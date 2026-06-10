from __future__ import annotations

import json
import re

from .warehouse import now_utc_iso


def _clean_title(title: str) -> str:
    return re.sub(r"^\d{4}:\s*", "", title or "").strip()


def upsert_curated_payload(warehouse, payload: dict) -> dict:
    nodes = payload.get("nodes", [])
    edges = payload.get("edges", [])
    now = now_utc_iso()
    node_ids = {node["id"] for node in nodes}
    with warehouse.transaction():
        for node in nodes:
            year = node.get("year")
            occurred_at = str(year) if year else None
            warehouse.connection.execute(
                """
                INSERT INTO events (
                    id, event_key, title, description, event_type,
                    occurred_at, occurred_precision, year, location,
                    primary_politician_id, party_id, verification_status,
                    confidence, impact_summary, current_status, is_curated,
                    source_links_json, watch_items_json, created_at, updated_at
                ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'curated', 1.0, ?, ?, 1, ?, ?, ?, ?)
                ON CONFLICT(id) DO UPDATE SET
                    title = excluded.title,
                    description = excluded.description,
                    event_type = excluded.event_type,
                    occurred_at = excluded.occurred_at,
                    occurred_precision = excluded.occurred_precision,
                    year = excluded.year,
                    location = excluded.location,
                    primary_politician_id = excluded.primary_politician_id,
                    party_id = excluded.party_id,
                    verification_status = 'curated',
                    confidence = 1.0,
                    impact_summary = excluded.impact_summary,
                    current_status = excluded.current_status,
                    is_curated = 1,
                    source_links_json = excluded.source_links_json,
                    watch_items_json = excluded.watch_items_json,
                    updated_at = excluded.updated_at
                """,
                (
                    node["id"],
                    f"curated:{node['id']}",
                    _clean_title(node.get("title") or node.get("name") or node["id"]),
                    node.get("description") or "",
                    node.get("type") or "event",
                    occurred_at,
                    "year" if year else "unknown",
                    year,
                    node.get("location"),
                    node.get("politicianId") or node.get("primaryPoliticianId"),
                    node.get("partyId"),
                    node.get("fallout") or node.get("impactSummary") or "",
                    node.get("currentStatus"),
                    json.dumps(node.get("sourceLinks") or [], ensure_ascii=False),
                    json.dumps(node.get("watchItems") or [], ensure_ascii=False),
                    now,
                    now,
                ),
            )
        imported_links = 0
        for edge in edges:
            if edge.get("source") not in node_ids or edge.get("target") not in node_ids:
                continue
            warehouse.connection.execute(
                """
                INSERT INTO event_links (
                    source_event_id, target_event_id, relationship,
                    confidence, source
                ) VALUES (?, ?, ?, 1.0, 'curated')
                ON CONFLICT(source_event_id, target_event_id, relationship)
                DO UPDATE SET confidence = 1.0, source = 'curated'
                """,
                (
                    edge["source"],
                    edge["target"],
                    edge.get("label") or edge.get("relationship") or "related",
                ),
            )
            imported_links += 1
    return {"curated_events": len(nodes), "curated_links": imported_links}

