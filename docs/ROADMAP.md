# PolInt roadmap

Planned improvements, highest value first. Each item states what it fixes,
how it would be built and what it costs. "Done" lists what has already
shipped so the plan stays honest.

## Done

- Flat story records, real summaries and political-relevance filtering (scraper fix).
- Source tiers, party-affiliation flags and a 0–100 importance score.
- Near-duplicate merging under the best-sourced report.
- Moves, inferred intent, storylines and per-politician playbooks.
- Bilingual concept linking (SIR, meth, power purchase, Periyar centre…), so
  Tamil and English reports of one issue share a storyline.
- Storyline merging when greedy threading split one issue in two.
- Momentum from coverage pace: outlets in the last 24 hours against the three days before.
- Feed diversity: further stories from a storyline already shown rank lower.
- Android app: back button, native share sheet, saved last download, app
  icon and splash, compact app bar and icon tab bar, signed version releases.
- EmbeddingGemma 2 vector store for text, photos and audio in the warehouse;
  cross-modal search (`scripts/search_intel.py`); on-device search by meaning
  in the app; centred embeddings in storyline linking; a same-issue benchmark
  (`scripts/eval_embeddings.py`); a dataset builder and a first action
  classifier (`scripts/build_datasets.py`, `scripts/train_move_classifier.py`).

## 1. Algorithm

### 1.1 An evaluation set before more tuning (next)
The rules are tuned by eye. Label about 300 recent headlines (half Tamil)
with actor, action, target and intent, store them in
`tests/fixtures/moves_gold.jsonl`, and report precision and recall per field
in CI. Every later change is then measured, not guessed. About a day of
labelling; no running cost.

### 1.2 Model reading for the weak cases
About a third of moves are read with low confidence (questions, analysis
pieces, headlines without a verb). Send only those to a small Claude model
with the rule reading as a hint, asking for actor, action, target, intent
and a one-line rationale as JSON. Cache by story id so each story is read
once. At roughly 200 new low-confidence stories per day this is a few cents
a day. It needs an `ANTHROPIC_API_KEY` secret in the data workflow, and the
rules remain the fallback.

### 1.3 Embeddings: next steps
- Grow the hand-checked benchmark beyond 10 groups, and add groups where
  embeddings currently fail (analysis pieces, opinion columns).
- Use the action classifier (70% agreement with high-confidence rule labels
  after three weeks of data) for headlines the rules cannot read, once a
  hand-labelled set shows it beats the rules there.
- Fine-tune on `story_pairs.jsonl` and `gold_pairs.jsonl` (e.g. a small
  linear adapter on top of the frozen vectors) when there are a few thousand
  pairs.
- Add audio sources: Tamil news podcasts and bulletin feeds with enclosures,
  or a YouTube transcript-free audio pipeline for speeches.

### 1.4 Wider name coverage
Only about 40 leaders are recognised by name. Generate aliases for all 234
sitting MLAs and the ministers from the roster already in
`scrapedIntel.json` (English plus Tamil transliteration), with collision
checks against common words. More stories get an actor, and the People
pages fill in.

### 1.5 Promise and contradiction tracking
- Link each "promise" move to later "deliver" moves by the same actor on the
  same concept, and show kept, pending and overdue promises.
- Flag when an actor's stance on a concept flips (backs, then opposes).

### 1.6 Relationship temperature
Turn ally and attack edges into a party-to-party score that decays over time
(warming or cooling), drawn as a small network. This answers "who is drifting
toward whom" ahead of alliance talks.

### 1.7 Resolve Google News links
Google News items carry redirect URLs, so they only merge with the
publisher's own copy when the headlines match. Decode the article URL from
the Google News id, or follow one redirect per new item, so duplicates merge
by URL.

### 1.8 Learned source reliability
Track how often an outlet's reports are later corroborated by
newspaper-of-record sources, and how often they are flagged as rumours.
Blend this into the tier weight so reliability is earned, not hand-assigned.

## 2. Mobile app

### 2.1 Notifications for escalating storylines
When a storyline turns "escalating", or a followed politician makes a
high-confidence move, send a push notification. This needs a Firebase
project (`google-services.json`) and a small sender step in the data
workflow. The Capacitor push plugin is already compatible.

### 2.2 Follow politicians
Star politicians; the feed and notifications prioritise them. Stored on the
device (Capacitor Preferences), so no account is needed.

### 2.3 Tamil interface
The data is already bilingual. Add a language switch for the interface text
(labels, intents, "watch for"), with the intent phrases translated once in
`storylines.py`.

### 2.4 Google Play listing
The release workflow already produces a signed `.aab`. Remaining work is a
privacy policy page (no personal data is collected), the data-safety form,
screenshots from `npm run build:mobile`, and a store description.

### 2.5 iOS
Capacitor supports iOS from the same code. This needs a Mac runner (or
Xcode Cloud) and an Apple developer account.

## 3. Engineering

- Split `src/data/politicalDatabase.js` (~100 KB) into lazily loaded chunks;
  the JS bundle is about 380 KB.
- A Playwright smoke test in CI that loads the feed, opens a storyline and a
  dossier at phone width.
- Clamp future `published_at` at ingest, not only in storylines.
- Install graphify in CI so `graphify update .` runs after code changes.
