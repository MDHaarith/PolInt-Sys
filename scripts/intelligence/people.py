from __future__ import annotations

import re

# Scraper ids that predate the frontend dossier ids they describe.
LEGACY_POLITICIAN_IDS = {
    "m_k_alagiri": "mk_alagiri",
    "palanivel_thiaga_rajan": "ptr",
    "cv_shanmugam": "c_ve_shanmugam",
}

DEFAULT_ALIASES = {
    "m_karunanidhi": ["m. karunanidhi", "karunanidhi", "kalaignar", "கருணாநிதி"],
    "j_jayalalithaa": ["j. jayalalithaa", "jayalalithaa", "jayalalitha", "ஜெயலலிதா"],
    "m_g_ramachandran": ["m. g. ramachandran", "m.g.r.", "mgr", "எம்ஜிஆர்"],
    "mk_stalin": ["m. k. stalin", "m.k. stalin", "mk stalin", "stalin", "மு.க.ஸ்டாலின்", "மு.க. ஸ்டாலின்", "ஸ்டாலின்"],
    "seeman": ["seeman", "சீமான்"],
    "vijay": [
        "c. joseph vijay", "joseph vijay", "cm vijay", "chief minister vijay",
        "tvk chief", "thalapathy", "vijay", "விஜய்",
    ],
    "edappadi_palaniswami": [
        "edappadi k. palaniswami", "edappadi palaniswami", "palaniswami",
        "edappadi", "EPS", "எடப்பாடி பழனிசாமி", "எடப்பாடி கே.பழனிசாமி", "எடப்பாடி", "பழனிசாமி",
    ],
    "o_panneerselvam": ["o. panneerselvam", "panneerselvam", "OPS", "பன்னீர்செல்வம்"],
    "k_annamalai": ["k. annamalai", "annamalai", "அண்ணாமலை"],
    "v_k_sasikala": ["v. k. sasikala", "v.k. sasikala", "sasikala", "சசிகலா"],
    "thol_thirumavalavan": ["thol. thirumavalavan", "thirumavalavan", "திருமாவளவன்"],
    "udhayanidhi_stalin": ["udhayanidhi stalin", "udhayanidhi", "உதயநிதி ஸ்டாலின்", "உதயநிதி"],
    "anbumani_ramadoss": ["anbumani ramadoss", "anbumani", "அன்புமணி"],
    "s_ramadoss": ["s. ramadoss", "ramadoss", "ராமதாஸ்"],
    "vaiko": ["vaiko", "வைகோ"],
    "kanimozhi": ["kanimozhi", "கனிமொழி"],
    "senthil_balaji": ["senthil balaji", "செந்தில் பாலாஜி"],
    "duraimurugan": ["duraimurugan", "durai murugan", "துரைமுருகன்"],
    "kamal_haasan": ["kamal haasan", "kamal hassan", "கமல்ஹாசன்"],
    "ttv_dhinakaran": ["ttv dhinakaran", "t.t.v. dhinakaran", "dhinakaran", "தினகரன்"],
    "a_raja": ["a. raja"],
    "tr_baalu": ["t. r. baalu", "t.r. baalu", "tr baalu"],
    "ptr": ["palanivel thiaga rajan", "palanivel thiagarajan", "ptr"],
    "sp_velumani": ["s.p. velumani", "sp velumani", "velumani", "வேலுமணி"],
    "k_ponmudy": ["ponmudy", "ponmudi", "பொன்முடி"],
    "tamilisai": ["tamilisai", "தமிழிசை"],
    # Frequently quoted leaders without a dossier yet; tracked so headlines
    # about them are not credited to the person they answer.
    "nainar_nagendran": ["nainar nagendran", "nainar", "நயினார் நாகேந்திரன்", "நயினார்"],
    "aadhav_arjuna": ["aadhav arjuna", "aadhav arjun", "ஆதவ் அர்ஜுனா", "ஆதவ் அர்ஜுன்"],
    "bussy_anand": ["bussy anand", "bussy n. anand", "புஸ்ஸி ஆனந்த்"],
    "manickam_tagore": ["manickam tagore", "மாணிக்கம் தாகூர்"],
    "selvaperunthagai": ["selvaperunthagai", "செல்வப்பெருந்தகை"],
    "rahul_gandhi": ["rahul gandhi", "ராகுல் காந்தி"],
    "l_murugan": ["l. murugan", "l murugan", "union minister murugan", "murugan", "எல்.முருகன்"],
    "premalatha_vijayakanth": ["premalatha vijayakanth", "premalatha", "பிரேமலதா"],
    "sengottaiyan": ["sengottaiyan", "செங்கோட்டையன்"],
    # Dossier subjects the collectors search for by name.
    "kn_nehru": ["k.n. nehru", "k. n. nehru", "kn nehru", "கே.என்.நேரு", "கே.என். நேரு"],
    "ma_subramanian": ["ma. subramanian", "ma subramanian", "மா.சுப்பிரமணியன்", "மா. சுப்பிரமணியன்"],
    "ev_velu": ["e.v. velu", "e. v. velu", "ev velu", "எ.வ.வேலு", "எ.வ. வேலு"],
    "c_ve_shanmugam": ["c.ve. shanmugam", "c. ve. shanmugam", "c ve shanmugam", "cv shanmugam", "சி.வி.சண்முகம்", "சி.வி. சண்முகம்"],
    "mk_alagiri": ["m.k. alagiri", "m. k. alagiri", "mk alagiri", "alagiri", "அழகிரி"],
    "k_kamaraj": ["kamarajar", "kamaraj", "காமராஜர்", "காமராசர்"],
    "cn_annadurai": ["c.n. annadurai", "annadurai", "அண்ணாதுரை", "பேரறிஞர் அண்ணா"],
    "c_rajagopalachari": ["rajagopalachari", "rajaji", "ராஜாஜி"],
    "periyar": ["thanthai periyar", "e.v. ramasamy", "periyar", "தந்தை பெரியார்", "பெரியார்"],
}

# Party of each tracked politician, as recorded in the frontend dossiers.
POLITICIAN_PARTY = {
    "m_karunanidhi": "dmk", "j_jayalalithaa": "aiadmk", "m_g_ramachandran": "aiadmk",
    "mk_stalin": "dmk", "seeman": "ntk", "vijay": "tvk", "edappadi_palaniswami": "aiadmk",
    "o_panneerselvam": "ind", "k_annamalai": "tdk", "v_k_sasikala": "ind",
    "thol_thirumavalavan": "vck", "udhayanidhi_stalin": "dmk", "anbumani_ramadoss": "pmk",
    "s_ramadoss": "pmk", "vaiko": "mdmk", "kanimozhi": "dmk", "senthil_balaji": "dmk",
    "duraimurugan": "dmk", "kamal_haasan": "mnm", "ttv_dhinakaran": "ammk", "a_raja": "dmk",
    "tr_baalu": "dmk", "ptr": "dmk", "sp_velumani": "aiadmk", "k_ponmudy": "dmk",
    "tamilisai": "bjp", "mk_alagiri": "ind", "c_ve_shanmugam": "aiadmk",
    "nainar_nagendran": "bjp", "aadhav_arjuna": "tvk", "bussy_anand": "tvk",
    "manickam_tagore": "congress", "selvaperunthagai": "congress", "rahul_gandhi": "congress",
    "l_murugan": "bjp", "premalatha_vijayakanth": "dmdk", "sengottaiyan": "tvk",
    "kn_nehru": "dmk", "ma_subramanian": "dmk", "ev_velu": "dmk", "k_kamaraj": "congress",
    "cn_annadurai": "dmk", "c_rajagopalachari": "congress", "periyar": "dk",
}

POLITICIAN_NAMES = {
    "m_karunanidhi": "M. Karunanidhi", "j_jayalalithaa": "J. Jayalalithaa",
    "m_g_ramachandran": "M. G. Ramachandran", "mk_stalin": "M. K. Stalin", "seeman": "Seeman",
    "vijay": "Vijay", "edappadi_palaniswami": "Edappadi K. Palaniswami",
    "o_panneerselvam": "O. Panneerselvam", "k_annamalai": "K. Annamalai",
    "v_k_sasikala": "V. K. Sasikala", "thol_thirumavalavan": "Thol. Thirumavalavan",
    "udhayanidhi_stalin": "Udhayanidhi Stalin", "anbumani_ramadoss": "Anbumani Ramadoss",
    "s_ramadoss": "S. Ramadoss", "vaiko": "Vaiko", "kanimozhi": "Kanimozhi",
    "senthil_balaji": "V. Senthil Balaji", "duraimurugan": "Duraimurugan",
    "kamal_haasan": "Kamal Haasan", "ttv_dhinakaran": "T. T. V. Dhinakaran", "a_raja": "A. Raja",
    "tr_baalu": "T. R. Baalu", "ptr": "Palanivel Thiaga Rajan", "sp_velumani": "S. P. Velumani",
    "k_ponmudy": "K. Ponmudy", "tamilisai": "Tamilisai Soundararajan",
    "mk_alagiri": "M. K. Alagiri", "c_ve_shanmugam": "C. Ve. Shanmugam",
    "nainar_nagendran": "Nainar Nagendran", "aadhav_arjuna": "Aadhav Arjuna",
    "bussy_anand": "Bussy N. Anand", "manickam_tagore": "Manickam Tagore",
    "selvaperunthagai": "K. Selvaperunthagai", "rahul_gandhi": "Rahul Gandhi",
    "l_murugan": "L. Murugan", "premalatha_vijayakanth": "Premalatha Vijayakanth",
    "sengottaiyan": "K. A. Sengottaiyan",
    "kn_nehru": "K. N. Nehru", "ma_subramanian": "Ma. Subramanian", "ev_velu": "E. V. Velu",
    "k_kamaraj": "K. Kamaraj", "cn_annadurai": "C. N. Annadurai", "c_rajagopalachari": "C. Rajagopalachari",
    "periyar": "Periyar E. V. Ramasamy",
}

# Other public figures who share an alias with a tracked politician.
_ALIAS_EXCLUSIONS = {
    "vijay": r"(?:\s+(?:sethupathi|antony|deverakonda|shankar|hazare|mallya|varma|yesudas|vasanth|milton|amritraj)|\s+kumar\s+sinha)",
    "stalin": r"(?:grad|ist|ism)",
    # Places and institutions named after Periyar are not stories about him.
    "periyar": r"(?:'s)?\s+(?:arivulagam|knowledge|centre|center|university|river|dam|bus|nagar|samathuvapuram|memorial|library|statue)",
    "பெரியார": r"(?:\s*அறிவுலக|\s*பல்கலை|\s*பேருந்து|\s*நகர்|\s*சிலை|\s*அணை)",
    "murugan": r"(?:\s+(?:temple|kovil|koil|shrine|devotees?)|\s+idol)",
    # "கலைஞர்" alone is the ordinary word for artist, so it is not an alias.
    "விஜய": r"(?:காந்த|குமார|பாஸ்கர|சேதுபதி|ஆண்டனி|வசந்த|தேவரகொண்டா)",
}


def _alias_pattern(alias: str) -> re.Pattern:
    # Tamil names take case suffixes ("ஸ்டாலின்" -> "ஸ்டாலினின்"), so match the
    # stem without its final virama.
    if re.search(r"[஀-௿]", alias):
        stem = alias.removesuffix("்")
        exclusion = _ALIAS_EXCLUSIONS.get(stem, "")
        # The other person's name may follow after the virama and a space: "விஜய் சேதுபதி".
        return re.compile(re.escape(stem) + (f"(?!்?\\s*{exclusion})" if exclusion else ""))
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


def politician_mentions(text: str) -> list[tuple[int, int, str]]:
    """(start, end, politician id) for each name in the text, left to right.

    A shorter alias inside a longer one ("Stalin" in "Udhayanidhi Stalin") is
    not a separate mention.
    """
    spans = []
    for politician_id, _, pattern in _ALIAS_PATTERNS:
        for match in pattern.finditer(text or ""):
            spans.append((match.start(), -(match.end() - match.start()), match.end(), politician_id))
    spans.sort()
    mentions = []
    covered_until = -1
    for start, _, end, politician_id in spans:
        if start < covered_until:
            continue
        covered_until = end
        mentions.append((start, end, politician_id))
    return mentions


def mentioned_politicians(text: str) -> list[str]:
    """Tracked politicians in the order the text first names them."""
    ordered: list[str] = []
    for _, _, politician_id in politician_mentions(text):
        if politician_id not in ordered:
            ordered.append(politician_id)
    return ordered


def resolve_politician(text: str, explicit_id: str | None = None) -> str | None:
    if explicit_id and explicit_id != "general":
        return canonical_politician_id(explicit_id)
    # Headlines name their subject first: "EPS slams Stalin" is about EPS.
    mentions = mentioned_politicians(text)
    return mentions[0] if mentions else None
