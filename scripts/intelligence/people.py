from __future__ import annotations

DEFAULT_ALIASES = {
    "m_karunanidhi": ["m. karunanidhi", "karunanidhi", "kalaignar"],
    "j_jayalalithaa": ["j. jayalalithaa", "jayalalithaa", "amma"],
    "m_g_ramachandran": ["m. g. ramachandran", "m.g.r.", "mgr"],
    "mk_stalin": ["m. k. stalin", "m.k. stalin", "mk stalin", "stalin"],
    "seeman": ["seeman"],
    "vijay": ["c. joseph vijay", "joseph vijay", "vijay", "thalapathy"],
    "edappadi_palaniswami": [
        "edappadi k. palaniswami",
        "edappadi palaniswami",
        "palaniswami",
        "eps",
    ],
    "o_panneerselvam": ["o. panneerselvam", "panneerselvam", "ops"],
    "k_annamalai": ["k. annamalai", "annamalai"],
    "v_k_sasikala": ["v. k. sasikala", "v.k. sasikala", "sasikala"],
    "thol_thirumavalavan": ["thol. thirumavalavan", "thirumavalavan"],
    "udhayanidhi_stalin": ["udhayanidhi stalin", "udhayanidhi"],
}


def resolve_politician(text: str, explicit_id: str | None = None) -> str | None:
    if explicit_id and explicit_id != "general":
        return explicit_id
    lowered = f" {text.lower()} "
    matches = []
    for politician_id, aliases in DEFAULT_ALIASES.items():
        for alias in aliases:
            marker = f" {alias.lower()} "
            if marker in lowered:
                matches.append((len(alias), politician_id))
    return max(matches, default=(0, None))[1]

