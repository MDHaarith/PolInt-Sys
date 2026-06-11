import json

from scripts.intelligence.models import CollectedItem
from scripts.run_intelligence_pipeline import run_pipeline


class FixtureCollector:
    name = "fixture"
    health = {"status": "ready"}

    def collect(self):
        yield CollectedItem(
            canonical_url="https://fixture.test/seeman",
            collector="fixture",
            source_name="Fixture News",
            source_type="news",
            platform=None,
            external_id="fixture-1",
            title="Police arrest Seeman after protest",
            body="Police arrested Seeman after a protest in Chennai.",
            author_name="Reporter",
            published_at="2026-06-10",
            retrieved_at="2026-06-11T00:00:00Z",
            politician_id="seeman",
            category="news",
            verification_status="source_reported",
            raw_metadata={},
        )


def test_pipeline_migrates_collects_extracts_and_snapshots(tmp_path):
    source = tmp_path / "scrapedIntel.json"
    source.write_text(
        json.dumps(
            {
                "news": [],
                "evidence": [],
                "mlas": [{"id": f"mla-{index}"} for index in range(234)],
                "rosterMeta": {"sourceType": "official_eci"},
                "dataQuality": {},
                "coverageMeta": {"storyTarget": 100000},
            }
        ),
        encoding="utf-8",
    )
    curated = {
        "nodes": [
            {
                "id": "event_curated",
                "title": "1965: Curated Event",
                "year": 1965,
                "description": "Existing event",
                "fallout": "Existing impact",
                "type": "event",
            }
        ],
        "edges": [],
    }

    result = run_pipeline(
        source=source,
        database=tmp_path / "intelligence.db",
        output_dir=tmp_path / "public",
        quarantine_dir=tmp_path / "quarantine",
        collectors=[FixtureCollector()],
        curated_payload=curated,
        migrate_existing=True,
        collect=True,
        extract_events=True,
        snapshot=True,
    )

    fabric = json.loads((tmp_path / "public/timeFabric.json").read_text(encoding="utf-8"))
    compatibility = json.loads((tmp_path / "public/scrapedIntel.json").read_text(encoding="utf-8"))

    assert result["collection"]["items_added"] == 1
    assert result["events"]["event_total"] == 2
    assert len(compatibility["mlas"]) == 234
    assert {event["id"] for event in fabric["events"]} == {
        "event_curated",
        next(event["id"] for event in fabric["events"] if not event["is_curated"]),
    }
