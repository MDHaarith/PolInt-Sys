#!/usr/bin/env python3
"""Compare EmbeddingGemma 2 set-ups for story linking and search.

Every variant is scored on the hand-checked same-issue groups
(tests/fixtures/same_issue_clusters.json) against the published feed, as in
scripts/eval_embeddings.py, and on the search queries written for those groups
(tests/fixtures/search_queries.json):

  encoding         precision of the ONNX export (fp32, fp16, q8, q4, q4f16) and
                   how a story is put to the model (task prompt, real title
                   field, headline only)
  post-processing  Matryoshka size; centring on the corpus mean or on each
                   language's mean; removing the dominant directions (ABTT);
                   whitening; int8 as stored in the app's index
  combinations     two prompts averaged; embeddings plus word overlap
  search           query prompt and query centring for the app's Meaning search

Gains are shown against the set-up used before these experiments (document
prompt, q4, 768-d, centred) with 95% intervals from resampling the ten groups,
so a gain that a different set of issues could erase reads as such. Results and
the choices made from them: docs/embedding-experiments.md.

    python3 scripts/embedding_experiments.py [--encodings document@q4 similarity@q4 ...]
                                             [--json data/models/eval-cache/experiments.json]

Encoded matrices are cached in data/models/eval-cache/, so post-processing can
be re-run without the model.
"""
from __future__ import annotations

import argparse
import hashlib
import json
import os
import sys
import time
from pathlib import Path

import numpy as np

PROJECT_ROOT = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(PROJECT_ROOT))

from scripts.eval_embeddings import TAMIL, evaluate, load_records, summarise, word_vectors  # noqa: E402
from scripts.intelligence.vectors import run_worker, story_document  # noqa: E402

# How a story (title, snippet) is written for the model. The prefixes are the
# model's own (config_sentence_transformers.json on the model page).
FORMATS = {
    "document": lambda title, snippet: f"title: none | text: {story_document(title, snippet)}",
    "document-titled": lambda title, snippet: f"title: {title.strip()} | text: {(snippet or '').strip()[:300] or title.strip()}",
    "headline": lambda title, snippet: f"title: none | text: {title.strip()}",
    "similarity": lambda title, snippet: f"task: sentence similarity | query: {story_document(title, snippet)}",
    "clustering": lambda title, snippet: f"task: clustering | query: {story_document(title, snippet)}",
    "classification": lambda title, snippet: f"task: classification | query: {story_document(title, snippet)}",
    "search-query": lambda title, snippet: f"task: search result | query: {story_document(title, snippet)}",
    "fact-checking": lambda title, snippet: f"task: fact checking | query: {story_document(title, snippet)}",
    "plain": story_document,
}
QUERY_FORMATS = {
    "search": lambda text: f"task: search result | query: {text}",
    "similarity": lambda text: f"task: sentence similarity | query: {text}",
    "document": lambda text: f"title: none | text: {text}",
}
DTYPES = ("fp32", "fp16", "q8", "q4", "q4f16")
DEFAULT_ENCODINGS = [
    "document@q4", "document@fp32", "document@q8", "document@fp16", "document@q4f16",
    "document-titled@q4", "headline@q4", "similarity@q4", "clustering@q4", "classification@q4",
    "search-query@q4", "fact-checking@q4", "plain@q4",
]
REFERENCE = "document@q4 768 centred"


def normalise(matrix: np.ndarray) -> np.ndarray:
    return matrix / np.maximum(np.linalg.norm(matrix, axis=1, keepdims=True), 1e-12)


def encode(texts: list[str], dtype: str, cache_dir: Path) -> tuple[np.ndarray, float]:
    """Embed already-formatted texts; returns the matrix and seconds per 100 texts (0 when cached)."""
    digest = hashlib.sha1("\n".join([dtype, *texts]).encode("utf-8")).hexdigest()[:16]
    cache = cache_dir / f"{dtype}-{digest}.npy"
    if cache.exists():
        return np.load(cache), 0.0
    previous = os.environ.get("EMBEDDING_DTYPE")
    os.environ["EMBEDDING_DTYPE"] = dtype
    started = time.time()
    try:
        results = run_worker([{"id": str(i), "modality": "text", "input": text, "prompt": "raw"} for i, text in enumerate(texts)])
    finally:
        if previous is None:
            os.environ.pop("EMBEDDING_DTYPE", None)
        else:
            os.environ["EMBEDDING_DTYPE"] = previous
    seconds = time.time() - started
    failed = [value for value in results.values() if isinstance(value, str)]
    if failed or len(results) != len(texts):
        raise RuntimeError(f"{dtype}: {len(failed)} failed, {len(texts) - len(results)} missing; {failed[:1]}")
    matrix = np.stack([results[str(i)] for i in range(len(texts))]).astype(np.float32)
    np.save(cache, matrix)
    return matrix, seconds * 100 / len(texts)


# ── post-processing ────────────────────────────────────────────────────────
def fit_directions(matrix: np.ndarray, count: int):
    """All-but-the-top, fitted on one corpus: centre, then drop the leading principal directions."""
    mean = matrix.mean(axis=0)
    _, _, components = np.linalg.svd(matrix - mean, full_matrices=False)
    top = components[:count]
    return lambda vectors: normalise((vectors - mean) - (vectors - mean) @ top.T @ top)


def remove_directions(matrix: np.ndarray, count: int) -> np.ndarray:
    return fit_directions(matrix, count)(matrix)


def by_language_mean(matrix: np.ndarray, tamil: np.ndarray) -> np.ndarray:
    out = matrix.copy()
    for mask in (tamil, ~tamil):
        out[mask] -= matrix[mask].mean(axis=0)
    return normalise(out)


def whitened(matrix: np.ndarray) -> np.ndarray:
    """Whitening with shrinkage: rescale principal directions towards equal variance."""
    centred = matrix - matrix.mean(axis=0)
    _, values, components = np.linalg.svd(centred, full_matrices=False)
    variance = values**2 / len(matrix)
    scale = 1 / np.sqrt(variance + variance.mean())
    return normalise(centred @ components.T * scale)


def int8_round_trip(matrix: np.ndarray) -> np.ndarray:
    """The app's index: per-row scale to int8, as in snapshots.app_vector_index."""
    scales = 127 / np.maximum(np.abs(matrix).max(axis=1), 1e-9)
    quantised = np.clip(np.rint(matrix * scales[:, None]), -127, 127)
    return quantised / scales[:, None]


POST = {
    "raw": lambda matrix, tamil: normalise(matrix),
    "centred": lambda matrix, tamil: normalise(matrix - matrix.mean(axis=0)),
    "centred by language": by_language_mean,
    "abtt-1": lambda matrix, tamil: remove_directions(matrix, 1),
    "abtt-3": lambda matrix, tamil: remove_directions(matrix, 3),
    "abtt-8": lambda matrix, tamil: remove_directions(matrix, 8),
    "whitened": lambda matrix, tamil: whitened(matrix),
}


# ── scoring ────────────────────────────────────────────────────────────────
def group_resamples(groups: list[str], count: int = 2000, seed: int = 11) -> np.ndarray:
    """How often each group is drawn in each bootstrap resample of the groups."""
    rng = np.random.default_rng(seed)
    return rng.multinomial(len(groups), np.full(len(groups), 1 / len(groups)), size=count)


def resampled_means(values: np.ndarray, members: np.ndarray, groups: list[str], draws: np.ndarray) -> np.ndarray:
    sums = np.array([values[members == group].sum() for group in groups])
    counts = np.array([(members == group).sum() for group in groups])
    return (draws @ sums) / np.maximum(draws @ counts, 1)


def compare(result: dict, reference: dict, groups: list[str], draws: np.ndarray) -> dict:
    """Difference from the reference with a 95% interval over resampled groups."""
    out = {}
    for key, member_key in (("precision", "precision_group"), ("cross", "cross_group")):
        difference = (
            resampled_means(result[key], result[member_key], groups, draws)
            - resampled_means(reference[key], reference[member_key], groups, draws)
        )
        point = float(result[key].mean() - reference[key].mean())
        low, high = np.percentile(difference, [2.5, 97.5])
        out[key] = (round(point, 3), round(float(low), 3), round(float(high), 3))
    return out


def search_scores(queries: np.ndarray, documents: np.ndarray, query_groups: list[str], ids: list[str], label: dict) -> dict:
    """Precision@10 and reciprocal rank of the first relevant story, per query."""
    scores = queries @ documents.T
    story_groups = np.array([label.get(story_id, "") for story_id in ids])
    precision, reciprocal = [], []
    for row, group in enumerate(query_groups):
        order = np.argsort(-scores[row])
        relevant = story_groups[order] == group
        precision.append(relevant[:10].sum() / min(10, (story_groups == group).sum()))
        reciprocal.append(1 / (1 + int(np.argmax(relevant))))
    return {"precision": np.array(precision), "reciprocal": np.array(reciprocal)}


def main() -> None:
    parser = argparse.ArgumentParser()
    parser.add_argument("--fixture", default=PROJECT_ROOT / "tests/fixtures/same_issue_clusters.json", type=Path)
    parser.add_argument("--queries", default=PROJECT_ROOT / "tests/fixtures/search_queries.json", type=Path)
    parser.add_argument("--feed", default=PROJECT_ROOT / "public/scrapedIntel.mobile.json", type=Path)
    parser.add_argument("--encodings", nargs="+", default=DEFAULT_ENCODINGS, help="format@dtype")
    parser.add_argument("--cache-dir", default=PROJECT_ROOT / "data/models/eval-cache", type=Path)
    parser.add_argument("--json", type=Path, help="Also write every result here")
    args = parser.parse_args()
    args.cache_dir.mkdir(parents=True, exist_ok=True)

    ids, records, label = load_records(args.fixture, args.feed)
    texts = [story_document(title, snippet) for title, snippet in records]
    tamil = np.array([bool(TAMIL.search(text)) for text in texts])
    groups = sorted(set(label.values()))
    draws = group_resamples(groups)
    queries = json.loads(args.queries.read_text(encoding="utf-8"))["queries"]
    print(f"{len(ids)} stories; {len(label)} in {len(groups)} hand-checked groups; {len(queries)} search queries")

    rows: dict[str, dict] = {}
    evaluations: dict[str, dict] = {}
    matrices: dict[str, np.ndarray] = {}
    speed: dict[str, float] = {}

    def record(name: str, similarity: np.ndarray) -> None:
        evaluations[name] = evaluate(similarity, ids, texts, label)
        rows[name] = summarise(evaluations[name])

    record("word overlap", (lambda words: words @ words.T)(word_vectors(texts)))
    for encoding in args.encodings:
        format_name, dtype = encoding.split("@")
        try:
            matrices[encoding], speed[encoding] = encode([FORMATS[format_name](*record_) for record_ in records], dtype, args.cache_dir)
        except Exception as error:  # noqa: BLE001 - a variant that cannot run is reported, not fatal
            rows[f"{encoding} (failed)"] = {"error": str(error)[:200]}
            print(f"{encoding}: {error}", file=sys.stderr)
            continue
        for dimensions in (768, 512, 256, 128):
            head = normalise(matrices[encoding][:, :dimensions])
            posts = POST if (encoding == "document@q4" and dimensions == 768) else {
                name: POST[name] for name in ("raw", "centred", "abtt-3")
            }
            for post_name, post in posts.items():
                processed = post(head, tamil)
                record(f"{encoding} {dimensions} {post_name}", processed @ processed.T)
            if dimensions == 256:
                # The app's index: int8 as stored, then optionally processed on the device.
                stored = int8_round_trip(head)
                record(f"{encoding} 256 raw int8", stored @ stored.T)
                for count in (1, 3):
                    processed = remove_directions(normalise(stored), count)
                    record(f"{encoding} 256 abtt-{count} int8", processed @ processed.T)

    # Combinations, on the production encoding.
    if "document@q4" in matrices:
        base = matrices["document@q4"]
        for other in ("headline@q4", "similarity@q4", "classification@q4", "document@fp32"):
            if other in matrices:
                mixed = normalise(normalise(base) + normalise(matrices[other]))
                record(f"document@q4 + {other} 768 centred", POST["centred"](mixed, tamil) @ POST["centred"](mixed, tamil).T)
        words = word_vectors(texts)
        centred = POST["centred"](normalise(base), tamil)
        for weight in (0.1, 0.25, 0.5):
            record(f"document@q4 768 centred + {weight} x word overlap", centred @ centred.T + weight * (words @ words.T))

    # Search by meaning: queries against stories.
    search_rows = {}
    query_groups = [query["group"] for query in queries]
    query_tamil = np.array([query["language"] == "ta" for query in queries])
    # The phone always encodes queries with the 4-bit model, whatever encoded the stories.
    search_results: dict[str, dict] = {}
    for encoding, query_dtype in (("document@q4", "q4"), ("document@fp32", "fp32"), ("document@fp32", "q4"),
                                  ("similarity@q4", "q4"), ("search-query@q4", "q4"), ("plain@q4", "q4")):
        if encoding not in matrices:
            continue
        for query_format, write in QUERY_FORMATS.items():
            if query_dtype != encoding.split("@")[1] and query_format != "search":
                continue
            try:
                encoded, _ = encode([write(query["text"]) for query in queries], query_dtype, args.cache_dir)
            except Exception as error:  # noqa: BLE001
                print(f"queries {query_format}@{query_dtype}: {error}", file=sys.stderr)
                continue
            query_format = f"{query_format}@{query_dtype}"
            for dimensions in (768, 256):
                documents = normalise(matrices[encoding][:, :dimensions])
                if dimensions == 256:
                    documents = normalise(int8_round_trip(documents))  # as stored in the app's index
                query_matrix = normalise(encoded[:, :dimensions])
                variants = {
                    "raw": (query_matrix, documents),
                    "stories centred": (query_matrix, POST["centred"](documents, tamil)),
                    "both centred": (normalise(query_matrix - documents.mean(axis=0)), POST["centred"](documents, tamil)),
                }
                for count in (1, 3):
                    process = fit_directions(documents, count)
                    variants[f"both abtt-{count}"] = (process(query_matrix), process(documents))
                for variant, (left, right) in variants.items():
                    result = search_scores(left, right, query_groups, ids, label)
                    name = f"{encoding} stories, {query_format} queries, {dimensions} {variant}"
                    search_results[name] = result
                    search_rows[name] = {
                        "precision_at_10": round(float(result["precision"].mean()), 3),
                        "precision_at_10_tamil": round(float(result["precision"][query_tamil].mean()), 3),
                        "mrr": round(float(result["reciprocal"].mean()), 3),
                    }

    reference = evaluations.get(REFERENCE)
    print(f"\n{'variant':58} {'P@10':>6} {'Δ (95% CI)':>22} {'xlang':>6} {'Δ (95% CI)':>22} {'pairF1':>6} {'thr':>5} {'pairAP':>6}")
    for name, row in rows.items():
        if "error" in row:
            print(f"{name:58} {row['error']}")
            continue
        delta = compare(evaluations[name], reference, groups, draws) if reference else None
        row["vs_reference"] = delta
        show = lambda item: f"{item[0]:+.3f} [{item[1]:+.3f},{item[2]:+.3f}]" if item else ""  # noqa: E731
        print(
            f"{name:58} {row['precision_at_10']:6.3f} {show(delta and delta['precision']):>22} "
            f"{row['cross_language_top1']:6.3f} {show(delta and delta['cross']):>22} "
            f"{row['pair_f1']:6.3f} {row['best_threshold']:5.2f} {row['pair_ap']:6.3f}"
        )
    print("\nSeconds per 100 stories (CPU, 0 = cached):", {key: round(value, 1) for key, value in speed.items()})
    # Against the app as shipped: document-prompt stories, 256-d int8, search-prompt queries.
    shipped = search_results.get("document@q4 stories, search@q4 queries, 256 raw")
    query_members = np.array(query_groups)
    print(f"\n{'search variant':70} {'P@10':>6} {'Δ (95% CI)':>22} {'P@10 ta':>8} {'MRR':>6}")
    for name, row in search_rows.items():
        delta = ""
        if shipped is not None:
            difference = (resampled_means(search_results[name]["precision"], query_members, groups, draws)
                          - resampled_means(shipped["precision"], query_members, groups, draws))
            low, high = np.percentile(difference, [2.5, 97.5])
            point = float(search_results[name]["precision"].mean() - shipped["precision"].mean())
            row["vs_shipped"] = (round(point, 3), round(float(low), 3), round(float(high), 3))
            delta = f"{point:+.3f} [{low:+.3f},{high:+.3f}]"
        print(f"{name:70} {row['precision_at_10']:6.3f} {delta:>22} {row['precision_at_10_tamil']:8.3f} {row['mrr']:6.3f}")
    if args.json:
        args.json.write_text(json.dumps({"linking": rows, "search": search_rows, "speed": speed}, indent=2), encoding="utf-8")


if __name__ == "__main__":
    main()
