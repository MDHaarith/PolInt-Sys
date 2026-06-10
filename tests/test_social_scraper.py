import unittest

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
