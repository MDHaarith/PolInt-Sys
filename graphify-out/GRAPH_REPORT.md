# Graph Report - .  (2026-06-11)

## Corpus Check
- Large corpus: 44 files · ~1,409,646 words. Semantic extraction will be expensive (many Claude tokens). Consider running on a subfolder.

## Summary
- 218 nodes · 302 edges · 33 communities (19 shown, 14 thin omitted)
- Extraction: 94% EXTRACTED · 6% INFERRED · 0% AMBIGUOUS · INFERRED: 19 edges (avg confidence: 0.9)
- Token cost: 0 input · 0 output

## Community Hubs (Navigation)
- [[_COMMUNITY_Graph & Policy Dashboard|Graph & Policy Dashboard]]
- [[_COMMUNITY_MLA Roster Build Script|MLA Roster Build Script]]
- [[_COMMUNITY_Project Dependencies & ReactFlow|Project Dependencies & ReactFlow]]
- [[_COMMUNITY_Political Intelligence Scraper|Political Intelligence Scraper]]
- [[_COMMUNITY_Assembly Dashboard Layout|Assembly Dashboard Layout]]
- [[_COMMUNITY_App Initialization & Canonicalization|App Initialization & Canonicalization]]
- [[_COMMUNITY_Vite Configuration & Seeding|Vite Configuration & Seeding]]
- [[_COMMUNITY_Politician Profile Sentiment|Politician Profile Sentiment]]
- [[_COMMUNITY_Social Media Vector Icons|Social Media Vector Icons]]
- [[_COMMUNITY_Event Graph Visualization|Event Graph Visualization]]
- [[_COMMUNITY_MLA Seeding Scripts|MLA Seeding Scripts]]
- [[_COMMUNITY_Asset Hero Visualizations|Asset Hero Visualizations]]
- [[_COMMUNITY_Git Commit Hooks|Git Commit Hooks]]
- [[_COMMUNITY_Graphify Agent Rules|Graphify Agent Rules]]
- [[_COMMUNITY_Pre-Tool Use Hooks|Pre-Tool Use Hooks]]
- [[_COMMUNITY_Linting Rules|Linting Rules]]
- [[_COMMUNITY_HTML Root Entry|HTML Root Entry]]
- [[_COMMUNITY_Package Configuration|Package Configuration]]
- [[_COMMUNITY_Intelligence Ingestion Plan|Intelligence Ingestion Plan]]
- [[_COMMUNITY_Favicon Brand Logo|Favicon Brand Logo]]
- [[_COMMUNITY_README Data Workflow|README Data Workflow]]
- [[_COMMUNITY_Graphify Rule Settings|Graphify Rule Settings]]
- [[_COMMUNITY_Intelligence Ingestion Spec|Intelligence Ingestion Spec]]
- [[_COMMUNITY_Vite Helper DefineConfig|Vite Helper DefineConfig]]
- [[_COMMUNITY_Graphify Pipeline Workflow|Graphify Pipeline Workflow]]

## God Nodes (most connected - your core abstractions)
1. `BuildMlaRosterTest` - 12 edges
2. `parse_winner_blocks()` - 11 edges
3. `parse_candidate_line()` - 9 edges
4. `SocialScraperTest` - 9 edges
5. `fetch_bluesky()` - 8 edges
6. `fetch_rss()` - 7 edges
7. `main()` - 7 edges
8. `mergeIntelAndRoster()` - 7 edges
9. `normalize_spaces()` - 6 edges
10. `normalize_party_id()` - 6 edges

## Surprising Connections (you probably didn't know these)
- `main()` --implements--> `Hybrid MLA Roster Plan`  [INFERRED]
  scripts/build_mla_roster.py → docs/superpowers/plans/2026-06-08-hybrid-mla-roster.md
- `App()` --implements--> `Hybrid MLA Roster Design Spec`  [INFERRED]
  src/App.jsx → docs/superpowers/specs/2026-06-08-hybrid-mla-roster-design.md
- `AssemblyDashboard()` --implements--> `Hybrid MLA Roster Design Spec`  [INFERRED]
  src/components/AssemblyDashboard.jsx → docs/superpowers/specs/2026-06-08-hybrid-mla-roster-design.md
- `React SVG Logo` --conceptually_related_to--> `react`  [INFERRED]
  src/assets/react.svg → package.json
- `Vite Logo` --conceptually_related_to--> `vite`  [INFERRED]
  src/assets/vite.svg → package.json

## Import Cycles
- None detected.

## Hyperedges (group relationships)
- **MLA Roster Ingestion and Presentation Flow** — scripts_build_mla_roster_main, public_scrapedintel_data, src_app_mergeintelandroster, components_assemblydashboard_assemblydashboard [INFERRED 0.95]
- **Integrated Intelligence Ingestion Pipeline Definition** — plans_2026_06_11_integrated_intelligence_ingestion_plan, specs_2026_06_11_integrated_intelligence_ingestion_design_spec, scripts_scrape_political_intel_main [INFERRED 0.95]
- **Political Timeline and Causal Event Flow** — components_timelineview_timelineview, data_politicaldatabase_seedevents, data_politicaldatabase_generateeventgraphdata [INFERRED 0.85]
- **MLA Directory and Profile Deep Dive Flow** — components_tableview_tableview, components_sidebar_sidebar, data_politicaldatabase_seedpoliticians, data_politicaldatabase_generateassemblyseats [INFERRED 0.85]
- **SVG Icon Assets Set** — public_icons_bluesky_icon, public_icons_discord_icon, public_icons_documentation_icon, public_icons_github_icon, public_icons_social_icon, public_icons_x_icon [EXTRACTED 1.00]

## Communities (33 total, 14 thin omitted)

### Community 0 - "Graph & Policy Dashboard"
Cohesion: 0.09
Nodes (19): nodeTypes, domains, Sidebar(), TableView(), TimelineView(), chiefMinisterPolicyIndex, dailyDelivery, policyImpactRecords (+11 more)

### Community 1 - "MLA Roster Build Script"
Cohesion: 0.15
Nodes (21): Hybrid MLA Roster Plan, build_roster(), build_winner_record(), download_pdf(), extract_pdf_text(), extract_text_with_pdfplumber(), extract_text_with_pdftotext(), is_generated_evidence() (+13 more)

### Community 2 - "Project Dependencies & ReactFlow"
Cohesion: 0.08
Nodes (24): React SVG Logo, dependencies, lucide-react, react, react-dom, reactflow, devDependencies, eslint (+16 more)

### Community 3 - "Political Intelligence Scraper"
Cohesion: 0.20
Nodes (18): bluesky_post_url(), build_social_jobs(), clean_html(), detect_unverified_signal(), fetch_bluesky(), fetch_reddit(), fetch_rss(), fetch_social() (+10 more)

### Community 4 - "Assembly Dashboard Layout"
Cohesion: 0.11
Nodes (17): ADR_WINNER_SUMMARY, AssemblyDashboard(), assignBenchPositions(), buildChamberLayout(), HISTORICAL_DATA, OPPOSITION_PARTY_ORDER, PARTY_COLORS, PARTY_LABELS (+9 more)

### Community 5 - "App Initialization & Canonicalization"
Cohesion: 0.24
Nodes (12): App(), buildOfficialRoster(), buildPoliticianIdAliases(), canonicalizePoliticianId(), formatAssemblySummary(), formatVoteCount(), getPoliticianEndYear(), hasNumberValue() (+4 more)

### Community 6 - "Vite Configuration & Seeding"
Cohesion: 0.20
Nodes (8): Vite Logo, vite, Scraped Intelligence Data Store, Seeder Main execution, __dirname, intelPath, launchScraper(), readIntelStatus()

### Community 8 - "Social Media Vector Icons"
Cohesion: 0.29
Nodes (7): Icons SVG Asset, Bluesky Icon, Discord Icon, Documentation Icon, GitHub Icon, Social Icon, X Icon

### Community 9 - "Event Graph Visualization"
Cohesion: 0.83
Nodes (3): EventGraph(), getEventLabel(), getEventType()

### Community 11 - "MLA Seeding Scripts"
Cohesion: 0.83
Nodes (3): generate_mla_roster(), get_tamil_name(), seed_scraped_intel()

### Community 12 - "Asset Hero Visualizations"
Cohesion: 0.67
Nodes (3): Hero Graphic Asset, Isometric Stacked Illustration, Layered Visualization Pattern

## Knowledge Gaps
- **63 isolated node(s):** `PreToolUse`, `name`, `private`, `version`, `type` (+58 more)
  These have ≤1 connection - possible missing edges or undocumented components.
- **14 thin communities (<3 nodes) omitted from report** — run `graphify query` to explore isolated nodes.

## Suggested Questions
_Questions this graph is uniquely positioned to answer:_

- **Why does `main()` connect `MLA Roster Build Script` to `Vite Configuration & Seeding`?**
  _High betweenness centrality (0.383) - this node is a cross-community bridge._
- **Why does `Hybrid MLA Roster Design Spec` connect `MLA Roster Build Script` to `Assembly Dashboard Layout`, `App Initialization & Canonicalization`?**
  _High betweenness centrality (0.312) - this node is a cross-community bridge._
- **Why does `Seeder Main execution` connect `Vite Configuration & Seeding` to `MLA Roster Build Script`?**
  _High betweenness centrality (0.280) - this node is a cross-community bridge._
- **What connects `PreToolUse`, `name`, `private` to the rest of the system?**
  _66 weakly-connected nodes found - possible documentation gaps or missing edges._
- **Should `Graph & Policy Dashboard` be split into smaller, more focused modules?**
  _Cohesion score 0.09032258064516129 - nodes in this community are weakly interconnected._
- **Should `MLA Roster Build Script` be split into smaller, more focused modules?**
  _Cohesion score 0.14942528735632185 - nodes in this community are weakly interconnected._
- **Should `Project Dependencies & ReactFlow` be split into smaller, more focused modules?**
  _Cohesion score 0.08 - nodes in this community are weakly interconnected._