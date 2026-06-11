from __future__ import annotations

import hashlib
import json
import re
from datetime import datetime
from email.utils import parsedate_to_datetime
from urllib.parse import urlsplit

from .people import resolve_politician
from .warehouse import now_utc_iso


EVENT_PATTERNS = [
    ("bail", r"\b(?:grants?|granted|gets?|secured|denied|rejects?)\s+bail\b"),
    ("remand", r"\bremand(?:ed)?\b|\bjudicial custody\b"),
    ("appeal", r"\bappeal(?:s|ed)?\b|\bchallenges? .* (?:order|verdict|conviction)\b"),
    ("acquittal", r"\bacquit(?:tal|ted)?\b"),
    ("conviction", r"\bconvict(?:ion|ed)?\b|\bsentenced?\b"),
    ("fir", r"\bfir\b|\bfirst information report\b|\bbooked (?:for|under|by)\b"),
    ("arrest", r"\barrest(?:s|ed)?\b|\bdetain(?:s|ed|tion)?\b|\btaken into custody\b"),
    ("raid", r"\braid(?:s|ed)?\b|\bsearches? .* (?:home|office|residence)\b"),
    ("summons", r"\bsummon(?:s|ed)?\b|\bnotice issued\b"),
    ("court_hearing", r"\bcourt (?:hears?|hearing)\b|\bhearing (?:in|on|before)\b|\bplea (?:heard|listed)\b"),
    ("resignation", r"\bresign(?:s|ed|ation)?\b|\bsteps? down\b"),
    ("defection", r"\bdefect(?:s|ed|ion)?\b|\bjoins? (?:dmk|aiadmk|tvk|bjp|inc|congress|ntk)\b|\bswitches? party\b"),
    ("suspension", r"\bsuspend(?:s|ed|sion)?\b|\bexpel(?:s|led|ulsion)?\b|\bdisciplinary action\b"),
    ("appointment", r"\bappoint(?:s|ed|ment)?\b|\bsworn in\b|\btakes? oath\b"),
    ("death", r"\bdies?\b|\bpasses? away\b|\bdeath of\b"),
    ("hospitalization", r"\bhospitali[sz](?:ed|ation)\b|\badmitted to hospital\b"),
    ("policy", r"\blaunch(?:es|ed)?\b|\bscheme\b|\bgovernment order\b|\bg\.o\.\b|\bpolicy\b|\bsanction(?:s|ed)?\b"),
    ("protest", r"\bprotest(?:s|ed|ers)?\b|\bdemonstration\b|\bhunger strike\b|\brally\b|\broad blockade\b"),
    ("speech", r"\baddresses?\b|\bspeech\b|\bpress meet\b|\bpress conference\b|\bremarks?\b"),
]

LEGAL_TYPES = {
    "fir",
    "raid",
    "summons",
    "arrest",
    "remand",
    "bail",
    "court_hearing",
    "conviction",
    "acquittal",
    "appeal",
}


def detect_event_type(text: str) -> str | None:
    lowered = " ".join(text.lower().split())
    for event_type, pattern in EVENT_PATTERNS:
        if re.search(pattern, lowered):
            return event_type
    return None


def normalize_date(value: str | None) -> tuple[str | None, str, int | None]:
    if not value:
        return None, "unknown", None
    raw = str(value).strip()
    try:
        parsed = datetime.fromisoformat(raw.replace("Z", "+00:00"))
        return parsed.date().isoformat(), "date", parsed.year
    except ValueError:
        pass
    for fmt in ("%B %d, %Y", "%b %d, %Y", "%Y-%m-%d", "%Y-%m", "%Y"):
        try:
            parsed = datetime.strptime(raw, fmt)
            precision = "year" if fmt == "%Y" else "month" if fmt == "%Y-%m" else "date"
            occurred = str(parsed.year) if precision == "year" else parsed.strftime("%Y-%m") if precision == "month" else parsed.date().isoformat()
            return occurred, precision, parsed.year
        except ValueError:
            continue
    try:
        parsed = parsedate_to_datetime(raw)
        return parsed.date().isoformat(), "date", parsed.year
    except (TypeError, ValueError, OverflowError):
        match = re.search(r"\b(19|20)\d{2}\b", raw)
        year = int(match.group(0)) if match else None
        return (str(year) if year else None), ("year" if year else "unknown"), year


def independence_key(url: str | None, source_id: str) -> str:
    host = urlsplit(url or "").hostname
    return (host or source_id).lower().removeprefix("www.")


def event_key(politician_id: str | None, event_type: str, occurred_at: str | None) -> str:
    return "|".join((politician_id or "general", event_type, occurred_at or "unknown"))


def stable_event_id(key: str) -> str:
    return f"event_auto_{hashlib.sha256(key.encode('utf-8')).hexdigest()[:18]}"


class EventExtractor:
    def __init__(self, warehouse):
        self.warehouse = warehouse

    def _candidates(self):
        rows = self.warehouse.connection.execute(
            """
            SELECT raw_items.*, sources.name AS source_name,
                   sources.source_type AS stored_source_type
            FROM raw_items
            JOIN sources ON sources.id = raw_items.source_id
            ORDER BY COALESCE(raw_items.published_at, raw_items.retrieved_at), raw_items.id
            """
        ).fetchall()
        candidates = []
        for row in rows:
            combined = f"{row['title']} {row['body']}"
            event_type = detect_event_type(combined)
            if not event_type:
                continue
            politician_id = resolve_politician(combined, row["politician_id"])
            occurred_at, precision, year = normalize_date(row["published_at"])
            candidates.append(
                {
                    "raw_item_id": row["id"],
                    "title": row["title"],
                    "body": row["body"],
                    "event_type": event_type,
                    "politician_id": politician_id,
                    "occurred_at": occurred_at,
                    "precision": precision,
                    "year": year,
                    "is_social": bool(row["is_social"]),
                    "verification_status": row["verification_status"],
                    "source_type": row["stored_source_type"],
                    "independence_key": independence_key(row["canonical_url"], row["source_id"]),
                    "url": row["canonical_url"],
                    "source_name": row["source_name"],
                }
            )
        return candidates

    def extract_all(self) -> dict:
        groups = {}
        for candidate in self._candidates():
            key = event_key(
                candidate["politician_id"],
                candidate["event_type"],
                candidate["occurred_at"],
            )
            groups.setdefault(key, []).append(candidate)

        upserted = 0
        social_only = 0
        with self.warehouse.transaction():
            for key, candidates in groups.items():
                non_social = [item for item in candidates if not item["is_social"]]
                if not non_social:
                    social_only += 1
                    continue
                official = any(
                    any(term in item["source_type"].lower() for term in ("official", "court", "police", "eci", "government"))
                    for item in non_social
                )
                independent_sources = {item["independence_key"] for item in non_social}
                verification = (
                    "official"
                    if official
                    else "corroborated"
                    if len(independent_sources) >= 2
                    else "reported"
                )
                confidence = 1.0 if official else 0.85 if verification == "corroborated" else 0.65
                primary = non_social[0]
                event_id = stable_event_id(key)
                now = now_utc_iso()
                existing = self.warehouse.connection.execute(
                    "SELECT is_curated FROM events WHERE event_key = ?", (key,)
                ).fetchone()
                if existing and existing["is_curated"]:
                    event_id = self.warehouse.connection.execute(
                        "SELECT id FROM events WHERE event_key = ?", (key,)
                    ).fetchone()["id"]
                else:
                    self.warehouse.connection.execute(
                        """
                        INSERT INTO events (
                            id, event_key, title, description, event_type,
                            occurred_at, occurred_precision, year,
                            primary_politician_id, verification_status, confidence,
                            impact_summary, is_curated, source_links_json,
                            watch_items_json, created_at, updated_at
                        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 0, ?, '[]', ?, ?)
                        ON CONFLICT(event_key) DO UPDATE SET
                            verification_status = excluded.verification_status,
                            confidence = excluded.confidence,
                            updated_at = excluded.updated_at
                        """,
                        (
                            event_id,
                            key,
                            primary["title"],
                            primary["body"] or primary["title"],
                            primary["event_type"],
                            primary["occurred_at"],
                            primary["precision"],
                            primary["year"],
                            primary["politician_id"],
                            verification,
                            confidence,
                            "",
                            json.dumps(
                                [
                                    {"label": item["source_name"], "url": item["url"]}
                                    for item in candidates
                                    if item["url"]
                                ],
                                ensure_ascii=False,
                            ),
                            now,
                            now,
                        ),
                    )
                if primary["politician_id"]:
                    self.warehouse.connection.execute(
                        """
                        INSERT OR IGNORE INTO event_people (event_id, politician_id, role)
                        VALUES (?, ?, 'subject')
                        """,
                        (event_id, primary["politician_id"]),
                    )
                for item in candidates:
                    role = "social_signal" if item["is_social"] else "primary_report"
                    self.warehouse.connection.execute(
                        """
                        INSERT OR IGNORE INTO event_evidence (
                            event_id, raw_item_id, evidence_role,
                            independence_key, added_at
                        ) VALUES (?, ?, ?, ?, ?)
                        """,
                        (
                            event_id,
                            item["raw_item_id"],
                            role,
                            item["independence_key"],
                            now,
                        ),
                    )
                upserted += 1
            self._link_legal_events()
        return {
            "events_upserted": upserted,
            "social_only_candidates": social_only,
            "event_total": self.warehouse.count("events"),
        }

    def _link_legal_events(self):
        people = [
            row[0]
            for row in self.warehouse.connection.execute(
                """
                SELECT DISTINCT primary_politician_id FROM events
                WHERE primary_politician_id IS NOT NULL
                """
            )
        ]
        for politician_id in people:
            rows = self.warehouse.connection.execute(
                """
                SELECT id, event_type FROM events
                WHERE primary_politician_id = ?
                ORDER BY COALESCE(occurred_at, year), id
                """,
                (politician_id,),
            ).fetchall()
            legal_rows = [row for row in rows if row["event_type"] in LEGAL_TYPES]
            for previous, current in zip(legal_rows, legal_rows[1:]):
                if previous["event_type"] == current["event_type"]:
                    continue
                self.warehouse.connection.execute(
                    """
                    INSERT OR IGNORE INTO event_links (
                        source_event_id, target_event_id, relationship,
                        confidence, source
                    ) VALUES (?, ?, 'legal-follow-up', 0.7, 'automatic')
                    """,
                    (previous["id"], current["id"]),
                )
