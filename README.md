# Intelligence Graph

Tamil Nadu political intelligence dashboard built with React and Vite.

## Data Workflow

Build the official MLA roster first:

```bash
python3 scripts/build_mla_roster.py
```

This parses the official Election Commission of India detailed-results PDF, validates all 234 constituency winners, writes `public/scrapedIntel.json`, and removes old generated MLA evidence sheets.

Run the news crawler separately:

```bash
python3 scripts/scrape_political_intel.py
```

The news crawler adds Google News RSS articles only. It does not create affidavit URLs, assets, criminal cases, or legal filings.

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
