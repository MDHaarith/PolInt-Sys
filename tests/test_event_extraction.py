import pytest

from scripts.intelligence.events import EventExtractor, detect_event_type
from scripts.intelligence.snapshots import generate_snapshots
from scripts.intelligence.warehouse import IntelligenceWarehouse


@pytest.mark.parametrize(
    ("title", "expected"),
    [
        ("Police arrest Karunanidhi after midnight raid", "arrest"),
        ("FIR filed against Seeman over speech", "fir"),
        ("ED raids minister's residence", "raid"),
        ("Court hears bail plea in corruption case", "court_hearing"),
        ("NTK workers protest outside collectorate", "protest"),
        ("Vijay addresses TVK district meeting", "speech"),
        ("Governor appoints new Tamil Nadu minister", "appointment"),
        ("Party suspends district secretary", "suspension"),
        ("Former MLA defects to DMK", "defection"),
        ("Government launches breakfast scheme", "policy"),
    ],
)
def test_detects_minor_event_types(title, expected):
    assert detect_event_type(title) == expected


def add_story(
    warehouse,
    *,
    story_id,
    title,
    source,
    url,
    date="2026-06-10",
    politician_id="seeman",
    platform=None,
    verification="source_reported",
):
    warehouse.upsert_raw_item(
        {
            "id": story_id,
            "url": url,
            "title": title,
            "snippet": title,
            "source": source,
            "sourceType": "social" if platform else "news",
            "platform": platform,
            "publishedAtRaw": date,
            "retrievedAt": "2026-06-11T00:00:00Z",
            "politicianId": politician_id,
            "category": "social_media" if platform else "news",
            "verificationStatus": verification,
        }
    )
    warehouse.connection.commit()


def test_duplicate_reports_cluster_into_one_corroborated_event(tmp_path):
    warehouse = IntelligenceWarehouse(tmp_path / "intel.db")
    add_story(
        warehouse,
        story_id="one",
        title="Seeman detained during Chennai protest",
        source="News One",
        url="https://one.test/seeman-protest",
    )
    add_story(
        warehouse,
        story_id="two",
        title="Police detain Seeman at protest in Chennai",
        source="News Two",
        url="https://two.test/seeman-protest",
    )

    result = EventExtractor(warehouse).extract_all()

    assert result["events_upserted"] == 1
    event = warehouse.connection.execute("SELECT * FROM events").fetchone()
    assert event["event_type"] == "arrest"
    assert event["verification_status"] == "corroborated"
    assert warehouse.count("event_evidence") == 2


def test_single_anonymous_social_claim_stays_out_of_time_fabric(tmp_path):
    warehouse = IntelligenceWarehouse(tmp_path / "intel.db")
    add_story(
        warehouse,
        story_id="social-one",
        title="Rumour: Seeman arrested tonight",
        source="X anonymous",
        url="https://x.com/anonymous/status/1",
        platform="x",
        verification="unverified_chatter",
    )

    result = EventExtractor(warehouse).extract_all()
    generate_snapshots(warehouse, tmp_path / "public")

    assert result["social_only_candidates"] == 1
    assert warehouse.count("events") == 0
    assert '"events":[]' in (tmp_path / "public/timeFabric.json").read_text(encoding="utf-8")


def test_social_claim_enters_cluster_after_independent_news_report(tmp_path):
    warehouse = IntelligenceWarehouse(tmp_path / "intel.db")
    add_story(
        warehouse,
        story_id="social-one",
        title="Seeman arrested tonight",
        source="X user",
        url="https://x.com/user/status/1",
        platform="x",
        verification="unverified_chatter",
    )
    add_story(
        warehouse,
        story_id="news-one",
        title="Police arrest Seeman following protest",
        source="News One",
        url="https://one.test/seeman-arrest",
    )

    EventExtractor(warehouse).extract_all()

    assert warehouse.count("events") == 1
    assert warehouse.count("event_evidence") == 2
    event = warehouse.connection.execute("SELECT * FROM events").fetchone()
    assert event["verification_status"] == "reported"


def test_arrest_and_bail_remain_distinct_linked_events(tmp_path):
    warehouse = IntelligenceWarehouse(tmp_path / "intel.db")
    add_story(
        warehouse,
        story_id="arrest",
        title="Police arrest Seeman after protest",
        source="News One",
        url="https://one.test/arrest",
    )
    add_story(
        warehouse,
        story_id="bail",
        title="Court grants bail to Seeman",
        source="News One",
        url="https://one.test/bail",
        date="2026-06-11",
    )

    EventExtractor(warehouse).extract_all()

    assert warehouse.count("events") == 2
    types = {
        row[0]
        for row in warehouse.connection.execute("SELECT event_type FROM events")
    }
    assert types == {"arrest", "bail"}
    link = warehouse.connection.execute("SELECT relationship FROM event_links").fetchone()
    assert link["relationship"] == "legal-follow-up"
