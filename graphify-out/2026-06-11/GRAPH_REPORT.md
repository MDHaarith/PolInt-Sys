# Graph Report - Intelligence-Graph  (2026-06-11)

## Corpus Check
- 71 files · ~1,762,813 words
- Verdict: corpus is large enough that graph structure adds value.

## Summary
- 473 nodes · 730 edges · 45 communities (27 shown, 18 thin omitted)
- Extraction: 95% EXTRACTED · 5% INFERRED · 0% AMBIGUOUS · INFERRED: 34 edges (avg confidence: 0.72)
- Token cost: 0 input · 0 output

## Graph Freshness
- Built from commit: `7b8ec4e7`
- Run `git rev-parse HEAD` and compare to check if the graph is stale.
- Run `graphify update .` after code changes (no API cost).

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
- [[_COMMUNITY_Community 33|Community 33]]
- [[_COMMUNITY_Community 34|Community 34]]
- [[_COMMUNITY_Community 35|Community 35]]
- [[_COMMUNITY_Community 36|Community 36]]
- [[_COMMUNITY_Community 37|Community 37]]
- [[_COMMUNITY_Community 38|Community 38]]
- [[_COMMUNITY_Community 39|Community 39]]
- [[_COMMUNITY_Community 40|Community 40]]
- [[_COMMUNITY_Community 41|Community 41]]
- [[_COMMUNITY_Community 42|Community 42]]
- [[_COMMUNITY_Community 43|Community 43]]
- [[_COMMUNITY_Community 44|Community 44]]

## God Nodes (most connected - your core abstractions)
1. `IntelligenceWarehouse` - 38 edges
2. `generate_snapshots()` - 20 edges
3. `CollectedItem` - 18 edges
4. `Integrated Intelligence Ingestion and Time Fabric Design` - 18 edges
5. `Path` - 14 edges
6. `EventExtractor` - 13 edges
7. `ScrapyDiscoveryCollector` - 12 edges
8. `BuildMlaRosterTest` - 12 edges
9. `parse_winner_blocks()` - 11 edges
10. `build_default_collectors()` - 11 edges

## Surprising Connections (you probably didn't know these)
- `main()` --implements--> `Hybrid MLA Roster Plan`  [INFERRED]
  scripts/build_mla_roster.py → docs/superpowers/plans/2026-06-08-hybrid-mla-roster.md
- `main()` --implements--> `Hybrid MLA Roster Design Spec`  [INFERRED]
  scripts/build_mla_roster.py → docs/superpowers/specs/2026-06-08-hybrid-mla-roster-design.md
- `App()` --implements--> `Hybrid MLA Roster Design Spec`  [INFERRED]
  src/App.jsx → docs/superpowers/specs/2026-06-08-hybrid-mla-roster-design.md
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

## Communities (45 total, 18 thin omitted)

### Community 0 - "Graph & Policy Dashboard"
Cohesion: 0.07
Nodes (34): domains, Sidebar(), TableView(), TimelineView(), chiefMinisterPolicyIndex, dailyDelivery, policyImpactRecords, sourceCatalog (+26 more)

### Community 1 - "MLA Roster Build Script"
Cohesion: 0.16
Nodes (20): Hybrid MLA Roster Plan, build_roster(), build_winner_record(), download_pdf(), extract_pdf_text(), extract_text_with_pdfplumber(), extract_text_with_pdftotext(), is_generated_evidence() (+12 more)

### Community 2 - "Project Dependencies & ReactFlow"
Cohesion: 0.07
Nodes (27): React SVG Logo, Vite Logo, dependencies, lucide-react, react, react-dom, reactflow, devDependencies (+19 more)

### Community 3 - "Political Intelligence Scraper"
Cohesion: 0.13
Nodes (24): Scraped Intelligence Data Store, bluesky_post_url(), build_social_jobs(), clean_html(), detect_unverified_signal(), fetch_bluesky(), fetch_reddit(), fetch_rss() (+16 more)

### Community 4 - "Assembly Dashboard Layout"
Cohesion: 0.10
Nodes (18): ADR_WINNER_SUMMARY, AssemblyDashboard(), assignBenchPositions(), buildChamberLayout(), HISTORICAL_DATA, OPPOSITION_PARTY_ORDER, PARTY_COLORS, PARTY_LABELS (+10 more)

### Community 5 - "App Initialization & Canonicalization"
Cohesion: 0.06
Nodes (30): CollectorRunner, BlueskyCollector, InstagramCollector, RedditCollector, RssCollector, ArticleExtractor, _LinkParser, ScrapyDiscoveryCollector (+22 more)

### Community 6 - "Vite Configuration & Seeding"
Cohesion: 0.09
Nodes (31): apply_current_assembly_status(), _clean_title(), upsert_curated_payload(), atomic_write_json(), _collector_health(), _coverage_gaps(), _event_links(), _event_rows() (+23 more)

### Community 7 - "Politician Profile Sentiment"
Cohesion: 0.18
Nodes (3): CATEGORY_CONFIG, EMPTY_NEWS, POLITICIAN_HANDLES

### Community 8 - "Social Media Vector Icons"
Cohesion: 0.29
Nodes (7): Icons SVG Asset, Bluesky Icon, Discord Icon, Documentation Icon, GitHub Icon, Social Icon, X Icon

### Community 9 - "Event Graph Visualization"
Cohesion: 0.80
Nodes (4): EventGraph(), getEventLabel(), getEventType(), humanize()

### Community 11 - "MLA Seeding Scripts"
Cohesion: 0.83
Nodes (3): generate_mla_roster(), get_tamil_name(), seed_scraped_intel()

### Community 12 - "Asset Hero Visualizations"
Cohesion: 0.67
Nodes (3): Hero Graphic Asset, Isometric Stacked Illustration, Layered Visualization Pattern

### Community 28 - "README Data Workflow"
Cohesion: 0.50
Nodes (3): Data Workflow, Intelligence Graph, Source Rules

### Community 33 - "Community 33"
Cohesion: 0.04
Nodes (46): Candidate Detection, Clustering, Collector Integration, Collector Responsibilities, Compatibility Requirements, `crawl_failures`, `crawl_runs`, Curated and Extracted Event Amalgamation (+38 more)

### Community 34 - "Community 34"
Cohesion: 0.20
Nodes (13): detect_event_type(), event_key(), EventExtractor, independence_key(), normalize_date(), stable_event_id(), resolve_politician(), add_story() (+5 more)

### Community 35 - "Community 35"
Cohesion: 0.18
Nodes (10): Integrated Intelligence Ingestion Implementation Plan, Task 1: Warehouse Schema and Existing JSON Recovery, Task 2: Atomic Compatibility and Time Fabric Snapshots, Task 3: Collector Adapter Contract, Task 4: Scrapy, Newspaper, Instagram, and X Adapters, Task 5: Event Extraction and Clustering, Task 6: Curated Event and Policy Amalgamation, Task 7: Unified Pipeline and Scheduling (+2 more)

### Community 36 - "Community 36"
Cohesion: 0.18
Nodes (10): collectorHealth, coverageGaps, coverageMeta, currentStories, lastSnapshotAt, storyTarget, eventCount, generatedAt (+2 more)

### Community 37 - "Community 37"
Cohesion: 0.18
Nodes (10): Architecture, Data Model, Decisions, Error Handling, Goal, Hybrid MLA Roster Design, Implementation Order, Sources (+2 more)

### Community 38 - "Community 38"
Cohesion: 0.25
Nodes (7): Hybrid MLA Roster Implementation Plan, Task 1: Add Testable ECI Roster Parser, Task 2: Generate Official `mlas` Data, Task 3: Wire Official Roster Into React State, Task 4: Update Assembly Dashboard Copy And Fields, Task 5: Remove Fake Roster From Normal Workflow, Task 6: Verify Build And Runtime

## Knowledge Gaps
- **142 isolated node(s):** `PreToolUse`, `name`, `private`, `version`, `type` (+137 more)
  These have ≤1 connection - possible missing edges or undocumented components.
- **18 thin communities (<3 nodes) omitted from report** — run `graphify query` to explore isolated nodes.

## Suggested Questions
_Questions this graph is uniquely positioned to answer:_

- **Why does `main()` connect `MLA Roster Build Script` to `Political Intelligence Scraper`, `Assembly Dashboard Layout`?**
  _High betweenness centrality (0.091) - this node is a cross-community bridge._
- **Why does `Hybrid MLA Roster Design Spec` connect `Assembly Dashboard Layout` to `Graph & Policy Dashboard`, `MLA Roster Build Script`?**
  _High betweenness centrality (0.075) - this node is a cross-community bridge._
- **Why does `Seeder Main execution` connect `Political Intelligence Scraper` to `MLA Roster Build Script`?**
  _High betweenness centrality (0.066) - this node is a cross-community bridge._
- **Are the 4 inferred relationships involving `IntelligenceWarehouse` (e.g. with `IntelligenceWarehouse` and `Path`) actually correct?**
  _`IntelligenceWarehouse` has 4 INFERRED edges - model-reasoned connections that need verification._
- **Are the 11 inferred relationships involving `Path` (e.g. with `CollectorRunner` and `BlueskyCollector`) actually correct?**
  _`Path` has 11 INFERRED edges - model-reasoned connections that need verification._
- **What connects `PreToolUse`, `name`, `private` to the rest of the system?**
  _147 weakly-connected nodes found - possible documentation gaps or missing edges._
- **Should `Graph & Policy Dashboard` be split into smaller, more focused modules?**
  _Cohesion score 0.06802721088435375 - nodes in this community are weakly interconnected._