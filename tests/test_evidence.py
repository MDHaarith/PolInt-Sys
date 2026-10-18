import base64
import sqlite3
from datetime import datetime, timezone

import numpy as np

from scripts.intelligence.evidence import (
    EvidenceStore, Story, check_citation, evidence_pack, passages, proof_gate, text_key,
)

NOW = datetime(2026, 10, 18, tzinfo=timezone.utc)


def story(**fields):
    base = {"id": "s1", "title": "Stalin calls TVK a 'Breaking Bad' party", "text": "", "source": "The Hindu",
            "url": "https://www.thehindu.com/a", "published_at": "2026-10-16T10:00:00Z"}
    return Story(**(base | fields))


def unit(*values):
    vector = np.zeros(768, dtype=np.float32)
    vector[: len(values)] = values
    return vector / np.linalg.norm(vector)


def fake_worker(vectors, calls):
    def run(jobs, deadline_seconds=None):
        calls.extend(job["input"] for job in jobs)
        return {job["id"]: vectors.get(job["input"], "could not embed") for job in jobs}
    return run


def test_proof_gate_keeps_trusted_outlets_and_names_why_others_are_left_out():
    assert proof_gate(story()) == ("record", None)
    assert proof_gate(story(source="Murasoli")) == ("partisan", None)
    assert proof_gate(story(source="Some Blog")) == (None, "tier_aggregator")
    assert proof_gate(story(is_social=True)) == (None, "social")
    assert proof_gate(story(verification="unverified_chatter")) == (None, "unverified")
    assert proof_gate(story(url="http://example.com")) == (None, "no_link")
    assert proof_gate(story(published_at="")) == (None, "no_date")


def test_passages_keep_full_sentences_and_drop_cut_off_ones():
    text = ("சென்னை: மெத்தம்பெட்டமைன் பறிமுதல் செய்யப்பட்டது மிகவும் தீவிரமான விஷயம். "
            "Stalin said the party had failed the state completely. Short one. "
            "The minister added that the inquiry would continue for many…")
    out = passages(story(text=text))
    assert out[0] == "Stalin calls TVK a 'Breaking Bad' party"
    assert "Stalin said the party had failed the state completely." in out
    assert not any("inquiry" in item for item in out)  # cut off by the outlet
    assert "Short one." not in out
    assert any("மெத்தம்பெட்டமைன்" in item for item in out)


def test_text_key_keeps_tamil_words_whole_and_citations_must_match():
    assert text_key("தமிழ் நாடு!") == "தமிழ் நாடு"
    passage = "Stalin said the party had failed the state completely."
    assert check_citation("the party had failed the state", passage)
    assert check_citation("THE PARTY  had failed, the state", passage)
    assert not check_citation("the party had failed the people", passage)
    assert not check_citation("failed", passage)  # too short to prove anything


def test_store_embeds_new_text_once_and_corroborates_across_outlets():
    connection = sqlite3.connect(":memory:")
    store = EvidenceStore(connection)
    stories = [
        story(),
        story(id="s2", source="Dinamani", url="https://www.dinamani.com/b"),  # same headline, syndicated
        story(id="s3", title="Cauvery water released from Mettur dam for delta farmers", source="DT Next",
              url="https://www.dtnext.in/c"),
        story(id="s4", title="Rumour about a minister", source="Some Blog", url="https://blog.example/d"),
    ]
    added = store.add(stories)
    assert added["stories"] == 3 and added["left_out"] == {"tier_aggregator": 1}
    assert store.add(stories)["unchanged"] == 3

    calls = []
    vectors = {"Stalin calls TVK a 'Breaking Bad' party": unit(1, 0.1),
               "Cauvery water released from Mettur dam for delta farmers": unit(0, 1)}
    counts = store.embed_pending(worker=fake_worker(vectors, calls))
    assert counts["embedded"] == 2 and len(calls) == 2  # the syndicated copy reused its vector
    assert store.stats() == {"passages": 3, "embedded": 3, "stories": 3, "outlets": 3}

    pack = evidence_pack(store, days=30, now=NOW)
    assert pack["kind"] == "evidence" and len(pack["ids"]) == len(pack["passages"]) == 3
    assert len(base64.b64decode(pack["vectors"])) == 3 * pack["dimensions"]
    hindu = next(item for item in pack["passages"] if item["source"] == "The Hindu")
    assert hindu["corroboratedBy"] == ["Dinamani"]
    assert hindu["kind"] == "report" and hindu["url"] == "https://www.thehindu.com/a"
    cauvery = next(item for item in pack["passages"] if item["source"] == "DT Next")
    assert cauvery["corroboratedBy"] == []


def test_changed_story_text_replaces_its_passages_and_pack_skips_old_ones():
    connection = sqlite3.connect(":memory:")
    store = EvidenceStore(connection)
    store.add([story(published_at="2026-08-01T10:00:00Z")])
    store.add([story(title="Stalin calls TVK a 'Breaking Bad' party, demands inquiry",
                     published_at="2026-08-01T10:00:00Z")])
    texts = [row[0] for row in connection.execute("SELECT text FROM evidence_passages")]
    assert texts == ["Stalin calls TVK a 'Breaking Bad' party, demands inquiry"]
    store.embed_pending(worker=fake_worker({texts[0]: unit(1)}, []))
    assert evidence_pack(store, days=30, now=NOW)["passages"] == []
