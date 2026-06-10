# Graph Report - Intelligence-Graph  (2026-06-10)

## Corpus Check
- 34 files · ~1,405,366 words
- Verdict: corpus is large enough that graph structure adds value.

## Summary
- 214 nodes · 271 edges · 27 communities (22 shown, 5 thin omitted)
- Extraction: 100% EXTRACTED · 0% INFERRED · 0% AMBIGUOUS · INFERRED: 1 edges (avg confidence: 0.8)
- Token cost: 0 input · 0 output

## Graph Freshness
- Built from commit: `d5704c51`
- Run `git rev-parse HEAD` and compare to check if the graph is stale.
- Run `graphify update .` after code changes (no API cost).

## Community Hubs (Navigation)
- [[_COMMUNITY_Community 0|Community 0]]
- [[_COMMUNITY_Community 1|Community 1]]
- [[_COMMUNITY_Community 2|Community 2]]
- [[_COMMUNITY_Community 3|Community 3]]
- [[_COMMUNITY_Community 4|Community 4]]
- [[_COMMUNITY_Community 5|Community 5]]
- [[_COMMUNITY_Community 6|Community 6]]
- [[_COMMUNITY_Community 7|Community 7]]
- [[_COMMUNITY_Community 8|Community 8]]
- [[_COMMUNITY_Community 9|Community 9]]
- [[_COMMUNITY_Community 10|Community 10]]
- [[_COMMUNITY_Community 11|Community 11]]
- [[_COMMUNITY_Community 13|Community 13]]
- [[_COMMUNITY_Community 14|Community 14]]
- [[_COMMUNITY_Community 15|Community 15]]
- [[_COMMUNITY_Community 16|Community 16]]

## God Nodes (most connected - your core abstractions)
1. `Hybrid MLA Roster Design` - 10 edges
2. `parse_winner_blocks()` - 9 edges
3. `parse_candidate_line()` - 8 edges
4. `fetch_bluesky()` - 8 edges
5. `BuildMlaRosterTest` - 8 edges
6. `Hybrid MLA Roster Implementation Plan` - 7 edges
7. `normalize_spaces()` - 6 edges
8. `build_roster()` - 6 edges
9. `fetch_rss()` - 6 edges
10. `scripts` - 5 edges

## Surprising Connections (you probably didn't know these)
- `AssemblyDashboard()` --calls--> `formatNumber()`  [INFERRED]
  src/components/AssemblyDashboard.jsx → src/components/IntelligenceFeed.jsx

## Import Cycles
- None detected.

## Communities (27 total, 5 thin omitted)

### Community 0 - "Community 0"
Cohesion: 0.09
Nodes (22): domains, chiefMinisterPolicyIndex, dailyDelivery, policyImpactRecords, sourceCatalog, basePoliticians, CURRENT_ASSEMBLY_STATUS, generateAssemblySeats() (+14 more)

### Community 1 - "Community 1"
Cohesion: 0.15
Nodes (19): build_roster(), build_winner_record(), download_pdf(), extract_pdf_text(), extract_text_with_pdfplumber(), extract_text_with_pdftotext(), is_generated_evidence(), load_json_database() (+11 more)

### Community 2 - "Community 2"
Cohesion: 0.08
Nodes (24): dependencies, lucide-react, react, react-dom, reactflow, devDependencies, eslint, @eslint/js (+16 more)

### Community 3 - "Community 3"
Cohesion: 0.18
Nodes (18): bluesky_post_url(), build_social_jobs(), clean_html(), detect_unverified_signal(), fetch_bluesky(), fetch_reddit(), fetch_rss(), fetch_social() (+10 more)

### Community 4 - "Community 4"
Cohesion: 0.20
Nodes (10): ADR_WINNER_SUMMARY, assignBenchPositions(), buildChamberLayout(), HISTORICAL_DATA, OPPOSITION_PARTY_ORDER, PARTY_COLORS, PARTY_LABELS, RULING_ALLIANCE_PARTIES (+2 more)

### Community 5 - "Community 5"
Cohesion: 0.22
Nodes (7): AssemblyDashboard(), CATEGORY_CONFIG, detectRumor(), formatNumber(), IntelligenceFeed(), normalizeText(), RUMOR_TERMS

### Community 6 - "Community 6"
Cohesion: 0.18
Nodes (10): Architecture, Data Model, Decisions, Error Handling, Goal, Hybrid MLA Roster Design, Implementation Order, Sources (+2 more)

### Community 8 - "Community 8"
Cohesion: 0.25
Nodes (7): Hybrid MLA Roster Implementation Plan, Task 1: Add Testable ECI Roster Parser, Task 2: Generate Official `mlas` Data, Task 3: Wire Official Roster Into React State, Task 4: Update Assembly Dashboard Copy And Fields, Task 5: Remove Fake Roster From Normal Workflow, Task 6: Verify Build And Runtime

### Community 11 - "Community 11"
Cohesion: 0.83
Nodes (3): EventGraph(), getEventLabel(), getEventType()

### Community 13 - "Community 13"
Cohesion: 0.50
Nodes (3): Data Workflow, Intelligence Graph, Source Rules

### Community 14 - "Community 14"
Cohesion: 0.83
Nodes (3): generate_mla_roster(), get_tamil_name(), seed_scraped_intel()

## Knowledge Gaps
- **62 isolated node(s):** `PreToolUse`, `name`, `private`, `version`, `type` (+57 more)
  These have ≤1 connection - possible missing edges or undocumented components.
- **5 thin communities (<3 nodes) omitted from report** — run `graphify query` to explore isolated nodes.

## Suggested Questions
_Questions this graph is uniquely positioned to answer:_

- **What connects `PreToolUse`, `name`, `private` to the rest of the system?**
  _65 weakly-connected nodes found - possible documentation gaps or missing edges._
- **Should `Community 0` be split into smaller, more focused modules?**
  _Cohesion score 0.08522727272727272 - nodes in this community are weakly interconnected._
- **Should `Community 2` be split into smaller, more focused modules?**
  _Cohesion score 0.08 - nodes in this community are weakly interconnected._