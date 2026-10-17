from __future__ import annotations

import re

# Scraper ids that predate the frontend dossier ids they describe.
LEGACY_POLITICIAN_IDS = {
    "m_k_alagiri": "mk_alagiri",
    "palanivel_thiaga_rajan": "ptr",
    "cv_shanmugam": "c_ve_shanmugam",
}

DEFAULT_ALIASES = {
    "m_karunanidhi": ["m. karunanidhi", "karunanidhi", "kalaignar", "கருணாநிதி", "கலைஞர்"],
    "j_jayalalithaa": ["j. jayalalithaa", "jayalalithaa", "jayalalitha", "ஜெயலலிதா"],
    "m_g_ramachandran": ["m. g. ramachandran", "m.g.r.", "mgr", "எம்ஜிஆர்"],
    "mk_stalin": ["m. k. stalin", "m.k. stalin", "mk stalin", "stalin", "ஸ்டாலின்"],
    "seeman": ["seeman", "சீமான்"],
    "vijay": [
        "c. joseph vijay", "joseph vijay", "cm vijay", "chief minister vijay",
        "tvk chief", "thalapathy", "vijay", "விஜய்",
    ],
    "edappadi_palaniswami": [
        "edappadi k. palaniswami", "edappadi palaniswami", "palaniswami",
        "edappadi", "EPS", "எடப்பாடி", "பழனிசாமி",
    ],
    "o_panneerselvam": ["o. panneerselvam", "panneerselvam", "OPS", "பன்னீர்செல்வம்"],
    "k_annamalai": ["k. annamalai", "annamalai", "அண்ணாமலை"],
    "v_k_sasikala": ["v. k. sasikala", "v.k. sasikala", "sasikala", "சசிகலா"],
    "thol_thirumavalavan": ["thol. thirumavalavan", "thirumavalavan", "திருமாவளவன்"],
    "udhayanidhi_stalin": ["udhayanidhi stalin", "udhayanidhi", "உதயநிதி"],
    "anbumani_ramadoss": ["anbumani ramadoss", "anbumani", "அன்புமணி"],
    "s_ramadoss": ["s. ramadoss", "ramadoss", "ராமதாஸ்"],
    "vaiko": ["vaiko", "வைகோ"],
    "kanimozhi": ["kanimozhi", "கனிமொழி"],
    "senthil_balaji": ["senthil balaji", "செந்தில் பாலாஜி"],
    "duraimurugan": ["duraimurugan", "durai murugan", "துரைமுருகன்"],
    "kamal_haasan": ["kamal haasan", "kamal hassan", "கமல்ஹாசன்"],
    "ttv_dhinakaran": ["ttv dhinakaran", "t.t.v. dhinakaran", "dhinakaran", "தினகரன்"],
    "a_raja": ["a. raja", "a raja"],
    "tr_baalu": ["t. r. baalu", "t.r. baalu", "tr baalu"],
    "ptr": ["palanivel thiaga rajan", "palanivel thiagarajan", "ptr"],
    "sp_velumani": ["s.p. velumani", "sp velumani", "velumani", "வேலுமணி"],
    "k_ponmudy": ["ponmudy", "ponmudi", "பொன்முடி"],
    "tamilisai": ["tamilisai", "தமிழிசை"],
}

# Other public figures who share an alias with a tracked politician.
_ALIAS_EXCLUSIONS = {
    "vijay": r"(?:\s+(?:sethupathi|antony|deverakonda|shankar|hazare|mallya|varma|yesudas|vasanth|milton|amritraj)|\s+kumar\s+sinha)",
    "stalin": r"(?:grad|ist|ism)",
    "விஜய": r"(?:காந்த|குமார|பாஸ்கர|சேதுபதி)",
}


def _alias_pattern(alias: str) -> re.Pattern:
    # Tamil names take case suffixes ("ஸ்டாலின்" -> "ஸ்டாலினின்"), so match the
    # stem without its final virama.
    if re.search(r"[஀-௿]", alias):
        stem = alias.removesuffix("்")
        exclusion = _ALIAS_EXCLUSIONS.get(stem, "")
        return re.compile(re.escape(stem) + (f"(?!{exclusion})" if exclusion else ""))
    exclusion = _ALIAS_EXCLUSIONS.get(alias.lower(), "")
    suffix = f"(?!{exclusion})" if exclusion else ""
    # Upper-case acronyms (EPS, OPS) only count when written as acronyms.
    flags = 0 if alias.isupper() else re.IGNORECASE
    return re.compile(rf"(?<![\w.]){re.escape(alias)}(?!\w){suffix}", flags)


_ALIAS_PATTERNS = [
    (politician_id, len(alias), _alias_pattern(alias))
    for politician_id, aliases in DEFAULT_ALIASES.items()
    for alias in aliases
]


def canonical_politician_id(politician_id: str | None) -> str | None:
    return LEGACY_POLITICIAN_IDS.get(politician_id, politician_id)


def resolve_politician(text: str, explicit_id: str | None = None) -> str | None:
    if explicit_id and explicit_id != "general":
        return canonical_politician_id(explicit_id)
    matches = [
        (length, politician_id)
        for politician_id, length, pattern in _ALIAS_PATTERNS
        if pattern.search(text or "")
    ]
    # Prefer the longest alias so "Udhayanidhi Stalin" beats "Stalin".
    return max(matches, default=(0, None))[1]
