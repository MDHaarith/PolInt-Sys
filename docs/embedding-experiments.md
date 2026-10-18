# EmbeddingGemma 2: which set-up, and how to make training data

October 2026. Every variant was scored on the hand-checked same-issue groups
(`tests/fixtures/same_issue_clusters.json`: 235 Tamil and English headlines in
10 issues from 10–17 October) against the 2,270 non-social stories of the
published feed. Reproduce with:

```bash
python3 scripts/embedding_experiments.py      # encodings, post-processing, search
python3 scripts/eval_storylines.py            # storylines end to end (needs embedded warehouse)
python3 scripts/build_datasets.py             # dataset card reports label agreement with the groups
```

Brackets are 95% intervals for the difference from the reference, from
resampling the ten groups. Ten issues are few: treat gains whose interval
touches zero as unproven.

## What changed

| Use | Before | After | Measured gain |
| --- | --- | --- | --- |
| Story vectors | document prompt (`title: none \| text: …`) | search prompt (`task: search result \| query: …`) | P@10 0.70 → 0.74, pair AP 0.920 → 0.954 |
| Storylines | link 0.58 / 0.50, merge 0.72 | link 0.61 / 0.52, merge 0.60 | gold pair recall 0.63 → 0.83 at precision 1.0; group completeness 0.69 → 0.77 |
| App "Similar" (256-d int8) | stored vectors as they are | mean and one shared direction removed on the device | P@10 0.68 → 0.76 |
| App "Meaning" search | stored vectors as they are | same removal on query and stories | P@10 0.69 → 0.75 [+0.007, +0.121]; Tamil queries 0.76 → 0.81 |
| Photo → its story | document-prompt stories | search-prompt stories | MRR 0.094 → 0.119 (108 photos) |
| Triple negatives | same actor, other storyline | same actor, other storyline, similarity < 0.15 | correct 20% → 100% |
| Move classifier | L2 fixed at 1e-3 | L2 picked on held-back training rows | accuracy 0.71 → 0.74 on rule labels |

Older app versions ignore the new index fields and compare stored vectors as
before; with search-prompt stories they still gain slightly (Similar 0.68 →
0.71, search 0.69 → 0.70).

The first data run after this change re-embeds every story (the content hash
now includes the prompt, and old vectors are dropped so prompts never mix);
with the workflow's budget that takes one or two runs, during which storylines
fall back to words for stories not yet re-embedded.

## 1. Encoding

Story-to-story linking, 768-d, corpus mean removed ("centred"); reference is
the previous production set-up (document prompt, q4).

| Set-up | P@10 | Cross-language top-1 | Pair F1 | Pair AP | ΔP@10 |
| --- | ---: | ---: | ---: | ---: | --- |
| Word overlap | 0.64 | 0.20 | 0.64 | 0.630 | −0.063 [−0.123, −0.017] |
| document, fp32 | 0.70 | 0.71 | 0.85 | 0.921 | +0.004 [−0.006, +0.012] |
| document, fp16 | 0.70 | 0.71 | 0.85 | 0.921 | +0.005 [−0.006, +0.013] |
| document, q8 | 0.70 | 0.71 | 0.85 | 0.922 | +0.006 [−0.005, +0.014] |
| **document, q4 (reference)** | 0.70 | 0.71 | 0.85 | 0.920 | |
| document, q4f16 | 0.70 | 0.70 | 0.85 | 0.920 | +0.002 [+0.000, +0.005] |
| **search prompt, q4** | **0.74** | **0.73** | **0.89** | **0.954** | **+0.043 [+0.018, +0.087]** |
| sentence-similarity prompt | 0.71 | 0.66 | 0.87 | 0.937 | +0.015 [−0.007, +0.053] |
| fact-checking prompt | 0.69 | 0.71 | 0.85 | 0.929 | −0.005 [−0.022, +0.016] |
| document prompt, headline only | 0.70 | 0.71 | 0.84 | 0.918 | +0.001 [−0.018, +0.020] |
| no prompt | 0.68 | 0.71 | 0.75 | 0.840 | −0.019 [−0.051, +0.007] |
| document prompt with real title field | 0.67 | 0.68 | 0.82 | 0.893 | −0.027 [−0.057, −0.008] |
| clustering prompt | 0.64 | 0.71 | 0.70 | 0.794 | −0.058 [−0.101, −0.025] |
| classification prompt | 0.61 | 0.56 | 0.70 | 0.792 | −0.086 [−0.133, −0.040] |

- **Precision**: fp32, fp16 and q8 are not reliably better than q4, and the
  phone encodes queries with q4, so q4 stays. CPU time is similar for all
  (about 5–9 s per 100 stories, including loading the model).
- **Prompt**: the search prompt wins on every group or ties (paired with the
  document prompt under the same processing: P@10 +0.031 [+0.012, +0.063],
  pair AP +0.010 [+0.003, +0.023]). The model's own configuration uses this
  prefix for bitext mining, that is for finding the same content in another
  language, which is what linking reports of one issue asks for.
- Putting the headline in the `title:` field, or using the clustering or
  classification prompts, is worse.

## 2. Post-processing

| Document prompt, q4, 768-d | P@10 | Cross-language | Pair F1 | Pair AP |
| --- | ---: | ---: | ---: | ---: |
| raw | 0.67 | 0.69 | 0.83 | 0.895 |
| centred (corpus mean removed) | 0.70 | 0.71 | 0.85 | 0.920 |
| each language's mean removed | 0.73 | 0.70 | 0.90 | 0.956 |
| mean and 1 shared direction removed | 0.73 | 0.71 | 0.90 | 0.955 |
| mean and 3 shared directions removed | 0.74 | 0.73 | 0.90 | 0.956 |
| mean and 8 shared directions removed | 0.72 | 0.73 | 0.80 | 0.873 |
| whitened | 0.73 | 0.69 | 0.77 | 0.839 |
| **search prompt, 3 directions removed** | **0.77** | **0.74** | **0.92** | **0.968** |

- Removing the mean and the strongest shared directions ("all-but-the-top")
  beats centring alone for pairs: three directions at 768-d, one at 256-d;
  more strips meaning. It is used for the app index and for mining training
  data (`vectors.without_shared_directions`).
- Storylines compare stories with a thread's centre, not with each other.
  There, end to end, centring (completeness 0.77) did as well as removing
  three directions (0.74), so storylines keep centring.
- Matryoshka sizes: 512, 256 and even 128 dimensions lose nothing measurable
  after centring (128 loses 0.04 without it). int8 storage costs nothing.
- Averaging two prompts' vectors (+0.018) or adding word overlap (+0.017)
  helps a little, less than the prompt change, at twice the cost or complexity.

App index, 256-d int8:

| Stories | Processing on the device | Similar P@10 | Pair AP |
| --- | --- | ---: | ---: |
| document prompt | none (before) | 0.68 | 0.899 |
| document prompt | mean and 1 direction removed | 0.72 | 0.947 |
| search prompt | none (older app versions) | 0.71 | 0.937 |
| **search prompt** | **mean and 1 direction removed** | **0.76** | **0.958** |
| search prompt | mean and 3 directions removed | 0.75 | 0.944 |

## 3. Search by meaning

30 queries written for the ten groups (`tests/fixtures/search_queries.json`:
short English, longer English, Tamil); a result is relevant when it belongs to
the query's group. 256-d int8 index, as on the phone.

| Stories | Queries | Processing | P@10 | Δ vs shipped | P@10 Tamil | MRR |
| --- | --- | --- | ---: | --- | ---: | ---: |
| document | search prompt | none (shipped) | 0.69 | | 0.76 | 0.93 |
| document | sentence-similarity prompt | none | 0.69 | +0.003 [−0.027, +0.037] | 0.78 | 0.92 |
| document | document prompt | none | 0.66 | −0.029 [−0.047, −0.010] | 0.73 | 0.92 |
| document | search prompt | both centred | 0.72 | +0.033 [+0.007, +0.063] | 0.81 | 0.93 |
| document | search prompt | mean and 1 direction removed | 0.77 | +0.077 [+0.030, +0.127] | 0.82 | 0.93 |
| search prompt | search prompt | none | 0.70 | +0.013 [−0.027, +0.060] | 0.77 | 0.92 |
| **search prompt** | **search prompt** | **mean and 1 direction removed** | **0.75** | **+0.059 [+0.007, +0.121]** | **0.81** | 0.91 |

Removing the shared direction from both sides is what matters. Search alone
is a shade better with document-prompt stories (0.77 against 0.75, well inside
the noise), but search-prompt stories win for linking, Similar and photos.
Removing the mean from the stories but not the query hurts (0.66).

## 4. Storylines end to end

`scripts/eval_storylines.py`: storylines built as the snapshot step does, for
the 45 days ending with the groups' week; 137 gold stories are read as moves.
Thresholds for each set-up were matched to the same share of off-topic stories
(0.1%) passing the link cut-off.

| Set-up | Merge | Pair precision | Pair recall | Group completeness |
| --- | ---: | ---: | ---: | ---: |
| words only | | 1.00 | 0.42 | 0.59 |
| document prompt, centred (before) | 0.72 | 1.00 | 0.63 | 0.69 |
| document prompt, centred | 0.55 | 1.00 | 0.65 | 0.71 |
| search prompt, centred | 0.72 | 1.00 | 0.47 | 0.67 |
| **search prompt, centred (now)** | **0.60** | **1.00** | **0.83** | **0.77** |
| search prompt, 3 directions removed | 0.60 | 1.00 | 0.80 | 0.74 |

Pair recall moves in steps because the biggest group (71 stories) dominates
pair counts; completeness is steadier. With the search prompt, merge
thresholds from 0.55 to 0.65 all give completeness 0.74–0.77 and 0.70 or
above leaves the Tamil and English threads of one issue apart. Every extra
merge at 0.60 was checked by eye: the Tamil and English threads of the Rahul
Gandhi visit, the SIR protests, the VCK–PMK row, L. Murugan's resignation and
composer Deva's death. No two gold issues were ever merged.

## 5. Training data

### Label quality

Each way of making contrastive pairs was checked against the gold groups
(stories from 9–17 October; only pairs where both stories are in the groups
can be checked).

| Labels | Correct | Checked |
| --- | ---: | ---: |
| Positive: same storyline | 100% | 91 |
| Negative: same actor, other storyline (before) | **20%** | 49 |
| Negative: random story outside the storyline | 88% | 16 |
| Negative: most similar same-actor story below 0.15 (now) | 100% | 10 |
| Mined: mutual nearest neighbours within 3 days, ≥ 0.35 | 100% | 43 |
| Mined: cross-language only, ≥ 0.30 | 89% | 18 |

Storylines split one issue into several threads, so most "same actor, other
storyline" negatives were the same issue: the old `story_pairs.jsonl` mostly
taught a model to push apart stories that belong together. The dataset
builder now picks the most similar same-actor story whose similarity is under
0.15 (pair precision on the groups is 87% at 0.15 and 94% at 0.20, so below
0.15 is safely different), writes mined pairs as `mined_pairs.jsonl`, keeps
ids and similarities on every row, flags rows touching the gold groups
(`inGoldSet`), and reports these agreement figures in each dataset card. The
first real build: triple positives 100% of 54, negatives 100% of 10, mined
pairs 100% of 40.

### Does a trained adapter help yet?

A linear adapter (768×768, initialised at identity, InfoNCE with in-batch and
explicit negatives) was trained on each kind of triple and scored on the
groups, with gold stories left out of training, in two regimes: *temporal*
(train on stories before 10 October, 235–332 triples) and *in-window* (train on
9–17 October without gold stories, 170–463 triples). No variant beat the frozen
vectors with three shared directions removed: changes in P@10 ranged from
−0.017 to +0.008, all intervals including zero except small losses. With a few
hundred triples there is not enough signal; revisit with a few thousand, using
the corrected negatives.

### Move classifier

Softmax regression on story vectors against rule labels (high and medium
confidence), newest fifth held out: 1,076 labelled stories since May, 216
held out (100 high confidence), majority baseline 0.34.

| Features | L2 | Accuracy | On high-confidence | Macro-F1 | Tamil |
| --- | ---: | ---: | ---: | ---: | ---: |
| document prompt, centred | 1e-3 (before) | 0.69 | 0.71 | 0.42 | 0.69 |
| document prompt, centred | 1e-4 | 0.75 | 0.77 | 0.49 | 0.75 |
| search prompt, centred | 1e-3 | 0.71 | 0.72 | 0.45 | 0.70 |
| search prompt, centred | 1e-4 | 0.74 | 0.74 | 0.50 | 0.78 |
| search prompt, centred, balanced | 1e-3 | 0.67 | 0.75 | 0.54 | 0.77 |
| classification prompt, centred | 1e-4 | 0.71 | 0.74 | 0.44 | 0.75 |
| search prompt, 3 directions removed | 1e-3 | 0.64 | 0.61 | 0.38 | 0.66 |
| search prompt, high-confidence labels only | 1e-3 | 0.50 | 0.77 | 0.18 | 0.53 |
| search prompt, 15 nearest neighbours | | 0.60 | 0.70 | 0.42 | 0.56 |

Less regularisation helps every feature set, so `train_move_classifier.py`
now picks L2 from 1e-4, 3e-4 and 1e-3 on the newest fifth of the training
rows. Centring suits classification better than removing more directions; the
classification prompt is no better; training on high-confidence rows alone
throws away too much. These scores measure agreement with the rules, not true
accuracy: a hand-labelled set (roadmap 1.1) is still needed to show whether
the classifier reads headlines the rules miss.
