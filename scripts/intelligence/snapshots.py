from __future__ import annotations

import json
import os
import tempfile
from pathlib import Path

from .warehouse import IntelligenceWarehouse, now_utc_iso


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


def _legacy_news(warehouse: IntelligenceWarehouse, limit: int) -> list[dict]:
    rows = warehouse.connection.execute(
        """
        SELECT raw_metadata_json
        FROM raw_items
        ORDER BY COALESCE(published_at, retrieved_at) DESC, id DESC
        LIMIT ?
        """,
        (limit,),
    ).fetchall()
    return [json.loads(row["raw_metadata_json"]) for row in rows]


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


def generate_snapshots(
    warehouse: IntelligenceWarehouse,
    output_dir: str | Path,
    recent_news_limit: int = 25000,
) -> dict:
    output = Path(output_dir)
    raw_count = warehouse.count("raw_items")
    event_count = warehouse.count("events")
    generated_at = now_utc_iso()
    coverage_meta = warehouse.get_state("coverageMeta", {}) or {}
    coverage_meta = {
        "storyTarget": 100000,
        **coverage_meta,
        "currentStories": raw_count,
        "lastSnapshotAt": generated_at,
    }

    compatibility = {
        "news": _legacy_news(warehouse, recent_news_limit),
        "evidence": warehouse.get_state("evidence", []),
        "mlas": warehouse.get_state("mlas", []),
        "rosterMeta": warehouse.get_state("rosterMeta"),
        "dataQuality": warehouse.get_state("dataQuality", {}),
        "coverageMeta": coverage_meta,
    }
    if not isinstance(compatibility["mlas"], list):
        raise ValueError("Compatibility snapshot requires an MLA list")

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
        "rawItemCount": raw_count,
        "eventCount": event_count,
        "mlaCount": len(compatibility["mlas"]),
        "coverageMeta": coverage_meta,
    }

    atomic_write_json(output / "scrapedIntel.json", compatibility)
    atomic_write_json(output / "timeFabric.json", time_fabric)
    atomic_write_json(output / "policyUpdates.json", policy_updates)
    atomic_write_json(output / "intelStatus.json", status)
    return {"raw_items": raw_count, "events": event_count}

