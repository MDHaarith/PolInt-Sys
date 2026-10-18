#!/usr/bin/env python3
"""Is NVIDIA NeMo Data Designer worth adding to PolInt? Two measured tests.

  judge     Pairs of hand-checked headlines whose EmbeddingGemma 2 similarity
            sits within JUDGE_BAND of its best cut-off on all gold pairs, where
            the embeddings get only about 73% right. A hosted model, through
            Data Designer, says whether each pair reports the same issue.
            Worth it if its balanced accuracy beats the embeddings' by
            JUDGE_MARGIN.
  generate  Real headlines from before the gold week (no gold stories) are
            turned into a translation, a paraphrase and a decoy (same people,
            different issue), as typed records checked by Python. A linear
            adapter trained on them is scored on the hand-checked groups. Worth
            it if precision@10 improves with a 95% interval above zero.
  hard      The same judge on the gold pairs the embeddings get most wrong:
            same-issue pairs with the lowest similarity (often Tamil beside
            English) and different-issue pairs with the highest (same people,
            different story). The embeddings score near zero here by design, so
            there is no bar; it shows how far the model can be trusted.

    pip install data-designer
    NVIDIA_API_KEY=... python3 scripts/data_designer_pilot.py [--model ...] [--pairs 200] [--seeds 400] [--tests judge hard generate]

Any OpenAI-compatible endpoint works with --endpoint and --key-env (e.g. a
local server or OpenRouter). Results go to data/data-designer-pilot/.
"""
from __future__ import annotations

import argparse
import json
import os
import random
import re
import sys
import time
from pathlib import Path
from typing import Literal

import numpy as np

PROJECT_ROOT = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(PROJECT_ROOT))

from scripts.embedding_experiments import FORMATS, compare, encode, fit_directions, group_resamples, normalise  # noqa: E402
from scripts.eval_embeddings import TAMIL, evaluate, load_records, pair_scores, summarise  # noqa: E402

FIXTURE = PROJECT_ROOT / "tests/fixtures/same_issue_clusters.json"
FEED = PROJECT_ROOT / "public/scrapedIntel.mobile.json"
CACHE = PROJECT_ROOT / "data/models/eval-cache"
OUT = PROJECT_ROOT / "data/data-designer-pilot"
GOLD_WEEK = "2026-10-10"
JUDGE_BAND = 0.07
JUDGE_MARGIN = 0.10


# ── Data Designer ──────────────────────────────────────────────────────────
def designer(args):
    import data_designer.config as dd
    from data_designer.interface import DataDesigner

    provider = dd.ModelProvider(name="pilot", endpoint=args.endpoint, provider_type="openai", api_key=args.key_env)
    model = dd.ModelConfig(
        alias="pilot", model=args.model, provider="pilot",
        inference_parameters=dd.ChatCompletionInferenceParams(temperature=0.3, max_tokens=2000, max_parallel_requests=args.parallel),
    )
    return DataDesigner(artifact_path=OUT / "artifacts", model_providers=[provider]), model


def run(args, df, column_name, prompt, output_format, system_prompt, dataset_name=None):
    import data_designer.config as dd

    engine, model = designer(args)
    builder = dd.DataDesignerConfigBuilder(model_configs=[model])
    builder.with_seed_dataset(dd.DataFrameSeedSource(df=df))
    builder.add_column(dd.LLMStructuredColumnConfig(
        name=column_name, model_alias="pilot", prompt=prompt, system_prompt=system_prompt, output_format=output_format,
    ))
    started = time.time()
    result = engine.create(builder, num_records=len(df), dataset_name=dataset_name or column_name)
    return result.load_dataset(), time.time() - started


def as_dict(value):
    if hasattr(value, "model_dump"):
        return value.model_dump()
    if isinstance(value, str):
        try:
            return json.loads(value)
        except ValueError:
            return None
    return value if isinstance(value, dict) else None


# ── benchmark ──────────────────────────────────────────────────────────────
def benchmark():
    ids, records, label = load_records(FIXTURE, FEED)
    texts = [FORMATS["plain"](*record) for record in records]
    matrix, _ = encode([FORMATS["search-query"](*record) for record in records], "q4", CACHE)
    return ids, records, texts, label, normalise(matrix)


def judge_test(args, ids, records, label, vectors, hardest=False) -> dict:
    import pandas as pd
    from pydantic import BaseModel, Field

    class Verdict(BaseModel):
        same_issue: bool
        confidence: Literal["low", "medium", "high"]
        reason: str = Field(max_length=600, description="One short sentence")

    processed = fit_directions(vectors, 3)(vectors)
    labelled = [i for i, story_id in enumerate(ids) if story_id in label]
    gold = evaluate(processed @ processed.T, ids, [records[i][0] for i in range(len(ids))], label)
    _, cut, _ = pair_scores(gold["pairs"], gold["pair_same"])
    rng = random.Random(5)
    same, different = [], []
    for position, left in enumerate(labelled):
        for right in labelled[position + 1:]:
            similarity = float(processed[left] @ processed[right])
            if hardest or abs(similarity - cut) < JUDGE_BAND:
                (same if label[ids[left]] == label[ids[right]] else different).append((left, right, similarity))
    half = args.pairs // 2
    if hardest:
        pairs = sorted(same, key=lambda pair: pair[2])[:half] + sorted(different, key=lambda pair: -pair[2])[:half]
    else:
        pairs = rng.sample(same, min(half, len(same))) + rng.sample(different, min(half, len(different)))
    rng.shuffle(pairs)
    df = pd.DataFrame([{
        "headline_a": records[left][0], "headline_b": records[right][0],
        "truth": label[ids[left]] == label[ids[right]], "similarity": similarity,
        "tamil": bool(TAMIL.search(records[left][0] + records[right][0])),
    } for left, right, similarity in pairs])
    rows, seconds = run(
        args, df, "verdict",
        "Headline A: {{ headline_a }}\nHeadline B: {{ headline_b }}\n\n"
        "Are these two headlines about the same news issue? One issue is one event or development together "
        "with the coverage it sets off: reports of it, reactions, accusations, defences and follow-ups about "
        "it. Sharing only a party, a person or a general topic is not enough. Give the reason in one short sentence.",
        Verdict,
        "You read Tamil Nadu political news in Tamil and English. Answer only from the headlines.",
        "hard-verdict" if hardest else "verdict",
    )
    verdicts = [as_dict(value) for value in rows["verdict"]]
    valid = np.array([verdict is not None for verdict in verdicts])
    predicted = np.array([bool(verdict and verdict.get("same_issue")) for verdict in verdicts])
    truth = rows["truth"].to_numpy(bool)
    similarity = rows["similarity"].to_numpy(float)
    tamil = rows["tamil"].to_numpy(bool)
    def balanced(guess, mask=None):
        mask = np.ones(len(truth), bool) if mask is None else mask
        parts = [np.mean(guess[mask & (truth == side)] == side) for side in (True, False) if (mask & (truth == side)).any()]
        return round(float(np.mean(parts)), 3)

    embedding = balanced(similarity >= cut)
    accuracy = balanced(predicted)
    accuracy_tamil = balanced(predicted, tamil) if tamil.any() else None
    embedding_tamil = balanced(similarity >= cut, tamil) if tamil.any() else None
    worth_it = accuracy >= embedding + JUDGE_MARGIN and (accuracy_tamil is None or accuracy_tamil >= embedding_tamil + JUDGE_MARGIN)
    return {
        "pairs": len(rows), "same_issue_pairs": int(truth.sum()), "valid_records": float(valid.mean()),
        "cut": round(float(cut), 3), "model_accuracy": accuracy,
        "model_accuracy_tamil_pairs": accuracy_tamil,
        "embedding_accuracy": embedding, "embedding_accuracy_tamil_pairs": embedding_tamil,
        "worth_it": None if hardest else bool(worth_it),
        "seconds": round(seconds), "examples_wrong": rows.assign(predicted=predicted)[predicted != truth][
            ["headline_a", "headline_b", "truth", "similarity"]].head(8).to_dict("records"),
    }


def generate_test(args, ids, records, texts, label, vectors) -> dict:
    import pandas as pd
    from pydantic import BaseModel, Field

    class Variants(BaseModel):
        translation: str = Field(description="The same headline in the other language")
        paraphrase: str = Field(description="Same news, same language, different words, as another outlet would write it")
        decoy: str = Field(description="A realistic headline about the same people or party but a different issue")

    gold_titles = {records[i][0] for i, story_id in enumerate(ids) if story_id in label}
    feed = json.loads(FEED.read_text(encoding="utf-8"))["news"]
    seeds = [
        story["title"].strip() for story in feed
        if story.get("sourceTier") != "social" and (story.get("publishedAt") or "") < GOLD_WEEK
        and story["title"].strip() not in gold_titles and len(story["title"]) > 25
    ]
    rng = random.Random(7)
    tamil = [title for title in seeds if TAMIL.search(title)]
    english = [title for title in seeds if not TAMIL.search(title)]
    picked = rng.sample(tamil, min(args.seeds // 2, len(tamil))) + rng.sample(english, min(args.seeds // 2, len(english)))
    df = pd.DataFrame([{
        "headline": title,
        "language": "Tamil" if TAMIL.search(title) else "English",
        "other_language": "English" if TAMIL.search(title) else "Tamil",
    } for title in picked])
    rows, seconds = run(
        args, df, "variants",
        "Headline ({{ language }}): {{ headline }}\n\n"
        "Write three headlines:\n"
        "translation: this headline in {{ other_language }}, as a {{ other_language }} newspaper would write it\n"
        "paraphrase: the same news in {{ language }} with different wording, as another outlet would write it\n"
        "decoy: a realistic {{ language }} headline about the same people or party but a clearly different issue",
        Variants,
        "You are a bilingual Tamil and English political news editor in Tamil Nadu.",
    )

    # Typed records, then checks the schema cannot express.
    kept = []
    for headline, language, value in zip(rows["headline"], rows["language"], rows["variants"]):
        variants = as_dict(value)
        if not variants or not all(isinstance(variants.get(key), str) and variants[key].strip() for key in ("translation", "paraphrase", "decoy")):
            continue
        seed_is_tamil = language == "Tamil"
        if bool(TAMIL.search(variants["translation"])) == seed_is_tamil:
            continue  # translation in the wrong script
        if bool(TAMIL.search(variants["paraphrase"])) != seed_is_tamil or variants["paraphrase"].strip() == headline:
            continue
        kept.append((headline, variants["translation"], variants["paraphrase"], variants["decoy"]))
    if len(kept) < 32:
        return {"records": len(rows), "passed_checks": len(kept), "worth_it": False, "seconds": round(seconds)}

    flat = [text for row in kept for text in row]
    encoded, _ = encode([FORMATS["search-query"](text, "") for text in flat], "q4", CACHE)
    encoded = normalise(encoded).reshape(len(kept), 4, -1)
    process = fit_directions(vectors, 3)
    anchor, translation, paraphrase, decoy = (process(encoded[:, k]) for k in range(4))
    weights = train_adapter(np.vstack([anchor, anchor]), np.vstack([translation, paraphrase]), np.vstack([decoy, decoy]))

    groups = sorted(set(label.values()))
    draws = group_resamples(groups)
    base_vectors = process(vectors)
    base = evaluate(base_vectors @ base_vectors.T, ids, texts, label)
    adapted_vectors = normalise(base_vectors @ weights.T)
    adapted = evaluate(adapted_vectors @ adapted_vectors.T, ids, texts, label)
    delta = compare(adapted, base, groups, draws)
    return {
        "records": len(rows), "passed_checks": len(kept),
        "similarity_seed_translation": round(float(np.mean(np.sum(anchor * translation, axis=1))), 3),
        "similarity_seed_paraphrase": round(float(np.mean(np.sum(anchor * paraphrase, axis=1))), 3),
        "similarity_seed_decoy": round(float(np.mean(np.sum(anchor * decoy, axis=1))), 3),
        "benchmark_before": summarise(base), "benchmark_after": summarise(adapted), "change_vs_before": delta,
        "worth_it": delta["precision"][1] > 0, "seconds": round(seconds),
        "examples": [dict(zip(("headline", "translation", "paraphrase", "decoy"), row)) for row in kept[:5]],
    }


def train_adapter(x_anchor, x_positive, x_negative, *, epochs=40, batch=64, rate=1e-3, temperature=0.05, decay=0.1, seed=3):
    """Linear map (from identity) trained with InfoNCE over in-batch and explicit negatives."""
    dimensions = x_anchor.shape[1]
    identity = np.eye(dimensions, dtype=np.float32)
    weights, moment, velocity = identity.copy(), np.zeros_like(identity), np.zeros_like(identity)
    rng = np.random.default_rng(seed)
    step = 0

    def forward(x):
        z = x @ weights.T
        norm = np.linalg.norm(z, axis=1, keepdims=True)
        return z / norm, norm

    def backward(grad_u, u, norm, x):
        return ((grad_u - (grad_u * u).sum(axis=1, keepdims=True) * u) / norm).T @ x

    for _ in range(epochs):
        order = rng.permutation(len(x_anchor))
        for start in range(0, len(order), batch):
            index = order[start:start + batch]
            if len(index) < 4:
                continue
            (ua, na), (up, n_p), (un, nn) = forward(x_anchor[index]), forward(x_positive[index]), forward(x_negative[index])
            candidates = np.vstack([up, un])
            logits = ua @ candidates.T / temperature
            probability = np.exp(logits - logits.max(axis=1, keepdims=True))
            probability /= probability.sum(axis=1, keepdims=True)
            probability[np.arange(len(index)), np.arange(len(index))] -= 1
            grad_logits = probability / (len(index) * temperature)
            grad_c = grad_logits.T @ ua
            grad = (backward(grad_logits @ candidates, ua, na, x_anchor[index])
                    + backward(grad_c[:len(index)], up, n_p, x_positive[index])
                    + backward(grad_c[len(index):], un, nn, x_negative[index])
                    + decay * (weights - identity))
            step += 1
            moment = 0.9 * moment + 0.1 * grad
            velocity = 0.999 * velocity + 0.001 * grad**2
            weights -= rate * (moment / (1 - 0.9**step)) / (np.sqrt(velocity / (1 - 0.999**step)) + 1e-8)
    return weights


def main() -> None:
    parser = argparse.ArgumentParser()
    parser.add_argument("--model", default="nvidia/nemotron-3-super-120b-a12b")
    parser.add_argument("--endpoint", default="https://integrate.api.nvidia.com/v1")
    parser.add_argument("--key-env", default="NVIDIA_API_KEY", help="Environment variable holding the API key")
    parser.add_argument("--pairs", type=int, default=200)
    parser.add_argument("--seeds", type=int, default=400)
    parser.add_argument("--parallel", type=int, default=4)
    parser.add_argument("--tests", nargs="+", default=["judge", "generate"], choices=["judge", "hard", "generate"])
    args = parser.parse_args()
    if not os.environ.get(args.key_env):
        raise SystemExit(f"{args.key_env} is not set; no model was called.")
    OUT.mkdir(parents=True, exist_ok=True)
    CACHE.mkdir(parents=True, exist_ok=True)
    ids, records, texts, label, vectors = benchmark()
    path = OUT / f"report-{re.sub(r'[^a-z0-9]+', '-', args.model.lower())}.json"
    report = json.loads(path.read_text(encoding="utf-8")) if path.exists() else {}  # keep tests not re-run
    report.update(model=args.model, endpoint=args.endpoint)
    if "judge" in args.tests:
        report["judge"] = judge_test(args, ids, records, label, vectors)
        print(json.dumps({"judge": report["judge"]}, indent=2, ensure_ascii=False))
    if "hard" in args.tests:
        report["hard"] = judge_test(args, ids, records, label, vectors, hardest=True)
        print(json.dumps({"hard": report["hard"]}, indent=2, ensure_ascii=False))
    if "generate" in args.tests:
        report["generate"] = generate_test(args, ids, records, texts, label, vectors)
        print(json.dumps({"generate": report["generate"]}, indent=2, ensure_ascii=False))
    path.write_text(json.dumps(report, indent=2, ensure_ascii=False), encoding="utf-8")


if __name__ == "__main__":
    main()
