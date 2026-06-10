# Hybrid MLA Roster Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace generated/fake 17th Assembly MLA data with a source-labeled ECI-first roster plus free secondary-source enrichment hooks.

**Architecture:** Add a focused Python roster builder that parses the official ECI detailed-results PDF, validates 234 constituency winners, computes margins, preserves existing news/evidence data without fabricating official claims, and writes `public/scrapedIntel.json`. Update React merge/rendering logic so real MLA result fields appear in the Assembly Dashboard and unsourced assets/cases render honestly.

**Tech Stack:** Python 3 standard library plus existing `requests`, `pdfplumber`, and `bs4`; React 19/Vite; existing CSS and lucide icons.

---

### Task 1: Add Testable ECI Roster Parser

**Files:**
- Create: `scripts/build_mla_roster.py`
- Create: `tests/test_build_mla_roster.py`

- [ ] **Step 1: Write parser tests**

Create `tests/test_build_mla_roster.py`:

```python
import unittest

from scripts.build_mla_roster import (
    normalize_party_id,
    parse_constituency_header,
    parse_candidate_line,
    parse_winner_blocks,
)


SAMPLE_TEXT = """
Election Commission of India, State Election,2026 to the legislative assembly of Tamil Nadu
Constituency 1 - GUMMIDIPOONDI ( TOTAL ELECTORS - 254175)
1 S.vijayakumar MALE 56 GENERAL TVK Whistle 93820 500 94320 40.56 37.11
2 Sudhakar.v MALE 40 GENERAL ADMK Two leaves 65894 481 66375 28.55 26.11
3 T.j.govindarajan MALE 65 GENERAL DMK Rising sun 61922 570 62492 26.88 24.59
TURN OUT TOTAL: 230900 1622 232522 - 91.48
Constituency 2 - PONNERI (SC) ( TOTAL ELECTORS - 251421)
1 Dr.ravi.m.s MALE 67 SC TVK Whistle 110051 388 110439 48.69 43.93
2 Durai Chandrasekar MALE 53 SC INC Hand 54301 370 54671 24.1 21.74
TURN OUT TOTAL: 225676 1143 226819 - 90.21
"""


class BuildMlaRosterTest(unittest.TestCase):
    def test_normalize_party_id(self):
        self.assertEqual(normalize_party_id("TVK"), "tvk")
        self.assertEqual(normalize_party_id("ADMK"), "aiadmk")
        self.assertEqual(normalize_party_id("DMK"), "dmk")
        self.assertEqual(normalize_party_id("Independent"), "ind")

    def test_parse_constituency_header(self):
        parsed = parse_constituency_header("Constituency 2 - PONNERI (SC) ( TOTAL ELECTORS - 251421)")
        self.assertEqual(parsed["constituencyNumber"], 2)
        self.assertEqual(parsed["constituency"], "PONNERI")
        self.assertEqual(parsed["reservationCategory"], "SC")
        self.assertEqual(parsed["totalElectors"], 251421)

    def test_parse_candidate_line(self):
        parsed = parse_candidate_line("1 S.vijayakumar MALE 56 GENERAL TVK Whistle 93820 500 94320 40.56 37.11")
        self.assertEqual(parsed["rank"], 1)
        self.assertEqual(parsed["candidateName"], "S.vijayakumar")
        self.assertEqual(parsed["gender"], "MALE")
        self.assertEqual(parsed["age"], 56)
        self.assertEqual(parsed["category"], "GENERAL")
        self.assertEqual(parsed["partyCode"], "TVK")
        self.assertEqual(parsed["votes"], 94320)
        self.assertEqual(parsed["voteShare"], 40.56)

    def test_parse_winner_blocks_computes_margin(self):
        winners = parse_winner_blocks(SAMPLE_TEXT)
        self.assertEqual(len(winners), 2)
        self.assertEqual(winners[0]["mlaName"], "S.vijayakumar")
        self.assertEqual(winners[0]["party"], "tvk")
        self.assertEqual(winners[0]["marginVotes"], 27945)
        self.assertEqual(winners[1]["constituency"], "PONNERI")
        self.assertEqual(winners[1]["runnerUpName"], "Durai Chandrasekar")


if __name__ == "__main__":
    unittest.main()
```

- [ ] **Step 2: Run tests and confirm expected failure**

Run: `python3 -m unittest tests/test_build_mla_roster.py -v`

Expected: import failure because `scripts/build_mla_roster.py` does not exist yet.

- [ ] **Step 3: Implement parser functions**

Create `scripts/build_mla_roster.py` with parser functions, party normalization, PDF download/extract helpers, validation, and JSON writer. Use `pdfplumber` first and `pdftotext` fallback.

- [ ] **Step 4: Run parser unit tests**

Run: `python3 -m unittest tests/test_build_mla_roster.py -v`

Expected: all tests pass.

### Task 2: Generate Official `mlas` Data

**Files:**
- Modify: `scripts/build_mla_roster.py`
- Modify: `public/scrapedIntel.json`

- [ ] **Step 1: Run the roster builder**

Run: `python3 scripts/build_mla_roster.py`

Expected: output reports 234 official ECI winners and party totals matching ECI aggregates.

- [ ] **Step 2: Validate generated JSON**

Run:

```bash
jq '{mlas: (.mlas|length), fakeConstituencies: ([.mlas[].constituency] | map(select(test("^Constituency-[0-9]+$"))) | length), parties: (.mlas | group_by(.party) | map({party: .[0].party, count: length}))}' public/scrapedIntel.json
```

Expected: `mlas` is `234`, `fakeConstituencies` is `0`, and party counts match official ECI aggregate pages.

### Task 3: Wire Official Roster Into React State

**Files:**
- Modify: `src/App.jsx`
- Modify: `src/data/politicalDatabase.js`

- [ ] **Step 1: Update merge logic**

Modify `mergeIntelAndRoster` so each MLA record contributes `sourceType`, `sources`, `votes`, `voteShare`, `marginVotes`, `runnerUpName`, `runnerUpParty`, `reservationCategory`, and `totalElectors`.

- [ ] **Step 2: Stop fake evidence carryover for ECI-only MLAs**

When an MLA is unmatched to a base politician and has no real evidence sheet, set assets/cases to unavailable values and `isSourcedRoster: true`. Do not create fake affidavit URLs, legal filings, or case claims.

### Task 4: Update Assembly Dashboard Copy And Fields

**Files:**
- Modify: `src/components/AssemblyDashboard.jsx`
- Modify: `src/index.css`

- [ ] **Step 1: Replace fake result fields**

Update the dashboard header, cards, and seat inspector to show candidate, party, votes, vote share, margin, runner-up, and source badge.

- [ ] **Step 2: Render unavailable assets/cases honestly**

Show `Not sourced yet` for assets and criminal cases when those values are missing, instead of random generated numbers.

- [ ] **Step 3: Add data quality status**

Render an official roster status line with `234 ECI winners loaded` when the roster is complete.

### Task 5: Remove Fake Roster From Normal Workflow

**Files:**
- Modify: `scripts/seed_all_234_mlas.py`
- Modify: `scripts/scrape_political_intel.py`
- Modify: `README.md`

- [ ] **Step 1: Mark seeding script demo-only**

Add a module docstring warning that `seed_all_234_mlas.py` is demo-only and should not be used for production roster data.

- [ ] **Step 2: Remove fake affidavit creation from the news scraper**

Ensure `scripts/scrape_political_intel.py` preserves existing evidence but does not invent affidavit URLs or legal filings for MLAs.

- [ ] **Step 3: Document the real roster workflow**

Update `README.md` with `python3 scripts/build_mla_roster.py`, `python3 scripts/scrape_political_intel.py`, and `npm run dev`.

### Task 6: Verify Build And Runtime

**Files:**
- No source edits expected.

- [ ] **Step 1: Run Python tests**

Run: `python3 -m unittest tests/test_build_mla_roster.py -v`

Expected: all tests pass.

- [ ] **Step 2: Run React build**

Run: `npm run build`

Expected: Vite build completes successfully.

- [ ] **Step 3: Run final JSON checks**

Run:

```bash
jq -r '"mlas=\(.mlas|length) fake_constituencies=\([.mlas[].constituency] | map(select(test("^Constituency-[0-9]+$"))) | length) fake_affidavits=\([.evidence[]? | select((.affidavitUrl // "") | contains("/2026/TN/Constituency-"))] | length)"' public/scrapedIntel.json
```

Expected: `mlas=234 fake_constituencies=0 fake_affidavits=0`.

- [ ] **Step 4: Start dev server and inspect**

Run: `npm run dev -- --host 127.0.0.1`

Expected: app loads with real roster values in the Assembly Dashboard.
