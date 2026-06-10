from scripts.intelligence.curated_seed import upsert_curated_payload
from scripts.intelligence.warehouse import IntelligenceWarehouse


def test_curated_import_preserves_ids_and_relationships(tmp_path):
    warehouse = IntelligenceWarehouse(tmp_path / "intel.db")
    payload = {
        "nodes": [
            {
                "id": "event_midnight_arrest",
                "title": "2001: Midnight Arrest of Karunanidhi",
                "year": 2001,
                "description": "Curated description",
                "fallout": "National outrage",
                "type": "event",
                "domain": "Political Event",
            },
            {
                "id": "policy_test",
                "title": "2022: Test Policy",
                "year": 2022,
                "description": "Policy description",
                "fallout": "Policy impact",
                "type": "policy",
                "domain": "Education",
            },
        ],
        "edges": [
            {
                "source": "event_midnight_arrest",
                "target": "policy_test",
                "label": "policy lineage",
            }
        ],
    }

    result = upsert_curated_payload(warehouse, payload)

    assert result == {"curated_events": 2, "curated_links": 1}
    event = warehouse.connection.execute(
        "SELECT * FROM events WHERE id = 'event_midnight_arrest'"
    ).fetchone()
    assert event["is_curated"] == 1
    assert event["title"] == "Midnight Arrest of Karunanidhi"
    assert warehouse.count("event_links") == 1


def test_reimport_restores_curated_text_after_automatic_change(tmp_path):
    warehouse = IntelligenceWarehouse(tmp_path / "intel.db")
    payload = {
        "nodes": [
            {
                "id": "event_curated",
                "title": "1965: Curated Event",
                "year": 1965,
                "description": "Authoritative text",
                "fallout": "Known impact",
                "type": "event",
            }
        ],
        "edges": [],
    }
    upsert_curated_payload(warehouse, payload)
    warehouse.connection.execute(
        "UPDATE events SET title = 'Automatic overwrite' WHERE id = 'event_curated'"
    )
    warehouse.connection.commit()

    upsert_curated_payload(warehouse, payload)

    title = warehouse.connection.execute(
        "SELECT title FROM events WHERE id = 'event_curated'"
    ).fetchone()[0]
    assert title == "Curated Event"
