import json

import pytest

from scripts.intelligence.snapshots import atomic_write_json, generate_snapshots
from scripts.intelligence.warehouse import IntelligenceWarehouse


def seed_warehouse(path):
    warehouse = IntelligenceWarehouse(path)
    warehouse.import_legacy_document(
        {
            "news": [
                {
                    "id": f"story-{index}",
                    "url": f"https://example.test/{index}",
                    "title": f"Story {index}",
                    "snippet": "Political report",
                    "source": "Example",
                    "publishedAtRaw": f"2026-06-{index + 1:02d}T08:00:00Z",
                }
                for index in range(3)
            ],
            "mlas": [{"id": "tn-2026-001"}],
            "rosterMeta": {"sourceType": "official_eci"},
            "dataQuality": {"ok": True},
            "coverageMeta": {"storyTarget": 100000},
            "evidence": [{"politicianId": "seeman"}],
        }
    )
    with warehouse.transaction():
        warehouse.connection.execute(
            """
            INSERT INTO events (
                id, event_key, title, description, event_type, occurred_at,
                occurred_precision, year, verification_status, confidence,
                impact_summary, is_curated, created_at, updated_at
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
            """,
            (
                "event_test",
                "test-event",
                "Test event",
                "Test description",
                "arrest",
                "2026-06-10",
                "date",
                2026,
                "reported",
                0.7,
                "",
                0,
                "2026-06-10T00:00:00Z",
                "2026-06-10T00:00:00Z",
            ),
        )
    return warehouse


def test_atomic_write_keeps_existing_file_when_validation_fails(tmp_path):
    destination = tmp_path / "snapshot.json"
    destination.write_text('{"stable":true}', encoding="utf-8")

    with pytest.raises(ValueError):
        atomic_write_json(
            destination,
            {"replacement": True},
            validator=lambda value: (_ for _ in ()).throw(ValueError("invalid")),
        )

    assert json.loads(destination.read_text(encoding="utf-8")) == {"stable": True}


def test_generate_snapshots_preserves_state_and_bounds_recent_news(tmp_path):
    warehouse = seed_warehouse(tmp_path / "intel.db")

    result = generate_snapshots(warehouse, tmp_path / "public", recent_news_limit=2)

    compatibility = json.loads((tmp_path / "public/scrapedIntel.json").read_text(encoding="utf-8"))
    fabric = json.loads((tmp_path / "public/timeFabric.json").read_text(encoding="utf-8"))
    status = json.loads((tmp_path / "public/intelStatus.json").read_text(encoding="utf-8"))

    assert len(compatibility["news"]) == 2
    assert compatibility["mlas"] == [{"id": "tn-2026-001"}]
    assert compatibility["rosterMeta"]["sourceType"] == "official_eci"
    assert compatibility["evidence"] == [{"politicianId": "seeman"}]
    assert fabric["events"][0]["id"] == "event_test"
    assert status["rawItemCount"] == 3
    assert status["eventCount"] == 1
    assert status["coverageMeta"]["storyTarget"] == 100000
    assert result["raw_items"] == 3
