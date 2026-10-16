from __future__ import annotations

import json
import sqlite3

import pytest

from scripts.intelligence.events import normalize_date
from scripts.intelligence.models import to_sortable_timestamp
from scripts.intelligence.schema import SCHEMA_SQL
from scripts.intelligence.snapshots import _legacy_news
from scripts.intelligence.warehouse import IntelligenceWarehouse


@pytest.mark.parametrize(
    ("value", "expected"),
    [
        ("Tue, 14 Oct 2026 07:00:00 GMT", "2026-10-14T07:00:00Z"),
        ("Wed, 14 Oct 2026 02:00:00 +0530", "2026-10-13T20:30:00Z"),
        ("2026-10-14T07:00:00Z", "2026-10-14T07:00:00Z"),
        ("2026-10-14T07:00:00+05:30", "2026-10-14T01:30:00Z"),
        ("2026-10-14T07:00:00", "2026-10-14T07:00:00Z"),
        ("October 14, 2026", "2026-10-14"),
        ("Oct 14, 2026", "2026-10-14"),
        ("2026-10-14", "2026-10-14"),
        ("2025-03", "2025-03"),
        ("2025", "2025"),
        ("garbage", None),
        ("2025-99-99", None),
        ("", None),
        ("   ", None),
        (None, None),
    ],
)
def test_sortable_timestamp(value, expected):
    assert to_sortable_timestamp(value) == expected


@pytest.mark.parametrize(
    ("value", "expected"),
    [
        ("2026-10-14T07:00:00Z", ("2026-10-14", "date", 2026)),
        ("2026-10-14", ("2026-10-14", "date", 2026)),
        ("2025-03", ("2025-03", "month", 2025)),
        ("2025", ("2025", "year", 2025)),
        (None, (None, "unknown", None)),
    ],
)
def test_event_date_accepts_sortable_timestamps(value, expected):
    assert normalize_date(value) == expected


def test_upsert_normalizes_dates_and_snapshots_preserve_raw_items(tmp_path):
    warehouse = IntelligenceWarehouse(tmp_path / "intel.db")
    items = [
        {"id": "wednesday", "publishedAtRaw": "Wed, 14 Oct 2026 07:00:00 GMT"},
        {"id": "friday", "publishedAtRaw": "Fri, 16 Oct 2026 07:00:00 GMT"},
        {"id": "invalid", "date": "garbage", "retrievedAt": "2026-10-15T00:00:00Z"},
        {"id": "display", "date": "October 13, 2026"},
        {"id": "iso", "publishedAt": "2026-10-16T08:00:00+01:00"},
    ]
    try:
        for item in items:
            assert warehouse.upsert_raw_item(item)
        dates = {
            row["external_id"]: row["published_at"]
            for row in warehouse.connection.execute("SELECT * FROM raw_items")
        }
        assert dates == {
            "wednesday": "2026-10-14T07:00:00Z",
            "friday": "2026-10-16T07:00:00Z",
            "invalid": None,
            "display": "2026-10-13",
            "iso": "2026-10-16T07:00:00Z",
        }
        news = _legacy_news(warehouse, 10)
        assert {item["id"]: item for item in news} == {item["id"]: item for item in items}
        assert {item["id"] for item in news[:2]} == {"iso", "friday"}
        assert [item["id"] for item in news[2:]] == ["wednesday", "display", "invalid"]
        assert {item["id"] for item in _legacy_news(warehouse, 2)} == {"iso", "friday"}
    finally:
        warehouse.close()


@pytest.mark.parametrize(
    ("value", "expected"),
    [
        ("Tue, 14 Oct 2026 07:00:00 GMT", "2026-10-14T07:00:00Z"),
        ("October 14, 2026", "2026-10-14"),
        ("2026-10-14T07:00:00+05:30", "2026-10-14T01:30:00Z"),
        ("2025-03", "2025-03"),
        ("2025", "2025"),
        ("garbage", None),
    ],
)
def test_existing_dates_are_backfilled_once_without_changing_other_columns(tmp_path, value, expected):
    path = tmp_path / "intel.db"
    with sqlite3.connect(path) as connection:
        connection.row_factory = sqlite3.Row
        connection.executescript(SCHEMA_SQL)
        connection.execute(
            "INSERT INTO sources (id, name, source_type, created_at, updated_at) VALUES ('s', 'News', 'news', '2026', '2026')"
        )
        connection.execute(
            """
            INSERT INTO raw_items (
                id, source_id, collector, external_id, title, published_at,
                retrieved_at, content_hash, raw_metadata_json, first_seen_at, last_seen_at
            ) VALUES ('old-id', 's', 'news', 'old-id', 'Story', ?, '2026-10-16T00:00:00Z',
                      'hash', ?, '2026', '2026')
            """,
            (value, json.dumps({"publishedAtRaw": value})),
        )
        before = dict(connection.execute("SELECT * FROM raw_items").fetchone())
    for _ in range(2):
        warehouse = IntelligenceWarehouse(path)
        try:
            after = dict(warehouse.connection.execute("SELECT * FROM raw_items").fetchone())
            assert after == {**before, "published_at": expected}
            assert warehouse.connection.execute(
                "SELECT value FROM schema_meta WHERE key = 'sortable_published_at'"
            ).fetchone()[0] == "2"
        finally:
            warehouse.close()


@pytest.mark.parametrize("old_date", [None, "2020-01-01"])
def test_duplicate_date_corrections_update_the_sql_sort_date(tmp_path, old_date):
    warehouse = IntelligenceWarehouse(tmp_path / "intel.db")
    try:
        story = {"id": "revised", "url": "https://example.test/revised", "publishedAtRaw": old_date}
        assert warehouse.upsert_raw_item(story)
        assert warehouse.upsert_raw_item({"id": "older", "publishedAtRaw": "2026-10-15"})
        revised = {**story, "publishedAtRaw": "Fri, 16 Oct 2026 07:00:00 GMT"}
        assert warehouse.upsert_raw_item(revised) is False
        assert _legacy_news(warehouse, 1) == [revised]
        assert warehouse.count("raw_items") == 2
    finally:
        warehouse.close()


def test_existing_warehouse_repairs_dates_revised_after_old_normalization(tmp_path):
    path = tmp_path / "intel.db"
    warehouse = IntelligenceWarehouse(path)
    story = {"id": "revised", "publishedAtRaw": "Fri, 16 Oct 2026 07:00:00 GMT"}
    warehouse.upsert_raw_item(story)
    warehouse.connection.execute("UPDATE raw_items SET published_at = '2020-01-01'")
    warehouse.connection.execute("UPDATE schema_meta SET value = '1' WHERE key = 'sortable_published_at'")
    warehouse.connection.commit()
    warehouse.close()

    repaired = IntelligenceWarehouse(path)
    try:
        assert repaired.connection.execute("SELECT published_at FROM raw_items").fetchone()[0] == "2026-10-16T07:00:00Z"
        assert _legacy_news(repaired, 1) == [story]
    finally:
        repaired.close()
