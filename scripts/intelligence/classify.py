import re


SOCIAL_MEDIA_KEYWORDS = (
    "tweet", "tweets", "tweeted", "twitter", "x.com", "social media",
    "instagram", "facebook", "viral post", "viral posts", "troll", "trolls",
    "trolling", "meme", "memes", "trending", "IT cell", "IT cells", "IT wing",
    "IT wings", "x post", "x posts", "retweet", "retweets", "hashtag", "hashtags",
    "viral video", "viral videos", "online war", "deleted tweet",
    "social media war", "digital campaign",
)
INVESTIGATION_KEYWORDS = (
    "scam", "scams", "corruption", "arrest", "arrests", "arrested", "arresting",
    "jail", "jailed", "convicted", "fir", "firs", "chargesheet", "chargesheets",
    "raid", "raids", "raided", "raiding", "ed raid", "cbi probe", "pmla",
    "disproportionate assets",
)
ELECTION_KEYWORDS = (
    "election", "elections", "campaign", "campaigns", "campaigning", "alliance",
    "alliances", "manifesto", "manifestos", "poll", "polls", "polling", "vote",
    "votes", "voted", "voting", "constituency", "constituencies", "candidate",
    "candidates", "ballot", "ballots",
)
POLICY_KEYWORDS = (
    "scheme", "schemes", "welfare scheme", "policy announcement", "government order",
    "government orders", "g.o.", "budget allocation", "beneficiary", "beneficiaries",
    "subsidy", "subsidies", "rollout", "implementation", "impact", "cabinet review",
    "project review", "department circular", "neet exemption",
)

_CATEGORY_PATTERNS = tuple(
    (category, re.compile(r"(?<!\w)(?:" + "|".join(map(re.escape, keywords)) + r")(?!\w)", re.IGNORECASE))
    for category, keywords in (
        ("social_media", SOCIAL_MEDIA_KEYWORDS),
        ("investigation", INVESTIGATION_KEYWORDS),
        ("election", ELECTION_KEYWORDS),
        ("policy", POLICY_KEYWORDS),
    )
)


_UNVERIFIED_SIGNAL_PATTERN = re.compile(
    r"(?<!\w)(?:rumou?rs?|speculations?|buzz|unverified|alleged(?:ly)?|"
    r"leak(?:s|ed|ing)?|viral|social media|x posts?|tweets?|hashtags?|"
    r"claim(?:s|ed|ing)?)(?!\w)",
    re.IGNORECASE,
)


def detect_unverified_signal(text: str) -> bool:
    return bool(_UNVERIFIED_SIGNAL_PATTERN.search(text or ""))


# Reporters routinely write "alleges" or "claims"; only these words mark a report as hearsay.
_HEARSAY_PATTERN = re.compile(
    r"(?<!\w)(?:rumou?rs?|speculations?|buzz|unverified|leak(?:s|ed)?|viral)(?!\w)",
    re.IGNORECASE,
)


def reports_hearsay(text: str) -> bool:
    return bool(_HEARSAY_PATTERN.search(text or ""))


def classify_category(text: str) -> str:
    for category, pattern in _CATEGORY_PATTERNS:
        if pattern.search(text):
            return category
    return "news"


# Broad publisher feeds and keyword social searches return weather, cinema and
# marketing posts; only items with a political signal belong in the archive.
POLITICAL_KEYWORDS = (
    "dmk", "aiadmk", "admk", "tvk", "bjp", "congress", "ntk", "pmk", "vck", "mdmk",
    "ammk", "dmdk", "mnm", "cpi", "cpi(m)", "cpm", "iuml", "nda", "india bloc",
    "chief minister", "cm", "deputy cm", "minister", "ministers", "mla", "mlas", "mp", "mps",
    "governor", "assembly", "legislative", "cabinet", "government", "govt", "opposition",
    "party", "parties", "cadre", "cadres", "functionary", "functionaries", "election",
    "elections", "bypoll", "bypolls", "poll", "polls", "vote", "votes", "voter", "voters",
    "sir", "eci", "election commission", "ballot", "campaign", "alliance", "manifesto",
    "candidate", "constituency", "panchayat", "corporation council", "mayor", "councillor",
    "scheme", "schemes", "policy", "bill", "ordinance", "budget", "g.o.", "protest", "rally",
    "agitation", "strike", "hunger strike", "parliament", "lok sabha", "rajya sabha", "speaker",
    "ed", "cbi", "dvac",
    "corruption", "scam", "governance", "politics", "political", "politician", "dravidian",
    "slams", "criticises", "criticizes",
)
POLITICAL_TAMIL_KEYWORDS = (
    "திமுக", "அதிமுக", "தவெக", "பாஜக", "காங்கிரஸ்", "நாம் தமிழர்", "பாமக", "விசிக", "மதிமுக",
    "அமமுக", "தேமுதிக", "கம்யூனிஸ்ட்", "முதல்வர்", "முதலமைச்சர்", "அமைச்சர்", "எம்எல்ஏ",
    "எம்.எல்.ஏ", "எம்பி", "ஆளுநர்", "சட்டமன்ற", "சட்டப்பேரவை", "சட்டசபை", "அரசு", "அரசியல்",
    "கட்சி", "தேர்தல்", "வாக்கு", "கூட்டணி", "எதிர்க்கட்சி", "திட்டம்", "போராட்ட", "ஆர்ப்பாட்ட",
    "நீதிமன்ற", "கைது", "ஊழல்", "பிரச்சார", "வேட்பாளர்", "தொகுதி", "நிர்வாகி",
)
_POLITICAL_PATTERN = re.compile(
    r"(?<![\w.])(?:" + "|".join(map(re.escape, sorted(POLITICAL_KEYWORDS, key=len, reverse=True))) + r")(?!\w)",
    re.IGNORECASE,
)
# Acronyms such as "SIR" or "ED" are only political when written in capitals.
_CASE_SENSITIVE_POLITICAL = re.compile(r"(?<![\w.])(?:SIR|ED|EC|CM|MP|MPs)(?!\w)")
_AMBIGUOUS_LOWERCASE = {"sir", "ed", "cm", "mp", "mps"}


def is_political(text: str) -> bool:
    text = text or ""
    if any(keyword in text for keyword in POLITICAL_TAMIL_KEYWORDS):
        return True
    if _CASE_SENSITIVE_POLITICAL.search(text):
        return True
    return any(
        match.group(0).lower() not in _AMBIGUOUS_LOWERCASE
        for match in _POLITICAL_PATTERN.finditer(text)
    )
