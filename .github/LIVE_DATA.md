The mobile build fetches snapshots from
`https://raw.githubusercontent.com/MDHaarith/PolInt-Sys/live-data`, then falls back
to its bundled JSON if the request fails or takes more than 20 seconds.
`VITE_DATA_BASE_URL` remains a build-time override for a LAN server. Rebuild and
install the APK to give an existing installation the new default. `loadData(path)`
fetches again on every call, so periodic and manual UI refreshes use the same API.
Raw GitHub responses can remain cached for about five minutes despite `?t=`.

After merging the workflow into the default branch, allow GitHub Actions and
read/write workflow permissions in Settings → Actions → General, then dispatch
“Refresh live intelligence data” once from Actions. No API secrets are needed.
Allow the workflow token to force-push `live-data` if branch rules restrict it.
The workflow then runs at minutes 7 and 37 of every hour (UTC). GitHub schedules
can be delayed and scheduled workflows in inactive public repositories can be
disabled; this is periodic publishing, not a real-time guarantee.

Python 3.12 and Node 22 are sufficient: RSS, Reddit/PullPush and Bluesky collectors
use the Python standard library; Node exports curated events. The optional
packages in `requirements-intelligence.txt` are used only by extended collectors,
which CI does not run. Instagram and X generally reject anonymous searches. The
dead government press-release URL was removed; optional web discovery now starts
at the assembly's “what's new” page rather than its navigation-heavy homepage.

Each successful run saves `data/intelligence.db` using Actions cache with a unique
key and restores the newest matching cache next time. SQLite is closed before
saving. The local warehouse is about 128 MiB after the initial refresh;
cache quotas/eviction apply. If a cache is lost, the checked-in full snapshot
reseeds historical data, but records collected only since that snapshot may be
lost. Cache is deliberately separate from the public data branch: only
`scrapedIntel.mobile.json` (3,000 newest dated-first stories), `timeFabric.json`,
`policyUpdates.json` and `intelStatus.json` are published. Each publication starts
a fresh Git repository and force-pushes its root commit to `live-data`, so branch
history stays one commit. No warehouse or full news JSON is published.

Before publishing, the workflow checks JSON parsing, a 95 MB per-file ceiling,
current dated news within seven days and a successful RSS collector. If checks
fail, the previous public snapshots remain available. Check `collectorHealth`
and `coverageGaps` in `intelStatus.json` for partial failures. Public endpoints
can change or rate-limit cloud runners; public social posts remain unverified
chatter. Respect publisher/platform terms. Event and warehouse data grow over
time even though the mobile feed and branch history are bounded.

Feed probes on 2026-10-16 returned HTTP 200 with 60 items from The Hindu Tamil Nadu,
22 from DT Next, 6 from Puthiya Thalaimurai and 20 from TOI Tamil Nadu. Their URLs
are in `scripts/intelligence/source_config.py`. Google News searches with
`when:7d` returned 96 English and 70 Tamil items. The tested News18 Tamil
`/rss/tamil-nadu.xml` and `/rss/politics.xml` and Dinamani `/rss/tamilnadu.xml`
returned 404, so none was added. News18 articles can still arrive via Google News.
Bluesky search on `public.api.bsky.app` returned 403; the same search on
`api.bsky.app` returned HTTP 200 and posts. The English-only language restriction
was removed. RSS/social HTTP errors now reach collector health instead of being
silently reported as healthy zero-item runs.

Local verification on 2026-10-16:

- The initial live collection added 1,951 records. A repeat with the exact CI
  collector selection added 65 more: 2,016 total additions, 24,226 warehouse
  stories and 2,199 events. The mobile snapshot contains 3,000 stories and 234 MLAs.
- Latest collector health (seen / added in the repeat run): RSS 1,815 / 62 ready;
  direct RSS 108 / 3 ready; Reddit 270 / 0 ready; Bluesky 213 / 0 ready. Across both
  runs the additions were RSS 1,512, direct RSS 111, Reddit 205 and Bluesky 188.
- The extended diagnostic run returned no articles/posts: web extraction was
  degraded because `newspaper` is absent, and Instagram/X were unavailable
  because `instaloader`/`twikit` are absent. Earlier recorded Instagram access
  also returned 403. These optional collectors are excluded from CI.
- The top ten normalized publication timestamps are all 2026-10-16, at
  15:34:32, 15:33:15, 15:31:04, 15:29:01, 15:26:55, 15:25:02, 15:18:00,
  15:18:00, 15:16:43 and 15:16:43 UTC. The entire full/mobile snapshots were
  checked for descending publication dates. Undated pages follow dated stories.
- A publisher revised one existing story's date, exposing an old warehouse bug:
  duplicate upserts changed JSON metadata without its SQL sort date. Upserts now
  synchronize both, and a one-time migration repairs existing warehouse dates.
- `python3 -m pytest -q`: 177 passed. `node --test tests/*.test.mjs`: 4 passed.
  ESLint and both Vite builds passed; `scripts/build_mobile_data.py` completed.
  All four mobile fallback JSON files match their generated public counterparts.
  YAML parsing, inline Bash syntax and the workflow's actual data validation
  passed. Production dependency audit reported zero vulnerabilities.
- Published payload sizes: mobile news 7,984,122 bytes; time fabric 5,987,876;
  policy updates 1,033,726; status 3,368. The 133,218,304-byte SQLite warehouse
  stays in cache, and the roughly 56 MiB full news JSON stays off `live-data`.
- `graphify query` and `graphify update .` could not run because the executable
  and its recorded Python environment are missing. No workflow was dispatched
  and no Git commit or push was performed locally.

Implementation files changed: `scripts/run_intelligence_pipeline.py`,
`scripts/scrape_political_intel.py`, `scripts/build_mobile_data.py`,
`scripts/intelligence/source_config.py`, `scripts/intelligence/warehouse.py`,
`scripts/intelligence/snapshots.py`, the `base.py`, `rss.py`, `reddit.py` and
`bluesky.py` collector adapters, `src/dataSource.js`, this document and
`.github/workflows/live-data.yml`. Regression checks are in
`tests/test_intelligence_snapshots.py`, `tests/test_warehouse_dates.py`,
`tests/test_social_scraper.py`, `tests/test_live_collectors.py` and
`tests/data_source.test.mjs`. The five generated `public/*.json` snapshots were
refreshed. UI components and styling were left to the concurrent UI agent.
