"""Source reputation and story importance.

Every published story carries a source tier and an importance score. The score
ignores age, so a snapshot stays valid between runs; the app multiplies it by a
recency decay when it ranks the feed.
"""
from __future__ import annotations

import math
import re

# Newsrooms with their own Tamil Nadu reporters and corrections policies.
NATIONAL_RECORD = (
    "the hindu", "the new indian express", "new indian express", "the indian express",
    "indian express", "bbc", "bbc tamil", "bbc news tamil", "reuters", "pti",
    "press trust of india", "the print", "theprint", "the news minute", "the federal",
    "frontline", "scroll", "scroll.in", "hindustan times", "deccan herald", "india today",
    "ndtv", "the times of india", "times of india", "dt next", "the south first",
    "hindu tamil thisai", "the economic times", "economic times", "mint", "livemint",
    "deccan chronicle", "the wire", "thewire.in", "outlook", "outlook india", "ians", "ani",
    "ani news", "asian news international", "businessline", "the hindu businessline",
    "news on air", "all india radio", "live law", "livelaw", "bar and bench", "the week",
)
# Established Tamil dailies and broadcasters.
REGIONAL_ESTABLISHED = (
    "dinamani", "dinamalar", "daily thanthi", "dinakaran", "vikatan", "ananda vikatan",
    "junior vikatan", "nakkheeran", "news18 tamil", "news18 tamil nadu", "puthiya thalaimurai",
    "news7 tamil", "polimer news", "thanthi tv", "etv bharat", "etv bharat tamil nadu",
    "abp nadu", "samayam tamil", "oneindia tamil", "maalai malar", "kumudam", "minnambalam",
    "the hans india", "zee news tamil", "malai murasu", "tamil murasu", "kalki",
    "the commune", "kamadenu", "indian express tamil", "hindustan times tamil",
    "bbc news", "the quint", "news minute", "news18", "puthiyathalaimurai", "times now",
    "the statesman", "abp live english", "malaimurasu seithikal", "oneindia", "free press journal",
    "asianet newsable", "rediff", "moneycontrol.com", "moneycontrol", "business today",
    "news today", "polimer", "sathiyam tv", "captain news", "raj news", "vendhar tv",
)
# Outlets owned by, or the official organs of, a party: kept, but never treated as neutral.
PARTISAN_OUTLETS = {
    "kalaignar seithigal": "dmk", "kalaignar tv": "dmk", "murasoli": "dmk", "sun news": "dmk",
    "namadhu amma": "aiadmk", "news j": "aiadmk", "jaya tv": "aiadmk", "jaya plus": "aiadmk",
    "tvk official": "tvk", "thamarai tv": "bjp", "organiser": "bjp", "organiser.org": "bjp",
    "viduthalai": "dk", "viduthalai.in": "dk", "makkal kural": "aiadmk",
}
_SOCIAL_SOURCES = re.compile(
    r"^(?:x\.com|twitter|instagram(?:\.com)?|facebook(?:\.com)?|youtube|reddit\b.*|bluesky\b.*|threads)$",
    re.IGNORECASE,
)

TIER_WEIGHT = {
    "record": 1.0,
    "established": 0.8,
    "partisan": 0.55,
    "aggregator": 0.45,
    "social": 0.35,
}
TIER_LABEL = {
    "record": "Newspaper of record",
    "established": "Established outlet",
    "partisan": "Party-affiliated outlet",
    "aggregator": "Aggregator or small site",
    "social": "Social post",
}
CATEGORY_WEIGHT = {
    "investigation": 1.15,
    "election": 1.1,
    "policy": 1.1,
    "news": 1.0,
    "social_media": 0.75,
}


def _normalized(name: str) -> str:
    return re.sub(r"\s+", " ", re.sub(r"[^\w\s.]", " ", (name or "").lower())).strip()


_RECORD = {_normalized(name) for name in NATIONAL_RECORD}
_ESTABLISHED = {_normalized(name) for name in REGIONAL_ESTABLISHED}


def source_tier(source: str, *, is_social: bool = False) -> str:
    name = _normalized(source)
    if is_social or _SOCIAL_SOURCES.match(name):
        return "social"
    if name in PARTISAN_OUTLETS:
        return "partisan"
    if name in _RECORD:
        return "record"
    if name in _ESTABLISHED:
        return "established"
    return "aggregator"


def source_affiliation(source: str) -> str | None:
    return PARTISAN_OUTLETS.get(_normalized(source))


def story_importance(record: dict) -> float:
    """0-100 score from source quality, corroboration, substance and subject."""
    tier = record.get("sourceTier") or source_tier(record.get("source", ""))
    outlets = record.get("outletCount") or 1 + len(record.get("alsoReportedBy") or [])
    # Corroboration from better outlets counts for more than a lone report.
    best = max(
        [TIER_WEIGHT[tier]]
        + [TIER_WEIGHT[source_tier(other.get("source", ""))] for other in record.get("alsoReportedBy") or []]
    )
    score = 0.65 * TIER_WEIGHT[tier] + 0.35 * best
    score *= 1 + 0.45 * math.log(outlets)
    score *= CATEGORY_WEIGHT.get(record.get("category"), 1.0)
    if record.get("politicianId") not in (None, "", "general"):
        score *= 1.15
    if len(record.get("snippet") or "") >= 80:
        score *= 1.08
    if record.get("isRumor"):
        score *= 0.6
    engagement = record.get("engagement") or {}
    reach = sum(value for value in engagement.values() if isinstance(value, (int, float)))
    if reach:
        score *= 1 + min(0.3, math.log10(1 + reach) / 15)
    # Six outlets from the record tier on an investigation is roughly the ceiling.
    return round(min(100.0, score / 2.6 * 100), 1)
