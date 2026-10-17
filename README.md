# Intelligence Graph

Tamil Nadu political intelligence dashboard built with React and Vite.

**Android app:** [Download PolInt.apk](https://github.com/MDHaarith/PolInt-Sys/releases/download/apk-latest/PolInt.apk), rebuilt automatically on every app update to `main`.

## Data Workflow

Build the official MLA roster first:

```bash
python3 scripts/build_mla_roster.py
```

This parses the official Election Commission of India detailed-results PDF, validates all 234 constituency winners, writes `public/scrapedIntel.json`, and removes old generated MLA evidence sheets.

Install the optional integrated collectors:

```bash
python3 -m venv .venv
.venv/bin/python -m pip install -r requirements-intelligence.txt
```

Run the integrated evidence pipeline:

```bash
.venv/bin/python scripts/run_intelligence_pipeline.py --all --extended-public
```

This imports the existing JSON data into a local SQLite warehouse, preserves the
existing MLA/ADR/policy/event data, runs the existing RSS/Reddit/Bluesky
coverage, attempts anonymous public Scrapy/Newspaper/Instagram/X collection,
clusters duplicate reporting into events, and atomically regenerates the
frontend snapshots.

Run a bounded smoke collection:

```bash
.venv/bin/python scripts/run_intelligence_pipeline.py --all --extended-public \
  --max-rss-queries 10 --max-social-queries 5 --social-limit 5
```

Snapshots publish a flat story record (`id`, `url`, `snippet`, `publishedAt`,
`imageUrl`, `alsoReportedBy`, …). Broad publisher feeds and keyword social
searches are filtered to items with a political signal or a tracked politician,
syndicated copies of one headline collapse into a single story, and automatic
timeline events are rebuilt each run by clustering headlines per person, type
and day.

Every story carries a source tier (`record`, `established`, `partisan`,
`aggregator`, `social`; see `scripts/intelligence/quality.py`) and a 0–100
`importance` built from source quality, how many outlets carried it, its
subject and its category. Reworded copies of one story merge under the
best-sourced report. The feed's **Top** order multiplies importance by an
18-hour half-life; **Latest** is chronological.

`public/storylines.json` connects the dots (`scripts/intelligence/storylines.py`).
Each story is read as a move — who acted, what they did (attack, rebut, protest,
demand, deliver, ally, purge, go to court…) and at whom — and the likely intent
is inferred from the move and the actor's position relative to the ruling
parties (`RULING_STATE_PARTY`, `RULING_CENTRE_PARTY`; update these when power
changes hands). Moves that share distinctive words are chained into storylines
with momentum, a short reading and what to watch for next, and each politician
gets a playbook: current posture, shifts, targets, attackers and allies. These
are rule-based inferences, labelled as such in the app.

The original `scripts/scrape_political_intel.py` remains available as the
legacy collector implementation used by the integrated adapters.

Start the app:

```bash
npm run dev
```

Build for production:

```bash
npm run build
```

## Source Rules

- MLA winners, parties, votes, vote share, and margins come from ECI.
- Secondary free public sources may enrich records only when explicitly stored with source URLs.
- Assets, affidavits, criminal cases, and court filings must remain `Not sourced yet` until a real affidavit ingestion step exists.
- `scripts/seed_all_234_mlas.py` is demo-only and must not be used for production roster data.
