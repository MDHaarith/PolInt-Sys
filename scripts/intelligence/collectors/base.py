from __future__ import annotations

import json
import uuid

from ..models import now_utc_iso


class CollectorRunner:
    def __init__(self, warehouse):
        self.warehouse = warehouse

    def run(self, collectors) -> dict:
        totals = {"items_seen": 0, "items_added": 0, "errors": 0}
        for collector in collectors:
            run_id = f"crawl_{uuid.uuid4().hex}"
            started_at = now_utc_iso()
            self.warehouse.connection.execute(
                """
                INSERT INTO crawl_runs (id, collector, started_at, status)
                VALUES (?, ?, ?, 'running')
                """,
                (run_id, collector.name, started_at),
            )
            seen = 0
            added = 0
            errors = 0
            try:
                for item in collector.collect():
                    seen += 1
                    if self.warehouse.upsert_raw_item(item.to_warehouse_dict()):
                        added += 1
                status = "completed"
            except Exception as exc:
                errors = 1
                status = "failed"
                self.warehouse.connection.execute(
                    """
                    INSERT INTO crawl_failures (
                        crawl_run_id, collector, error_type, message,
                        retryable, occurred_at
                    ) VALUES (?, ?, ?, ?, 1, ?)
                    """,
                    (
                        run_id,
                        collector.name,
                        type(exc).__name__,
                        str(exc),
                        now_utc_iso(),
                    ),
                )
            self.warehouse.connection.execute(
                """
                UPDATE crawl_runs SET completed_at = ?, status = ?,
                    items_seen = ?, items_added = ?, errors = ?, details_json = ?
                WHERE id = ?
                """,
                (
                    now_utc_iso(),
                    status,
                    seen,
                    added,
                    errors,
                    json.dumps(getattr(collector, "health", {})),
                    run_id,
                ),
            )
            self.warehouse.connection.commit()
            totals["items_seen"] += seen
            totals["items_added"] += added
            totals["errors"] += errors
        return totals

