# Integrated Intelligence Ingestion and Time Fabric Design

Date: 2026-06-11
Project: Intelligence Graph
Scope: Extend the existing Tamil Nadu political intelligence application with scalable multi-source collection, complete evidence retention, and clustered event extraction from 1952 onward.

## Goal

The current application already contains useful and sourced capabilities:

- The 17th Assembly MLA roster, canonical politician IDs, seating arrangement, vacancy handling, and coalition composition.
- ADR/MyNeta criminal-profile references and source links.
- The Intelligence Feed with Google News RSS, Reddit, Bluesky, rumor labeling, policy categorization, and automatic batch reload.
- Curated historical Time Fabric events and policy lineage records.
- Politician profiles, party data, Assembly history, and policy impact monitoring.

This work must preserve those capabilities and integrate additional collectors into the same product. It is not a replacement application or an independent scraper project.

The completed system must:

- Retain every collected raw story or public social post as evidence.
- Cluster duplicate reporting into one event record.
- Display major and minor political events from 1952 onward.
- Include arrests, FIRs, raids, court hearings, protests, speeches, appointments, suspensions, defections, party disciplinary actions, policy changes, constituency disputes, and similar lower-profile developments.
- Keep single-source anonymous social claims in the Intelligence Feed until corroborated.
- Scale beyond 100,000 raw records without loading one giant JSON document into the browser.
- Use only free and locally operated software and sources.

## Compatibility Requirements

Existing application behavior is preserved unless this specification explicitly changes it.

- Existing MLA and politician IDs remain canonical.
- Existing curated `seedEvents` remain authoritative records and are never deleted by automatic extraction.
- Existing policy lineage records remain visible in Policy Impact and Time Fabric.
- Existing Google News RSS, Reddit, and Bluesky collection remains available.
- Existing React workspace modes and routes remain intact.
- Existing `public/scrapedIntel.json` remains available as a compatibility snapshot while the frontend is migrated incrementally.
- Existing source URLs, verification labels, ADR metadata, coalition configuration, vacancy state, and seating assignments must be retained.
- Demo-only seeded records must not be promoted to verified evidence.

## Source Boundaries

### General News

Scrapy is the crawl coordinator for configured public websites:

- News publication archive and section pages.
- Tamil Nadu government, department, Assembly, police, court, party, and election pages.
- Public RSS or sitemap-discovered article URLs.

Newspaper is the article-content extractor:

- Title.
- Main article text.
- Authors.
- Publication date.
- Canonical URL.
- Lead image and metadata when publicly available.

Google News RSS remains a discovery collector. The canonical publisher URL and extracted publisher content are preferred when available.

### Social Platforms

The system operates without account credentials.

- Instaloader is a best-effort adapter for anonymously accessible public Instagram profiles and posts.
- Twikit is an optional best-effort adapter. It is disabled automatically when anonymous retrieval is unavailable.
- Reddit and Bluesky public collectors remain active.
- Indexed references to X, Instagram, Facebook, and YouTube discovered through news/search sources remain valid discovery records.

The system does not:

- Store usernames, passwords, or authenticated session cookies.
- Circumvent private profiles, access controls, CAPTCHAs, or platform restrictions.
- Claim full Instagram or X coverage.
- Fabricate inaccessible post text, engagement, or author metadata.

Collector failure must be recorded but must not block other collectors.

## Storage Architecture

SQLite becomes the local primary evidence warehouse. The current JSON file becomes a generated compatibility artifact.

Default database path:

`data/intelligence.db`

The database is excluded from Git because it contains generated crawl state and can grow substantially.

### Tables

#### `sources`

Stores one record per source or publisher:

- `id`
- `name`
- `source_type`
- `base_url`
- `platform`
- `trust_tier`
- `active`
- `created_at`
- `updated_at`

#### `raw_items`

Stores every deduplicated article or public social post:

- `id`
- `canonical_url`
- `source_id`
- `collector`
- `platform`
- `external_id`
- `title`
- `body`
- `author_name`
- `published_at`
- `retrieved_at`
- `language`
- `content_hash`
- `politician_id`
- `category`
- `verification_status`
- `is_social`
- `raw_metadata_json`
- `first_seen_at`
- `last_seen_at`

URL, external ID, and content-hash indexes support deduplication. Duplicate collection updates `last_seen_at` and metadata rather than deleting evidence.

#### `people`

Maps extracted names and aliases to existing canonical politician IDs:

- `politician_id`
- `canonical_name`
- `aliases_json`
- `party_id`
- `active_from`
- `active_to`
- `source`

The existing React politician database and official MLA roster seed this table.

#### `events`

Stores curated and automatically extracted event clusters:

- `id`
- `event_key`
- `title`
- `description`
- `event_type`
- `occurred_at`
- `occurred_precision`
- `year`
- `location`
- `primary_politician_id`
- `party_id`
- `verification_status`
- `confidence`
- `impact_summary`
- `current_status`
- `is_curated`
- `created_at`
- `updated_at`

`occurred_precision` distinguishes exact timestamp, date, month, year, and unknown-within-year records.

#### `event_people`

Links all involved people to an event:

- `event_id`
- `politician_id`
- `role`

Roles include subject, actor, complainant, arrested, speaker, appointee, opponent, and affected party.

#### `event_evidence`

Retains every raw item supporting or disputing an event:

- `event_id`
- `raw_item_id`
- `evidence_role`
- `independence_key`
- `added_at`

Evidence roles include primary report, corroboration, official record, social signal, correction, denial, and follow-up.

`independence_key` groups syndication copies from the same underlying report so copied articles do not count as independent corroboration.

#### `event_links`

Stores explicit relationships:

- `source_event_id`
- `target_event_id`
- `relationship`
- `confidence`
- `source`

Relationships include caused, followed, escalated, contradicted, policy-converted-into, investigation-of, appeal-of, and continuation-of.

#### `crawl_runs`

Stores collector execution state:

- `id`
- `collector`
- `started_at`
- `completed_at`
- `status`
- `items_seen`
- `items_added`
- `items_updated`
- `errors`
- `details_json`

#### `crawl_failures`

Stores non-fatal failures with retry information:

- `id`
- `crawl_run_id`
- `collector`
- `url_or_query`
- `error_type`
- `message`
- `retryable`
- `occurred_at`

## Data Migration and Repair

The migration imports the first valid JSON document from the existing malformed `public/scrapedIntel.json`. It preserves:

- `news`
- `evidence`
- `mlas`
- `rosterMeta`
- `dataQuality`
- `coverageMeta`

Trailing malformed content is saved to a quarantine file for inspection rather than silently discarded.

Migration behavior:

1. Parse the first complete JSON object.
2. Write the trailing bytes to `data/quarantine/scrapedIntel.trailing.txt`.
3. Import existing records transactionally into SQLite.
4. Validate counts and canonical MLA IDs.
5. Generate a repaired JSON compatibility snapshot using a temporary file and atomic rename.
6. Refuse to replace the compatibility snapshot if validation fails.

All future database and snapshot writes are transactional or atomic.

## Collector Integration

Collectors implement a common adapter result:

```python
@dataclass
class CollectedItem:
    canonical_url: str
    collector: str
    source_name: str
    source_type: str
    platform: str | None
    external_id: str | None
    title: str
    body: str
    author_name: str | None
    published_at: str | None
    retrieved_at: str
    politician_id: str | None
    category: str
    verification_status: str
    raw_metadata: dict
```

Adapters do not write frontend JSON directly. They submit normalized items to the warehouse.

### Collector Responsibilities

- `rss`: Preserve the existing Google News RSS query coverage.
- `reddit`: Preserve PullPush and Reddit JSON fallback behavior.
- `bluesky`: Preserve public search behavior.
- `scrapy`: Crawl configured sites with per-domain concurrency, delays, robots-policy configuration, and URL allowlists.
- `newspaper`: Enrich discovered article URLs with canonical text and metadata.
- `instaloader`: Fetch only anonymously visible public Instagram material.
- `twikit`: Attempt only anonymous/public operations supported by the installed version; disable the adapter after authentication-required or repeated blocking responses.

Collectors use bounded concurrency, retryable error categories, domain throttling, and crawl-run statistics.

## Event Extraction

Automatic Time Fabric events are derived from raw evidence rather than using every article as a timeline node.

### Candidate Detection

An item becomes an event candidate when it contains:

- A recognized Tamil Nadu political person, party, administration, constituency, department, or policy.
- A dated action or state change.
- An event verb or pattern such as arrested, detained, booked, FIR filed, raided, summoned, convicted, acquitted, appealed, protested, resigned, defected, joined, expelled, suspended, appointed, sworn in, announced, launched, withdrawn, renamed, merged, allocated, sanctioned, inaugurated, died, hospitalized, or addressed.

Candidates retain the source headline and body evidence. Extraction does not invent impact or causality.

### Normalization

Each candidate receives:

- Canonical people and party IDs.
- Event type.
- Normalized date and precision.
- Location when present.
- Action.
- Object or target.
- Source independence key.
- Content fingerprint.

### Clustering

Candidates cluster when they share:

- The same normalized people or parties.
- Compatible event type and action.
- A close event-date window.
- Similar title/body fingerprints.
- Compatible location or legal/policy object.

One event can contain any number of raw evidence items. Syndicated copies remain attached but count as one independent source.

Minor events remain separate when they represent distinct actions. For example:

- Arrest.
- Remand hearing.
- Bail order.
- Charge sheet.
- Acquittal.
- Appeal.

These are linked as a legal-event chain rather than collapsed into one lifetime case.

### Verification Rules

Verification states:

- `official`: Supported by an official government, court, police, Assembly, ECI, or party record.
- `corroborated`: Supported by at least two independent non-social sources.
- `reported`: Supported by one attributable news source.
- `unverified_signal`: Social or unattributed claim without corroboration.
- `disputed`: Supported and explicitly denied or contradicted.
- `corrected`: Superseded by a correction.

Time Fabric includes:

- Curated records.
- Official records.
- Corroborated records.
- Single-source attributable news records marked `Reported`.

Anonymous single-source social claims remain only in Intelligence Feed. They enter Time Fabric after an official record or independent non-social corroboration is attached.

## Curated and Extracted Event Amalgamation

Curated `seedEvents` and policy records are imported with stable IDs and `is_curated = true`.

Automatic extraction can:

- Attach new evidence to a curated event.
- Add follow-up events before or after it.
- Add people, sources, and relationship links.
- Refine date precision when a stronger source is available.

Automatic extraction cannot:

- Delete a curated event.
- Change its stable ID.
- Overwrite its title, description, or impact summary without an explicit reviewed migration.
- Downgrade its verification state.

The frontend snapshot merges curated and extracted records into one Time Fabric dataset.

## Frontend Integration

The current React application remains the user interface.

### Intelligence Feed

- Continues to show every raw collected item.
- Adds collector, platform, verification, and event-cluster badges.
- Allows opening the associated Time Fabric event when available.
- Keeps unverified social signals clearly separated from reported news.

### Time Fabric

- Loads generated event summaries instead of only the hand-written array.
- Keeps existing curated policy and event nodes.
- Supports filters for event type, verification, person, party, date range, source, and curated/extracted status.
- Uses incremental pagination or virtualized rendering so thousands of minor events remain usable.
- Displays exact date where known, not only year.
- Shows all evidence sources, corrections, denials, and linked follow-ups in the detail panel.
- Shows legal and political chains such as FIR to arrest to bail to trial to appeal.

### Politician Profiles

- Display the politician's extracted event history using canonical IDs.
- Keep existing biography, MLA, ADR, seating, party-shift, good-deed, bad-deed, and evidence sections.
- Add filters for event type and verification.

### Policy Impact

- Retains the current curated CM policy index and scheme lineage.
- Attaches automatically collected announcements, G.O.s, budget changes, implementation reports, audits, protests, and successor-government actions.
- Does not convert generic political commentary into a policy event without a concrete policy action.

## Generated Snapshots and APIs

The browser does not load the full warehouse.

Generated files:

- `public/scrapedIntel.json`: Existing compatibility structure with bounded recent news plus full MLA/roster metadata.
- `public/timeFabric.json`: Event summaries, source counts, people, and relationship links.
- `public/policyUpdates.json`: Policy follow-ups linked to curated policy IDs.
- `public/intelStatus.json`: Counts, last successful crawl, collector health, event totals, and coverage target.

The Vite development middleware may expose status and paginated local queries. Production-compatible static snapshots remain available so the app does not require a permanently running Python service.

Snapshot generation uses temporary files, validation, `fsync`, and atomic rename.

## Scheduling

The existing server-owned schedule remains the only crawl trigger.

- No user-facing manual sync button.
- Lightweight collectors may run every 30 minutes.
- General Scrapy archive crawls run on a slower schedule.
- Historical backfill runs as a resumable command, not every 30 minutes.
- A crawl lock prevents overlapping runs.
- The frontend reloads after at least 10 new raw items or any newly verified event.

## Historical Backfill

The historical scope begins on January 1, 1952.

Backfill proceeds by:

1. Existing canonical politicians and parties.
2. Chief minister and cabinet terms.
3. Elections and Assembly sessions.
4. Arrests, FIRs, raids, court proceedings, protests, disciplinary actions, defections, appointments, speeches, deaths, and policy changes.
5. Constituency and district-level political reporting.

The process is resumable by source, person, date range, and query. It records coverage gaps instead of claiming completeness where archives are inaccessible.

## Data Quality and Safety

- Every displayed record must link to at least one retained raw evidence item or an existing curated source.
- Fetched text is stored as evidence; summaries and event descriptions are derived separately.
- Rumor and social-signal labels remain visible.
- Deleted or inaccessible source URLs remain recorded with last retrieval time.
- Corrections and denials attach to the original event rather than silently replacing it.
- No scraper bypasses authentication, private access, CAPTCHA, or explicit blocking controls.
- Rate limits and source terms can disable individual adapters without breaking the pipeline.
- The application must say “coverage gap” rather than “complete” when a source or period is not accessible.

## Error Handling

The pipeline continues when an optional collector fails.

Fatal conditions:

- SQLite migration or schema validation failure.
- Canonical MLA roster corruption.
- Snapshot validation failure.
- Database transaction failure.

Non-fatal conditions:

- Instaloader anonymous access denied.
- Twikit authentication required or blocked.
- Newspaper extraction failure for one URL.
- Scrapy response errors for one domain.
- Reddit, Bluesky, RSS, or publisher request timeout.

Non-fatal failures are recorded in `crawl_failures`, surfaced in status metadata, and retried according to collector policy.

## Testing

### Unit Tests

- Existing JSON recovery and trailing-byte quarantine.
- Schema migration and idempotent import.
- URL, external ID, and content-hash deduplication.
- Atomic snapshot generation.
- Person alias resolution to existing IDs.
- Event candidate detection for minor events.
- Distinct legal-step preservation.
- Duplicate article clustering.
- Syndication independence grouping.
- Social corroboration gating.
- Curated event preservation.
- Collector failure isolation.

### Integration Tests

- Import current JSON into a temporary SQLite database.
- Run fixture-based RSS, Scrapy, Newspaper, Instagram, X, Reddit, and Bluesky adapters without network access.
- Extract and cluster events from fixtures.
- Generate compatibility and Time Fabric snapshots.
- Load snapshots through the React data path.

### Verification

- Existing MLA count and IDs remain unchanged.
- Existing curated event and policy IDs remain present.
- No generated dead MLA links return.
- A single anonymous social post does not enter Time Fabric.
- Two independent reports produce one event with two evidence records.
- Separate arrest, remand, bail, and appeal events remain distinct and linked.
- More than 100,000 fixture records can be imported without producing one browser-loaded monolithic file.
- Python tests, targeted ESLint, and Vite production build pass.

## Delivery Phases

### Phase 1: Warehouse Foundation

- Repair and import existing JSON.
- Add SQLite schema, repositories, migrations, and atomic exports.
- Preserve current frontend behavior through compatibility snapshots.

### Phase 2: Collector Adapters

- Refactor existing RSS, Reddit, and Bluesky collectors into adapters.
- Add Scrapy discovery and Newspaper extraction.
- Add anonymous Instaloader and optional anonymous Twikit adapters.
- Add collector health and failure reporting.

### Phase 3: Event Intelligence

- Add person/action/date extraction.
- Add event clustering, evidence attachment, corroboration rules, and legal/policy chains.
- Import curated events and policies with stable IDs.
- Backfill from 1952 using resumable jobs.

### Phase 4: Product Integration

- Load extracted events into Time Fabric.
- Add source, verification, person, party, and date filters.
- Link Intelligence Feed stories and politician profiles to event clusters.
- Attach policy follow-ups to current policy lineage records.

## Decisions

- This work extends the existing application; it does not replace it.
- Existing sourced MLA, ADR, seating, policy, feed, profile, and curated event data remains.
- SQLite is the local primary warehouse.
- Frontend JSON files are generated compatibility/materialized snapshots.
- Historical coverage begins in 1952.
- Duplicate coverage is clustered into one event with all raw evidence retained.
- Minor legal and political steps remain distinct linked events.
- Anonymous/public-only collection is required.
- Single-source anonymous social claims stay out of Time Fabric until corroborated.
- Free and open-source software only.
