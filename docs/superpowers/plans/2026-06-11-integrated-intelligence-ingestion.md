# Integrated Intelligence Ingestion Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Extend the existing Intelligence Graph with a local SQLite evidence warehouse, additive multi-source collectors, clustered minor-event extraction from 1952 onward, and generated snapshots consumed by the existing React UI.

**Architecture:** Existing MLA, ADR, seating, feed, profile, policy, and curated Time Fabric data remains authoritative. New and existing collectors normalize raw evidence into SQLite; an extraction layer clusters duplicate reporting into events, applies social corroboration rules, imports curated events with stable IDs, and atomically generates backward-compatible frontend snapshots.

**Tech Stack:** Python 3.12, SQLite, unittest/pytest, Scrapy, Newspaper, Instaloader, optional Twikit, React 19, Vite 8.

---

### Task 1: Warehouse Schema and Existing JSON Recovery

**Files:**
- Create: `scripts/intelligence/__init__.py`
- Create: `scripts/intelligence/schema.py`
- Create: `scripts/intelligence/warehouse.py`
- Create: `scripts/migrate_intelligence.py`
- Create: `tests/test_intelligence_warehouse.py`
- Create: `requirements-intelligence.txt`
- Modify: `.gitignore`

- [ ] **Step 1: Write failing tests**

Test schema creation, malformed trailing-byte recovery, idempotent raw-item import, canonical MLA preservation, and transaction rollback.

- [ ] **Step 2: Run tests and verify RED**

Run: `python3 -m pytest tests/test_intelligence_warehouse.py -q`

Expected: import failures because the warehouse modules do not exist.

- [ ] **Step 3: Implement schema and warehouse**

Create versioned SQLite tables for sources, raw items, people, events, event people, evidence, links, crawl runs, and failures. Add WAL mode, foreign keys, deduplication indexes, and repository helpers.

- [ ] **Step 4: Implement migration**

Use `json.JSONDecoder().raw_decode()` to recover the first complete JSON document, quarantine trailing bytes, import news/MLAs/evidence, and preserve the original file until snapshot validation succeeds.

- [ ] **Step 5: Run tests and commit**

Run: `python3 -m pytest tests/test_intelligence_warehouse.py -q`

Expected: PASS.

Commit: `feat: add intelligence evidence warehouse`

### Task 2: Atomic Compatibility and Time Fabric Snapshots

**Files:**
- Create: `scripts/intelligence/snapshots.py`
- Create: `tests/test_intelligence_snapshots.py`
- Modify: `scripts/migrate_intelligence.py`

- [ ] **Step 1: Write failing tests**

Test atomic temporary-file replacement, valid JSON output, bounded compatibility news, full MLA metadata, Time Fabric event export, and refusal to replace output when validation fails.

- [ ] **Step 2: Run tests and verify RED**

Run: `python3 -m pytest tests/test_intelligence_snapshots.py -q`

- [ ] **Step 3: Implement snapshot generation**

Generate:

- `public/scrapedIntel.json`
- `public/timeFabric.json`
- `public/policyUpdates.json`
- `public/intelStatus.json`

Use `fsync`, schema validation, and `os.replace()`.

- [ ] **Step 4: Run tests and commit**

Run: `python3 -m pytest tests/test_intelligence_snapshots.py -q`

Expected: PASS.

Commit: `feat: generate atomic intelligence snapshots`

### Task 3: Collector Adapter Contract

**Files:**
- Create: `scripts/intelligence/models.py`
- Create: `scripts/intelligence/collectors/__init__.py`
- Create: `scripts/intelligence/collectors/base.py`
- Create: `scripts/intelligence/collectors/rss.py`
- Create: `scripts/intelligence/collectors/reddit.py`
- Create: `scripts/intelligence/collectors/bluesky.py`
- Create: `tests/test_collector_adapters.py`
- Modify: `scripts/scrape_political_intel.py`

- [ ] **Step 1: Write failing tests**

Test normalized `CollectedItem` output, preservation of current RSS/Reddit/Bluesky fields, collector failure isolation, crawl-run accounting, and deduplication.

- [ ] **Step 2: Run tests and verify RED**

Run: `python3 -m pytest tests/test_collector_adapters.py -q`

- [ ] **Step 3: Implement adapters**

Move reusable collection behavior behind a common adapter contract while retaining the existing query lists and compatibility CLI.

- [ ] **Step 4: Run existing and new tests**

Run: `python3 -m pytest tests/test_social_scraper.py tests/test_collector_adapters.py -q`

- [ ] **Step 5: Commit**

Commit: `refactor: normalize existing intelligence collectors`

### Task 4: Scrapy, Newspaper, Instagram, and X Adapters

**Files:**
- Create: `scripts/intelligence/collectors/web.py`
- Create: `scripts/intelligence/collectors/instagram.py`
- Create: `scripts/intelligence/collectors/x_public.py`
- Create: `scripts/intelligence/source_config.py`
- Create: `tests/fixtures/collector/`
- Create: `tests/test_extended_collectors.py`
- Modify: `requirements-intelligence.txt`

- [ ] **Step 1: Write failing fixture tests**

Test Scrapy page discovery, Newspaper article extraction, anonymous Instaloader normalization, optional Twikit disablement, and failure records without network access.

- [ ] **Step 2: Run tests and verify RED**

Run: `python3 -m pytest tests/test_extended_collectors.py -q`

- [ ] **Step 3: Implement optional adapters**

Use lazy imports. Missing packages, authentication requirements, rate limits, and access blocks produce collector health/failure records without stopping the pipeline.

- [ ] **Step 4: Run tests and commit**

Run: `python3 -m pytest tests/test_extended_collectors.py -q`

Commit: `feat: add public web and social collectors`

### Task 5: Event Extraction and Clustering

**Files:**
- Create: `scripts/intelligence/events.py`
- Create: `scripts/intelligence/people.py`
- Create: `tests/test_event_extraction.py`
- Modify: `scripts/intelligence/warehouse.py`

- [ ] **Step 1: Write failing tests**

Cover minor arrests, FIRs, raids, court hearings, protests, speeches, appointments, suspensions, defections, policy actions, date precision, canonical people, duplicate clustering, syndication independence, distinct legal steps, and anonymous-social corroboration gating.

- [ ] **Step 2: Run tests and verify RED**

Run: `python3 -m pytest tests/test_event_extraction.py -q`

- [ ] **Step 3: Implement deterministic extraction**

Use explicit action patterns, canonical aliases, normalized dates, event fingerprints, bounded date windows, and evidence independence keys. Preserve each legal procedural step as a linked event.

- [ ] **Step 4: Run tests and commit**

Run: `python3 -m pytest tests/test_event_extraction.py -q`

Commit: `feat: extract and cluster political events`

### Task 6: Curated Event and Policy Amalgamation

**Files:**
- Create: `scripts/intelligence/curated_seed.py`
- Create: `scripts/export_curated_intelligence.mjs`
- Create: `tests/test_curated_amalgamation.py`
- Modify: `package.json`

- [ ] **Step 1: Write failing tests**

Verify stable curated IDs, policy IDs, automatic evidence attachment, no automatic overwrite, and relationship preservation.

- [ ] **Step 2: Run tests and verify RED**

Run: `python3 -m pytest tests/test_curated_amalgamation.py -q`

- [ ] **Step 3: Implement curated import**

Export the existing JavaScript curated event/policy structures to JSON and upsert them into SQLite with `is_curated = true`.

- [ ] **Step 4: Run tests and commit**

Run: `python3 -m pytest tests/test_curated_amalgamation.py -q`

Commit: `feat: amalgamate curated and extracted events`

### Task 7: Unified Pipeline and Scheduling

**Files:**
- Create: `scripts/run_intelligence_pipeline.py`
- Create: `tests/test_intelligence_pipeline.py`
- Modify: `scripts/scrape_political_intel.py`
- Modify: `vite.config.js`
- Modify: `README.md`

- [ ] **Step 1: Write failing pipeline test**

Use fixture collectors to import raw items, extract events, attach evidence, generate snapshots, and report collector failures.

- [ ] **Step 2: Run tests and verify RED**

Run: `python3 -m pytest tests/test_intelligence_pipeline.py -q`

- [ ] **Step 3: Implement commands**

Provide:

- `--migrate`
- `--collect`
- `--extract-events`
- `--backfill-from 1952`
- `--snapshot`
- `--all`

Keep the server-owned 30-minute trigger and prevent overlapping runs.

- [ ] **Step 4: Run tests and commit**

Run: `python3 -m pytest tests/test_intelligence_pipeline.py -q`

Commit: `feat: orchestrate integrated intelligence pipeline`

### Task 8: React Data Integration

**Files:**
- Modify: `src/App.jsx`
- Modify: `src/data/politicalDatabase.js`
- Modify: `src/components/EventGraph.jsx`
- Modify: `src/components/IntelligenceFeed.jsx`
- Modify: `src/components/PoliticianSpace.jsx`
- Modify: `src/index.css`

- [ ] **Step 1: Add frontend behavior checks**

Use data helper tests where practical and build-time verification for snapshot loading, curated fallback, exact dates, verification filters, evidence counts, event-story links, and politician event history.

- [ ] **Step 2: Implement additive snapshot loading**

Load `timeFabric.json` when available, merge it with the existing curated fallback by stable ID, and retain current behavior when the snapshot is absent.

- [ ] **Step 3: Extend Time Fabric**

Add filters for event type, verification, person/party, date, and curated/extracted status. Render exact dates, evidence counts, source drawers, and legal/policy chains using pagination or windowed batches.

- [ ] **Step 4: Link existing product surfaces**

Connect feed items and politician profiles to clustered events while preserving current MLA, ADR, seating, policy, and profile sections.

- [ ] **Step 5: Run lint/build and commit**

Run:

`npx eslint src/App.jsx src/data/politicalDatabase.js src/components/EventGraph.jsx src/components/IntelligenceFeed.jsx src/components/PoliticianSpace.jsx`

`npm run build`

Commit: `feat: integrate extracted events into intelligence UI`

### Task 9: Migration, Backfill Smoke Test, and Final Verification

**Files:**
- Modify only files required by discovered verification defects.

- [ ] **Step 1: Run complete Python test suite**

Run: `python3 -m pytest tests -q`

- [ ] **Step 2: Run migration against the existing JSON**

Back up the current malformed artifact, import its first valid document, quarantine trailing bytes, and generate repaired snapshots.

- [ ] **Step 3: Run a bounded public collector smoke test**

Execute a small anonymous RSS/Reddit/Bluesky/Instagram/X/web collection. Record unavailable adapters as coverage gaps.

- [ ] **Step 4: Extract events and generate snapshots**

Confirm minor events appear, duplicates cluster, and social-only claims remain excluded from Time Fabric.

- [ ] **Step 5: Verify existing data**

Confirm 234 MLA records, existing canonical IDs, seating, ADR references, curated events, and policy IDs remain.

- [ ] **Step 6: Run final frontend verification**

Run targeted ESLint, `npm run build`, start Vite, and check the status and snapshot endpoints.

- [ ] **Step 7: Commit final verification fixes**

Commit: `chore: verify integrated intelligence pipeline`
