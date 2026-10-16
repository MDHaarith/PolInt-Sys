# PolInt system plan — embeddings, two vector stores, personalised feed

Status: plan only, nothing built. Date: 16/10/2026.

## 0. Order of work
1. Newsprint & Kumkum UI restyle (in progress, separate agent).
2. Decide the open questions in §8.
3. Build phase A (info vector DB + threads), then B (on-device user DB), then C (hashed sync + general DB).

## 1. Measured facts (google/embeddinggemma-2, this PC)
| Fact | Value | Source |
|---|---|---|
| License / gating | Apache-2.0, ungated | HF model card |
| Checkpoint | bf16, 1.42 GB, ~740M params (text 270M + vision 170M + audio 300M) | `model.safetensors`, card |
| Output | 768-d, MRL 512/256/128, cosine | card, `config_sentence_transformers.json` |
| Context | 8,192 tokens | card |
| Prompts | query `task: search result \| query: ` · doc `title: none \| text: ` · clustering `task: clustering \| query: ` | `config_sentence_transformers.json` |
| Lib | sentence-transformers >= 6.1.0 (multimodal dict inputs) | same |
| f32 text tower on CPU | load 2.6 s, RSS 2.5–3.2 GB, ~7.5 docs/s (short titles) | `/tmp/egemma-venv/benchmark-f32.log` |
| Warehouse | 24,226 items, 96.9% Google News, 0 media URLs | research audit |
| Not measured yet | image throughput, bf16-vs-f32 agreement, Tamil↔English pairing quality | — |

## 2. Architecture
```
 collectors ──► warehouse.db ──► [EMBED: full f32, PC/CI] ──► INFO VECTOR DB (server-side, SQLite)
                                                                   │  threads · trends · related · int8 MRL-256 vectors
                                                                   ▼
                                                  live-data branch JSON (+ info_vectors.bin)
                                                                   │
 ┌──────────────────────── phone (Capacitor WebView) ──────────────▼────────────────────────┐
 │ INFO VECTOR DB (local copy, int8-256)      USER VECTOR DB (local only, IndexedDB)        │
 │        ▲                                   events → interest centroids (k≤6, decayed)     │
 │        └──── rank feed = f(freshness, thread momentum, sim(story, user centroids)) ◄──────┤
 │                                     │                                                    │
 │                         SimHash(centroid) → bucket id → randomized response (LDP)        │
 └─────────────────────────────────────┼────────────────────────────────────────────────────┘
                                       ▼  daily, opt-in, no device id
                         GENERAL DB (aggregate counts only: bucket × thread)
                                       │  read by pipeline
                                       ▼
                         bucket_recs.json on live-data ("readers like you")
```

## 3. Info vector DB (content) — phase A
- Runs where the pipeline runs, at **full f32**. Table `embeddings(item_id, content_hash, modality, model_rev, prompt_ver, dim, vec BLOB f32)`; key `(content_hash, modality, model_rev, prompt_ver)` so re-scrapes never re-embed.
- Text = `title + body[:~1500 chars]` with the document prompt. Images only once collectors store `media_url` (RSS `media:*`/enclosure, `og:image`, Bluesky/Reddit previews, YouTube thumbs); Google News items need the publisher URL resolved first.
- Budgeted, resumable backfill: each run embeds newest-first for at most N minutes, so CI never blows its 25 min limit (24k items ≈ 55 min on this PC; incremental 100–500 items ≈ 15–70 s).
- Derived outputs (pure numpy, no new vector engine needed at 24k rows):
  - **Story threads**: incremental clustering, cosine to time-decayed centroids, 72 h window; same-image hit = strong merge. Threshold tuned from measured duplicate vs random cosine distributions.
  - **Hybrid search index**: SQLite FTS5 (`trigram` tokenizer, works for Tamil) + dense cosine, Reciprocal Rank Fusion (k=60), MMR for diversity.
  - **Trends**: per-thread EWMA z-score of item rate; novelty = 1 − max cos to last-7-day centroids.
  - **Corroboration**: independent sources and languages per thread; social post with no news thread = "uncorroborated".
- Ships to the phone: `threads.json` and an `info_vectors.bin` with the newest 3,000 items, **MRL-256 int8**: 3000 × 256 B ≈ **0.75 MB** (vs 9.2 MB as f32-768).

## 4. RAM tiers on the phone
The phone never needs the model for personalisation. User vectors are built from the *precomputed* story vectors the user reads. A model is only needed to embed free-text search queries, so it is optional and sized to device RAM:

| Device RAM (Capacitor Device / `navigator.deviceMemory`) | On-device model | Weights in RAM | Search |
|---|---|---|---|
| < 4 GB | none | 0 | FTS keyword + "more like this" via shipped vectors |
| 4–6 GB | text tower int8 | ~0.3 GB | + semantic query embedding |
| 6–8 GB | text tower fp16/bf16 | ~0.55 GB | same, higher fidelity |
| ≥ 8 GB | text + vision fp16 | ~0.9 GB | + photo search |

**Full f32 stays on the backend.** f32 multimodal (~3 GB plus activations) exceeds what a WebView/WASM process can safely hold on almost any phone. Runtime (LiteRT via a native Capacitor plugin vs ONNX Runtime Web) is **unverified for this model**; it's a phase-B spike, and fp16 overflow must be checked (EmbeddingGemma 1 did not support fp16).

## 5. User vector DB (on-device only) — phase B
- IndexedDB stores: `events(story_id, action, dwell_s, ts)` and `centroids(k≤6, vec int8-256, weight, updated)`.
- Signal weights: open 1, dwell > 20 s +1, save 2, share 3, "less like this" −2. Half-life 14 days.
- Update: assign the story vector to the nearest centroid if cos > 0.55, else spawn or replace the weakest one (online k-means).
- Feed score = 0.45·freshness + 0.25·thread momentum + 0.30·max cos(story, centroid); always keep ≥30% non-personalised slots (avoid filter bubbles on political content).
- Never leaves the phone in raw form. Includes a "Clear my reading profile" button.

## 6. Hash → general DB — phase C
- The phone sends **only**: SimHash of each centroid (10 random hyperplanes over MRL-256 → 1,024 buckets; plane seeds published with the data), passed through randomized response (ε≈2), plus thread ids opened that day. Also an app version and a daily-rotating random token for rate limiting. **No device id, no raw vectors, no text.**
- General DB holds aggregate counts `(bucket, thread_id, day) → n`. The pipeline reads it and publishes `bucket_recs.json` (top threads per bucket). The phone reads its own buckets' rows.
- Honest caveat: hashing a vector is **not** anonymisation on its own. Bucket + thread ids + timing can still profile political leaning, which is sensitive. LDP noise, coarse buckets, opt-in consent and aggregate-only storage are what make it defensible under India's DPDP Act 2023 (notice + consent + purpose limitation + deletion).
- Needs a writable endpoint; the current stack has none (GitHub raw is read-only). See §8.

## 7. Failure modes
- Model or torch missing: the embedding stage is skipped, JSON fields are empty, and the app falls back to today's ranking.
- No vectors on the phone yet: fall back to chronological plus momentum.
- General DB unreachable: queue up to 7 days locally, then drop.

## 8. Decisions needed from you
1. **General DB host**: Cloudflare Worker + D1 (free tier, recommended), Supabase, or Firebase. Needs an account you own.
2. **Opt-in wording/consent screen** for the sync (required for C).
3. **Where embeddings run**: PC (fast, but only when it's on) vs GitHub Actions (always on, slower, budgeted backfill). Recommended: CI with the budgeted backfill, with a one-time full backfill from the PC.
4. **Phone model in phase B**: OK to spike LiteRT/ONNX for the text tower, or ship tier-"none" first?
