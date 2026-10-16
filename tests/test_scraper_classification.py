import pytest

from scripts.intelligence.classify import classify_category
from scripts.scrape_political_intel import detect_unverified_signal


@pytest.mark.parametrize("text", [
    "Stanley first govt medical college to bag hand surgery seats",
    "Police firing reported", "Firebrand leader speaks", "Minister fired aide",
    "City tackles pollution", "Leaders afraid of criticism", "A devoted worker",
    "An ambitious programme", "A memorable day", "FIRwood", "ag.o.b",
])
def test_classification_does_not_match_substrings(text):
    assert classify_category(text) == "news"


@pytest.mark.parametrize(("text", "category"), [
    ("IT cell responds", "social_media"), ("IT WING responds", "social_media"),
    ("Viral posts spread", "social_media"), ("Tweets and memes", "social_media"),
    ("See x.com for details", "social_media"), ("FIR registered", "investigation"),
    ("ED raid", "investigation"), ("CBI probe", "investigation"),
    ("Arrests and raids", "investigation"), ("Leader arrested", "investigation"),
    ("Elections announced", "election"), ("Polls begin", "election"),
    ("Counting votes", "election"), ("New welfare schemes", "policy"),
    ("G.O. issued", "policy"), ("Read (g.o.)", "policy"),
    ("Subsidies for beneficiaries", "policy"),
])
def test_classification_matches_case_phrases_punctuation_and_inflections(text, category):
    assert classify_category(text) == category


@pytest.mark.parametrize(("text", "category"), [
    ("IT cell discusses corruption election scheme", "social_media"),
    ("FIR during election scheme rollout", "investigation"),
    ("Election welfare scheme", "election"),
    ("Welfare scheme", "policy"),
    ("", "news"),
])
def test_classification_priority(text, category):
    assert classify_category(text) == category


@pytest.mark.parametrize("text", [
    "LEAKED report", "Rumours spread", "RUMORS spread", "Claims emerge",
    "Alleged incident", "Allegedly involved", "Claimed involvement", "Leaking details",
])
def test_unverified_signal_keeps_common_inflections(text):
    assert detect_unverified_signal(text)


@pytest.mark.parametrize("text", [
    "A bleak outlook", "Reclaimed land", "Acclaimed leader", "Antiviral medicine",
    "Official order published",
])
def test_unverified_signal_does_not_match_inside_words(text):
    assert not detect_unverified_signal(text)
