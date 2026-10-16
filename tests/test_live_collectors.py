import urllib.parse

import pytest

from scripts import scrape_political_intel as legacy
from scripts.intelligence.collectors.base import CollectorRunner
from scripts.intelligence.collectors.bluesky import BlueskyCollector
from scripts.intelligence.collectors.reddit import RedditCollector
from scripts.intelligence.collectors.rss import RssCollector
from scripts.intelligence.warehouse import IntelligenceWarehouse
from scripts.run_intelligence_pipeline import build_default_collectors


def test_recent_jobs_prioritize_broad_bilingual_search_and_cover_every_politician():
    jobs = legacy.build_rss_jobs()
    assert jobs[0][0] == "Tamil Nadu politics when:7d"
    assert jobs[1][0] == "தமிழ்நாடு அரசியல் when:7d"
    assert all(query.endswith(" when:7d") for query, _, _ in jobs)
    assert set(legacy.POLITICIANS) <= {politician_id for _, politician_id, _ in jobs}
    assert len(jobs) == len(set(jobs))
    assert legacy.build_social_jobs({}, 1) == [("Tamil Nadu", "general", "Tamil Nadu Politics")]


def test_google_rss_uses_tamil_edition_for_tamil_searches(monkeypatch):
    urls = []
    monkeypatch.setattr(legacy, "http_get", lambda url: urls.append(url) or b"<rss/>")
    monkeypatch.setattr(legacy.time, "sleep", lambda _: None)
    legacy.fetch_rss("தமிழ்நாடு அரசியல் when:7d", "general", "Politics")
    params = urllib.parse.parse_qs(urllib.parse.urlsplit(urls[0]).query)
    assert params == {"q": ["தமிழ்நாடு அரசியல் when:7d"], "hl": ["ta"], "gl": ["IN"], "ceid": ["IN:ta"]}


def test_publisher_rss_keeps_full_title_and_source_without_source_element(monkeypatch):
    xml = b"""<rss><channel><item><title>Cabinet meets - new welfare policy</title>
    <link>https://example.test/policy</link><pubDate>Fri, 16 Oct 2026 12:00:00 GMT</pubDate>
    </item><item><title>Unsafe URL</title><link>javascript:alert(1)</link></item></channel></rss>"""
    monkeypatch.setattr(legacy, "http_get", lambda url: xml)
    monkeypatch.setattr(legacy.time, "sleep", lambda _: None)
    items = legacy.fetch_direct_rss("https://example.test/feed", "general", "Example News")
    assert len(items) == 1
    assert items[0]["title"] == "Cabinet meets - new welfare policy"
    assert items[0]["source"] == "Example News"
    assert items[0]["sourceType"] == "publisher_rss"


def test_bluesky_uses_working_host_and_does_not_exclude_tamil_posts(monkeypatch):
    urls = []
    monkeypatch.setattr(legacy, "load_json_url", lambda url: urls.append(url) or {"posts": []})
    monkeypatch.setattr(legacy.time, "sleep", lambda _: None)
    legacy.fetch_bluesky("தமிழ்நாடு", "general", "Politics", raise_errors=True)
    url = urllib.parse.urlsplit(urls[0])
    assert url.hostname == "api.bsky.app"
    assert "lang" not in urllib.parse.parse_qs(url.query)
    assert urllib.parse.parse_qs(url.query)["sort"] == ["latest"]


@pytest.mark.parametrize("fetcher", [legacy.fetch_rss, legacy.fetch_bluesky, legacy.fetch_reddit])
def test_pipeline_fetchers_propagate_http_errors_for_health_reporting(monkeypatch, fetcher):
    def blocked(*args, **kwargs):
        raise RuntimeError("HTTP 403")

    monkeypatch.setattr(legacy, "http_get", blocked)
    monkeypatch.setattr(legacy, "load_json_url", blocked)
    with pytest.raises(RuntimeError, match="HTTP 403"):
        fetcher("politics", "general", "Politics", raise_errors=True)


@pytest.mark.parametrize("collector_type", [RssCollector, RedditCollector, BlueskyCollector])
def test_all_failed_jobs_are_unavailable_and_counted_in_run(tmp_path, collector_type):
    def blocked(*args):
        raise RuntimeError("HTTP 403")

    collector = collector_type([("politics", "general", "Politics")], blocked)
    warehouse = IntelligenceWarehouse(tmp_path / "intel.db")
    try:
        result = CollectorRunner(warehouse).run([collector])
        assert result == {"items_seen": 0, "items_added": 0, "errors": 1}
        assert collector.health["status"] == "unavailable"
        assert collector.health["reason"] == "RuntimeError: HTTP 403"
    finally:
        warehouse.close()


def test_headless_collector_selection_keeps_recent_jobs_and_verified_direct_feeds():
    collectors = build_default_collectors(
        {}, max_rss_queries=2, max_social_queries=1, social_limit=3,
        include_extended_public=False, collector_names=["rss", "rss_direct", "bluesky"],
    )
    assert [collector.name for collector in collectors] == ["rss", "rss_direct", "bluesky"]
    assert len(collectors[0].jobs) == 2
    assert len(collectors[1].jobs) == 4
    assert all(url.startswith("https://") for url, _, _ in collectors[1].jobs)


@pytest.mark.parametrize("collector_type", [RssCollector, RedditCollector, BlueskyCollector])
def test_successful_empty_search_is_distinguished_from_endpoint_failure(collector_type):
    collector = collector_type([("politics", "general", "Politics")], lambda *args: [])
    assert list(collector.collect()) == []
    assert collector.health["status"] == "no_results"
    assert collector.health["empty_jobs"] == 1
    assert collector.health["failed_jobs"] == 0
