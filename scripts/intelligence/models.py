from __future__ import annotations

from dataclasses import dataclass, field
from datetime import datetime, timezone
from email.utils import parsedate_to_datetime


def now_utc_iso() -> str:
    return datetime.now(timezone.utc).isoformat(timespec="seconds").replace("+00:00", "Z")


def to_sortable_timestamp(value: str | None) -> str | None:
    if not value:
        return None
    raw = str(value).strip()
    for fmt, output in (
        ("%B %d, %Y", "%Y-%m-%d"),
        ("%b %d, %Y", "%Y-%m-%d"),
        ("%Y-%m-%d", "%Y-%m-%d"),
        ("%Y-%m", "%Y-%m"),
        ("%Y", "%Y"),
    ):
        try:
            return datetime.strptime(raw, fmt).strftime(output)
        except ValueError:
            continue
    try:
        parsed = datetime.fromisoformat(raw.replace("Z", "+00:00"))
    except ValueError:
        try:
            parsed = parsedate_to_datetime(raw)
        except (TypeError, ValueError, OverflowError):
            return None
    try:
        return parsed.replace(tzinfo=parsed.tzinfo or timezone.utc).astimezone(
            timezone.utc
        ).isoformat(timespec="seconds").replace("+00:00", "Z")
    except (ValueError, OverflowError):
        return None


@dataclass
class CollectedItem:
    canonical_url: str
    collector: str
    source_name: str
    source_type: str
    platform: str | None
    external_id: str | None
    title: str
    body: str
    author_name: str | None
    published_at: str | None
    retrieved_at: str
    politician_id: str | None
    category: str
    verification_status: str
    raw_metadata: dict = field(default_factory=dict)
    language: str | None = None

    @classmethod
    def from_legacy(cls, item: dict) -> "CollectedItem":
        author = item.get("author")
        author_name = (
            author.get("displayName")
            if isinstance(author, dict)
            else item.get("authorName")
        )
        return cls(
            canonical_url=item.get("canonicalUrl") or item.get("url") or "",
            collector=item.get("collector") or item.get("sourceType") or "legacy",
            source_name=item.get("source") or "Unknown source",
            source_type=item.get("sourceType") or "legacy",
            platform=item.get("platform"),
            external_id=item.get("externalId") or item.get("id"),
            title=item.get("title") or "",
            body=item.get("body") or item.get("snippet") or "",
            author_name=author_name,
            published_at=item.get("publishedAtRaw") or item.get("publishedAt") or item.get("date"),
            retrieved_at=item.get("retrievedAt") or now_utc_iso(),
            politician_id=item.get("politicianId"),
            category=item.get("category") or "news",
            verification_status=item.get("verificationStatus") or "source_reported",
            raw_metadata=item,
            language=item.get("language"),
        )

    def to_warehouse_dict(self) -> dict:
        return {
            "canonicalUrl": self.canonical_url,
            "collector": self.collector,
            "source": self.source_name,
            "sourceType": self.source_type,
            "platform": self.platform,
            "externalId": self.external_id,
            "title": self.title,
            "body": self.body,
            "authorName": self.author_name,
            "publishedAtRaw": self.published_at,
            "retrievedAt": self.retrieved_at,
            "politicianId": self.politician_id,
            "category": self.category,
            "verificationStatus": self.verification_status,
            "language": self.language,
            "rawMetadata": self.raw_metadata,
            "isSocial": bool(self.platform or self.category == "social_media"),
        }

