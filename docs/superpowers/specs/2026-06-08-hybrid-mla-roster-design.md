# Hybrid MLA Roster Design

Date: 2026-06-08
Project: Intelligence Graph
Scope: Replace the fake 17th Assembly MLA roster with a real, source-labeled hybrid roster.

## Goal

The Assembly Dashboard currently uses generated MLA records, invented seat results, fake case counts, fake assets, and simulated 2026 political data. The first milestone is to build a real MLA roster pipeline using completely free sources.

The roster must make source trust clear:

- ECI is the primary source of truth for constituency result, winning candidate, party, and votes.
- Secondary public sources can enrich records, but must never override ECI winner data silently.
- Any unsourced field must render as unavailable, not fabricated.

## Sources

Primary source:

- Election Commission of India 2026 Tamil Nadu Legislative Assembly detailed results PDF.
- ECI party-wise result pages can be used for aggregate cross-checks.

Secondary sources:

- Public browsable MLA/result pages such as OneIndia, KnowYourMLA-style pages, or similar free pages.
- These sources may fill convenience metadata only when the value is directly present and source URL is stored.

Out of scope for this milestone:

- Paid APIs.
- Login-only social networks.
- Circumventing anti-bot protections.
- Affidavit extraction, assets, criminal cases, and live rumor/social feed. Those come after the roster is real.

Future live social sentiment stack:

- Use `tweetnlp` as the primary Python library for social-media text classification.
- Use `cardiffnlp/twitter-roberta-base-sentiment-latest` as the preferred English social-media sentiment model.
- Use VADER only as a lightweight fallback when the transformer model is unavailable.
- Track sentiment target/entity separately from raw text sentiment, because political posts can be negative toward one actor while favorable toward another.
- For this React/Vite app, expose sentiment output through the existing dashboard UI. A separate Streamlit dashboard can be added as an analyst lab later, but should not replace the product UI unless explicitly requested.

## Data Model

Each MLA record will be stored under `public/scrapedIntel.json` in `mlas`:

```json
{
  "id": "tn-2026-001",
  "assemblyId": 17,
  "state": "Tamil Nadu",
  "constituencyNumber": 1,
  "constituency": "Example Constituency",
  "candidateName": "Example Candidate",
  "mlaName": "Example Candidate",
  "party": "dmk",
  "partyName": "Dravida Munnetra Kazhagam",
  "votes": 123456,
  "voteShare": 52.34,
  "marginVotes": 1234,
  "resultStatus": "won",
  "sourceType": "official_eci",
  "sources": [
    {
      "label": "ECI Detailed Results",
      "url": "https://www.eci.gov.in/...",
      "retrievedAt": "2026-06-08T00:00:00.000Z"
    }
  ],
  "enrichment": {
    "secondarySources": []
  }
}
```

Optional secondary fields can be added only if sourced:

- `gender`
- `age`
- `district`
- `reservationCategory`
- `profileUrl`
- `photoUrl`

The following fields must not be generated:

- Assets
- Criminal cases
- Affidavit URLs
- Court filings
- Source claims such as "ECI Affidavit" unless the pipeline really retrieved that source

## Architecture

Add a roster ingestion script, separate from the existing news scraper:

- `scripts/build_mla_roster.py`
  - Downloads or reads the ECI detailed-results PDF.
  - Extracts table rows.
  - Normalizes party names to existing app party IDs.
  - Selects the winning row for each constituency.
  - Optionally enriches from secondary free public pages.
  - Writes `public/scrapedIntel.json` with a real `mlas` array.

Keep the existing Google News scraper separate:

- `scripts/scrape_political_intel.py` remains for news.
- It should not invent MLA records or fake affidavit details.

Retire fake roster generation from the normal workflow:

- `scripts/seed_all_234_mlas.py` should no longer be used for production app data.
- If retained, label it as demo data only and do not call it from the app.

## UI Changes

Assembly Dashboard:

- Show source-labeled MLA roster from `mlas`.
- Display party, constituency, candidate, votes, vote share, and margin where available.
- Show "Official ECI" badges for primary roster fields.
- Render assets and criminal cases as "Not sourced yet" until affidavit ingestion exists.
- Remove language implying fake generated records are real.

Politician Directory:

- Merge official MLA records into existing politician profiles by normalized name when possible.
- For unmatched MLA records, create a minimal profile from ECI result data.
- Do not attach fake `newsFeed`, `evidenceSheet`, assets, or cases.

Data quality panel:

- Show roster count, source count, and any parse/enrichment warnings.
- Block a successful "official roster" status unless 234 constituency winners are present.

## Error Handling

The ingestion script should fail loudly when:

- ECI data cannot be fetched or parsed.
- Fewer than 234 winners are found.
- Duplicate constituency numbers appear.
- Unknown parties cannot be mapped.

The app should still load with existing base politicians if the roster file is unavailable, but it should show a clear "roster unavailable" status instead of fake records.

## Testing And Verification

Minimum verification:

- Run the roster script and confirm `mlas.length === 234`.
- Confirm no generated `Constituency-###` values remain.
- Confirm no generated fake assets, fake affidavit URLs, or fake legal filings are introduced.
- Confirm party totals match ECI aggregate results.
- Run `npm run build`.
- Open the app locally and verify the Assembly Dashboard renders the real roster.

## Implementation Order

1. Add the ECI-first parser and normalized output writer.
2. Add secondary-source enrichment behind a best-effort flag.
3. Update merge logic in `src/App.jsx` to preserve source fields.
4. Update `src/components/AssemblyDashboard.jsx` to show sourced result fields.
5. Update `src/components/PoliticianSpace.jsx` to avoid fake evidence fields.
6. Mark old seeding script as demo-only or remove it from normal usage.
7. Build and manually verify the dashboard.

## Decisions

- Hybrid approach approved by user.
- Free sources only.
- ECI winner data is authoritative.
- Secondary sources are enrichments only.
- Fake data must be removed before building live rumors/social features.
