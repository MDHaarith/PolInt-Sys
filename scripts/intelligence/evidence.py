"""Evidence store: proof-checked passages and their vectors, for answers that cite.

Chat on the phone answers only from evidence and quotes it, so every stored
passage carries its proof: outlet, source tier, link and date. A story gets in
only through the proof gate:

  record, established  kept as reports
  partisan             kept as claims: proof that the outlet's side said it,
                       not that it is true
  aggregator, social   left out, as are stories marked unverified chatter and
                       stories without a link or a date

Each kept story is cut into passages (its headline, then each full sentence of
its text) that can be quoted word for word; a sentence cut off with an
ellipsis is left out, since quoting it would put words in the outlet's mouth.
Passages are embedded once with EmbeddingGemma 2, and a text another outlet
already carried reuses its vector.

The export for the phone has the shape of vectorIndex.json (256 dimensions,
int8) plus each passage's proof and the other outlets that reported the same
thing (`corroboratedBy`): the same text, or a passage at CORROBORATION or above
within CORROBORATION_DAYS once the shared directions are removed.
"""
from __future__ import annotations

import json
import re
import unicodedata
from dataclasses import dataclass
from datetime import datetime, timedelta, timezone
from pathlib import Path

import numpy as np

from .quality import source_tier
from .snapshots import app_vector_index
from .vectors import TEXT_PROMPT, run_worker, without_shared_directions
from .warehouse import now_utc_iso

KIND_BY_TIER = {"record": "report", "established": "report", "partisan": "claim"}
MIN_PASSAGE = 25
MAX_PASSAGE = 400
# Passages from different outlets at 0.35 and above (shared directions removed,
# within three days) were the same issue in 1,162 of 1,166 hand-checked pairs
# (99.7%), finding half of all same-issue pairs; at 0.30, 14 links were wrong.
CORROBORATION = 0.35
CORROBORATION_DAYS = 3
MAX_ATTEMPTS = 3
TAMIL = re.compile(r"[஀-௿]")
_SENTENCE_END = re.compile(r"(?<=[.!?।])\s+")
_TRUNCATED = re.compile(r"(…|\.\.\.)\s*$")

SCHEMA = """
CREATE TABLE IF NOT EXISTS evidence_passages (
    id TEXT PRIMARY KEY,
    story_id TEXT NOT NULL,
    position INTEGER NOT NULL,
    text TEXT NOT NULL,
    text_key TEXT NOT NULL,
    language TEXT NOT NULL,
    source TEXT NOT NULL,
    tier TEXT NOT NULL,
    kind TEXT NOT NULL,
    url TEXT NOT NULL,
    published_at TEXT NOT NULL,
    vector BLOB,
    attempts INTEGER NOT NULL DEFAULT 0,
    error TEXT,
    updated_at TEXT NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_evidence_story ON evidence_passages(story_id);
CREATE INDEX IF NOT EXISTS idx_evidence_published ON evidence_passages(published_at);
CREATE INDEX IF NOT EXISTS idx_evidence_text_key ON evidence_passages(text_key);
"""


@dataclass
class Story:
    id: str
    title: str
    text: str
    source: str
    url: str
    published_at: str
    verification: str = "source_reported"
    is_social: bool = False


def text_key(text: str) -> str:
    """Letters and digits only, lower case: the same sentence from two outlets matches."""
    normalised = unicodedata.normalize("NFC", text).lower()
    # Tamil vowel signs are not word characters to `\w`, so the Tamil block is named.
    return " ".join(re.findall(r"[\w஀-௿]+", normalised))


def check_citation(quote: str, passage: str) -> bool:
    """True when the quote appears word for word in the passage (case, spacing and punctuation aside)."""
    quoted = text_key(quote)
    return len(quoted) >= 12 and quoted in text_key(passage)


def proof_gate(story: Story) -> tuple[str | None, str | None]:
    """(tier, None) for a story the store keeps, or (None, why it is left out)."""
    if story.is_social:
        return None, "social"
    if story.verification == "unverified_chatter":
        return None, "unverified"
    if not story.url.startswith("https://"):
        return None, "no_link"
    if not story.published_at:
        return None, "no_date"
    tier = source_tier(story.source)
    if tier not in KIND_BY_TIER:
        return None, f"tier_{tier}"
    return tier, None


def passages(story: Story) -> list[str]:
    """The headline, then each full sentence of the story's text, as the outlet wrote them."""
    out = [story.title.strip()]
    for sentence in _SENTENCE_END.split((story.text or "").strip()):
        sentence = sentence.strip()
        if _TRUNCATED.search(sentence) or not MIN_PASSAGE <= len(sentence) <= MAX_PASSAGE:
            continue
        if text_key(sentence) not in {text_key(text) for text in out}:
            out.append(sentence)
    return [text for text in out if len(text) >= 10]


# ── where stories come from ────────────────────────────────────────────
def stories_from_feed(path: Path) -> list[Story]:
    """Stories from a published feed (public/scrapedIntel.json); only some carry text beyond the headline."""
    feed = json.loads(Path(path).read_text(encoding="utf-8"))
    return [
        Story(
            id=item.get("rawId") or item["id"], title=item.get("title") or "", text=item.get("snippet") or "",
            source=item.get("source") or "", url=item.get("url") or "", published_at=item.get("publishedAt") or "",
            verification=item.get("verificationStatus") or "source_reported",
            is_social=item.get("sourceTier") == "social" or bool(item.get("isRumor")),
        )
        for item in feed.get("news", [])
        if item.get("title")
    ]


def stories_from_warehouse(connection, *, since: str | None = None) -> list[Story]:
    """Stories from the intelligence warehouse, with their full collected text."""
    rows = connection.execute(
        f"""
        SELECT raw_items.id, raw_items.title, raw_items.body, raw_items.canonical_url, raw_items.published_at,
               raw_items.verification_status, raw_items.is_social, sources.name AS source
        FROM raw_items JOIN sources ON sources.id = raw_items.source_id
        {"WHERE raw_items.published_at >= ?" if since else ""}
        """,
        (since,) if since else (),
    ).fetchall()
    return [
        Story(
            id=row[0], title=row[1] or "", text="" if (row[2] or "").startswith("News coverage regarding ") else row[2] or "",
            source=row[7] or "", url=row[3] or "", published_at=row[4] or "", verification=row[5] or "source_reported",
            is_social=bool(row[6]),
        )
        for row in rows
    ]


# ── the store ─────────────────────────────────────────────────────────
class EvidenceStore:
    def __init__(self, connection):
        self.connection = connection
        self.connection.executescript(SCHEMA)

    def add(self, stories: list[Story]) -> dict:
        """Keep the stories that pass the proof gate; returns counts, including why others were left out."""
        counts: dict = {"stories": 0, "passages": 0, "unchanged": 0, "left_out": {}}
        now = now_utc_iso()
        for story in stories:
            tier, reason = proof_gate(story)
            if reason:
                counts["left_out"][reason] = counts["left_out"].get(reason, 0) + 1
                continue
            texts = passages(story)
            stored = [row[0] for row in self.connection.execute(
                "SELECT text FROM evidence_passages WHERE story_id = ? ORDER BY position", (story.id,))]
            if stored == texts:
                counts["unchanged"] += 1
                continue
            self.connection.execute("DELETE FROM evidence_passages WHERE story_id = ?", (story.id,))
            for position, text in enumerate(texts):
                self.connection.execute(
                    """
                    INSERT INTO evidence_passages (id, story_id, position, text, text_key, language, source, tier,
                                                   kind, url, published_at, updated_at)
                    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
                    """,
                    (f"{story.id}:{position}", story.id, position, text, text_key(text),
                     "ta" if TAMIL.search(text) else "en", story.source, tier, KIND_BY_TIER[tier],
                     story.url, story.published_at, now),
                )
            counts["stories"] += 1
            counts["passages"] += len(texts)
        self.connection.commit()
        return counts

    def embed_pending(self, *, since: str | None = None, limit: int | None = None,
                      deadline_seconds: float | None = None, worker=run_worker) -> dict:
        """Embed passages without a vector, newest first; a text already embedded elsewhere is copied."""
        copied = self.connection.execute(
            """
            UPDATE evidence_passages SET vector = (
                SELECT other.vector FROM evidence_passages AS other
                WHERE other.text_key = evidence_passages.text_key AND other.vector IS NOT NULL LIMIT 1)
            WHERE vector IS NULL AND EXISTS (
                SELECT 1 FROM evidence_passages AS other
                WHERE other.text_key = evidence_passages.text_key AND other.vector IS NOT NULL)
            """
        ).rowcount
        rows = self.connection.execute(
            f"""
            SELECT id, text, text_key FROM evidence_passages
            WHERE vector IS NULL AND attempts < ? {"AND published_at >= ?" if since else ""}
            ORDER BY published_at DESC
            """,
            (MAX_ATTEMPTS, *((since,) if since else ())),
        ).fetchall()
        first_by_key: dict = {}
        for row in rows:
            first_by_key.setdefault(row[2], row)
        jobs = [{"id": row[0], "modality": "text", "input": row[1], "prompt": TEXT_PROMPT}
                for row in list(first_by_key.values())[:limit]]
        results = worker(jobs, deadline_seconds=deadline_seconds) if jobs else {}
        counts = {"embedded": 0, "copied": copied, "failed": 0, "deferred": 0}
        now = now_utc_iso()
        for job in jobs:
            result = results.get(job["id"])
            if result is None:
                counts["deferred"] += 1
            elif isinstance(result, str):
                counts["failed"] += 1
                self.connection.execute(
                    "UPDATE evidence_passages SET attempts = attempts + 1, error = ?, updated_at = ? WHERE id = ?",
                    (result[:300], now, job["id"]))
            else:
                counts["embedded"] += 1
                # Every passage with the same text gets the vector: syndicated copies embed once.
                self.connection.execute(
                    "UPDATE evidence_passages SET vector = ?, error = NULL, updated_at = ? WHERE text_key = ?",
                    (result.astype(np.float16).tobytes(), now, text_key(job["input"])))
        self.connection.commit()
        return counts

    def load(self, *, since: str | None = None) -> tuple[list[dict], np.ndarray]:
        rows = self.connection.execute(
            f"""
            SELECT id, story_id, text, text_key, language, source, tier, kind, url, published_at, vector
            FROM evidence_passages WHERE vector IS NOT NULL {"AND published_at >= ?" if since else ""}
            ORDER BY published_at DESC, id
            """,
            (since,) if since else (),
        ).fetchall()
        if not rows:
            return [], np.zeros((0, 768), dtype=np.float32)
        names = ("id", "storyId", "text", "textKey", "language", "source", "tier", "kind", "url", "publishedAt")
        meta = [dict(zip(names, row[:10])) for row in rows]
        matrix = np.frombuffer(b"".join(row[10] for row in rows), dtype=np.float16).reshape(len(rows), -1)
        return meta, matrix.astype(np.float32)

    def stats(self) -> dict:
        row = self.connection.execute(
            "SELECT COUNT(*), COUNT(vector), COUNT(DISTINCT story_id), COUNT(DISTINCT source) FROM evidence_passages"
        ).fetchone()
        return {"passages": row[0], "embedded": row[1], "stories": row[2], "outlets": row[3]}


def corroboration(meta: list[dict], matrix: np.ndarray) -> list[list[str]]:
    """For each passage, the other outlets that carried the same text or the same thing within a few days."""
    outlets: list[set] = [set() for _ in meta]
    by_key: dict = {}
    for position, item in enumerate(meta):
        by_key.setdefault(item["textKey"], []).append(position)
    for group in by_key.values():
        for position in group:
            outlets[position].update(meta[other]["source"] for other in group)
    if len(meta) > 3:
        processed = without_shared_directions(matrix)
        dates = np.array([_epoch(item["publishedAt"]) for item in meta])
        similarity = processed @ processed.T
        close = (similarity >= CORROBORATION) & (np.abs(dates[:, None] - dates[None, :]) <= CORROBORATION_DAYS * 86400)
        for left, right in zip(*np.nonzero(np.triu(close, 1))):
            outlets[left].add(meta[right]["source"])
            outlets[right].add(meta[left]["source"])
    return [sorted(found - {item["source"]}) for found, item in zip(outlets, meta)]


def _epoch(value: str) -> float:
    try:
        return datetime.fromisoformat(value.replace("Z", "+00:00")).timestamp()
    except ValueError:
        return 0.0


def evidence_pack(store: EvidenceStore, *, days: int = 30, now: datetime | None = None) -> dict:
    """The recent evidence for the phone: vectors as in vectorIndex.json, plus each passage's proof."""
    now = now or datetime.now(timezone.utc)
    since = (now - timedelta(days=days)).strftime("%Y-%m-%dT%H:%M:%SZ")
    meta, matrix = store.load(since=since)
    generated_at = now.strftime("%Y-%m-%dT%H:%M:%SZ")
    index = app_vector_index({item["id"]: vector for item, vector in zip(meta, matrix)}, generated_at)
    backed = corroboration(meta, matrix) if meta else []
    index["kind"] = "evidence"
    index["days"] = days
    index["passages"] = [
        {key: item[key] for key in ("storyId", "text", "language", "source", "tier", "kind", "url", "publishedAt")}
        | {"corroboratedBy": others}
        for item, others in zip(meta, backed)
    ]
    return index
