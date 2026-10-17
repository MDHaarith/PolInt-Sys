import json

import pytest

from scripts.intelligence.models import CollectedItem
from scripts.intelligence.people import resolve_politician
from scripts.intelligence.quality import source_tier, story_importance
from scripts.intelligence.snapshots import _frontend_news, generate_snapshots
from scripts.intelligence.storylines import build_storylines, classify_action, read_move
from scripts.intelligence.warehouse import IntelligenceWarehouse


def collect(warehouse, **item):
    record = {"retrievedAt": "2026-10-16T10:00:00Z", "sourceType": "google_news_rss", **item}
    warehouse.upsert_raw_item(CollectedItem.from_legacy(record).to_warehouse_dict())
    warehouse.connection.commit()


@pytest.mark.parametrize(
    ("source", "tier"),
    [
        ("The Hindu", "record"),
        ("Dinamani", "established"),
        ("Kalaignar Seithigal", "partisan"),
        ("Lokal Tamil", "aggregator"),
        ("x.com", "social"),
        ("Reddit r/TamilNaduDiscussion", "social"),
    ],
)
def test_sources_are_tiered_by_reputation(source, tier):
    assert source_tier(source) == tier


def test_corroborated_reporting_from_record_outlets_ranks_highest():
    lone_blog = story_importance({"source": "Lokal Tamil", "category": "news"})
    lone_paper = story_importance({"source": "The Hindu", "category": "news"})
    corroborated = story_importance({
        "source": "The Hindu", "category": "investigation", "politicianId": "vijay", "outletCount": 5,
        "alsoReportedBy": [{"source": "DT Next"}, {"source": "NDTV"}],
    })
    rumour = story_importance({"source": "The Hindu", "category": "news", "isRumor": True})
    assert lone_blog < lone_paper < corroborated <= 100
    assert rumour < lone_paper


def test_reworded_copies_merge_under_the_best_sourced_report(tmp_path):
    warehouse = IntelligenceWarehouse(tmp_path / "intel.db")
    try:
        collect(
            warehouse, id="blog", title="Palaniswami accuses TVK govt of power purchase scam worth crores",
            url="https://blog.test/a", source="Lokal Tamil", publishedAtRaw="2026-10-16T09:00:00Z",
        )
        collect(
            warehouse, id="paper", title="Palaniswami accuses TVK government of power purchase scam",
            snippet="AIADMK general secretary Edappadi K. Palaniswami alleged the government bought power at inflated rates.",
            url="https://hindu.test/a", source="The Hindu", publishedAtRaw="2026-10-16T07:00:00Z",
        )
        collect(
            warehouse, id="other", title="Palaniswami inaugurates party office in Salem",
            url="https://paper.test/b", source="Dinamani", publishedAtRaw="2026-10-16T06:00:00Z",
        )
        news = _frontend_news(warehouse, 10)
    finally:
        warehouse.close()
    assert [story["id"] for story in news] == ["paper", "other"]
    lead = news[0]
    assert lead["outletCount"] == 2
    assert lead["alsoReportedBy"] == [{"source": "Lokal Tamil", "url": "https://blog.test/a"}]
    assert lead["sourceTier"] == "record"
    assert lead["importance"] > news[1]["importance"]


@pytest.mark.parametrize(
    ("title", "actor", "action", "intent"),
    [
        ("Stalin slams TVK govt on Periyar Arivulagam", "mk_stalin", "attack", "Erode the ruling party's standing"),
        ("Tamil Nadu CM Vijay urges PM Modi to sanction Metro Rail", "vijay", "demand", "Press the Centre on Tamil Nadu's behalf"),
        ("CM Vijay inaugurates Periyar knowledge centre in Coimbatore", "vijay", "deliver", "Deliver and claim credit"),
        ("‘We don’t need your lessons’: DMK hits back at Rahul Gandhi", "party:dmk", "rebut", "Contain damage and reframe the charge"),
        ("DMK demands Vijay's resignation over drug haul", "party:dmk", "demand", "Set the agenda for the government"),
        ("Price rise is the government's failure: Stalin", "mk_stalin", None, None),
        ("“இது மெகா ஊழல்” - மின்சார கொள்முதல் குறித்து எடப்பாடி பழனிசாமி விமர்சனம்", "edappadi_palaniswami", "attack", "Hold the government to account"),
        ("திட்டங்களில் ஊழல் - ஸ்டாலினைச் சாடும் ஆதவ் அர்ஜுனா", "aadhav_arjuna", "attack", "Discredit the government's critics"),
        ("சண்முகத்தின் ஆதரவாளர்கள் 100 பேர் நீக்கம் – எடப்பாடி பழனிசாமி உத்தரவு", "edappadi_palaniswami", "purge", "Purge dissent and consolidate control"),
        ("'Breaking Bad Party': DMK president M K Stalin flays TVK over meth bust", "mk_stalin", "attack", "Erode the ruling party's standing"),
        ("DMK's Stalin calls TVK \"Breaking Bad\" party following functionary's arrest", "mk_stalin", "attack", "Erode the ruling party's standing"),
        ("DMK moves Supreme Court against SIR exercise", "party:dmk", "litigate", "Take the fight with the Centre to court"),
        ("அதிமுக சுயபரிசோதனை செய்ய வேண்டும் - அன்புமணி", "anbumani_ramadoss", "demand", "Set the agenda for the government"),
    ],
)
def test_moves_read_actor_action_and_intent(title, actor, action, intent):
    move = read_move({"title": title})
    if action is None:
        assert move is None or move["actor"] == actor
        return
    assert (move["actor"], move["action"], move["intent"]) == (actor, action, intent)
    assert move["signals"]


def test_tamil_headlines_take_the_closing_verb():
    assert classify_action("பதவி விலகல் கோரிக்கையை கண்டு மோடி அஞ்சுகிறார் - திருமாவளவன் விமர்சனம்") == "attack"
    assert classify_action("Minister resigns after demand for resignation") == "resign"
    assert classify_action("DMK demands minister's resignation") == "demand"


def test_headline_subject_beats_the_longest_name():
    assert resolve_politician("EPS slams Stalin over power cuts") == "edappadi_palaniswami"
    assert resolve_politician("Union minister Murugan resigns") == "l_murugan"
    assert resolve_politician("Devotees throng Murugan temple") is None


def story(story_id, title, date, source="The Hindu", **extra):
    return {
        "id": story_id, "rawId": f"raw_{story_id}", "title": title, "publishedAt": date,
        "source": source, "sourceTier": source_tier(source), "importance": 40, "url": f"https://x.test/{story_id}",
        **extra,
    }


def test_storylines_chain_moves_on_one_issue_and_read_each_politician():
    news = [
        story("a", "Palaniswami alleges power purchase scam by TVK government", "2026-10-10T08:00:00Z"),
        story("b", "Minister denies power purchase scam charge by Palaniswami", "2026-10-11T08:00:00Z", source="DT Next"),
        story("c", "AIADMK cadres protest power purchase scam across districts", "2026-10-12T08:00:00Z"),
        story("d", "Stalin slams TVK government over power purchase scam", "2026-10-13T08:00:00Z"),
        story("e", "CM Vijay inaugurates Periyar knowledge centre in Coimbatore", "2026-10-13T09:00:00Z"),
        story("f", "Rumour mill on X", "2026-10-13T10:00:00Z", source="x.com"),
    ]
    # Linking weighs words by rarity, so the issue needs a realistic corpus around it.
    places = ["Ariyalur", "Karur", "Namakkal", "Theni", "Dindigul", "Sivaganga", "Ramanathapuram",
              "Virudhunagar", "Tenkasi", "Nilgiris", "Krishnagiri", "Dharmapuri", "Perambalur",
              "Pudukkottai", "Nagapattinam", "Tiruvarur", "Mayiladuthurai", "Cuddalore", "Villupuram",
              "Kallakurichi", "Ranipet", "Tirupattur", "Tiruvannamalai", "Kancheepuram", "Chengalpattu"]
    pairs = [(left, right) for left in places for right in places if left < right][:150]
    news += [
        story(f"filler{index}", f"Kanimozhi visits {left} and {right} weavers", f"2026-10-0{1 + index % 9}T08:00:00Z")
        for index, (left, right) in enumerate(pairs)
    ]
    result = build_storylines(news, "2026-10-14T00:00:00Z")

    [thread] = result["threads"]
    assert [step["storyId"] for step in thread["steps"]] == ["raw_a", "raw_c", "raw_d"] or [
        step["storyId"] for step in thread["steps"]
    ] == ["raw_a", "raw_b", "raw_c", "raw_d"]
    assert {p["id"] for p in thread["participants"]} >= {"edappadi_palaniswami", "mk_stalin"}
    assert thread["analysis"] and thread["watchFor"]
    assert thread["momentum"] in {"active", "escalating"}

    eps = result["people"]["edappadi_palaniswami"]
    assert eps["posture"] == "offence"
    assert {"id": "tvk", "name": "TVK", "count": 1} in eps["targets"]
    assert eps["moves"][0]["threadId"] == thread["id"]
    vijay = result["people"]["vijay"]
    assert vijay["moves"][0]["intent"] == "Deliver and claim credit"
    assert all(step["source"] != "x.com" for step in thread["steps"])


def test_snapshot_publishes_storylines(tmp_path):
    warehouse = IntelligenceWarehouse(tmp_path / "intel.db")
    try:
        collect(
            warehouse, id="a", title="Stalin slams TVK government over price rise",
            url="https://hindu.test/a", source="The Hindu", publishedAtRaw="2026-10-16T07:00:00Z",
        )
        generate_snapshots(warehouse, tmp_path / "public")
    finally:
        warehouse.close()
    storylines = json.loads((tmp_path / "public" / "storylines.json").read_text(encoding="utf-8"))
    assert storylines["moveCount"] == 1
    assert storylines["people"]["mk_stalin"]["moves"][0]["intent"] == "Erode the ruling party's standing"
