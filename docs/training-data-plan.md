# Training data plan

October 2026. What comes next for PolInt's training data and EmbeddingGemma 2,
in order. Each step has a test that decides whether the next one is worth
doing. Background: [embedding-experiments.md](embedding-experiments.md).

## Where things stand

- The embedding set-up is chosen by measurement: search prompt for stories,
  re-measured storyline thresholds, shared-direction removal in the app.
- Dataset builds check their own labels against the hand-checked groups.
  Triple negatives are now similarity-checked (correct 20% → 100%) and a
  mined-pairs file adds same-issue pairs found by meaning.
- A linear adapter trained on a few hundred of our own triples did not beat
  the frozen vectors. More, and more varied, pairs are needed.
- The move classifier agrees with the rules about 74% of the time; there are
  no human labels yet to say how often either is right.

## Step 1. Run the Data Designer pilot

`scripts/data_designer_pilot.py` measures whether NVIDIA NeMo Data Designer,
with a hosted model, adds anything. It needs `pip install data-designer` and
an `NVIDIA_API_KEY` set in the environment's settings (never in code or chat).

| Test | Question | Bar to pass |
| --- | --- | --- |
| judge | On 200 hand-checked pairs right at EmbeddingGemma 2's cut-off, where it gets 73% right (balanced), is the model better? | balanced accuracy ≥ 83%, Tamil pairs included |
| generate | Do 400 typed translation / paraphrase / decoy records, checked by script, train an adapter that links the gold groups better? | precision@10 up, 95% interval above zero |

About 600 model calls, 15–30 minutes. Start with the default model
(`nvidia/nemotron-3-super-120b-a12b`). If it fails only on Tamil pairs,
re-run with `--model google/gemma-3-12b-it` before concluding.

## Step 2. Act on the result

| Judge | Generate | Do this |
| --- | --- | --- |
| passes | passes | Add a Data Designer stage to `build_datasets.py`: verify mined pairs and storyline merges with the judge, and generate a few thousand pairs for an adapter. Re-run the pilot each month. |
| passes | fails | Use the model only as a checker: verify mined pairs, near-threshold storyline merges and triple negatives. No generated training text. |
| fails | passes | Use generated pairs for the adapter only, kept apart from evaluation data; check that the gain holds on the next month's groups. |
| fails | fails | Drop Data Designer. Put the time into step 3 instead. |

Whatever happens, generated or model-labelled data is never used to measure
anything. Evaluation stays on human-checked data.

## Step 3. A human-checked set (needed in every case)

- Grow the same-issue groups from 10 to about 30, adding analysis pieces,
  opinion columns and more Tamil-only issues; with 10 groups, gains under
  0.02 precision@10 cannot be told from noise.
- Label about 300 recent headlines, half Tamil, with actor, action, target
  and intent (roadmap 1.1), following a one-page guide; two people label the
  same 50 to check agreement.
- Pick headlines where the classifier and the rules disagree, or the rules
  have low confidence, so each label fixes a real gap.

## Step 4. Impact: who gains, who loses, and by how much

The idea: a move can help its actor a little and hurt its target a lot, and
the model should learn which side is bigger.

1. **Rough labels, no model calls.** For each move and each party it
   touches: direction from rules on the kind of move (an attack helps the
   attacker and hurts the target; a legal blow hurts the actor), and size
   from what happened next: how widely it was carried, whether the hurt
   party had to answer within three days, whether the helped party kept
   pushing the line.
2. **Decision model.** A small, readable decision tree that predicts that
   size from what is known when a story first appears (kind of move, who
   rules and who opposes, source). It shows, before the outcome is in,
   whether a move's gain or damage is likely to be the larger.
3. **Human comparisons.** A few hundred "which hurts DMK more, A or B?"
   choices between moves in one storyline, to check and then train the
   ranking.
4. **EmbeddingGemma 2 features.** Add story vectors to the decision model
   once steps 1–3 give a baseline to beat.

A first look at October data found 1,317 (move, party) rows from 1,306 moves,
which is enough for a rough first tree.

## Step 5. Fine-tune when the data is there

Once the dataset holds a few thousand checked pairs (from steps 2–3 and the
mined pairs), retrain the adapter and keep it only if it beats the frozen
vectors on the enlarged gold groups.
