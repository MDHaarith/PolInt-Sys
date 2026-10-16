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


def classify_category(text: str) -> str:
    for category, pattern in _CATEGORY_PATTERNS:
        if pattern.search(text):
            return category
    return "news"
