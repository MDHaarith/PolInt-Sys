from scripts.intelligence.collectors.base import CollectorRunner
from scripts.intelligence.collectors.rss import RssCollector
from scripts.intelligence.models import CollectedItem
from scripts.intelligence.warehouse import IntelligenceWarehouse


def test_collected_item_preserves_existing_legacy_fields():
    item = CollectedItem.from_legacy(
        {
            "id": "legacy-1",
            "url": "https://example.test/story",
            "title": "Karunanidhi arrested",
            "snippet": "Police arrested the former chief minister.",
            "source": "Example News",
            "sourceType": "google_news_rss",
            "politicianId": "m_karunanidhi",
            "verificationStatus": "source_reported",
        }
    )

    normalized = item.to_warehouse_dict()

    assert normalized["externalId"] == "legacy-1"
    assert normalized["canonicalUrl"] == "https://example.test/story"
    assert normalized["body"] == "Police arrested the former chief minister."
    assert normalized["politicianId"] == "m_karunanidhi"
    assert normalized["collector"] == "google_news_rss"


def test_rss_adapter_normalizes_existing_fetcher_output():
    collector = RssCollector(
        jobs=[("Karunanidhi arrest", "m_karunanidhi", "M. Karunanidhi")],
        fetcher=lambda query, politician_id, name: [
            {
                "id": "rss-1",
                "url": "https://example.test/arrest",
                "title": "Karunanidhi arrested in Chennai",
                "snippet": "Police action was reported.",
                "source": "Example",
                "sourceType": "google_news_rss",
                "politicianId": politician_id,
            }
        ],
    )

    items = list(collector.collect())

    assert len(items) == 1
    assert items[0].collector == "google_news_rss"
    assert items[0].politician_id == "m_karunanidhi"


def test_collector_runner_records_failure_without_blocking_other_collectors(tmp_path):
    warehouse = IntelligenceWarehouse(tmp_path / "intel.db")

    class BrokenCollector:
        name = "broken"

        def collect(self):
            raise RuntimeError("blocked")

    class WorkingCollector:
        name = "working"

        def collect(self):
            yield CollectedItem(
                canonical_url="https://example.test/working",
                collector="working",
                source_name="Example",
                source_type="news",
                platform=None,
                external_id="working-1",
                title="Working story",
                body="Evidence",
                author_name=None,
                published_at="2026-06-11",
                retrieved_at="2026-06-11T00:00:00Z",
                politician_id=None,
                category="news",
                verification_status="source_reported",
                raw_metadata={},
            )

    result = CollectorRunner(warehouse).run([BrokenCollector(), WorkingCollector()])

    assert result["items_added"] == 1
    assert result["errors"] == 1
    assert warehouse.count("raw_items") == 1
    assert warehouse.count("crawl_failures") == 1


def test_duplicate_url_with_new_external_id_does_not_fail_collector(tmp_path):
    warehouse = IntelligenceWarehouse(tmp_path / "intel.db")
    first = CollectedItem.from_legacy(
        {
            "id": "old-id",
            "url": "https://example.test/same-story",
            "title": "Same story",
            "source": "Example",
        }
    )
    second = CollectedItem.from_legacy(
        {
            "id": "new-id",
            "url": "https://example.test/same-story",
            "title": "Same story republished",
            "source": "Example",
        }
    )

    assert warehouse.upsert_raw_item(first.to_warehouse_dict()) is True
    assert warehouse.upsert_raw_item(second.to_warehouse_dict()) is False
    assert warehouse.count("raw_items") == 1
