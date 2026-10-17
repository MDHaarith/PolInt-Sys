import pytest

from scripts.intelligence.classify import is_political
from scripts.intelligence.models import CollectedItem
from scripts.intelligence.people import resolve_politician
from scripts.intelligence.snapshots import _frontend_news
from scripts.intelligence.warehouse import IntelligenceWarehouse


def collect(warehouse, **item):
    record = {"retrievedAt": "2026-10-16T10:00:00Z", **item}
    warehouse.upsert_raw_item(CollectedItem.from_legacy(record).to_warehouse_dict())
    warehouse.connection.commit()


def test_collected_items_are_flattened_for_the_app(tmp_path):
    warehouse = IntelligenceWarehouse(tmp_path / "intel.db")
    try:
        collect(
            warehouse, id="bsky_1", title="DMK cadres protest SIR in Madurai", snippet="Long post body",
            url="https://bsky.app/profile/a/post/1", source="Bluesky @a", sourceType="bluesky_search",
            platform="bluesky", category="social_media", politicianId="general",
            publishedAtRaw="2026-10-16T09:00:00Z", engagement={"likes": 4}, isRumor=True,
            verificationStatus="unverified_chatter",
        )
        [story] = _frontend_news(warehouse, 10)
    finally:
        warehouse.close()
    assert story["id"] == "bsky_1"
    assert story["rawId"].startswith("raw_")
    assert story["url"] == "https://bsky.app/profile/a/post/1"
    assert story["snippet"] == "Long post body"
    assert story["publishedAt"] == "2026-10-16T09:00:00Z"
    assert story["engagement"] == {"likes": 4}
    assert story["isRumor"] is True
    assert "rawMetadata" not in story


def test_snapshot_drops_placeholders_off_topic_feed_items_and_syndicated_copies(tmp_path):
    warehouse = IntelligenceWarehouse(tmp_path / "intel.db")
    try:
        collect(
            warehouse, id="rain", title="Chennai sees first monsoon rain, IMD issues alerts",
            snippet="News coverage regarding Times of India from Times of India.",
            url="https://toi.test/rain", source="Times of India", sourceType="publisher_rss",
            politicianId="general", publishedAtRaw="2026-10-16T09:00:00Z",
        )
        collect(
            warehouse, id="stalin-a", title="Stalin slams TVK government over drugs",
            snippet="News coverage regarding Times of India from Times of India.",
            url="https://toi.test/stalin", source="Times of India", sourceType="publisher_rss",
            politicianId="general", publishedAtRaw="2026-10-16T08:00:00Z",
        )
        collect(
            warehouse, id="stalin-b", title="Stalin slams TVK government over drugs",
            url="https://news.google.com/rss/articles/abc", source="The Hindu",
            sourceType="google_news_rss", politicianId="general", publishedAtRaw="2026-10-16T07:00:00Z",
        )
        news = _frontend_news(warehouse, 10)
    finally:
        warehouse.close()
    assert [story["id"] for story in news] == ["stalin-a"]
    assert "snippet" not in news[0]
    assert news[0]["politicianId"] == "mk_stalin"
    assert news[0]["alsoReportedBy"] == [{"source": "The Hindu", "url": "https://news.google.com/rss/articles/abc"}]


@pytest.mark.parametrize(
    ("text", "expected"),
    [
        ("Stalin's remarks draw TVK response", "mk_stalin"),
        ("Udhayanidhi Stalin campaigns in Chepauk", "udhayanidhi_stalin"),
        ("Vijay Sethupathi film wraps shoot", None),
        ("CM Vijay flags off Metro Rail", "vijay"),
        ("EPS urges cadre unity", "edappadi_palaniswami"),
        ("Photo ops and steps for growth", None),
        ("ஸ்டாலினின் அறிக்கை", "mk_stalin"),
    ],
)
def test_politician_resolution_uses_word_boundaries(text, expected):
    assert resolve_politician(text) == expected


@pytest.mark.parametrize(
    ("text", "expected"),
    [
        ("Runaway boys rescued by railway police", False),
        ("Market entry research and field surveys across Tamil Nadu", False),
        ("DMK calls for scrapping SIR", True),
        ("தவெக நிர்வாகி கைது", True),
        ("Yes sir, the cm scale is wrong", False),
    ],
)
def test_political_relevance(text, expected):
    assert is_political(text) is expected


def test_tamil_vijay_stem_does_not_match_vijayakanth():
    assert resolve_politician("விஜயகாந்த் நினைவு நாள்") is None
    assert resolve_politician("முதல்வர் விஜய்யின் அறிவிப்பு") == "vijay"
