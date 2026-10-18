"""Multimodal vector store for stories, photos and audio.

Embeddings come from EmbeddingGemma 2 (Google DeepMind, Apache 2.0), which puts
text, images and audio into one 768-dimensional space, so a text query can
find a photo or a speech clip and a photo can find the stories about it. The
model runs in Node through Transformers.js (scripts/embeddings/worker.mjs);
this module decides what to embed, runs the worker and keeps the results.

Storage lives in the SQLite warehouse:
  media_items  one row per thing to embed: a story's text, its photo, an
               audio clip from a feed enclosure or the local inbox
  vectors      float16 vectors for embedded items

Search is exact cosine similarity with numpy; at tens of thousands of items
that takes milliseconds and needs no separate vector database server.
"""
from __future__ import annotations

import base64
import hashlib
import json
import mimetypes
import subprocess
import tempfile
import urllib.request
from dataclasses import dataclass
from pathlib import Path

import numpy as np

from .warehouse import now_utc_iso

MODEL_NAME = "embeddinggemma-2"
DIMENSIONS = 768
# Stories are embedded with the model's search prompt ("task: search result |
# query: ..."), which its own config also uses for matching translations. On
# the hand-checked same-issue groups it links stories better than the document
# prompt (precision@10 0.74 vs 0.70, centred) and lets storylines join the Tamil
# and English halves of an issue; search by meaning stays as good and photos
# find their story slightly more often (scripts/embedding_experiments.py).
# Changing it re-embeds every story; see VectorStore.discover.
TEXT_PROMPT = "query"
PROJECT_ROOT = Path(__file__).resolve().parents[2]
WORKER = PROJECT_ROOT / "scripts" / "embeddings" / "worker.mjs"
DEFAULT_INBOX = PROJECT_ROOT / "data" / "media" / "inbox"
IMAGE_SUFFIXES = {".jpg", ".jpeg", ".png", ".webp", ".gif", ".bmp"}
AUDIO_SUFFIXES = {".wav", ".mp3", ".m4a", ".aac", ".ogg", ".opus", ".flac", ".webm", ".mp4"}
MAX_ATTEMPTS = 3

SCHEMA = """
CREATE TABLE IF NOT EXISTS media_items (
    id TEXT PRIMARY KEY,
    raw_item_id TEXT REFERENCES raw_items(id) ON DELETE CASCADE,
    modality TEXT NOT NULL CHECK (modality IN ('text', 'image', 'audio')),
    source TEXT NOT NULL,
    title TEXT,
    published_at TEXT,
    politician_id TEXT,
    content_hash TEXT NOT NULL,
    status TEXT NOT NULL DEFAULT 'pending',
    attempts INTEGER NOT NULL DEFAULT 0,
    error TEXT,
    updated_at TEXT NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_media_items_pending ON media_items(status, published_at);
CREATE INDEX IF NOT EXISTS idx_media_items_raw ON media_items(raw_item_id);

CREATE TABLE IF NOT EXISTS vectors (
    item_id TEXT PRIMARY KEY REFERENCES media_items(id) ON DELETE CASCADE,
    model TEXT NOT NULL,
    dimensions INTEGER NOT NULL,
    vector BLOB NOT NULL,
    created_at TEXT NOT NULL
);
"""


class EmbeddingUnavailable(RuntimeError):
    """Node, the worker's packages or the model are missing."""


def story_document(title: str, snippet: str = "") -> str:
    return f"{(title or '').strip()}. {(snippet or '').strip()[:300]}".strip(". ")


def _hash(*parts: str) -> str:
    return hashlib.sha1("|".join([MODEL_NAME, *parts]).encode("utf-8")).hexdigest()


def run_worker(jobs: list[dict], *, deadline_seconds: float | None = None) -> dict[str, np.ndarray | str]:
    """Embed jobs with the Node worker; returns id -> vector, or id -> error text."""
    if not jobs:
        return {}
    with tempfile.TemporaryDirectory() as temporary:
        jobs_path = Path(temporary) / "jobs.jsonl"
        results_path = Path(temporary) / "results.jsonl"
        jobs_path.write_text("".join(json.dumps(job, ensure_ascii=False) + "\n" for job in jobs), encoding="utf-8")
        command = ["node", str(WORKER), str(jobs_path), str(results_path)]
        if deadline_seconds:
            command += ["--deadline", str(int(deadline_seconds))]
        try:
            completed = subprocess.run(command, cwd=PROJECT_ROOT, capture_output=True, text=True)
        except FileNotFoundError as error:
            raise EmbeddingUnavailable("node is not installed") from error
        if completed.returncode != 0 and not results_path.exists():
            raise EmbeddingUnavailable(completed.stderr.strip()[-500:] or "embedding worker failed")
        results: dict[str, np.ndarray | str] = {}
        for line in results_path.read_text(encoding="utf-8").splitlines():
            record = json.loads(line)
            if "vector" in record:
                results[record["id"]] = np.frombuffer(base64.b64decode(record["vector"]), dtype=np.float32)
            else:
                results[record["id"]] = record.get("error", "unknown error")
        return results


_BROWSER_HEADERS = {
    "User-Agent": "Mozilla/5.0 (Linux; Android 14) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/130.0 Mobile Safari/537.36",
    "Accept": "image/avif,image/webp,image/*,audio/*,*/*;q=0.8",
}
_MAX_DOWNLOAD = {"image": 15 * 1024 * 1024, "audio": 60 * 1024 * 1024}


def fetch_media(url: str, modality: str, directory: Path) -> Path:
    """Download a photo or clip; some news CDNs refuse Node's HTTP client."""
    origin = "/".join(url.split("/")[:3]) + "/"
    request = urllib.request.Request(url, headers={**_BROWSER_HEADERS, "Referer": origin})
    with urllib.request.urlopen(request, timeout=30) as response:
        data = response.read(_MAX_DOWNLOAD[modality] + 1)
    if len(data) > _MAX_DOWNLOAD[modality]:
        raise ValueError(f"{modality} larger than {_MAX_DOWNLOAD[modality] // 1048576} MB")
    path = directory / hashlib.sha1(url.encode("utf-8")).hexdigest()
    path.write_bytes(data)
    return path


def embed_query(text: str | None = None, *, image: str | None = None, audio: str | None = None) -> np.ndarray:
    job = (
        {"id": "q", "modality": "text", "input": text, "prompt": "query"} if text
        else {"id": "q", "modality": "image", "input": image} if image
        else {"id": "q", "modality": "audio", "input": audio}
    )
    result = run_worker([job])["q"]
    if isinstance(result, str):
        raise EmbeddingUnavailable(result)
    return result


@dataclass
class Hit:
    item_id: str
    score: float
    modality: str
    raw_item_id: str | None
    title: str | None
    source: str
    published_at: str | None


class VectorStore:
    def __init__(self, connection):
        self.connection = connection
        self.connection.executescript(SCHEMA)

    # ── what to embed ──────────────────────────────────────────────────
    def _upsert(self, item_id, raw_item_id, modality, source, title, published_at, politician_id, content_hash):
        existing = self.connection.execute(
            "SELECT content_hash FROM media_items WHERE id = ?", (item_id,)
        ).fetchone()
        if existing and existing[0] == content_hash:
            return False
        if existing:
            # A vector of the old content must not be compared with new ones.
            self.connection.execute("DELETE FROM vectors WHERE item_id = ?", (item_id,))
        self.connection.execute(
            """
            INSERT INTO media_items (id, raw_item_id, modality, source, title, published_at, politician_id,
                                     content_hash, status, attempts, error, updated_at)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, 'pending', 0, NULL, ?)
            ON CONFLICT(id) DO UPDATE SET source = excluded.source, title = excluded.title,
                published_at = excluded.published_at, politician_id = excluded.politician_id,
                content_hash = excluded.content_hash, status = 'pending', attempts = 0, error = NULL,
                updated_at = excluded.updated_at
            """,
            (item_id, raw_item_id, modality, source, title, published_at, politician_id, content_hash, now_utc_iso()),
        )
        return True

    def discover(self, *, since: str | None = None, inbox: Path | None = DEFAULT_INBOX) -> dict:
        """Register stories, their photos and audio enclosures, plus inbox files."""
        added = {"text": 0, "image": 0, "audio": 0}
        rows = self.connection.execute(
            f"""
            SELECT id, title, body, published_at, politician_id, raw_metadata_json, is_social
            FROM raw_items {"WHERE published_at >= ?" if since else ""}
            """,
            (since,) if since else (),
        ).fetchall()
        for row in rows:
            stored = json.loads(row["raw_metadata_json"] or "{}")
            original = stored.get("rawMetadata") if isinstance(stored.get("rawMetadata"), dict) else stored
            snippet = original.get("snippet") or row["body"] or ""
            if snippet.startswith("News coverage regarding "):
                snippet = ""
            text = story_document(row["title"], snippet)
            common = (row["title"], row["published_at"], row["politician_id"])
            added["text"] += self._upsert(f"text:{row['id']}", row["id"], "text", text, *common, _hash("text", TEXT_PROMPT, text))
            image = original.get("imageUrl")
            if image and image.startswith("https://"):
                added["image"] += self._upsert(f"image:{row['id']}", row["id"], "image", image, *common, _hash("image", image))
            audio = original.get("audioUrl")
            if audio and audio.startswith("https://"):
                added["audio"] += self._upsert(f"audio:{row['id']}", row["id"], "audio", audio, *common, _hash("audio", audio))
        if inbox and inbox.exists():
            for path in sorted(inbox.rglob("*")):
                modality = "image" if path.suffix.lower() in IMAGE_SUFFIXES else "audio" if path.suffix.lower() in AUDIO_SUFFIXES else None
                if modality is None:
                    continue
                # Optional sidecar: clip.mp3.json with {"title", "publishedAt", "politicianId"}.
                sidecar = path.with_name(path.name + ".json")
                meta = json.loads(sidecar.read_text(encoding="utf-8")) if sidecar.exists() else {}
                digest = hashlib.sha1(path.read_bytes()).hexdigest()
                added[modality] += self._upsert(
                    f"{modality}:file:{digest[:20]}", None, modality, str(path.resolve()),
                    meta.get("title") or path.stem, meta.get("publishedAt"), meta.get("politicianId"),
                    _hash(modality, digest),
                )
        # Older stories embedded with another prompt are queued again, newest first.
        for row in self.connection.execute("SELECT id, source, content_hash FROM media_items WHERE modality = 'text'").fetchall():
            content_hash = _hash("text", TEXT_PROMPT, row["source"])
            if row["content_hash"] != content_hash:
                self.connection.execute("DELETE FROM vectors WHERE item_id = ?", (row["id"],))
                self.connection.execute(
                    "UPDATE media_items SET content_hash = ?, status = 'pending', attempts = 0, error = NULL, updated_at = ? WHERE id = ?",
                    (content_hash, now_utc_iso(), row["id"]),
                )
                added["text"] += 1
        self.connection.commit()
        return added

    # ── embedding ──────────────────────────────────────────────────────
    def pending(self, *, modalities=("text", "image", "audio"), limit: int | None = None) -> list:
        marks = ",".join("?" * len(modalities))
        return self.connection.execute(
            f"""
            SELECT id, modality, source, title FROM media_items
            WHERE status != 'embedded' AND attempts < ? AND modality IN ({marks})
            ORDER BY published_at IS NULL, published_at DESC
            {"LIMIT ?" if limit else ""}
            """,
            (MAX_ATTEMPTS, *modalities, *((limit,) if limit else ())),
        ).fetchall()

    def embed_pending(self, *, modalities=("text", "image", "audio"), limit: int | None = None,
                      deadline_seconds: float | None = None, worker=run_worker, fetch=fetch_media) -> dict:
        """Embed newest pending items first; returns counts per outcome."""
        rows = self.pending(modalities=modalities, limit=limit)
        results: dict = {}
        with tempfile.TemporaryDirectory() as downloads:
            jobs = []
            for row in rows:
                source = row["source"]
                if row["modality"] != "text" and source.startswith(("https://", "http://")):
                    try:
                        source = str(fetch(source, row["modality"], Path(downloads)))
                    except Exception as error:  # noqa: BLE001 - recorded per item and retried later
                        results[row["id"]] = f"download failed: {error}"[:300]
                        continue
                jobs.append({"id": row["id"], "modality": row["modality"], "input": source, "prompt": TEXT_PROMPT})
            if jobs:
                results.update(worker(jobs, deadline_seconds=deadline_seconds))
        now = now_utc_iso()
        counts = {"embedded": 0, "failed": 0, "deferred": 0}
        for row in rows:
            result = results.get(row["id"])
            if result is None:
                counts["deferred"] += 1
            elif isinstance(result, str):
                counts["failed"] += 1
                self.connection.execute(
                    "UPDATE media_items SET status = 'failed', attempts = attempts + 1, error = ?, updated_at = ? WHERE id = ?",
                    (result[:300], now, row["id"]),
                )
            else:
                counts["embedded"] += 1
                self.connection.execute(
                    "INSERT OR REPLACE INTO vectors (item_id, model, dimensions, vector, created_at) VALUES (?, ?, ?, ?, ?)",
                    (row["id"], MODEL_NAME, len(result), result.astype(np.float16).tobytes(), now),
                )
                self.connection.execute(
                    "UPDATE media_items SET status = 'embedded', error = NULL, updated_at = ? WHERE id = ?",
                    (now, row["id"]),
                )
        self.connection.commit()
        return counts

    # ── reading and search ─────────────────────────────────────────────
    def load(self, *, modality: str | None = None, since: str | None = None, raw_item_ids=None):
        clauses, params = [], []
        if modality:
            clauses.append("media_items.modality = ?")
            params.append(modality)
        if since:
            clauses.append("media_items.published_at >= ?")
            params.append(since)
        where = f"WHERE {' AND '.join(clauses)}" if clauses else ""
        rows = self.connection.execute(
            f"""
            SELECT media_items.id, media_items.modality, media_items.raw_item_id, media_items.title,
                   media_items.source, media_items.published_at, vectors.vector
            FROM vectors JOIN media_items ON media_items.id = vectors.item_id {where}
            """,
            params,
        ).fetchall()
        if raw_item_ids is not None:
            wanted = set(raw_item_ids)
            rows = [row for row in rows if row["raw_item_id"] in wanted]
        if not rows:
            return [], np.zeros((0, DIMENSIONS), dtype=np.float32)
        matrix = np.frombuffer(b"".join(row["vector"] for row in rows), dtype=np.float16).reshape(len(rows), -1)
        return [dict(row) for row in rows], matrix.astype(np.float32)

    def search(self, query: np.ndarray, *, k: int = 10, modality: str | None = None, since: str | None = None) -> list[Hit]:
        meta, matrix = self.load(modality=modality, since=since)
        if not meta:
            return []
        scores = matrix @ query[: matrix.shape[1]]
        order = np.argsort(-scores)[:k]
        return [
            Hit(meta[i]["id"], float(scores[i]), meta[i]["modality"], meta[i]["raw_item_id"],
                meta[i]["title"], meta[i]["source"], meta[i]["published_at"])
            for i in order
        ]

    def stats(self) -> dict:
        rows = self.connection.execute(
            "SELECT modality, status, COUNT(*) FROM media_items GROUP BY modality, status"
        ).fetchall()
        summary: dict = {}
        for modality, status, count in rows:
            summary.setdefault(modality, {})[status] = count
        return summary


def truncate(matrix: np.ndarray, dimensions: int) -> np.ndarray:
    """Matryoshka truncation: keep the leading dimensions and renormalise."""
    head = matrix[:, :dimensions]
    return head / np.maximum(np.linalg.norm(head, axis=1, keepdims=True), 1e-12)


def without_shared_directions(matrix: np.ndarray, count: int = 3) -> np.ndarray:
    """Centre, drop the `count` strongest shared directions and renormalise ("all-but-the-top").

    Every story shares a broad "Tamil Nadu politics" direction. Removing the
    mean and the three strongest directions makes same-issue pairs stand out
    more than centring alone: on the hand-checked groups, pairs at cosine 0.20
    and above are the same issue 94% of the time, and 99% at 0.35 and above
    (scripts/embedding_experiments.py). Centroid-based linking in storylines
    gains nothing from it, so storylines still only centre.
    """
    centred = matrix - matrix.mean(axis=0)
    _, _, components = np.linalg.svd(centred, full_matrices=False)
    top = components[:count]
    shifted = centred - centred @ top.T @ top
    return shifted / np.maximum(np.linalg.norm(shifted, axis=1, keepdims=True), 1e-12)


def guess_modality(path: str) -> str | None:
    kind = mimetypes.guess_type(path)[0] or ""
    return "image" if kind.startswith("image/") else "audio" if kind.startswith(("audio/", "video/")) else None
