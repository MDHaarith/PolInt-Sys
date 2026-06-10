#!/usr/bin/env python3
"""
Build the Tamil Nadu 2026 MLA roster from official ECI detailed results.

This script replaces generated roster records with source-labeled official
winner records. It does not fabricate assets, criminal cases, affidavit URLs,
or court filings.
"""
import argparse
import json
import os
import re
import shutil
import subprocess
import sys
import tempfile
from collections import Counter
from datetime import datetime, timezone
from pathlib import Path

import requests

try:
    import pdfplumber
except Exception:  # pragma: no cover - exercised only when dependency missing
    pdfplumber = None


ECI_DETAILED_RESULTS_URL = (
    "https://www.eci.gov.in/eci-backend/public/all_files/election_report/"
    "General_Election_to_the_Legislative_Assembly_of_Tamil_Nadu_2026_2026/"
    "10-Detailed_Results_1778165153.pdf"
)
ECI_RESULT_PAGE_URL = "https://results.eci.gov.in/ResultAcGenMay2026/candidateswise-S22{ac}.htm"

EXPECTED_PARTY_TOTALS = {
    "tvk": 108,
    "dmk": 59,
    "aiadmk": 47,
    "inc": 5,
    "pmk": 4,
    "cpi": 2,
    "cpm": 2,
    "iuml": 2,
    "vck": 2,
    "dmdk": 1,
    "ammk": 1,
    "bjp": 1,
}

PARTY_ID_MAP = {
    "TVK": "tvk",
    "DMK": "dmk",
    "ADMK": "aiadmk",
    "AIADMK": "aiadmk",
    "INC": "inc",
    "PMK": "pmk",
    "CPI": "cpi",
    "CPI(M)": "cpm",
    "CPM": "cpm",
    "IUML": "iuml",
    "VCK": "vck",
    "DMDK": "dmdk",
    "AMMK": "ammk",
    "AMMKMNKZ": "ammk",
    "BJP": "bjp",
    "IND": "ind",
    "INDEPENDENT": "ind",
    "INDEPENDENT / OTHER": "ind",
}

PARTY_NAME_MAP = {
    "tvk": "Tamilaga Vettri Kazhagam",
    "dmk": "Dravida Munnetra Kazhagam",
    "aiadmk": "All India Anna Dravida Munnetra Kazhagam",
    "inc": "Indian National Congress",
    "pmk": "Pattali Makkal Katchi",
    "cpi": "Communist Party of India",
    "cpm": "Communist Party of India (Marxist)",
    "iuml": "Indian Union Muslim League",
    "vck": "Viduthalai Chiruthaigal Katchi",
    "dmdk": "Desiya Murpokku Dravida Kazhagam",
    "ammk": "Amma Makkal Munnettra Kazagam",
    "bjp": "Bharatiya Janata Party",
    "ind": "Independent / Other",
}


def normalize_spaces(value):
    return re.sub(r"\s+", " ", value or "").strip()


def remove_page_artifacts(line):
    clean = normalize_spaces(line)
    clean = re.sub(r"\bPage\s+\d+\b", " ", clean, flags=re.IGNORECASE)
    clean = re.sub(r"\bP\S*[A-Za-z]\S*\s+\d{1,4}\b", " ", clean)
    return normalize_spaces(clean)


def normalize_party_id(party_code):
    normalized = normalize_spaces(party_code).upper()
    return PARTY_ID_MAP.get(normalized, re.sub(r"[^a-z0-9]+", "_", normalized.lower()).strip("_"))


def slugify(value):
    slug = re.sub(r"[^a-z0-9]+", "_", (value or "").lower()).strip("_")
    return slug or "unknown"


def parse_constituency_header(line):
    clean = normalize_spaces(line)
    match = re.match(
        r"^Constituency\s+(\d+)\s*-\s*(.+?)\s*\(\s*TOTAL ELECTORS\s*-\s*([0-9]+)\s*\)\s*$",
        clean,
        flags=re.IGNORECASE,
    )
    if not match:
        raise ValueError(f"Could not parse constituency header: {line}")

    number = int(match.group(1))
    name_part = normalize_spaces(match.group(2))
    total_electors = int(match.group(3))

    reservation = "GENERAL"
    reservation_match = re.search(r"\((SC|ST)\)\s*$", name_part, flags=re.IGNORECASE)
    if reservation_match:
        reservation = reservation_match.group(1).upper()
        name_part = normalize_spaces(name_part[: reservation_match.start()])

    return {
        "constituencyNumber": number,
        "constituency": name_part,
        "reservationCategory": reservation,
        "totalElectors": total_electors,
    }


def parse_candidate_line(line):
    clean = remove_page_artifacts(line)
    if not re.match(r"^\d+\s+", clean):
        return None

    tokens = clean.split()
    if len(tokens) < 10:
        return None

    try:
        rank = int(tokens[0])
        try:
            elector_share = float(tokens[-1])
            vote_share = float(tokens[-2])
            total_votes = int(tokens[-3])
            postal_votes = int(tokens[-4])
            general_votes = int(tokens[-5])
            prefix = tokens[1:-5]
        except ValueError:
            elector_share = None
            vote_share = float(tokens[-1])
            total_votes = int(tokens[-2])
            postal_votes = int(tokens[-3])
            general_votes = int(tokens[-4])
            prefix = tokens[1:-4]
    except ValueError:
        return None

    gender_index = next(
        (idx for idx, token in enumerate(prefix) if token.upper() in {"MALE", "FEMALE", "TRANSGENDER", "OTHER"}),
        None,
    )
    if gender_index is None or gender_index + 3 >= len(prefix):
        return None

    try:
        age = int(prefix[gender_index + 1])
    except ValueError:
        return None

    candidate_name = normalize_spaces(" ".join(prefix[:gender_index]))
    gender = prefix[gender_index].upper()
    category = prefix[gender_index + 2].upper()
    party_code = prefix[gender_index + 3]
    symbol = normalize_spaces(" ".join(prefix[gender_index + 4 :]))

    if not candidate_name:
        return None

    return {
        "rank": rank,
        "candidateName": candidate_name,
        "gender": gender,
        "age": age,
        "category": category,
        "partyCode": party_code,
        "party": normalize_party_id(party_code),
        "symbol": symbol,
        "generalVotes": general_votes,
        "postalVotes": postal_votes,
        "votes": total_votes,
        "voteShare": vote_share,
        "electorShare": elector_share,
    }


def build_winner_record(header, candidates, retrieved_at):
    ordered_candidates = sorted(candidates, key=lambda item: (-item["votes"], item["rank"]))
    if len(ordered_candidates) < 2:
        raise ValueError(f"Constituency {header['constituencyNumber']} has fewer than two parsed candidates")

    winner = ordered_candidates[0]
    runner_up = ordered_candidates[1]
    party_id = winner["party"]

    return {
        "id": f"tn-2026-{header['constituencyNumber']:03d}",
        "politicianId": f"tn_2026_{header['constituencyNumber']:03d}_{slugify(winner['candidateName'])[:48]}",
        "assemblyId": 17,
        "state": "Tamil Nadu",
        "constituencyNumber": header["constituencyNumber"],
        "constituency": header["constituency"],
        "reservationCategory": header["reservationCategory"],
        "totalElectors": header["totalElectors"],
        "candidateName": winner["candidateName"],
        "mlaName": winner["candidateName"],
        "gender": winner["gender"],
        "age": winner["age"],
        "category": winner["category"],
        "party": party_id,
        "partyCode": winner["partyCode"].upper(),
        "partyName": PARTY_NAME_MAP.get(party_id, winner["partyCode"].upper()),
        "symbol": winner["symbol"],
        "votes": winner["votes"],
        "generalVotes": winner["generalVotes"],
        "postalVotes": winner["postalVotes"],
        "voteShare": winner["voteShare"],
        "electorShare": winner["electorShare"],
        "marginVotes": winner["votes"] - runner_up["votes"],
        "runnerUpName": runner_up["candidateName"],
        "runnerUpParty": runner_up["party"],
        "runnerUpPartyCode": runner_up["partyCode"].upper(),
        "runnerUpVotes": runner_up["votes"],
        "resultStatus": "won",
        "sourceType": "official_eci",
        "isSourcedRoster": True,
        "assets": None,
        "hasCases": None,
        "casesCount": None,
        "sources": [
            {
                "label": "ECI Detailed Results PDF",
                "url": ECI_DETAILED_RESULTS_URL,
                "retrievedAt": retrieved_at,
            },
            {
                "label": "ECI Constituency Result Page",
                "url": ECI_RESULT_PAGE_URL.format(ac=header["constituencyNumber"]),
                "retrievedAt": retrieved_at,
            },
        ],
        "enrichment": {
            "secondarySources": [],
            "warnings": [],
        },
    }


def parse_winner_blocks(text, retrieved_at=None):
    retrieved_at = retrieved_at or datetime.now(timezone.utc).isoformat()
    winners = []
    current_header = None
    current_candidates = []
    pending_candidate_line = None
    pending_candidate_wrapped = False
    last_candidate = None
    last_candidate_accepts_suffix = False

    def flush_current():
        nonlocal pending_candidate_line, pending_candidate_wrapped
        nonlocal last_candidate, last_candidate_accepts_suffix
        if pending_candidate_line:
            parsed = parse_candidate_line(pending_candidate_line)
            if parsed:
                current_candidates.append(parsed)
        if current_header and current_candidates:
            winners.append(build_winner_record(current_header, current_candidates, retrieved_at))
        pending_candidate_line = None
        pending_candidate_wrapped = False
        last_candidate = None
        last_candidate_accepts_suffix = False

    def is_noise_line(value):
        upper_value = value.upper()
        return (
            value == "ST4895"
            or value.startswith("Page ")
            or upper_value.startswith("TOTAL VALID VOTES")
            or upper_value.startswith("+ NOTA")
            or upper_value.startswith("CANDIDATE NAME")
            or upper_value.startswith("VALID OVER")
            or upper_value.startswith("GENERAL POSTAL TOTAL")
            or upper_value in {"NOTA", "VOTES TOTAL", "ELECTORS"}
        )

    for raw_line in text.splitlines():
        line = normalize_spaces(raw_line)
        if not line:
            continue

        if line.startswith("Constituency "):
            flush_current()
            current_header = parse_constituency_header(line)
            current_candidates = []
            continue

        if current_header is None:
            continue

        if line.startswith("TURN OUT"):
            pending_candidate_line = None
            pending_candidate_wrapped = False
            last_candidate = None
            last_candidate_accepts_suffix = False
            continue

        if is_noise_line(line):
            continue

        if re.match(r"^\d+\s+", line):
            pending_candidate_line = line
            pending_candidate_wrapped = False
            parsed_candidate = parse_candidate_line(pending_candidate_line)
            if parsed_candidate:
                current_candidates.append(parsed_candidate)
                last_candidate = parsed_candidate
                last_candidate_accepts_suffix = False
                pending_candidate_line = None
            continue

        if pending_candidate_line:
            pending_candidate_line = f"{pending_candidate_line} {line}"
            pending_candidate_wrapped = True
            parsed_candidate = parse_candidate_line(pending_candidate_line)
            if parsed_candidate:
                current_candidates.append(parsed_candidate)
                last_candidate = parsed_candidate
                last_candidate_accepts_suffix = pending_candidate_wrapped
                pending_candidate_line = None
                pending_candidate_wrapped = False
            continue

        if last_candidate and last_candidate_accepts_suffix:
            last_candidate["candidateName"] = normalize_spaces(
                f"{last_candidate['candidateName']} {line}"
            )
            last_candidate["rawNameWasWrapped"] = True
            last_candidate_accepts_suffix = False

    flush_current()
    return winners


def download_pdf(url, target_path):
    response = requests.get(url, timeout=45, headers={"User-Agent": "Mozilla/5.0"})
    response.raise_for_status()
    if "pdf" not in response.headers.get("content-type", "").lower():
        raise ValueError(f"Expected PDF content from {url}, got {response.headers.get('content-type')}")
    target_path.write_bytes(response.content)


def extract_text_with_pdfplumber(pdf_path):
    if pdfplumber is None:
        return ""
    chunks = []
    with pdfplumber.open(str(pdf_path)) as pdf:
        for page in pdf.pages:
            chunks.append(page.extract_text(x_tolerance=1, y_tolerance=3) or "")
    return "\n".join(chunks)


def extract_text_with_pdftotext(pdf_path):
    if not shutil.which("pdftotext"):
        return ""
    completed = subprocess.run(
        ["pdftotext", "-layout", str(pdf_path), "-"],
        check=True,
        stdout=subprocess.PIPE,
        stderr=subprocess.PIPE,
        text=True,
    )
    return completed.stdout


def extract_pdf_text(pdf_path):
    text = extract_text_with_pdfplumber(pdf_path)
    if len(text) > 10000 and "Constituency" in text:
        return text

    text = extract_text_with_pdftotext(pdf_path)
    if len(text) > 10000 and "Constituency" in text:
        return text

    raise ValueError("Could not extract usable text from ECI PDF")


def validate_winners(winners, validate_party_totals=True):
    if len(winners) != 234:
        raise ValueError(f"Expected 234 constituency winners, found {len(winners)}")

    constituency_numbers = [item["constituencyNumber"] for item in winners]
    duplicate_numbers = [
        number for number, count in Counter(constituency_numbers).items() if count > 1
    ]
    if duplicate_numbers:
        raise ValueError(f"Duplicate constituency numbers: {duplicate_numbers}")

    if set(constituency_numbers) != set(range(1, 235)):
        missing = sorted(set(range(1, 235)) - set(constituency_numbers))
        raise ValueError(f"Missing constituency numbers: {missing}")

    unknown_parties = sorted(
        {
            item["partyCode"]
            for item in winners
            if item["party"] not in PARTY_NAME_MAP or item["party"] == ""
        }
    )
    if unknown_parties:
        raise ValueError(f"Unknown winning party codes: {unknown_parties}")

    if validate_party_totals:
        counts = dict(Counter(item["party"] for item in winners))
        if counts != EXPECTED_PARTY_TOTALS:
            raise ValueError(f"Party totals do not match ECI aggregate. Got {counts}")


def load_json_database(json_path):
    if not json_path.exists():
        return {"news": [], "evidence": []}
    with json_path.open("r", encoding="utf-8") as handle:
        return json.load(handle)


def is_generated_evidence(item):
    politician_id = str(item.get("politicianId", ""))
    affidavit_url = str(item.get("affidavitUrl", ""))
    return (
        politician_id.startswith("mla_")
        or politician_id.startswith("tn_2026_")
        or "/2026/TN/Constituency-" in affidavit_url
        or affidavit_url.startswith("https://affidavit.eci.gov.in/show-profile/2026/TN/")
    )


def write_roster(json_path, winners, retrieved_at):
    db = load_json_database(json_path)
    db["mlas"] = winners
    db["evidence"] = [
        item for item in db.get("evidence", []) if not is_generated_evidence(item)
    ]
    db["rosterMeta"] = {
        "assemblyId": 17,
        "state": "Tamil Nadu",
        "sourceType": "official_eci",
        "sourceUrl": ECI_DETAILED_RESULTS_URL,
        "retrievedAt": retrieved_at,
        "recordCount": len(winners),
        "partyTotals": dict(Counter(item["party"] for item in winners)),
        "secondarySources": [],
        "warnings": [
            "OneIndia secondary enrichment was not used because the site is Cloudflare-blocked from this environment.",
            "Assets, affidavits, and criminal cases are intentionally unavailable until a real affidavit ingestion step is added.",
        ],
    }

    with json_path.open("w", encoding="utf-8") as handle:
        json.dump(db, handle, indent=2, ensure_ascii=False)
        handle.write("\n")


def build_roster(pdf_path=None, pdf_url=ECI_DETAILED_RESULTS_URL, validate_party_totals=True):
    retrieved_at = datetime.now(timezone.utc).isoformat()
    if pdf_path:
        source_pdf = Path(pdf_path)
        if not source_pdf.exists():
            raise FileNotFoundError(source_pdf)
        text = extract_pdf_text(source_pdf)
    else:
        with tempfile.NamedTemporaryFile(suffix=".pdf", delete=False) as temp_file:
            source_pdf = Path(temp_file.name)
        try:
            download_pdf(pdf_url, source_pdf)
            text = extract_pdf_text(source_pdf)
        finally:
            source_pdf.unlink(missing_ok=True)

    winners = parse_winner_blocks(text, retrieved_at=retrieved_at)
    validate_winners(winners, validate_party_totals=validate_party_totals)
    return winners, retrieved_at


def main():
    parser = argparse.ArgumentParser(description="Build official Tamil Nadu 2026 MLA roster from ECI results.")
    parser.add_argument("--pdf-path", help="Use an already downloaded ECI detailed-results PDF")
    parser.add_argument("--pdf-url", default=ECI_DETAILED_RESULTS_URL, help="ECI detailed-results PDF URL")
    parser.add_argument(
        "--output",
        default=str(Path(__file__).resolve().parent.parent / "public" / "scrapedIntel.json"),
        help="JSON database path to update",
    )
    parser.add_argument(
        "--skip-party-total-validation",
        action="store_true",
        help="Skip strict party total validation against ECI aggregate counts",
    )
    args = parser.parse_args()

    winners, retrieved_at = build_roster(
        pdf_path=args.pdf_path,
        pdf_url=args.pdf_url,
        validate_party_totals=not args.skip_party_total_validation,
    )
    output_path = Path(args.output)
    output_path.parent.mkdir(parents=True, exist_ok=True)
    write_roster(output_path, winners, retrieved_at)

    totals = Counter(item["party"] for item in winners)
    print("Official ECI roster written")
    print(f"  Output       : {output_path}")
    print(f"  Winners      : {len(winners)}")
    print(f"  Party totals : {dict(sorted(totals.items()))}")
    print(f"  Retrieved at : {retrieved_at}")


if __name__ == "__main__":
    try:
        main()
    except Exception as exc:
        print(f"ERROR: {exc}", file=sys.stderr)
        sys.exit(1)
