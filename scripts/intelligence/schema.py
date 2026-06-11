SCHEMA_VERSION = 1

SCHEMA_SQL = """
PRAGMA foreign_keys = ON;

CREATE TABLE IF NOT EXISTS schema_meta (
    key TEXT PRIMARY KEY,
    value TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS sources (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    source_type TEXT NOT NULL,
    base_url TEXT,
    platform TEXT,
    trust_tier TEXT NOT NULL DEFAULT 'reported',
    active INTEGER NOT NULL DEFAULT 1,
    created_at TEXT NOT NULL,
    updated_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS raw_items (
    id TEXT PRIMARY KEY,
    canonical_url TEXT,
    source_id TEXT NOT NULL REFERENCES sources(id),
    collector TEXT NOT NULL,
    platform TEXT,
    external_id TEXT,
    title TEXT NOT NULL,
    body TEXT NOT NULL DEFAULT '',
    author_name TEXT,
    published_at TEXT,
    retrieved_at TEXT NOT NULL,
    language TEXT,
    content_hash TEXT NOT NULL,
    politician_id TEXT,
    category TEXT NOT NULL DEFAULT 'news',
    verification_status TEXT NOT NULL DEFAULT 'source_reported',
    is_social INTEGER NOT NULL DEFAULT 0,
    raw_metadata_json TEXT NOT NULL DEFAULT '{}',
    first_seen_at TEXT NOT NULL,
    last_seen_at TEXT NOT NULL
);

CREATE UNIQUE INDEX IF NOT EXISTS idx_raw_items_url
ON raw_items(canonical_url)
WHERE canonical_url IS NOT NULL AND canonical_url != '';

CREATE UNIQUE INDEX IF NOT EXISTS idx_raw_items_external
ON raw_items(collector, external_id)
WHERE external_id IS NOT NULL AND external_id != '';

CREATE INDEX IF NOT EXISTS idx_raw_items_content_hash ON raw_items(content_hash);
CREATE INDEX IF NOT EXISTS idx_raw_items_published ON raw_items(published_at);
CREATE INDEX IF NOT EXISTS idx_raw_items_politician ON raw_items(politician_id);

CREATE TABLE IF NOT EXISTS people (
    politician_id TEXT PRIMARY KEY,
    canonical_name TEXT NOT NULL,
    aliases_json TEXT NOT NULL DEFAULT '[]',
    party_id TEXT,
    active_from TEXT,
    active_to TEXT,
    source TEXT NOT NULL DEFAULT 'existing_application'
);

CREATE TABLE IF NOT EXISTS events (
    id TEXT PRIMARY KEY,
    event_key TEXT NOT NULL UNIQUE,
    title TEXT NOT NULL,
    description TEXT NOT NULL DEFAULT '',
    event_type TEXT NOT NULL,
    occurred_at TEXT,
    occurred_precision TEXT NOT NULL DEFAULT 'unknown',
    year INTEGER,
    location TEXT,
    primary_politician_id TEXT,
    party_id TEXT,
    verification_status TEXT NOT NULL DEFAULT 'reported',
    confidence REAL NOT NULL DEFAULT 0.5,
    impact_summary TEXT NOT NULL DEFAULT '',
    current_status TEXT,
    is_curated INTEGER NOT NULL DEFAULT 0,
    source_links_json TEXT NOT NULL DEFAULT '[]',
    watch_items_json TEXT NOT NULL DEFAULT '[]',
    created_at TEXT NOT NULL,
    updated_at TEXT NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_events_year ON events(year);
CREATE INDEX IF NOT EXISTS idx_events_person ON events(primary_politician_id);
CREATE INDEX IF NOT EXISTS idx_events_type ON events(event_type);

CREATE TABLE IF NOT EXISTS event_people (
    event_id TEXT NOT NULL REFERENCES events(id) ON DELETE CASCADE,
    politician_id TEXT NOT NULL,
    role TEXT NOT NULL,
    PRIMARY KEY (event_id, politician_id, role)
);

CREATE TABLE IF NOT EXISTS event_evidence (
    event_id TEXT NOT NULL REFERENCES events(id) ON DELETE CASCADE,
    raw_item_id TEXT NOT NULL REFERENCES raw_items(id) ON DELETE CASCADE,
    evidence_role TEXT NOT NULL,
    independence_key TEXT NOT NULL,
    added_at TEXT NOT NULL,
    PRIMARY KEY (event_id, raw_item_id)
);

CREATE TABLE IF NOT EXISTS event_links (
    source_event_id TEXT NOT NULL REFERENCES events(id) ON DELETE CASCADE,
    target_event_id TEXT NOT NULL REFERENCES events(id) ON DELETE CASCADE,
    relationship TEXT NOT NULL,
    confidence REAL NOT NULL DEFAULT 0.5,
    source TEXT NOT NULL DEFAULT 'automatic',
    PRIMARY KEY (source_event_id, target_event_id, relationship)
);

CREATE TABLE IF NOT EXISTS crawl_runs (
    id TEXT PRIMARY KEY,
    collector TEXT NOT NULL,
    started_at TEXT NOT NULL,
    completed_at TEXT,
    status TEXT NOT NULL,
    items_seen INTEGER NOT NULL DEFAULT 0,
    items_added INTEGER NOT NULL DEFAULT 0,
    items_updated INTEGER NOT NULL DEFAULT 0,
    errors INTEGER NOT NULL DEFAULT 0,
    details_json TEXT NOT NULL DEFAULT '{}'
);

CREATE TABLE IF NOT EXISTS crawl_failures (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    crawl_run_id TEXT REFERENCES crawl_runs(id) ON DELETE CASCADE,
    collector TEXT NOT NULL,
    url_or_query TEXT,
    error_type TEXT NOT NULL,
    message TEXT NOT NULL,
    retryable INTEGER NOT NULL DEFAULT 1,
    occurred_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS app_state (
    key TEXT PRIMARY KEY,
    value_json TEXT NOT NULL,
    updated_at TEXT NOT NULL
);
"""

