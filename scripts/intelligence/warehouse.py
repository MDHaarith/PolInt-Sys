from __future__ import annotations

import contextlib
import hashlib
import json
import sqlite3
from datetime import datetime, timezone
from pathlib import Path
from urllib.parse import urlsplit

from .schema import SCHEMA_SQL, SCHEMA_VERSION


def now_utc_iso() -> str:
    return datetime.now(timezone.utc).isoformat(timespec="seconds").replace("+00:00", "Z")


def recover_json_document(path: str | Path) -> tuple[dict, str]:
    text = Path(path).read_text(encoding="utf-8")
    document, end = json.JSONDecoder().raw_decode(text)
    if not isinstance(document, dict):
        raise ValueError("Intelligence JSON root must be an object")
    return document, text[end:]


def stable_id(prefix: str, value: str) -> str:
    digest = hashlib.sha256(value.encode("utf-8")).hexdigest()[:20]
    return f"{prefix}_{digest}"


def content_hash(title: str, body: str) -> str:
    normalized = " ".join(f"{title} {body}".lower().split())
    return hashlib.sha256(normalized.encode("utf-8")).hexdigest()


class IntelligenceWarehouse:
    def __init__(self, path: str | Path):
        self.path = Path(path)
        self.path.parent.mkdir(parents=True, exist_ok=True)
        self.connection = sqlite3.connect(self.path)
        self.connection.row_factory = sqlite3.Row
        self.connection.execute("PRAGMA journal_mode = WAL")
        self.connection.execute("PRAGMA foreign_keys = ON")
        self.connection.executescript(SCHEMA_SQL)
        self.connection.execute(
            "INSERT OR REPLACE INTO schema_meta (key, value) VALUES ('schema_version', ?)",
            (str(SCHEMA_VERSION),),
        )
        self.connection.commit()

    def close(self) -> None:
        self.connection.close()

    @contextlib.contextmanager
    def transaction(self):
        try:
            self.connection.execute("BEGIN")
            yield
        except Exception:
            self.connection.rollback()
            raise
        else:
            self.connection.commit()

    def count(self, table: str) -> int:
        allowed = {
            "sources",
            "raw_items",
            "people",
            "events",
            "event_people",
            "event_evidence",
            "event_links",
            "crawl_runs",
            "crawl_failures",
            "app_state",
        }
        if table not in allowed:
            raise ValueError(f"Unsupported table: {table}")
        return self.connection.execute(f"SELECT COUNT(*) FROM {table}").fetchone()[0]

    def set_state(self, key: str, value) -> None:
        was_in_transaction = self.connection.in_transaction
        self.connection.execute(
            """
            INSERT INTO app_state (key, value_json, updated_at)
            VALUES (?, ?, ?)
            ON CONFLICT(key) DO UPDATE SET
                value_json = excluded.value_json,
                updated_at = excluded.updated_at
            """,
            (key, json.dumps(value, ensure_ascii=False), now_utc_iso()),
        )
        if not was_in_transaction:
            self.connection.commit()

    def get_state(self, key: str, default=None):
        row = self.connection.execute(
            "SELECT value_json FROM app_state WHERE key = ?", (key,)
        ).fetchone()
        return json.loads(row["value_json"]) if row else default

    def _upsert_source(self, item: dict) -> str:
        name = item.get("source") or "Unknown source"
        source_type = item.get("sourceType") or item.get("collector") or "legacy"
        platform = item.get("platform")
        url = item.get("url") or ""
        parsed = urlsplit(url)
        base_url = f"{parsed.scheme}://{parsed.netloc}" if parsed.scheme and parsed.netloc else None
        source_id = stable_id("source", f"{name}|{source_type}|{platform or ''}")
        timestamp = now_utc_iso()
        self.connection.execute(
            """
            INSERT INTO sources (
                id, name, source_type, base_url, platform, created_at, updated_at
            ) VALUES (?, ?, ?, ?, ?, ?, ?)
            ON CONFLICT(id) DO UPDATE SET
                base_url = COALESCE(excluded.base_url, sources.base_url),
                updated_at = excluded.updated_at
            """,
            (source_id, name, source_type, base_url, platform, timestamp, timestamp),
        )
        return source_id

    def upsert_raw_item(self, item: dict, check_existing: bool = True) -> bool:
        source_id = self._upsert_source(item)
        title = str(item.get("title") or "").strip()
        body = str(item.get("body") or item.get("snippet") or "").strip()
        canonical_url = str(item.get("canonicalUrl") or item.get("url") or "").strip() or None
        external_id = str(item.get("externalId") or item.get("id") or "").strip() or None
        collector = str(item.get("collector") or item.get("sourceType") or "legacy")
        item_id = external_id or stable_id("raw", canonical_url or f"{title}|{body}")
        retrieved_at = item.get("retrievedAt") or now_utc_iso()
        existing = None
        if check_existing:
            existing = self.connection.execute(
                """
                SELECT id FROM raw_items
                WHERE id = ?
                   OR (? IS NOT NULL AND canonical_url = ?)
                   OR (? IS NOT NULL AND collector = ? AND external_id = ?)
                LIMIT 1
                """,
                (
                    item_id,
                    canonical_url,
                    canonical_url,
                    external_id,
                    collector,
                    external_id,
                ),
            ).fetchone()
        if existing is not None:
            self.connection.execute(
                """
                UPDATE raw_items
                SET last_seen_at = ?, raw_metadata_json = ?
                WHERE id = ?
                """,
                (retrieved_at, json.dumps(item, ensure_ascii=False), existing["id"]),
            )
            return False
        published_at = item.get("publishedAtRaw") or item.get("publishedAt") or item.get("date")
        item_hash = content_hash(title, body)
        is_social = bool(item.get("isSocial") or item.get("platform") or item.get("category") == "social_media")
        self.connection.execute(
            """
            INSERT INTO raw_items (
                id, canonical_url, source_id, collector, platform, external_id,
                title, body, author_name, published_at, retrieved_at, language,
                content_hash, politician_id, category, verification_status,
                is_social, raw_metadata_json, first_seen_at, last_seen_at
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
            ON CONFLICT(id) DO UPDATE SET
                last_seen_at = excluded.last_seen_at,
                raw_metadata_json = excluded.raw_metadata_json
            """,
            (
                item_id,
                canonical_url,
                source_id,
                collector,
                item.get("platform"),
                external_id,
                title,
                body,
                (item.get("author") or {}).get("displayName") if isinstance(item.get("author"), dict) else item.get("authorName"),
                published_at,
                retrieved_at,
                item.get("language"),
                item_hash,
                item.get("politicianId"),
                item.get("category") or "news",
                item.get("verificationStatus") or "source_reported",
                int(is_social),
                json.dumps(item, ensure_ascii=False),
                retrieved_at,
                retrieved_at,
            ),
        )
        return True

    def import_legacy_document(self, document: dict) -> dict:
        added = 0
        with self.transaction():
            for key in ("mlas", "rosterMeta", "dataQuality", "coverageMeta", "evidence"):
                if key in document:
                    self.set_state(key, document[key])
            existing_ids = {
                row[0] for row in self.connection.execute("SELECT id FROM raw_items")
            }
            existing_urls = {
                row[0]
                for row in self.connection.execute(
                    "SELECT canonical_url FROM raw_items WHERE canonical_url IS NOT NULL"
                )
            }
            existing_external = {
                (row[0], row[1])
                for row in self.connection.execute(
                    """
                    SELECT collector, external_id FROM raw_items
                    WHERE external_id IS NOT NULL
                    """
                )
            }
            for item in document.get("news", []):
                canonical_url = str(
                    item.get("canonicalUrl") or item.get("url") or ""
                ).strip() or None
                external_id = str(
                    item.get("externalId") or item.get("id") or ""
                ).strip() or None
                collector = str(
                    item.get("collector") or item.get("sourceType") or "legacy"
                )
                item_id = external_id or stable_id(
                    "raw",
                    canonical_url
                    or f"{item.get('title') or ''}|{item.get('body') or item.get('snippet') or ''}",
                )
                if (
                    item_id in existing_ids
                    or (canonical_url and canonical_url in existing_urls)
                    or (
                        external_id
                        and (collector, external_id) in existing_external
                    )
                ):
                    continue
                self.upsert_raw_item(item, check_existing=False)
                existing_ids.add(item_id)
                if canonical_url:
                    existing_urls.add(canonical_url)
                if external_id:
                    existing_external.add((collector, external_id))
                added += 1
        return {"raw_items_added": added, "raw_items_total": self.count("raw_items")}
