import base64
import json

import numpy as np

from scripts.intelligence.models import CollectedItem
from scripts.intelligence.snapshots import app_vector_index
from scripts.intelligence.storylines import build_storylines
from scripts.intelligence.vectors import VectorStore, truncate
from scripts.intelligence.warehouse import IntelligenceWarehouse


def collect(warehouse, **item):
    record = {"retrievedAt": "2026-10-16T10:00:00Z", "sourceType": "google_news_rss", **item}
    warehouse.upsert_raw_item(CollectedItem.from_legacy(record).to_warehouse_dict())
    warehouse.connection.commit()


def unit(*values):
    vector = np.zeros(768, dtype=np.float32)
    vector[: len(values)] = values
    return vector / np.linalg.norm(vector)


def fake_worker(vectors):
    """Stands in for the Node worker: returns a fixed vector per input, or an error."""
    def run(jobs, deadline_seconds=None):
        out = {}
        for job in jobs:
            value = vectors.get(job["input"])
            out[job["id"]] = value if value is not None else "could not fetch"
        return out
    return run


def test_store_registers_text_photos_audio_and_inbox_files(tmp_path):
    inbox = tmp_path / "inbox"
    inbox.mkdir()
    (inbox / "speech.mp3").write_bytes(b"fake audio")
    (inbox / "speech.mp3.json").write_text(json.dumps({"title": "Stalin speech", "politicianId": "mk_stalin"}))
    (inbox / "notes.txt").write_text("ignored")
    warehouse = IntelligenceWarehouse(tmp_path / "intel.db")
    try:
        collect(warehouse, id="a", title="Stalin slams TVK", url="https://x.test/a", source="The Hindu",
                publishedAtRaw="2026-10-16T07:00:00Z", imageUrl="https://img.test/a.jpg",
                audioUrl="https://audio.test/a.mp3")
        store = VectorStore(warehouse.connection)
        assert store.discover(inbox=inbox) == {"text": 1, "image": 1, "audio": 2}
        # Unchanged items are not registered again.
        assert store.discover(inbox=inbox) == {"text": 0, "image": 0, "audio": 0}
        rows = store.connection.execute("SELECT modality, title, politician_id FROM media_items WHERE raw_item_id IS NULL").fetchall()
        assert [tuple(row) for row in rows] == [("audio", "Stalin speech", "mk_stalin")]
    finally:
        warehouse.close()


def fake_fetch(url, modality, directory):
    if "missing" in url:
        raise OSError("HTTP 404")
    return f"/downloads/{url.rsplit('/', 1)[-1]}"


def test_embedding_stores_vectors_retries_failures_and_searches_across_modalities(tmp_path):
    warehouse = IntelligenceWarehouse(tmp_path / "intel.db")
    try:
        collect(warehouse, id="a", title="Farmers protest over Cauvery water", url="https://x.test/a",
                source="The Hindu", publishedAtRaw="2026-10-16T07:00:00Z", imageUrl="https://img.test/rally.jpg")
        collect(warehouse, id="b", title="Metro rail phase two opens", url="https://x.test/b",
                source="DT Next", publishedAtRaw="2026-10-15T07:00:00Z")
        store = VectorStore(warehouse.connection)
        store.discover(inbox=None)
        worker = fake_worker({
            "Farmers protest over Cauvery water": unit(1, 0.1),
            "Metro rail phase two opens": unit(0, 1),
        })
        assert store.embed_pending(worker=worker, fetch=fake_fetch) == {"embedded": 2, "failed": 1, "deferred": 0}
        hits = store.search(unit(1, 0), k=2)
        assert [hit.title for hit in hits] == ["Farmers protest over Cauvery water", "Metro rail phase two opens"]
        assert hits[0].score > 0.99
        # The photo failed once and stays queued until it has failed three times.
        assert [row["modality"] for row in store.pending()] == ["image"]
        worker_with_photo = fake_worker({"/downloads/rally.jpg": unit(0.9, 0.2)})
        assert store.embed_pending(worker=worker_with_photo, fetch=fake_fetch)["embedded"] == 1
        assert [hit.modality for hit in store.search(unit(1, 0), k=1, modality="image")] == ["image"]
        assert store.stats() == {"image": {"embedded": 1}, "text": {"embedded": 2}}
    finally:
        warehouse.close()


def test_app_index_is_small_and_ranks_like_the_full_vectors():
    rng = np.random.default_rng(1)
    vectors = {f"raw_{i}": v / np.linalg.norm(v) for i, v in enumerate(rng.normal(size=(50, 768)).astype(np.float32))}
    index = app_vector_index(vectors, "2026-10-17T00:00:00Z")
    assert index["dimensions"] == 256 and len(index["ids"]) == 50
    data = np.frombuffer(base64.b64decode(index["vectors"]), dtype=np.int8).reshape(50, 256)
    decoded = data / np.array(index["scales"])[:, None]
    query = truncate(vectors["raw_7"][None, :], 256)[0]
    assert index["ids"][int(np.argmax(decoded @ query))] == "raw_7"


def story(story_id, title, date, vector=None):
    return {"id": story_id, "rawId": f"raw_{story_id}", "title": title, "publishedAt": date,
            "source": "The Hindu", "sourceTier": "record", "importance": 40, "url": f"https://x.test/{story_id}"}


def test_embeddings_link_a_tamil_report_into_an_english_storyline():
    news = [
        story("a", "Stalin slams TVK over meth seizure by party functionary", "2026-10-15T08:00:00Z"),
        story("b", "Udhayanidhi attacks Vijay over drug haul in Nagapattinam", "2026-10-16T08:00:00Z"),
        story("c", "போதைப்பொருள் விவகாரம்: தவெக மீது கனிமொழி கடும் கண்டனம்", "2026-10-16T12:00:00Z"),
    ]
    # Vectors are centred on the corpus mean, so the issue must stand out from a
    # background of other stories, as it does in a real feed.
    rng = np.random.default_rng(3)
    background = {f"raw_other{i}": v / np.linalg.norm(v) for i, v in enumerate(rng.normal(size=(40, 768)).astype(np.float32))}
    issue = unit(1, 0.05, 0.02)
    vectors = {**background, "raw_a": issue, "raw_b": unit(1, 0.04, 0.03), "raw_c": unit(1, 0.06, 0.01)}
    linked = build_storylines(news, "2026-10-17T00:00:00Z", vectors=vectors)
    unlinked = build_storylines(news, "2026-10-17T00:00:00Z")
    assert linked["threads"] and linked["threads"][0]["stepCount"] == 3
    assert not unlinked["threads"]
