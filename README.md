# Intelligence Graph

Tamil Nadu political intelligence dashboard built with React and Vite.

**Android app:** [Download PolInt.apk](https://github.com/MDHaarith/PolInt-Sys/releases/download/apk-latest/PolInt.apk), rebuilt automatically on every app update to `main`.
Versioned releases (signed APK plus an App Bundle for Google Play) are published
from tags; see [Releasing the Android app](#releasing-the-android-app). The plan
for further work is in [docs/ROADMAP.md](docs/ROADMAP.md).

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

## Embeddings, vector store and search

Stories, news photos and audio are embedded with **EmbeddingGemma 2**
(Google DeepMind, Apache 2.0), which puts text, images and audio into one
768-dimensional space. A text query can therefore find a photo or a speech
clip, and Tamil and English reports of one event land close together. The
model runs on CPU through Transformers.js (`scripts/embeddings/`), using the
4-bit ONNX export. Each modality's encoder is downloaded only when needed:
text 174 MB, vision 109 MB, audio 189 MB, cached in `data/models/hf/`.

**Data pipeline** (`--embed`, also part of `--all`):
1. *Discover*: every story's headline and summary, its photo (`imageUrl`), any
   audio enclosure in its feed (`audioUrl`), and any image or audio file dropped
   into `data/media/inbox/`. A file can carry a sidecar `clip.mp3.json` with
   `{"title", "publishedAt", "politicianId"}`.
2. *Embed*: newest first, within a time budget (`--embed-seconds`), so a
   backlog fills in over several runs. Failures are retried up to three times.
   Stories are embedded with the model's search prompt (`task: search result |
   query: …`), which links reports of one issue better than its document
   prompt; changing the prompt re-embeds every story.
3. *Store*: vectors live in the SQLite warehouse (`media_items`, `vectors`
   tables, float16). Search is exact cosine similarity with numpy, which takes
   milliseconds at this size.

**Search** across modalities:

```bash
python3 scripts/search_intel.py "farmers protest over Cauvery water" --days 14
python3 scripts/search_intel.py "மீனவர்கள் கைது"
python3 scripts/search_intel.py --image rally.jpg --modality image
python3 scripts/search_intel.py --audio speech.mp3
python3 scripts/search_intel.py --stats
```

**In the app**, *Meaning* next to the feed's search box searches by meaning on
the phone. The pipeline publishes `vectorIndex.json` (the recent stories cut
to 256 dimensions by Matryoshka truncation and stored as int8, about 1 MB).
The first time it is used, the app downloads the text encoder once and keeps
it in the browser cache. After that, queries never leave the device. The index
also carries the stories' mean and strongest shared direction, which the app
removes from stories and queries before comparing them; it lifts both search
and *Similar* by about 0.05 precision@10.

**Storylines** also use the vectors, centred by subtracting the corpus mean.
Every headline shares a broad "Tamil Nadu politics" direction, and without
centring a big storyline's centre resembles every political story. A move
joins a storyline when its meaning is close to the storyline's centre, even
with no shared words, and storylines with near-identical centres merge
(thresholds and their measurements are in `storylines.py`). On the
hand-checked same-issue groups in `tests/fixtures/same_issue_clusters.json`
(`python3 scripts/embedding_experiments.py`; every variant tried, from model
precision to prompts and post-processing, is in
[docs/embedding-experiments.md](docs/embedding-experiments.md)):

| Method | Precision@10 | Cross-language top-1 | Pair F1 | Pair AP |
| --- | ---: | ---: | ---: | ---: |
| Word overlap | 0.64 | 0.20 | 0.64 | 0.63 |
| Document prompt, 768-d, centred (before) | 0.70 | 0.71 | 0.85 | 0.92 |
| Search prompt, 768-d, centred (storylines) | 0.74 | 0.73 | 0.89 | 0.95 |
| Search prompt, 768-d, 3 shared directions removed (datasets) | 0.77 | 0.74 | 0.92 | 0.97 |
| Search prompt, 256-d int8, 1 shared direction removed (app) | 0.76 | 0.73 | 0.91 | 0.96 |

End to end (`python3 scripts/eval_storylines.py`), storylines now put 83% of
same-issue gold pairs in one storyline (63% before, 42% with words alone),
still never joining two different issues.

**Datasets and training**:

```bash
python3 scripts/build_datasets.py --days 60      # data/datasets/polint-YYYYMMDD/
python3 scripts/train_move_classifier.py data/datasets/polint-YYYYMMDD
```

The dataset folder holds labelled stories, weak move labels, contrastive story
triples, pairs mined by meaning, hand-checked gold pairs, photo–headline and
audio pairs, and the vectors, with a dataset card (`README.md`) describing
provenance and limits. Each card reports how often the triples and mined pairs
agree with the hand-checked groups. Triple negatives must be unlike their
anchor: same-actor stories from another storyline were the same issue 80% of
the time, because storylines split one issue into several threads.

## Releasing the Android app

1. Create a release key once and keep it safe; Google Play and every update need the same key:
   `keytool -genkeypair -keystore polint-release.keystore -alias polint -keyalg RSA -keysize 2048 -validity 10000`
2. Add four repository secrets: `ANDROID_RELEASE_KEYSTORE_B64` (`base64 -w0 polint-release.keystore`),
   `ANDROID_RELEASE_KEYSTORE_PASSWORD`, `ANDROID_RELEASE_KEY_ALIAS` and `ANDROID_RELEASE_KEY_PASSWORD`.
3. Tag a version on `main` and push it: `git tag v1.0.0 && git push origin v1.0.0`.

The `Release Android app` workflow builds `PolInt-1.0.0.apk` and `PolInt-1.0.0.aab`
(version code 10000 for 1.0.0, 10100 for 1.1.0) and attaches both to a GitHub release.
To build locally: `npm run build:mobile`, then `cd android && ./gradlew assembleRelease`
with `ANDROID_KEYSTORE_FILE`, `ANDROID_KEYSTORE_PASSWORD`, `ANDROID_KEY_ALIAS` and
`ANDROID_KEY_PASSWORD` set.
