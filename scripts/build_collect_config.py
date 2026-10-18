#!/usr/bin/env python3
"""Export what the phone needs to collect news itself: src/data/collectConfig.json.

    python3 scripts/build_collect_config.py

The app scrapes on refresh (src/collect/) with the same jobs and rules as the
server pipeline. Rather than copying keyword lists, names and outlet tiers into
JavaScript by hand, they are exported from the Python modules that own them;
tests/collect_parity.test.mjs checks that both sides read real headlines alike.
Rerun after changing scrape_political_intel.py, source_config.py, classify.py,
people.py or quality.py; tests/test_collect_config.py fails until you do.
"""
from __future__ import annotations

import json
import sys
from pathlib import Path

PROJECT_ROOT = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(PROJECT_ROOT))

from scripts import scrape_political_intel as legacy  # noqa: E402
from scripts.intelligence import classify, evidence, people, quality  # noqa: E402
from scripts.intelligence.source_config import NEWS_RSS_FEEDS, REGIONAL_FEED_URLS  # noqa: E402
from scripts.intelligence.warehouse import recover_json_document  # noqa: E402

OUTPUT = PROJECT_ROOT / "src/data/collectConfig.json"
PARITY = PROJECT_ROOT / "tests/fixtures/collect_parity.json"
FEEDS = PROJECT_ROOT / "tests/fixtures/collect_feeds.json"
FEED_FIELDS = ("title", "url", "source", "snippet", "category", "politicianId", "isRumor", "verificationStatus", "language", "imageUrl", "audioUrl")
# The data workflow runs 18 social queries a refresh; the phone does the same.
MAX_SOCIAL_QUERIES = 18
SOCIAL_LIMIT = 15


def config() -> dict:
    document, _ = recover_json_document(PROJECT_ROOT / "public/scrapedIntel.json")
    return {
        "jobs": {
            "googleNews": [[query, politician] for query, politician, _ in legacy.build_rss_jobs()],
            "directFeeds": [[url, name] for url, name in NEWS_RSS_FEEDS],
            "regionalFeeds": sorted(REGIONAL_FEED_URLS),
            "social": [[query, politician] for query, politician, _ in legacy.build_social_jobs(document, MAX_SOCIAL_QUERIES)],
            "socialLimit": SOCIAL_LIMIT,
        },
        "classify": {
            "categories": [
                ["social_media", list(classify.SOCIAL_MEDIA_KEYWORDS)],
                ["investigation", list(classify.INVESTIGATION_KEYWORDS)],
                ["election", list(classify.ELECTION_KEYWORDS)],
                ["policy", list(classify.POLICY_KEYWORDS)],
            ],
            "hearsay": classify._HEARSAY_PATTERN.pattern,
            "political": sorted(classify.POLITICAL_KEYWORDS, key=len, reverse=True),
            "politicalTamil": list(classify.POLITICAL_TAMIL_KEYWORDS),
            "politicalCaseSensitive": classify._CASE_SENSITIVE_POLITICAL.pattern,
            "ambiguousLowercase": sorted(classify._AMBIGUOUS_LOWERCASE),
            "tamilNadu": list(classify.TAMIL_NADU_MARKERS),
            "tamilNaduTamil": list(classify.TAMIL_NADU_TAMIL_MARKERS),
        },
        "people": {
            "aliases": people.DEFAULT_ALIASES,
            "exclusions": people._ALIAS_EXCLUSIONS,
            "legacyIds": people.LEGACY_POLITICIAN_IDS,
        },
        "quality": {
            "record": list(quality.NATIONAL_RECORD),
            "established": list(quality.REGIONAL_ESTABLISHED),
            "partisan": quality.PARTISAN_OUTLETS,
            "social": quality._SOCIAL_SOURCES.pattern,
            "tierWeight": quality.TIER_WEIGHT,
            "categoryWeight": quality.CATEGORY_WEIGHT,
        },
    }


def parity_cases(limit: int = 1500) -> dict:
    """How the Python rules read a fixed sample of real headlines and outlet names.

    Entries follow the order of collect_parity_texts.json. tests/collect_parity.test.mjs
    expects the phone's rules to read them the same; tests/test_collect_config.py
    fails when this file or collectConfig.json is out of date.
    """
    document, _ = recover_json_document(PROJECT_ROOT / "tests/fixtures/collect_parity_texts.json")
    texts = document["texts"][:limit]
    sources = document["sources"]
    return {
        "texts": [
            {
                "political": classify.is_political(text),
                "tamilNadu": classify.mentions_tamil_nadu(text),
                "category": classify.classify_category(text),
                "hearsay": classify.reports_hearsay(text),
                "politicians": people.mentioned_politicians(text),
                "relevantRegional": legacy.is_relevant(text, require_tamil_nadu=True),
                "textKey": evidence.text_key(text),
                # The text as a story's body under a fixed headline: which sentences are quotable.
                "passages": evidence.passages(evidence.Story(id="s", title="Fixed headline for the test", text=text, source="", url="", published_at="")),
            }
            for text in texts
        ],
        "sources": [{"source": source, "tier": quality.source_tier(source)} for source in sources],
    }


def feed_records() -> dict:
    """What the Python collector makes of the saved feeds in collect_feeds.json."""
    from unittest import mock

    expected = {}
    for feed in json.loads(FEEDS.read_text(encoding="utf-8"))["feeds"]:
        with mock.patch.object(legacy, "http_get", return_value=feed["xml"].encode("utf-8")), mock.patch.object(legacy.time, "sleep"):
            records = legacy.fetch_rss(feed["query"], "general", feed["sourceName"] or "Tamil Nadu Politics",
                                       feed_url=feed["feedUrl"], source_name=feed["sourceName"], raise_errors=True)
        expected[feed["name"]] = [{key: record.get(key) for key in FEED_FIELDS} for record in records]
    return expected


def main() -> None:
    OUTPUT.parent.mkdir(parents=True, exist_ok=True)
    OUTPUT.write_text(json.dumps(config(), ensure_ascii=False, indent=1) + "\n", encoding="utf-8")
    PARITY.write_text(json.dumps(parity_cases(), ensure_ascii=False) + "\n", encoding="utf-8")
    feeds = json.loads(FEEDS.read_text(encoding="utf-8"))
    FEEDS.write_text(json.dumps({**feeds, "expected": feed_records()}, ensure_ascii=False) + "\n", encoding="utf-8")
    jobs = config()["jobs"]
    print(f"{OUTPUT.relative_to(PROJECT_ROOT)}: {len(jobs['googleNews'])} Google News, "
          f"{len(jobs['directFeeds'])} direct feeds, {len(jobs['social'])} social queries")


if __name__ == "__main__":
    main()
