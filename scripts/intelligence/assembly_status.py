from __future__ import annotations

from collections import Counter


CURRENT_VACANCIES = {
    141: {
        "currentStatus": "vacant",
        "vacancyReason": (
            "C. Joseph Vijay resigned Tiruchirappalli (East) after winning both "
            "Perambur and Tiruchirappalli (East). He retained Perambur."
        ),
        "vacatedBy": "C. Joseph Vijay",
        "vacatedOn": "2026-05-10",
        "vacancySourceUrl": (
            "https://www.newindianexpress.com/states/tamil-nadu/2026/May/10/"
            "vijay-resigns-as-member-of-trichy-east-assembly-constituency"
        ),
    }
}


def apply_current_assembly_status(mlas: list[dict], roster_meta: dict | None):
    current_mlas = []
    occupied_strength = Counter()
    vacancies = []
    for mla in mlas:
        current = dict(mla)
        vacancy = CURRENT_VACANCIES.get(current.get("constituencyNumber"))
        if vacancy:
            current.update(vacancy)
            current["isVacant"] = True
            vacancies.append(
                {
                    "constituencyNumber": current.get("constituencyNumber"),
                    "constituency": current.get("constituency"),
                    **vacancy,
                }
            )
        else:
            current["isVacant"] = False
            current["currentStatus"] = "occupied"
            occupied_strength[current.get("party") or "unknown"] += 1
        current_mlas.append(current)

    meta = dict(roster_meta or {})
    source_totals = meta.get("partyTotals") or dict(
        Counter(mla.get("party") or "unknown" for mla in mlas)
    )
    meta["sourcePartyTotals"] = source_totals
    meta["currentPartyStrength"] = dict(occupied_strength)
    meta["vacancies"] = vacancies
    meta["occupiedSeatCount"] = sum(occupied_strength.values())
    meta["vacancyCount"] = len(vacancies)
    return current_mlas, meta
