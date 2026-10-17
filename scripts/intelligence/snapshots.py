from __future__ import annotations

import html
import json
import os
import re
import tempfile
from pathlib import Path

from .assembly_status import apply_current_assembly_status
from .classify import classify_category, is_political, reports_hearsay
from .events import headline_tokens
from .models import to_sortable_timestamp
from .people import canonical_politician_id, resolve_politician
from .quality import TIER_WEIGHT, source_affiliation, source_tier, story_importance
from .storylines import build_storylines
from .warehouse import IntelligenceWarehouse, now_utc_iso

MOBILE_NEWS_LIMIT = 3000


def news_sort_key(item: dict) -> tuple[str, str, str]:
    return (
        to_sortable_timestamp(item.get("publishedAtRaw") or item.get("publishedAt") or item.get("date")) or "",
        item.get("retrievedAt") or "",
        item.get("id") or "",
    )


def mobile_intel(document: dict, limit: int = MOBILE_NEWS_LIMIT) -> dict:
    news = sorted(
        document.get("news", []),
        key=news_sort_key,
        reverse=True,
    )
    return {**document, "news": news[:limit]}


def atomic_write_json(path: str | Path, value, validator=None) -> None:
    destination = Path(path)
    destination.parent.mkdir(parents=True, exist_ok=True)
    if validator:
        validator(value)

    descriptor, temporary_name = tempfile.mkstemp(
        prefix=f".{destination.name}.",
        suffix=".tmp",
        dir=destination.parent,
    )
    try:
        with os.fdopen(descriptor, "w", encoding="utf-8") as handle:
            json.dump(value, handle, ensure_ascii=False, separators=(",", ":"))
            handle.flush()
            os.fsync(handle.fileno())
        with open(temporary_name, "r", encoding="utf-8") as handle:
            json.load(handle)
        os.replace(temporary_name, destination)
    except Exception:
        try:
            os.unlink(temporary_name)
        except FileNotFoundError:
            pass
        raise


_PLACEHOLDER_SNIPPET = re.compile(r"^News coverage regarding .* from .*\.$")
# Broad sources whose items are only published when they carry a political signal.
_FILTERED_SOURCE_TYPES = {"publisher_rss", "bluesky_search", "reddit_search", "pullpush_reddit_search"}


def _title_key(title: str) -> str:
    return re.sub(r"[\W_]+", " ", title.lower()).strip()


def _repeats_title(snippet: str, title: str) -> bool:
    # Google News descriptions are the headline followed by the outlet name.
    text, headline = _title_key(snippet), _title_key(title)
    return text == headline or (text.startswith(headline) and len(text) - len(headline) < 40)


def frontend_news_record(row) -> dict | None:
    """Flatten a warehouse row into the record shape the app reads.

    Collected items store the warehouse dict with the collector's original record
    nested under rawMetadata; legacy imports store the original record directly.
    """
    stored = json.loads(row["raw_metadata_json"] or "{}")
    original = stored.get("rawMetadata") if isinstance(stored.get("rawMetadata"), dict) else stored
    title = (row["title"] or original.get("title") or "").strip()
    if not title or title == row["canonical_url"]:
        return None
    snippet = " ".join(html.unescape(original.get("snippet") or original.get("body") or row["body"] or "").split())
    if _PLACEHOLDER_SNIPPET.match(snippet) or _repeats_title(snippet, title):
        snippet = ""
    source_type = original.get("sourceType") or row["collector"]
    story_text = f"{title} {snippet}"
    politician_id = canonical_politician_id(original.get("politicianId") or row["politician_id"]) or "general"
    if politician_id == "general":
        politician_id = resolve_politician(story_text) or "general"
    if source_type in _FILTERED_SOURCE_TYPES and politician_id == "general" and not is_political(story_text):
        return None
    is_social = bool(row["is_social"])
    category = "social_media" if is_social else classify_category(story_text)
    # Older collections flagged reports from the search query text, not the story.
    verification = original.get("verificationStatus") or row["verification_status"]
    if not is_social and verification in ("source_reported", "unverified_chatter"):
        verification = "unverified_chatter" if reports_hearsay(story_text) else "source_reported"
    published = row["published_at"]
    record = {
        "id": original.get("id") or row["external_id"] or row["id"],
        "rawId": row["id"],
        "title": title,
        "snippet": snippet,
        "url": original.get("url") or row["canonical_url"],
        "source": original.get("source") or "Unknown source",
        "sourceType": source_type,
        "platform": original.get("platform") or row["platform"],
        "category": category,
        "politicianId": politician_id,
        "publishedAt": published,
        "date": published,
        "retrievedAt": row["retrieved_at"],
        "verificationStatus": verification,
        "isRumor": verification == "unverified_chatter",
    }
    for key in ("imageUrl", "engagement", "author", "language"):
        if original.get(key):
            record[key] = original[key]
    return {key: value for key, value in record.items() if value not in (None, "")}


# Rewrites of one wire story share most of their headline words.
_NEAR_DUPLICATE_WINDOW_SECONDS = 36 * 3600


def _near_duplicate(left: frozenset[str], right: frozenset[str]) -> bool:
    shared = len(left & right)
    return shared >= 3 and shared / max(1, len(left | right)) >= 0.6


def _epoch(value: str | None) -> float | None:
    from datetime import datetime

    try:
        return datetime.fromisoformat((value or "").replace("Z", "+00:00")).timestamp()
    except ValueError:
        return None


def _lead_rank(record: dict) -> tuple:
    # The copy shown is the best-sourced one; the rest become "also reported by".
    return (TIER_WEIGHT[record["sourceTier"]], len(record.get("snippet") or "") >= 80, bool(record.get("imageUrl")))


def _merge_copy(lead: dict, copy: dict) -> dict:
    if _lead_rank(copy) > _lead_rank(lead):
        lead, copy = copy | {"alsoReportedBy": lead.pop("alsoReportedBy", []), "outletCount": lead["outletCount"]}, lead
    seen = {lead["source"], *(other["source"] for other in lead.get("alsoReportedBy", []))}
    if copy["source"] not in seen:
        lead["outletCount"] += 1
        if len(lead.setdefault("alsoReportedBy", [])) < 6:
            lead["alsoReportedBy"].append({"source": copy["source"], "url": copy.get("url")})
    return lead


def _frontend_news(warehouse: IntelligenceWarehouse, limit: int) -> list[dict]:
    cursor = warehouse.connection.execute(
        """
        SELECT id, canonical_url, collector, platform, external_id, title, body,
               published_at, retrieved_at, politician_id, verification_status,
               is_social, raw_metadata_json
        FROM raw_items
        ORDER BY published_at IS NULL, published_at DESC, retrieved_at DESC, id DESC
        """
    )
    news: list[dict] = []
    by_title: dict[str, int] = {}
    # Recent leads, for matching reworded copies: (epoch, tokens, index).
    window: list[tuple[float, frozenset[str], int]] = []
    for row in cursor:
        record = frontend_news_record(row)
        if record is None:
            continue
        record["sourceTier"] = source_tier(record["source"], is_social=bool(row["is_social"]))
        record["outletCount"] = 1
        key = _title_key(record["title"])
        index = by_title.get(key)
        tokens = headline_tokens(record["title"])
        published = _epoch(record.get("publishedAt"))
        if index is None and published is not None and record["sourceTier"] != "social":
            window = [entry for entry in window if entry[0] - published <= _NEAR_DUPLICATE_WINDOW_SECONDS]
            index = next((entry[2] for entry in window if _near_duplicate(tokens, entry[1])), None)
        if index is not None:
            news[index] = _merge_copy(news[index], record)
            by_title[key] = index
            continue
        if len(news) >= limit:
            break
        by_title[key] = len(news)
        if published is not None and record["sourceTier"] != "social":
            window.append((published, tokens, len(news)))
        news.append(record)
    for record in news:
        affiliation = source_affiliation(record["source"])
        if affiliation:
            record["sourceAffiliation"] = affiliation
        record["importance"] = story_importance(record)
    return news


def _event_rows(warehouse: IntelligenceWarehouse) -> list[dict]:
    rows = warehouse.connection.execute(
        """
        SELECT
            events.*,
            COUNT(DISTINCT event_evidence.raw_item_id) AS evidence_count,
            COUNT(DISTINCT event_evidence.independence_key) AS independent_source_count
        FROM events
        LEFT JOIN event_evidence ON event_evidence.event_id = events.id
        GROUP BY events.id
        ORDER BY year ASC, occurred_at ASC, events.id ASC
        """
    ).fetchall()
    events = []
    for row in rows:
        event = dict(row)
        event["is_curated"] = bool(event["is_curated"])
        event["sourceLinks"] = json.loads(event.pop("source_links_json") or "[]")
        event["watchItems"] = json.loads(event.pop("watch_items_json") or "[]")
        evidence = warehouse.connection.execute(
            """
            SELECT raw_items.id, raw_items.title, raw_items.canonical_url AS url,
                   sources.name AS source, event_evidence.evidence_role AS role
            FROM event_evidence
            JOIN raw_items ON raw_items.id = event_evidence.raw_item_id
            JOIN sources ON sources.id = raw_items.source_id
            WHERE event_evidence.event_id = ?
            ORDER BY raw_items.published_at DESC
            """,
            (row["id"],),
        ).fetchall()
        event["evidence"] = [dict(item) for item in evidence]
        events.append(event)
    return events


def _event_links(warehouse: IntelligenceWarehouse) -> list[dict]:
    return [
        dict(row)
        for row in warehouse.connection.execute(
            """
            SELECT source_event_id AS source, target_event_id AS target,
                   relationship, confidence, source AS provenance
            FROM event_links
            ORDER BY source_event_id, target_event_id
            """
        )
    ]


def _collector_health(warehouse: IntelligenceWarehouse) -> list[dict]:
    rows = warehouse.connection.execute(
        """
        SELECT crawl_runs.*
        FROM crawl_runs
        JOIN (
            SELECT collector, MAX(started_at) AS latest_started_at
            FROM crawl_runs
            GROUP BY collector
        ) latest
          ON latest.collector = crawl_runs.collector
         AND latest.latest_started_at = crawl_runs.started_at
        ORDER BY crawl_runs.collector
        """
    ).fetchall()
    health = []
    for row in rows:
        item = dict(row)
        item["health"] = json.loads(item.pop("details_json") or "{}")
        health.append(item)
    return health


def _coverage_gaps(warehouse: IntelligenceWarehouse, collector_health: list[dict]) -> list[dict]:
    gaps = []
    for collector in collector_health:
        health = collector["health"]
        if collector["status"] == "failed" or health.get("status") in {"degraded", "unavailable", "no_results"}:
            gaps.append(
                {
                    "collector": collector["collector"],
                    "status": health.get("status") or collector["status"],
                    "reason": health.get("reason"),
                    "pageFailures": health.get("pageFailures", []),
                }
            )
    failures = warehouse.connection.execute(
        """
        SELECT collector, error_type, message, retryable, occurred_at
        FROM crawl_failures
        ORDER BY occurred_at DESC, id DESC
        LIMIT 50
        """
    ).fetchall()
    gaps.extend(dict(row) for row in failures)
    return gaps


def generate_snapshots(
    warehouse: IntelligenceWarehouse,
    output_dir: str | Path,
    recent_news_limit: int = 25000,
) -> dict:
    output = Path(output_dir)
    raw_count = warehouse.count("raw_items")
    event_count = warehouse.count("events")
    generated_at = now_utc_iso()
    collector_health = _collector_health(warehouse)
    last_run_at = max((item["completed_at"] or "" for item in collector_health), default=None)
    coverage_meta = warehouse.get_state("coverageMeta", {}) or {}
    coverage_meta = {
        "storyTarget": 100000,
        **coverage_meta,
        "currentStories": raw_count,
        "lastSnapshotAt": generated_at,
        "lastRunAt": last_run_at or coverage_meta.get("lastRunAt"),
    }

    compatibility = {
        "news": _frontend_news(warehouse, recent_news_limit),
        "evidence": warehouse.get_state("evidence", []),
        "mlas": warehouse.get_state("mlas", []),
        "rosterMeta": warehouse.get_state("rosterMeta"),
        "dataQuality": warehouse.get_state("dataQuality", {}),
        "coverageMeta": coverage_meta,
    }
    if not isinstance(compatibility["mlas"], list):
        raise ValueError("Compatibility snapshot requires an MLA list")
    compatibility["mlas"], compatibility["rosterMeta"] = apply_current_assembly_status(
        compatibility["mlas"],
        compatibility["rosterMeta"],
    )

    events = _event_rows(warehouse)
    time_fabric = {
        "generatedAt": generated_at,
        "events": events,
        "links": _event_links(warehouse),
        "counts": {
            "events": event_count,
            "curated": sum(1 for event in events if event["is_curated"]),
            "extracted": sum(1 for event in events if not event["is_curated"]),
        },
    }
    policy_updates = {
        "generatedAt": generated_at,
        "events": [event for event in events if event["event_type"] == "policy"],
    }
    status = {
        "generatedAt": generated_at,
        "lastRunAt": last_run_at,
        "rawItemCount": raw_count,
        "eventCount": event_count,
        "mlaCount": len(compatibility["mlas"]),
        "coverageMeta": coverage_meta,
        "collectorHealth": collector_health,
        "coverageGaps": _coverage_gaps(warehouse, collector_health),
    }

    atomic_write_json(output / "scrapedIntel.json", compatibility)
    atomic_write_json(output / "scrapedIntel.mobile.json", mobile_intel(compatibility))
    atomic_write_json(output / "timeFabric.json", time_fabric)
    atomic_write_json(output / "policyUpdates.json", policy_updates)
    atomic_write_json(output / "intelStatus.json", status)
    atomic_write_json(output / "storylines.json", build_storylines(compatibility["news"], generated_at))
    return {"raw_items": raw_count, "events": event_count}
