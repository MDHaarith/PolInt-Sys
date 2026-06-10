import json
import sqlite3

import pytest

from scripts.intelligence.warehouse import (
    IntelligenceWarehouse,
    recover_json_document,
)


def test_recover_json_document_returns_first_object_and_trailing_bytes(tmp_path):
    source = tmp_path / "scrapedIntel.json"
    source.write_text('{"news":[{"id":"n1"}],"mlas":[{"id":"m1"}]} trailing', encoding="utf-8")

    document, trailing = recover_json_document(source)

    assert document["news"][0]["id"] == "n1"
    assert document["mlas"][0]["id"] == "m1"
    assert trailing == " trailing"


def test_schema_contains_evidence_and_event_tables(tmp_path):
    warehouse = IntelligenceWarehouse(tmp_path / "intel.db")

    tables = {
        row[0]
        for row in warehouse.connection.execute(
            "SELECT name FROM sqlite_master WHERE type = 'table'"
        )
    }

    assert {
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
    }.issubset(tables)


def test_import_legacy_document_is_idempotent_and_preserves_app_state(tmp_path):
    warehouse = IntelligenceWarehouse(tmp_path / "intel.db")
    document = {
        "news": [
            {
                "id": "story-1",
                "url": "https://example.test/story",
                "title": "Seeman detained during protest",
                "snippet": "Police detained the NTK leader during a demonstration.",
                "source": "Example News",
                "date": "June 1, 2026",
                "politicianId": "seeman",
                "category": "news",
                "sourceType": "google_news_rss",
                "verificationStatus": "source_reported",
            }
        ],
        "mlas": [{"id": "tn-2026-001", "politicianId": "mla-one"}],
        "rosterMeta": {"sourceType": "official_eci"},
        "dataQuality": {"removedGeneratedDeadLinks": 32141},
        "coverageMeta": {"storyTarget": 100000},
        "evidence": [{"politicianId": "seeman", "affidavitUrl": ""}],
    }

    first = warehouse.import_legacy_document(document)
    second = warehouse.import_legacy_document(document)

    assert first["raw_items_added"] == 1
    assert second["raw_items_added"] == 0
    assert warehouse.count("raw_items") == 1
    assert warehouse.get_state("mlas") == document["mlas"]
    assert warehouse.get_state("rosterMeta") == document["rosterMeta"]
    assert warehouse.get_state("dataQuality") == document["dataQuality"]
    assert warehouse.get_state("coverageMeta") == document["coverageMeta"]
    assert warehouse.get_state("evidence") == document["evidence"]


def test_failed_transaction_rolls_back(tmp_path):
    warehouse = IntelligenceWarehouse(tmp_path / "intel.db")

    with pytest.raises(sqlite3.IntegrityError):
        with warehouse.transaction():
            warehouse.connection.execute(
                "INSERT INTO sources (id, name, source_type, created_at, updated_at) VALUES (?, ?, ?, ?, ?)",
                ("source-1", "Example", "news", "2026-06-11T00:00:00Z", "2026-06-11T00:00:00Z"),
            )
            warehouse.connection.execute(
                "INSERT INTO sources (id, name, source_type, created_at, updated_at) VALUES (?, ?, ?, ?, ?)",
                ("source-1", "Duplicate", "news", "2026-06-11T00:00:00Z", "2026-06-11T00:00:00Z"),
            )

    assert warehouse.count("sources") == 0


def test_state_values_are_stored_as_json(tmp_path):
    warehouse = IntelligenceWarehouse(tmp_path / "intel.db")
    warehouse.set_state("sample", {"nested": [1, 2, 3]})

    raw = warehouse.connection.execute(
        "SELECT value_json FROM app_state WHERE key = 'sample'"
    ).fetchone()[0]

    assert json.loads(raw) == {"nested": [1, 2, 3]}
