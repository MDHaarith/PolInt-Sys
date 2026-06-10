# Intelligence Graph

Tamil Nadu political intelligence dashboard built with React and Vite.

## Data Workflow

Build the official MLA roster first:

```bash
python3 scripts/build_mla_roster.py
```

This parses the official Election Commission of India detailed-results PDF, validates all 234 constituency winners, writes `public/scrapedIntel.json`, and removes old generated MLA evidence sheets.

Install the optional integrated collectors:

```bash
python3 -m pip install -r requirements-intelligence.txt
```

Run the integrated evidence pipeline:

```bash
python3 scripts/run_intelligence_pipeline.py --all --extended-public
```

This imports the existing JSON data into a local SQLite warehouse, preserves the
existing MLA/ADR/policy/event data, runs the existing RSS/Reddit/Bluesky
coverage, attempts anonymous public Scrapy/Newspaper/Instagram/X collection,
clusters duplicate reporting into events, and atomically regenerates the
frontend snapshots.

Run a bounded smoke collection:

```bash
python3 scripts/run_intelligence_pipeline.py --all --extended-public \
  --max-rss-queries 10 --max-social-queries 5 --social-limit 5
```

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
