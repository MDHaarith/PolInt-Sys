import unittest

from scripts import scrape_political_intel as legacy
from scripts.scrape_political_intel import (
    bluesky_post_url,
    build_social_jobs,
    detect_unverified_signal,
    iso_to_display_date,
)


class SocialScraperTest(unittest.TestCase):
    def test_detect_unverified_signal_flags_social_and_rumor_terms(self):
        self.assertTrue(detect_unverified_signal("Viral X post claims a cabinet leak"))
        self.assertTrue(detect_unverified_signal("Tamil Nadu political rumour spreads online"))
        self.assertFalse(detect_unverified_signal("Official cabinet order was published today"))

    def test_bluesky_post_url_uses_author_handle_and_post_id(self):
        post = {
            "uri": "at://did:plc:abc/app.bsky.feed.post/3kxabc123",
            "author": {"handle": "example.bsky.social"},
        }
        self.assertEqual(
            bluesky_post_url(post),
            "https://bsky.app/profile/example.bsky.social/post/3kxabc123",
        )

    def test_iso_to_display_date_formats_public_post_dates(self):
        self.assertEqual(iso_to_display_date("2026-06-10T08:30:00Z"), "June 10, 2026")

    def test_build_social_jobs_adds_current_mla_queries_and_respects_cap(self):
        db = {
            "mlas": [
                {
                    "candidateName": "K V Vijay Damu",
                    "constituency": "ROYAPURAM",
                    "politicianId": "tn_2026_017_k_v_vijay_damu",
                }
            ]
        }
        jobs = build_social_jobs(db, max_queries=500)
        self.assertIn(
            ('"K V Vijay Damu" "ROYAPURAM" MLA Tamil Nadu', "tn_2026_017_k_v_vijay_damu", "K V Vijay Damu"),
            jobs,
        )
        self.assertLessEqual(len(build_social_jobs(db, max_queries=3)), 3)


if __name__ == "__main__":
    unittest.main()


def test_rss_preserves_raw_date_uses_classifier_and_keeps_partial_results(monkeypatch, capsys):
    xml = b"""<rss><channel><item>
        <title>Stanley first govt medical college - Example</title>
        <link>https://example.test/story</link>
        <pubDate>Wed, 10 Jun 2026 08:30:00 GMT</pubDate>
        <description>Medical college gets new seats</description><source>Example</source>
        </item><item><title/></item></channel></rss>"""
    monkeypatch.setattr(legacy, "http_get", lambda url: xml)
    monkeypatch.setattr(legacy.time, "sleep", lambda delay: None)
    monkeypatch.setattr(legacy, "stats", {"fetched": 0, "errors": 0, "queries_done": 0, "total_queries": 1})

    items = legacy.fetch_rss("Tamil Nadu", "general", "Politics")

    assert len(items) == 1
    assert items[0]["category"] == "news"
    assert items[0]["publishedAtRaw"] == "Wed, 10 Jun 2026 08:30:00 GMT"
    assert legacy.stats["errors"] == 1
    assert legacy.stats["queries_done"] == 1
    assert "[rss] 'Tamil Nadu': TypeError:" in capsys.readouterr().err


def test_social_fetcher_errors_are_logged_and_return_empty(monkeypatch, capsys):
    def blocked(*args, **kwargs):
        raise RuntimeError("offline")

    monkeypatch.setattr(legacy, "load_json_url", blocked)
    monkeypatch.setattr(legacy.time, "sleep", lambda delay: None)
    monkeypatch.setattr(legacy, "stats", {"errors": 0})

    assert legacy.fetch_bluesky("Politics", "general", "Politics") == []
    assert legacy.fetch_reddit("Politics", "general", "Politics") == []
    errors = capsys.readouterr().err.splitlines()
    assert len(errors) == 3
    assert errors[0] == "[bluesky] 'Politics': RuntimeError: offline"
    assert errors[1] == "[reddit:pullpush] 'Politics': RuntimeError: offline"
    assert errors[2] == "[reddit] 'Politics': RuntimeError: offline"
    assert legacy.stats["errors"] == 2
