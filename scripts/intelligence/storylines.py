"""Connect stories into storylines and read the intent behind each move.

Each story is read as a move: who acted (the politician the headline names
first), what they did (attack, rebut, protest, deliver, ally...), and at whom
(other politicians, parties and institutions in the text). The intent is
inferred from the move and the actor's position: an opposition leader attacking
the ruling party is eroding the government, the ruling party attacking the
Centre is rallying the state. Inferences are labelled as such and carry the
signals they rest on.

Moves that share distinctive words are chained into storylines, so a statement,
the rebuttal, the protest and the arrest that follows read as one thread.
"""
from __future__ import annotations

import math
import re
from collections import Counter, defaultdict
from datetime import datetime, timedelta, timezone

from .classify import mentions_tamil_nadu
from .people import DEFAULT_ALIASES, POLITICIAN_NAMES, POLITICIAN_PARTY, mentioned_politicians, politician_mentions

# Who governs, as of the 17th Assembly. Update when power changes hands.
RULING_STATE_PARTY = "tvk"
RULING_CENTRE_PARTY = "bjp"

PARTY_NAMES = {
    "dmk": "DMK", "aiadmk": "AIADMK", "tvk": "TVK", "bjp": "BJP", "congress": "Congress",
    "ntk": "NTK", "pmk": "PMK", "vck": "VCK", "mdmk": "MDMK", "ammk": "AMMK", "dmdk": "DMDK",
    "left": "Left parties", "mnm": "MNM", "tdk": "TDK", "ind": "Independent",
}
INSTITUTION_NAMES = {
    "centre": "Union government", "governor": "Governor", "eci": "Election Commission",
    "state_government": "State government", "court": "Courts", "agencies": "Central agencies",
    "police": "Police",
}

_ENGLISH_ENTITIES = {
    "dmk": r"dmk|dravida munnetra kazhagam",
    "aiadmk": r"aiadmk|admk|all india anna dravida munnetra kazhagam",
    "tvk": r"tvk|tamilaga vettri kazhagam|tamizhaga vetri kazhagam",
    "bjp": r"bjp|bharatiya janata party",
    "congress": r"congress|tncc",
    "ntk": r"ntk|naam tamilar katchi",
    "pmk": r"pmk|pattali makkal katchi",
    "vck": r"vck|viduthalai chiruthaigal katchi",
    "mdmk": r"mdmk", "ammk": r"ammk", "dmdk": r"dmdk",
    "left": r"cpi|cpi\(m\)|cpm|left parties",
    "centre": r"(?<!knowledge )(?<!research )(?<!convention )(?<!data )(?<!cancer )(?<!call )(?<!trade )(?<!health )(?<!care )(?<!skill )(?<!training )(?<!command )(?<!sports )(?<!heritage )(?<!innovation )(?<!service )(?<!excellence )(?<!learning )(?<!science )(?<!study )(?<!resource )(?<!relief )(?<!shopping )centre|union government|union govt|modi government|prime minister|pm modi|narendra modi|union minister",
    "governor": r"governor|raj bhavan",
    "eci": r"election commission|eci|chief election commissioner|cec|gyanesh kumar|sir exercise|special intensive revision|ballot papers?",
    "state_government": r"state government|tamil nadu government|tn government|tvk government|vijay government",
    "court": r"high court|supreme court|madras hc|court",
    "agencies": r"enforcement directorate|cbi|dvac|income tax department|\bed\b",
    "police": r"police",
}
# The electoral-roll revision; only an entity when written in capitals.
_SIR = re.compile(r"(?<![\w.])SIR(?!\w)")
_ENTITY_PATTERNS = {
    entity: re.compile(rf"(?<![\w.])(?:{pattern})(?!\w)", re.IGNORECASE)
    for entity, pattern in _ENGLISH_ENTITIES.items()
}
# Tamil party names nest ("திமுக" sits inside "அதிமுக" and "மதிமுக").
_TAMIL_ENTITIES = {
    "dmk": re.compile(r"(?<![அம])திமுக"), "aiadmk": re.compile(r"அதிமுக|அஇஅதிமுக"),
    "tvk": re.compile(r"தவெக|தமிழக வெற்றிக் கழக"), "bjp": re.compile(r"பாஜக|பா\.ஜ\.க"),
    "congress": re.compile(r"காங்கிரஸ"), "ntk": re.compile(r"நாம் தமிழர்"),
    "pmk": re.compile(r"பாமக"), "vck": re.compile(r"விசிக"), "mdmk": re.compile(r"மதிமுக"),
    "ammk": re.compile(r"அமமுக"), "dmdk": re.compile(r"தேமுதிக"),
    "centre": re.compile(r"மத்திய அரசு|பிரதமர்|மோடி"), "governor": re.compile(r"ஆளுநர்"),
    "eci": re.compile(r"தேர்தல் ஆணைய"), "state_government": re.compile(r"தமிழக அரசு|மாநில அரசு"),
    "court": re.compile(r"நீதிமன்ற"), "police": re.compile(r"காவல்|போலீஸ்"),
}

# Ordered: the first action that matches wins, so specific readings
# ("hits back" is a rebuttal) come before general ones ("hits out" is an attack).
_ACTIONS = [
    ("litigate", "Goes to court", r"moves? (?:the )?(?:madras )?(?:high court|hc|supreme court|sc|court)|files? (?:a )?(?:plea|petition|case|writ)|approach(?:es|ed)? (?:the )?(?:high court|hc|supreme court|court)",
     r"நீதிமன்றத்தில் மனு|வழக்கு தொடர|மனு தாக்கல்"),
    ("legal_hit", "Legal action", r"arrest(?:s|ed)?|detain(?:s|ed)?|remand(?:ed)?|summon(?:s|ed)?|raid(?:s|ed)?|chargesheet(?:s|ed)?|fir|booked|convicted|sentenced|searches|probe against|orders? (?:an? )?(?:probe|inquiry)|case against|case registered|charged with|hearing|verdict|plea",
     r"கைது|(?<![஀-௿])சோதனை|ரெய்டு|வழக்குப்பதிவு|வழக்கு பதிவு|சம்மன்|சிறை"),
    ("legal_relief", "Legal relief", r"bail|acquitt(?:ed|al)|quash(?:es|ed)?|discharged|stays? (?:on|order)|interim relief|relief for|(?:gives|grants|gets) (?:\S+ ){0,3}relief",
     r"ஜாமீன்|விடுவிப்பு|விடுதலை"),
    ("purge", "Expels rivals", r"expels?|sacks|ousts|purges?|removes? (?:\w+ )?(?:from|as)",
     r"நீக்கம்|நீக்கி|நீக்கப்பட்|களையெடுப்பு"),
    ("defect", "Switches sides", r"joins? (?:the )?(?:dmk|aiadmk|tvk|bjp|congress|ntk|pmk|vck|mdmk|ammk|dmdk)|quits? (?:the )?(?:party|dmk|aiadmk|tvk|bjp|congress|ntk|pmk)|switch(?:es|ed)? (?:sides|over)|defect(?:s|ed|ion)?|expelled|sacked|removed from (?:the )?(?:party|post)",
     r"இணைந்தார்|இணைந்தனர்|கட்சியில் இணை|விலகினார்|கட்சியிலிருந்து விலக"),
    ("alliance", "Alliance move", r"alliance|allies|ally|seat[- ]sharing|seat share|joins hands|ties? up|tie-up|coalition|extends support|backs",
     r"கூட்டணி|தொகுதிப் பங்கீடு|ஆதரவு"),
    ("rebut", "Rebuts", r"hits back|hit back|retorts?|counters?|rebuts?|denies|denied|refutes?|rejects? (?:the )?(?:charge|allegation|claim|criticism)s?|clarifies|dismisses? (?:the )?(?:charge|allegation|claim|criticism)s?|baseless",
     r"மறுப்பு|பதிலடி|விளக்கம் அளி|மறுத்"),
    ("attack", "Attacks", r"slams?|attacks?|lash(?:es)? out|hits? out|criticis(?:es|ed|m)|criticiz(?:es|ed)|accus(?:es|ed)|blames?|targets?|mocks?|takes? (?:a )?dig|takes? on|flays?|raps?|tears? into|questions?|condemns?|denounces?|charges? that|alleges?|jibe|swipe|sees? conspiracy|brands?|dubs?|calls? (?:\S+ ){1,3}(?=(?:a |an )?['\x22‘“])",
     r"கண்டன|குற்றச்சா|விமர்சன|சாடல்|சாடு|சாடி|தாக்கு|கேள்வி"),
    ("protest", "Protests", r"protest(?:s|ed|ers)?|agitation|dharna|hunger strike|fast|boycott(?:s|ed)?|walk(?:s|ed)? ?out|black flags?|blockade|road roko|rail roko|siege|stir",
     r"போராட்ட|ஆர்ப்பாட்ட|மறியல்|உண்ணாவிரத|வெளிநடப்பு|முற்றுகை"),
    ("demand", "Demands", r"demands?|urges?|calls? for|seeks?|appeals?|writes? to|letter to|petitions?|requests?|press(?:es)? for|insists?",
     r"வலியுறுத்த|கோரிக்கை|கடிதம்|வேண்டுகோள்|வேண்டும்"),
    ("outreach", "Outreach", r"condolences?|relief|consoles?|tributes?|pays? (?:last )?(?:homage|respects)|last respects|greets?|wishes|birthday|felicitat(?:es|ed)",
     r"ஆறுதல்|அஞ்சலி|நிவாரண|வாழ்த்து|மரியாதை"),
    ("resign", "Resigns", r"resigns|resigned|steps down|stepped down|quits as", r"ராஜினாமா செய்|பதவி விலகினார்"),
    ("deliver", "Delivers", r"launch(?:es|ed)?|inaugurat(?:es|ed|ion)|unveils?|sanction(?:s|ed)?|announces?|announced|orders?|allocat(?:es|ed)|rolls? out|distribut(?:es|ed)|lays? foundation|flags? off|disburs(?:es|ed)|implements?|approves?|g\.o\.|scheme",
     r"தொடங்கி|திறந்து|அறிவிப்பு|அறிவித்|வழங்கி|அடிக்கல்|திட்டம்"),
    ("promise", "Promises", r"promis(?:es|ed)|assures?|pledges?|vows?|guarantees?|manifesto", r"வாக்குறுதி|உறுதியளி"),
    ("campaign", "Campaigns", r"rall(?:y|ies)|campaign(?:s|ing)?|roadshow|tour|padayatra|public meeting|canvass(?:es|ing)?|yatra|conference|maanadu|bypoll|election",
     r"பிரச்சார|பொதுக்கூட்ட|சுற்றுப்பயண|மாநாடு|தேர்தல்"),
    ("organise", "Party building", r"appoint(?:s|ed|ment)?|names? (?:new|as)|reshuffle|district secretar(?:y|ies)|office[- ]bearers?|general council|cadres?|party meeting|working committee|nominat(?:es|ed)|candidates? list|membership",
     r"நியமன|பொதுக்குழு|மாவட்ட செயலாளர்|நிர்வாகிகள்|தொண்டர்"),
    ("meet", "Meets", r"meets?|met|calls? on|meeting with|holds? talks|talks with|courtesy call|visits?|visited", r"சந்திப்பு|சந்தித்|ஆலோசனை"),
]
_ACTION_PATTERNS = [
    (action, label, re.compile(rf"(?<![\w.])(?:{english})(?!\w)", re.IGNORECASE), re.compile(tamil))
    for action, label, english, tamil in _ACTIONS
]
ACTION_LABELS = {action: label for action, label, _, _ in _ACTIONS}

# What a move is for, grouped so a politician's playbook can be summarised.
OBJECTIVES = {
    "offence": "On the offensive",
    "defence": "Damage control",
    "governance": "Governing and claiming credit",
    "mobilisation": "Mobilising support",
    "coalition": "Coalition building",
    "realignment": "Realignment",
    "legal": "Legal exposure",
    "organisation": "Building the party",
    "pressure": "Applying pressure",
    "goodwill": "Building goodwill",
}

# What usually follows each kind of move; shown as "watch for".
_NEXT_MOVES = {
    "litigate": "the court's response and a counter-affidavit",
    "legal_hit": "a bail plea, a court hearing or a protest by supporters",
    "legal_relief": "an appeal by the prosecution or a return to the campaign trail",
    "defect": "more exits from the same camp or a counter-induction",
    "purge": "the expelled camp regrouping, or a court challenge",
    "resign": "a replacement, or the resignation turning into a switch of party",
    "alliance": "seat-sharing terms or a rival bloc forming",
    "rebut": "a fresh charge or documents from the other side",
    "attack": "a rebuttal from the target",
    "protest": "a government response, detentions or talks",
    "demand": "a reply or order from the government",
    "deliver": "opposition questions over funding or delivery",
    "promise": "a timeline, or rivals calling it a poll gimmick",
    "campaign": "alliance and candidate announcements",
    "organise": "reactions from sidelined functionaries",
    "meet": "an alliance announcement or a denial of talks",
    "outreach": "follow-up relief announcements",
}

_STOPWORDS = {
    "the", "and", "for", "with", "from", "that", "this", "into", "over", "after", "amid",
    "against", "about", "says", "said", "will", "has", "have", "had", "was", "were", "are",
    "its", "his", "her", "their", "who", "what", "why", "how", "new", "news", "latest",
    "tamil", "nadu", "chennai", "today", "live", "updates", "video", "not", "but", "all",
    "they", "them", "him", "she", "you", "our", "can", "may", "now", "than", "more", "only",
    "also", "says", "minister", "chief", "party", "government", "state", "leader", "leaders",
    "cadres", "people", "district", "former", "union", "president", "secretary", "general",
    # Institutions and verbs recur across unrelated stories.
    "madras", "high", "court", "supreme", "order", "orders", "case", "cases", "takes", "calls",
    "says", "make", "makes", "gives", "seeks", "amid", "over", "row", "video", "watch", "breaking",
    "india", "indian", "national", "times", "express", "today", "news", "exclusive", "report",
}


def _parse(value: str | None) -> datetime | None:
    try:
        parsed = datetime.fromisoformat((value or "").replace("Z", "+00:00"))
    except ValueError:
        return None
    return parsed if parsed.tzinfo else parsed.replace(tzinfo=timezone.utc)


def _stem(word: str) -> str:
    return word if re.match(r"[஀-௿]", word) else word[:6]


# Names tie together everything a person does; the participant bonus already
# credits them, so words of the topic alone decide whether two stories connect.
_NAME_TOKENS = {
    _stem(word)
    for aliases in DEFAULT_ALIASES.values()
    for alias in aliases
    for word in re.findall(r"[a-z]{4,}|[஀-௿]{3,}", alias.lower())
}


# Issues named differently in English and Tamil headlines; a shared concept lets
# a Tamil report join the English storyline about the same issue.
_CONCEPTS = {
    "sir": (r"\bSIR\b|special intensive revision|electoral rolls?", r"எஸ்ஐஆர்|எஸ்.ஐ.ஆர்|வாக்காளர் பட்டியல் திருத்த"),
    "cec": (r"chief election commissioner|\bCEC\b|gyanesh", r"தலைமைத் தேர்தல் ஆணையர்|ஞானேஷ்"),
    "ballot": (r"ballot papers?|\bEVMs?\b", r"வாக்குச்சீட்டு|மின்னணு வாக்குப்பதிவு"),
    "drugs": (r"\bmeth\b|methamphetamine|drugs?|narcotics?|ganja", r"போதை|மெத்|கஞ்சா"),
    "power": (r"power (?:purchase|procurement|cuts?)|electricity (?:purchase|tariff)|tangedco", r"மின்சார கொள்முதல்|மின் கொள்முதல்|மின்வெட்டு|மின் கட்டண"),
    "prices": (r"price rise|prices of|inflation|essential commodities", r"விலைவாசி|விலை உயர்வு"),
    "metro": (r"\bmetro\b", r"மெட்ரோ"),
    "periyar_centre": (r"periyar arivulagam|periyar knowledge", r"பெரியார் அறிவுலகம்"),
    "bypoll": (r"bypolls?|by-?elections?|bye-elections?", r"இடைத்தேர்தல்"),
    "fishermen": (r"fisherm[ae]n", r"மீனவர்"),
    "neet": (r"\bNEET\b", r"நீட்"),
    "cauvery": (r"cauvery|mekedatu", r"காவிரி|மேகதாது"),
    "delimitation": (r"delimitation", r"தொகுதி மறுவரையறை"),
    "language": (r"\bhindi\b|three-language|\bNEP\b", r"இந்தி திணிப்பு|மும்மொழி"),
    "reshuffle": (r"reshuffle", r"அமைச்சரவை மாற்றம்"),
    "seat_sharing": (r"seat[- ]sharing", r"தொகுதிப் பங்கீடு"),
    "liquor": (r"tasmac|liquor|hooch", r"டாஸ்மாக்|மதுபான|கள்ளச்சாராய"),
    "floods": (r"floods?|cyclone|heavy rain", r"வெள்ள|புயல்|கனமழை"),
    "reinduction": (r"re-?induct|reunification|merger of factions", r"மீண்டும் இணை|ஒருங்கிணைப்பு"),
}
_CONCEPT_PATTERNS = {
    concept: re.compile(f"(?:{english})|(?:{tamil})", re.IGNORECASE)
    for concept, (english, tamil) in _CONCEPTS.items()
}


def concept_tokens(text: str) -> list[str]:
    return [f"#{concept}" for concept, pattern in _CONCEPT_PATTERNS.items() if pattern.search(text or "")]


def _is_action_word(word: str) -> bool:
    return any(english.fullmatch(word) for _, _, english, _ in _ACTION_PATTERNS)


def _word_tokens(text: str) -> list[str]:
    words = re.findall(r"[a-z]{4,}|[஀-௿]{3,}", (text or "").lower())
    return [
        _stem(word) for word in words
        if word not in _STOPWORDS and _stem(word) not in _NAME_TOKENS and not _is_action_word(word)
    ]


_TAMIL = re.compile(r"[஀-௿]")
_CONTEXT_CLAUSE = re.compile(r"\b(?:following|after|amid|despite|in the wake of|days after|hours after)\b", re.IGNORECASE)


def classify_action(text: str) -> str | None:
    text = text or ""
    if _TAMIL.search(text):
        # Tamil headlines end on the verb: "... - எடப்பாடி பழனிசாமி விமர்சனம்".
        endings = [
            (max([m.end() for m in tamil.finditer(text)] + [m.end() for m in english.finditer(text)]), -rank, action)
            for rank, (action, _, english, tamil) in enumerate(_ACTION_PATTERNS)
            if tamil.search(text) or english.search(text)
        ]
        return max(endings)[2] if endings else None
    # English headlines put the verb right after the subject: the first match wins.
    # A clause opened by "following" or "after" is background, not the move.
    main_clause = _CONTEXT_CLAUSE.split(text, maxsplit=1)[0]
    if main_clause != text and classify_action(main_clause):
        return classify_action(main_clause)
    starts = [
        (match.start(), rank, action)
        for rank, (action, _, english, _) in enumerate(_ACTION_PATTERNS)
        if (match := english.search(text))
    ]
    return min(starts)[2] if starts else None


def mentioned_entities(text: str) -> list[str]:
    found = []
    for entity, pattern in _ENTITY_PATTERNS.items():
        if pattern.search(text):
            found.append(entity)
    for entity, pattern in _TAMIL_ENTITIES.items():
        if entity not in found and pattern.search(text):
            found.append(entity)
    if "eci" not in found and _SIR.search(text):
        found.append("eci")
    return found


def _counterpart_party(counterpart: str) -> str | None:
    if counterpart.startswith("@"):
        return POLITICIAN_PARTY.get(counterpart[1:])
    return counterpart if counterpart in PARTY_NAMES else None


# One family name, two people: "Stalin" after "Udhayanidhi Stalin" is usually the same man.
_SHARED_NAMES = {frozenset({"mk_stalin", "udhayanidhi_stalin"})}


def actor_party(actor: str) -> str | None:
    return actor.removeprefix("party:") if actor.startswith("party:") else POLITICIAN_PARTY.get(actor)


def actor_name(actor: str) -> str:
    if actor.startswith("party:"):
        return PARTY_NAMES.get(actor[6:], actor[6:].upper())
    return POLITICIAN_NAMES.get(actor, actor)


def counterpart_name(counterpart: str) -> str:
    if counterpart.startswith("@"):
        return POLITICIAN_NAMES.get(counterpart[1:], counterpart[1:])
    return PARTY_NAMES.get(counterpart) or INSTITUTION_NAMES.get(counterpart, counterpart)


def infer_intent(action: str, actor: str, counterparts: list[str], text: str = "") -> dict:
    """Read the likely purpose of a move from its kind and who it involves."""
    party = actor_party(actor)
    rules_state = party == RULING_STATE_PARTY
    rules_centre = party == RULING_CENTRE_PARTY
    target_parties = [p for p in map(_counterpart_party, counterparts) if p and p != "ind"]
    institutions = [c for c in counterparts if c in INSTITUTION_NAMES]
    hits_centre = any(c in {"centre", "governor", "eci", "agencies"} for c in institutions) or (
        RULING_CENTRE_PARTY in target_parties and not rules_centre
    )
    hits_state = "state_government" in institutions or RULING_STATE_PARTY in target_parties
    own_camp = party not in (None, "ind") and any(
        c.startswith("@") and POLITICIAN_PARTY.get(c[1:]) == party for c in counterparts
    )
    signals = [f"{ACTION_LABELS[action].lower()}"]
    if party:
        role = "ruling party" if rules_state else "party in power at the Centre" if rules_centre else "opposition"
        signals.append(f"{PARTY_NAMES.get(party, party.upper())} ({role})")
    if counterparts:
        signals.append("involves " + ", ".join(counterpart_name(c) for c in counterparts[:3]))

    def result(objective: str, intent: str, confidence: str = "medium") -> dict:
        return {"objective": objective, "intent": intent, "confidence": confidence, "signals": signals}

    if action == "attack":
        if own_camp and not hits_centre:
            return result("offence", "Fight for control inside their own camp")
        if hits_centre and rules_state:
            return result("offence", "Rally Tamil Nadu against the Centre", "high")
        if hits_centre and not rules_centre:
            return result("offence", "Position against the BJP and the Centre", "high")
        if hits_state and not rules_state:
            return result("offence", "Erode the ruling party's standing", "high")
        if rules_state and target_parties:
            return result("offence", "Discredit the government's critics", "high")
        if target_parties or any(c.startswith("@") for c in counterparts):
            return result("offence", "Discredit a rival")
        if party and not rules_state and not rules_centre:
            return result("offence", "Hold the government to account")
        return result("offence", "Put an issue on the agenda", "low")
    if action == "rebut":
        return result("defence", "Contain damage and reframe the charge", "high" if counterparts else "medium")
    if action == "protest":
        if hits_centre:
            return result("mobilisation", "Pressure the Centre through the street", "high")
        if not rules_state:
            return result("mobilisation", "Mobilise the base against the government", "high")
        return result("mobilisation", "Show street strength")
    if action == "demand":
        if re.search(r"(?<!\w)unity(?!\w)|ஒற்றுமை", text, re.IGNORECASE):
            return result("organisation", "Rally their own ranks")
        if hits_centre and rules_state:
            return result("pressure", "Press the Centre on Tamil Nadu's behalf", "high")
        if not rules_state:
            return result("pressure", "Set the agenda for the government")
        return result("pressure", "Push a demand through official channels")
    if action == "deliver":
        if rules_state:
            return result("governance", "Deliver and claim credit", "high")
        if rules_centre:
            return result("governance", "Show the Centre's hand in Tamil Nadu")
        return result("governance", "Claim credit for local work", "low")
    if action == "promise":
        if rules_state:
            return result("governance", "Commit the government publicly")
        return result("mobilisation", "Win voters with promises")
    if action == "alliance":
        return result("coalition", "Build a winning coalition", "high" if target_parties else "medium")
    if action == "purge":
        return result("organisation", "Purge dissent and consolidate control", "high")
    if action == "defect":
        return result("realignment", "Realign for better prospects")
    if action == "resign":
        return result("realignment", "Step back under pressure or reposition")
    if action == "litigate":
        if hits_centre:
            return result("pressure", "Take the fight with the Centre to court", "high")
        return result("pressure", "Use the courts to pin down a rival")
    if action == "legal_hit":
        if not rules_centre and any(c == "agencies" for c in counterparts):
            return result("legal", "Under central agency pressure", "high")
        return result("legal", "Under legal pressure")
    if action == "legal_relief":
        return result("legal", "Win legal breathing room")
    if action == "campaign":
        return result("mobilisation", "Lay electoral groundwork")
    if action == "organise":
        return result("organisation", "Tighten control of the party machine")
    if action == "meet":
        if target_parties and party not in target_parties:
            return result("coalition", "Signal a possible alignment")
        if hits_centre:
            return result("pressure", "Engage the Centre directly")
        return result("organisation", "Consult and coordinate", "low")
    return result("goodwill", "Build public goodwill", "low")


def _first_sentence(text: str) -> str:
    return re.split(r"(?<=[.!?])\s", text or "", maxsplit=1)[0][:240]


# Quoted remarks open many headlines; the speaker follows the quote.
_LEADING_QUOTE = re.compile(r"^\s*[“\"‘'][^”\"’']{6,}[”\"’']\s*[-–—:|]?\s*")
# A name directly after these words is the target, not the actor.
_OBJECT_BEFORE = re.compile(r"(?:\b(?:at|against|on|to|with|by|over|for|meets?|slams?|attacks?|targets?|accuses?|blames?)|vs\.?)\s+(?:(?:cm|minister|chief minister|former cm|deputy cm|mp|mla)\s+)?$", re.IGNORECASE)
# Tamil case endings that mark the object: ஸ்டாலினை, ஸ்டாலினுக்கு, ஸ்டாலினிடம்.
_TAMIL_OBJECT_CASE = re.compile(r"^(?:ை|ுக்கு|க்கு|ிடம்|ைப்|ைச்|ைக்|ுடன்)")


def subject_politicians(text: str) -> list[str]:
    """Politicians who can be the headline's actor, most likely first."""
    text = text or ""
    quote = _LEADING_QUOTE.match(text)
    offset = quote.end() if quote and quote.end() < len(text) - 3 else 0
    body = text[offset:]
    mentions = [
        (start, end, politician_id)
        for start, end, politician_id in politician_mentions(body)
        if not _OBJECT_BEFORE.search(body[max(0, start - 30):start])
        and not _TAMIL_OBJECT_CASE.match(body[end:end + 5])
    ]
    speaker = [
        politician_id for start, end, politician_id in mentions
        # "Nainar Nagendran: ..." names the speaker first; "...: Stalin" names them last.
        if (start < 3 and re.match(r"\s*[:–—-]", body[end:end + 3]))
        or (re.search(r"[:–—-]\s*$", body[max(0, start - 3):start]) and len(body) - end < 4)
    ]
    if _TAMIL.search(body):
        # The speaker closes a Tamil headline: "... - திருமாவளவன் விமர்சனம்".
        mentions.reverse()
    subjects = []
    for politician_id in speaker + [politician_id for _, _, politician_id in mentions]:
        if politician_id not in subjects:
            subjects.append(politician_id)
    return subjects


def _title_party_actor(title: str) -> tuple[int, str] | None:
    """A party near the start of the headline ("DMK demands ...") and where it is."""
    lead = _LEADING_QUOTE.sub("", title)[:40]
    positions = []
    for entity in PARTY_NAMES:
        for pattern in (_ENTITY_PATTERNS.get(entity), _TAMIL_ENTITIES.get(entity)):
            match = pattern.search(lead) if pattern else None
            if match:
                positions.append((match.start(), entity))
    if not positions:
        return None
    position, party = min(positions)
    return position, f"party:{party}"


# Parties that only contest in Tamil Nadu; any other party needs a Tamil Nadu marker.
_STATE_PARTIES = {"dmk", "aiadmk", "tvk", "ntk", "pmk", "vck", "mdmk", "ammk", "dmdk", "mnm", "tdk"}


def read_move(record: dict) -> dict | None:
    """The actor, action and intent of one story, or None when it is not a move.

    The actor is a politician the headline names as its subject, else a party
    that opens it, else a politician named in the summary's first sentence.
    """
    title = record.get("title") or ""
    lead_sentence = _first_sentence(record.get("snippet") or "")
    context = f"{title} {lead_sentence}"
    title_people = subject_politicians(title)
    party_lead = _title_party_actor(title)
    first_person = min((start for start, _, _ in politician_mentions(_LEADING_QUOTE.sub("", title))), default=len(title))
    confident = not title.rstrip().endswith("?")
    if party_lead is not None and (not title_people or (party_lead[0] < first_person and not _TAMIL.search(title))):
        party_actor = party_lead[1]
        if party_actor[6:] not in _STATE_PARTIES and not mentions_tamil_nadu(context):
            return None
        # "DMK president M K Stalin flays TVK": the party names its leader, who acts.
        own_leader = next((p for p in title_people if POLITICIAN_PARTY.get(p) == party_actor[6:]), None)
        actor = own_leader or party_actor
        action = classify_action(title) or classify_action(lead_sentence)
    elif title_people:
        actor, action = title_people[0], classify_action(title) or classify_action(lead_sentence)
    else:
        lead_people = subject_politicians(lead_sentence)
        if not lead_people:
            return None
        actor, action, confident = lead_people[0], classify_action(lead_sentence), False
    if action is None:
        return None
    others = [
        p for p in mentioned_politicians(context)
        if p != actor and frozenset({p, actor}) not in _SHARED_NAMES
    ]
    own_party = actor_party(actor)
    entities = [e for e in mentioned_entities(context) if e != own_party]
    counterparts = [f"@{p}" for p in others] + entities
    intent = infer_intent(action, actor, counterparts, context)
    if not confident or classify_action(title) is None:
        intent["confidence"] = "low"
    return {
        "actor": actor,
        "action": action,
        "counterparts": counterparts[:6],
        **intent,
    }


def _step(record: dict, move: dict) -> dict:
    return {
        "storyId": record.get("rawId") or record.get("id"),
        "date": record.get("publishedAt"),
        "actor": move["actor"],
        "actorName": actor_name(move["actor"]),
        "actorParty": actor_party(move["actor"]),
        "action": move["action"],
        "actionLabel": ACTION_LABELS[move["action"]],
        "objective": move["objective"],
        "intent": move["intent"],
        "confidence": move["confidence"],
        "signals": move["signals"],
        "counterparts": [{"id": c, "name": counterpart_name(c)} for c in move["counterparts"]],
        "title": record.get("title"),
        "url": record.get("url"),
        "source": record.get("source"),
        "sourceTier": record.get("sourceTier"),
        "outlets": record.get("outletCount", 1),
        "importance": record.get("importance", 0),
    }


_CONFIDENCE_WEIGHT = {"high": 1.0, "medium": 0.7, "low": 0.3}


def _thread_reading(steps: list[dict], reference: datetime) -> dict:
    actors = Counter(step["actor"] for step in steps)
    last = _parse(steps[-1]["date"]) or reference
    # Pace is outlets per day: the last 24 hours against the three days before.
    ages = [(reference - (_parse(step["date"]) or reference)).total_seconds() / 3600 for step in steps]
    last_day = sum(step["outlets"] for step, age in zip(steps, ages) if age <= 24)
    daily_before = sum(step["outlets"] for step, age in zip(steps, ages) if 24 < age <= 96) / 3
    if (reference - last).total_seconds() > 3 * 86400:
        momentum = "cooling"
    elif last_day >= max(2, 1.5 * daily_before):
        momentum = "escalating"
    elif last_day == 0 and daily_before > 0:
        momentum = "cooling"
    else:
        momentum = "active"
    exchanges = []
    for previous, current in zip(steps, steps[1:]):
        targets = {c["id"] for c in previous["counterparts"]}
        if previous["actor"] != current["actor"] and (
            f"@{current['actor']}" in targets or current["action"] in {"rebut", "attack"}
        ) and previous["action"] in {"attack", "protest", "demand", "legal_hit"}:
            exchanges.append((previous["actor"], current["actor"]))
    lines = []
    lead, lead_moves = actors.most_common(1)[0]
    objectives = Counter(step["objective"] for step in steps if step["actor"] == lead)
    lines.append(
        f"{actor_name(lead)} drives this storyline ({lead_moves} of {len(steps)} moves), "
        f"mostly {OBJECTIVES[objectives.most_common(1)[0][0]].lower()}."
    )
    if exchanges:
        left, right = exchanges[-1]
        lines.append(
            f"A back-and-forth: {actor_name(left)} moved and "
            f"{actor_name(right)} answered."
        )
    shift = [step["objective"] for step in steps]
    if len(set(shift)) > 1 and shift[0] != shift[-1]:
        lines.append(f"It has moved from {OBJECTIVES[shift[0]].lower()} to {OBJECTIVES[shift[-1]].lower()}.")
    return {
        "momentum": momentum,
        "pace": {"last24h": last_day, "dailyBefore": round(daily_before, 1)},
        "analysis": lines,
        "watchFor": _NEXT_MOVES.get(steps[-1]["action"]),
    }


def _core(thread: dict) -> set[str]:
    return {token for token, count in thread["tokens"].items() if count >= 2}


# Story vectors are centred (the corpus mean subtracted) before comparison:
# every headline here shares a "Tamil Nadu politics" direction, and without
# centring a large thread's centre resembles every political story. Measured on
# the hand-checked groups in tests/fixtures/same_issue_clusters.json with the
# search-prompt vectors (vectors.TEXT_PROMPT), a group's centred centre scores
# its own stories at a median 0.46-0.74 and the rest of the feed below
# 0.26-0.70 (99.9th percentile). A move joins a thread on meaning alone above
# SEMANTIC_LINK, or above SEMANTIC_LINK_WITH_CONTEXT when it also names the
# thread's issue (#sir, #cauvery, ...); both let in 0.1% of off-topic stories.
# Threads merge when their centres pass SEMANTIC_MERGE: two halves of one issue
# score 0.77-0.98, different issues at most 0.20, and 0.55-0.65 all join the
# Tamil and English threads of one issue (0.70 and above leave them apart).
SEMANTIC_LINK = 0.61
SEMANTIC_LINK_WITH_CONTEXT = 0.52
SEMANTIC_MERGE = 0.60


def _centred(vectors: dict) -> dict:
    if len(vectors) < 2:
        return dict(vectors)
    mean = sum(vectors.values()) / len(vectors)
    out = {}
    for key, vector in vectors.items():
        shifted = vector - mean
        out[key] = shifted / max(float((shifted @ shifted) ** 0.5), 1e-9)
    return out


def _centroid(thread: dict):
    if not thread.get("vectors"):
        return None
    total = sum(thread["vectors"])
    return total / max(float((total @ total) ** 0.5), 1e-9)


def _same_issue(left: dict, right: dict) -> bool:
    left_centre, right_centre = _centroid(left), _centroid(right)
    if left_centre is not None and right_centre is not None and float(left_centre @ right_centre) >= SEMANTIC_MERGE:
        return True
    left_core, right_core = _core(left), _core(right)
    shared = left_core & right_core
    # Relative overlap, so a thread that has already absorbed others cannot snowball.
    if len(shared) >= 2 and len(shared) / max(1, min(len(left_core), len(right_core))) >= 0.4:
        return True
    # A Tamil and an English thread share no words, only concepts; a recurring
    # concept in both plus a common participant marks the same issue.
    if _language(left) == _language(right):
        return False
    concepts = {token for token in shared if token.startswith("#")}
    return bool(concepts) and bool(left["people"] & right["people"])


def _language(thread: dict) -> str:
    tamil = sum(1 for step in thread["steps"] if _TAMIL.search(step["title"] or ""))
    return "ta" if tamil * 2 > len(thread["steps"]) else "en"


def _merge_threads(threads: list[dict]) -> list[dict]:
    """Join threads that turned out to follow the same issue.

    Threading is greedy and chronological, so one issue can split when its
    early reports used different words. Two threads merge when they overlap in
    time and share at least two recurring words or concepts.
    """
    merged: list[dict] = []
    for thread in sorted(threads, key=lambda item: item["steps"][0]["date"] if item["steps"] else ""):
        if not thread["steps"]:
            continue
        start = _parse(thread["steps"][0]["date"])
        target = next(
            (
                other for other in merged
                if start and start - other["last"] <= timedelta(days=3)
                and _same_issue(thread, other)
            ),
            None,
        )
        if target is None:
            merged.append(thread)
            continue
        target["steps"] = sorted(target["steps"] + thread["steps"], key=lambda step: step["date"] or "")
        target["tokens"].update(thread["tokens"])
        target["storyIds"].extend(thread["storyIds"])
        target["people"] |= thread["people"]
        target["vectors"] = (target.get("vectors", []) + thread.get("vectors", []))[-12:]
        target["last"] = max(target["last"], thread["last"])
    return merged


def build_storylines(
    news: list[dict],
    generated_at: str,
    *,
    window_days: int = 45,
    max_threads: int = 60,
    vectors: dict | None = None,
) -> dict:
    """Moves, storylines and per-politician playbooks for the recent window."""
    dated = [(record, _parse(record.get("publishedAt"))) for record in news]
    # Clients set their own post dates; nothing may claim to come from the future.
    generated = _parse(generated_at) or datetime.now(timezone.utc)
    dated = [(record, when) for record, when in dated if when is not None and when <= generated + timedelta(hours=1)]
    reference = min(generated, max((when for _, when in dated), default=generated))
    cutoff = reference - timedelta(days=window_days)
    recent = sorted(
        ((record, when) for record, when in dated if when >= cutoff and record.get("sourceTier") != "social"),
        key=lambda pair: pair[1],
    )

    moves = []
    for record, when in recent:
        move = read_move(record)
        if move is not None:
            title = record.get("title", "")
            tokens = Counter(_word_tokens(title))
            tokens.update(concept_tokens(f"{title} {_first_sentence(record.get('snippet') or '')}"))
            moves.append((record, when, move, tokens))
    # Story embeddings (EmbeddingGemma 2), when the pipeline has them, link
    # reports that share a meaning but no words, such as a Tamil and an
    # English account of one statement.
    vectors = _centred(vectors or {})
    vector_of = {
        id(record): vectors.get(record.get("rawId")) for record, *_ in moves
    }

    # Words most stories use ("DMK", "alliance") cannot tie two stories together.
    document_frequency = Counter(token for *_, tokens in moves for token in tokens)
    total = max(1, len(moves))
    # Concepts are named issues, so they may recur more often and still mean something.
    idf = {
        token: math.log(total / count)
        for token, count in document_frequency.items()
        if 2 <= count <= max(4, (0.12 if token.startswith("#") else 0.03) * total)
    }

    threads: list[dict] = []
    for record, when, move, tokens in moves:
        distinctive = {token for token in tokens if token in idf}
        best, best_score = None, 0.0
        for thread in threads:
            if when - thread["last"] > timedelta(days=7):
                continue
            bag = Counter()
            for recent_tokens in thread["recent"]:
                bag.update(recent_tokens)
            # Once a thread has a theme, new moves must share its recurring words.
            needed = 2 if len(thread["steps"]) >= 3 else 1
            shared = [token for token in distinctive if bag[token] >= needed]
            vector = vector_of[id(record)]
            # Against the thread's centre, so a chain of near neighbours cannot drift off-topic.
            centre = _centroid(thread)
            meaning = float(vector @ centre) if vector is not None and centre is not None else 0.0
            # Two distinctive words in common, or a close match in meaning;
            # people alone do not make a storyline.
            # The same named issue (SIR, Cauvery, ...); leading figures appear in too many threads to count.
            context = any(token.startswith("#") and bag[token] for token in distinctive)
            if len(shared) >= 2:
                score = sum(idf[token] for token in shared) + max(0.0, meaning - SEMANTIC_LINK_WITH_CONTEXT) * 20
            elif meaning >= SEMANTIC_LINK or (context and meaning >= SEMANTIC_LINK_WITH_CONTEXT):
                score = 7.0 + (meaning - SEMANTIC_LINK_WITH_CONTEXT) * 20
            else:
                continue
            if move["actor"] in thread["people"] or any(
                c[1:] in thread["people"] for c in move["counterparts"] if c.startswith("@")
            ):
                score += 1.5
            if score > best_score:
                best, best_score = thread, score
        if best is None or best_score < 7.0:
            best = {"recent": [], "people": set(), "steps": [], "last": when, "tokens": Counter(), "storyIds": [], "vectors": []}
            threads.append(best)
        step = _step(record, move)
        repeat = next(
            (
                earlier for earlier, earlier_tokens in zip(reversed(best["steps"]), reversed(best["recent"]))
                if earlier["actor"] == step["actor"] and earlier["action"] == step["action"]
                and len(distinctive & earlier_tokens) >= max(2, len(distinctive | earlier_tokens) // 2)
            ),
            None,
        ) if best["steps"] else None
        if repeat is not None:
            # A rewrite of a move already in the thread is more coverage, not a new move.
            repeat["outlets"] += step["outlets"]
            repeat["importance"] = max(repeat["importance"], step["importance"])
        else:
            best["steps"].append(step)
            best["recent"] = (best["recent"] + [distinctive])[-6:]
        best["tokens"].update(distinctive)
        if vector_of[id(record)] is not None:
            best["vectors"] = (best["vectors"] + [vector_of[id(record)]])[-12:]
        best["storyIds"].append(step["storyId"])
        best["people"].add(move["actor"])
        best["people"].update(c[1:] for c in move["counterparts"] if c.startswith("@"))
        best["last"] = when

    threads = _merge_threads(threads)

    published = []
    for thread in threads:
        steps = thread["steps"]
        days = {step["date"][:10] for step in steps}
        actors = {step["actor"] for step in steps}
        if len(steps) < 3 or (len(days) < 2 and len(actors) < 2):
            continue
        age_days = max(0.0, (reference - thread["last"]).total_seconds() / 86400)
        recent_steps = sum(1 for step in steps if (_parse(step["date"]) or reference) >= reference - timedelta(days=2))
        # Fresh, multi-sided storylines first: more people means more dots connected.
        weight = (
            sum((step["importance"] or 10) * step["outlets"] ** 0.5 for step in steps)
            * math.exp(-age_days / 2.5)
            * (1 + 0.5 * recent_steps / len(steps))
            * (1 + 0.15 * (len(actors) - 1))
        )
        headline = max(steps, key=lambda step: (step["importance"] or 0, step["date"]))
        published.append({
            "id": f"thread_{steps[0]['storyId']}",
            "title": headline["title"],
            "startedAt": steps[0]["date"],
            "lastAt": steps[-1]["date"],
            "participants": [
                {"id": actor, "name": actor_name(actor), "party": actor_party(actor), "moves": count}
                for actor, count in Counter(step["actor"] for step in steps).most_common()
            ],
            "score": round(weight, 1),
            "steps": steps[-30:],
            "stepCount": len(steps),
            "storyIds": thread["storyIds"],
            **_thread_reading(steps, reference),
        })
    published.sort(key=lambda thread: thread["score"], reverse=True)
    published = published[:max_threads]
    # Rewrites folded into a step still belong to the thread.
    thread_of = {story_id: thread["id"] for thread in published for story_id in thread.pop("storyIds")}

    people: dict[str, dict] = {}
    relations: Counter = Counter()
    by_actor: dict[str, list] = defaultdict(list)
    for record, when, move, _ in moves:
        by_actor[move["actor"]].append((when, _step(record, move)))
        for counterpart in move["counterparts"]:
            if counterpart.startswith("@") or counterpart in PARTY_NAMES or counterpart in INSTITUTION_NAMES:
                relations[(move["actor"], counterpart, move["action"])] += 1
    for actor, entries in by_actor.items():
        if actor.startswith("party:"):
            continue
        entries.sort(key=lambda pair: pair[0], reverse=True)
        last_week = [step for when, step in entries if when >= reference - timedelta(days=7)]
        before = [step for when, step in entries if when < reference - timedelta(days=7)]
        mix = Counter(step["objective"] for _, step in entries)

        def weighted(steps):
            # Weakly-read moves count for less when judging posture.
            totals: Counter = Counter()
            for step in steps:
                totals[step["objective"]] += _CONFIDENCE_WEIGHT[step["confidence"]]
            return totals

        recent_mix = weighted(last_week)
        earlier_mix = weighted(before)
        posture_mix = recent_mix if sum(recent_mix.values()) >= 2 else weighted(step for _, step in entries)
        posture = posture_mix.most_common(1)[0][0]
        shift = None
        if recent_mix and earlier_mix:
            was, now = earlier_mix.most_common(1)[0][0], recent_mix.most_common(1)[0][0]
            if was != now:
                shift = {"from": was, "to": now}
        targets = Counter()
        allies = Counter()
        for (source, counterpart, action), count in relations.items():
            if source != actor:
                continue
            if action in {"attack", "protest", "demand"}:
                targets[counterpart] += count
            elif action in {"alliance", "meet"}:
                allies[counterpart] += count
        attacked_by = Counter(
            source for (source, counterpart, action), count in relations.items()
            for _ in range(count)
            if counterpart == f"@{actor}" and action in {"attack", "protest", "demand"}
        )
        people[actor] = {
            "id": actor,
            "name": POLITICIAN_NAMES.get(actor, actor),
            "party": POLITICIAN_PARTY.get(actor),
            "moveCount": len(entries),
            "lastWeek": len(last_week),
            "posture": posture,
            "postureLabel": OBJECTIVES[posture],
            "shift": shift,
            "objectives": [{"id": key, "label": OBJECTIVES[key], "count": count} for key, count in mix.most_common()],
            "actions": [{"id": key, "label": ACTION_LABELS[key], "count": count} for key, count in Counter(step["action"] for _, step in entries).most_common()],
            "targets": [{"id": key, "name": counterpart_name(key), "count": count} for key, count in targets.most_common(6)],
            "allies": [{"id": key, "name": counterpart_name(key), "count": count} for key, count in allies.most_common(6)],
            "attackedBy": [
                {"id": key if key.startswith("party:") else f"@{key}", "name": actor_name(key), "count": count}
                for key, count in attacked_by.most_common(6)
            ],
            "moves": [step | {"threadId": thread_of.get(step["storyId"])} for _, step in entries[:25]],
            "threads": sorted({thread_of[step["storyId"]] for _, step in entries if step["storyId"] in thread_of}),
        }

    rivalries = [
        {
            "from": source, "fromName": actor_name(source),
            "to": counterpart, "toName": counterpart_name(counterpart),
            "action": action, "label": ACTION_LABELS[action], "count": count,
        }
        for (source, counterpart, action), count in relations.most_common()
        if action in {"attack", "rebut", "alliance", "meet", "protest", "demand"} and count >= 2
    ][:40]

    # Compact per-story reading, so the feed can show each story's move.
    story_moves = {
        (record.get("rawId") or record.get("id")): {
            "actor": move["actor"],
            "actorName": actor_name(move["actor"]),
            "action": move["action"],
            "actionLabel": ACTION_LABELS[move["action"]],
            "objective": move["objective"],
            "intent": move["intent"],
            "confidence": move["confidence"],
            "threadId": thread_of.get(record.get("rawId") or record.get("id")),
        }
        for record, _, move, _ in moves
    }

    return {
        "generatedAt": generated_at,
        "referenceAt": reference.isoformat(timespec="seconds").replace("+00:00", "Z"),
        "windowDays": window_days,
        "government": {"state": RULING_STATE_PARTY, "centre": RULING_CENTRE_PARTY},
        "objectives": OBJECTIVES,
        "moveCount": len(moves),
        "threads": published,
        "people": people,
        "relations": rivalries,
        "storyMoves": story_moves,
    }
