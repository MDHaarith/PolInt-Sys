import json
import sqlite3

import pytest

from scripts import run_intelligence_pipeline as pipeline
from scripts.intelligence.collectors.base import CollectorRunner
from scripts.intelligence.models import CollectedItem
from scripts.intelligence.warehouse import IntelligenceWarehouse
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


def test_pipeline_closes_warehouse_on_failure(tmp_path, monkeypatch):
    warehouse = IntelligenceWarehouse(tmp_path / "intel.db")
    monkeypatch.setattr(pipeline, "IntelligenceWarehouse", lambda path: warehouse)
    source = tmp_path / "invalid.json"
    source.write_text("invalid", encoding="utf-8")

    with pytest.raises(json.JSONDecodeError):
        run_pipeline(
            source=source,
            database=tmp_path / "intel.db",
            output_dir=tmp_path / "public",
            quarantine_dir=tmp_path / "quarantine",
        )

    with pytest.raises(sqlite3.ProgrammingError, match="closed"):
        warehouse.connection.execute("SELECT 1")


@pytest.mark.parametrize("absolute_paths", [False, True])
def test_cli_paths_are_resolved_from_project_root(tmp_path, monkeypatch, absolute_paths):
    project_root = tmp_path / "project"
    project_root.mkdir()
    source = project_root / "public/scrapedIntel.json"
    source.parent.mkdir()
    source.write_text('{"news":[]}', encoding="utf-8")
    monkeypatch.setattr(pipeline, "PROJECT_ROOT", project_root)
    monkeypatch.chdir(tmp_path)
    arguments = ["pipeline", "--snapshot"]
    paths = {
        "source": "public/scrapedIntel.json",
        "database": "data/intelligence.db",
        "output-dir": "public",
        "quarantine-dir": "data/quarantine",
    }
    if absolute_paths:
        for key, value in paths.items():
            arguments.extend([f"--{key}", str(project_root / value)])
    monkeypatch.setattr(pipeline.sys, "argv", arguments)
    monkeypatch.setattr(pipeline, "export_curated_payload", lambda root: {})
    calls = []
    monkeypatch.setattr(pipeline, "run_pipeline", lambda **kwargs: calls.append(kwargs) or {})

    pipeline.main()

    assert {key.replace("-", "_"): project_root / value for key, value in paths.items()}.items() <= calls[0].items()


def test_collector_failure_logs_warning_and_commits_partial_progress(tmp_path, capsys):
    class FailingCollector(FixtureCollector):
        def collect(self):
            yield from super().collect()
            raise ValueError("fixture failure")

    path = tmp_path / "intel.db"
    warehouse = IntelligenceWarehouse(path)
    try:
        result = CollectorRunner(warehouse).run([FailingCollector()])
        assert result == {"items_seen": 1, "items_added": 1, "errors": 1}
        assert capsys.readouterr().err == "[collector:fixture] failed: ValueError: fixture failure\n"
        with sqlite3.connect(path) as connection:
            assert connection.execute("SELECT status, items_added, errors FROM crawl_runs").fetchone() == ("failed", 1, 1)
            assert connection.execute("SELECT error_type, message FROM crawl_failures").fetchone() == ("ValueError", "fixture failure")
            assert connection.execute("SELECT COUNT(*) FROM raw_items").fetchone()[0] == 1
    finally:
        warehouse.close()
