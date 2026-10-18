#!/usr/bin/env python3
"""Benchmark story linking on hand-checked same-issue groups.

Each story in tests/fixtures/same_issue_clusters.json is a query; every other
non-social story in the published feed is a candidate; a hit is a story from
the same group. Reports:
  precision_at_10      share of the 10 nearest stories from the same group
  cross_language_top1  for stories whose group has the other language, whether
                       the nearest other-language story is from the group
  best_threshold       the cosine cut-off that best separates same-group pairs
                       from different-group pairs (F1), for linking rules

    python3 scripts/eval_embeddings.py [--prompts document clustering]
"""
from __future__ import annotations

import argparse
import json
import re
import sys
import time
from pathlib import Path

import numpy as np

PROJECT_ROOT = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(PROJECT_ROOT))

from scripts.intelligence.vectors import run_worker, story_document  # noqa: E402

TAMIL = re.compile(r"[஀-௿]")


def load(fixture: Path, feed: Path):
    groups = json.loads(fixture.read_text(encoding="utf-8"))["clusters"]
    label = {item["rawId"]: name for name, items in groups.items() for item in items}
    stories = {}
    for item in json.loads(feed.read_text(encoding="utf-8"))["news"]:
        if item.get("sourceTier") != "social":
            stories[item["rawId"]] = story_document(item["title"], item.get("snippet", ""))
    for items in groups.values():
        for item in items:
            stories.setdefault(item["rawId"], story_document(item["title"], item["snippet"]))
    ids = list(stories)
    return ids, [stories[i] for i in ids], label


def word_vectors(texts: list[str]) -> np.ndarray:
    """The current method: shared words weighted by rarity."""
    tokens = [set(re.findall(r"[a-z]{4,}|[஀-௿]{3,}", text.lower())) for text in texts]
    frequency: dict[str, int] = {}
    for item in tokens:
        for token in item:
            frequency[token] = frequency.get(token, 0) + 1
    index = {token: i for i, token in enumerate(frequency)}
    matrix = np.zeros((len(texts), len(index)), dtype=np.float32)
    for row, item in enumerate(tokens):
        for token in item:
            matrix[row, index[token]] = np.log(len(texts) / frequency[token])
    return matrix / np.maximum(np.linalg.norm(matrix, axis=1, keepdims=True), 1e-9)


def gemma_vectors(texts: list[str], prompt: str, cache: Path) -> np.ndarray:
    if cache.exists():
        return np.load(cache)
    results = run_worker([
        {"id": str(i), "modality": "text", "input": text, "prompt": prompt, "title": "none"}
        for i, text in enumerate(texts)
    ])
    matrix = np.stack([results[str(i)] for i in range(len(texts))])
    np.save(cache, matrix)
    return matrix


def score(matrix: np.ndarray, ids: list[str], texts: list[str], label: dict) -> dict:
    similarity = matrix @ matrix.T
    np.fill_diagonal(similarity, -np.inf)
    tamil = np.array([bool(TAMIL.search(text)) for text in texts])
    labelled = [i for i, story_id in enumerate(ids) if story_id in label]
    precision, cross, same, different = [], [], [], []
    for row in labelled:
        group = label[ids[row]]
        top = np.argsort(-similarity[row])[:10]
        mates = sum(1 for other in ids if label.get(other) == group) - 1
        precision.append(sum(label.get(ids[i]) == group for i in top) / min(10, mates))
        other_language = np.where(tamil != tamil[row])[0]
        if any(label.get(ids[i]) == group for i in other_language):
            nearest = other_language[np.argmax(similarity[row, other_language])]
            cross.append(label.get(ids[nearest]) == group)
        for column in labelled:
            if column > row:
                (same if label[ids[column]] == group else different).append(similarity[row, column])
    same, different = np.array(same), np.array(different)
    best = max(
        ((2 * (same >= t).mean() * ((same >= t).sum() / max(1, (same >= t).sum() + (different >= t).sum())))
         / max(1e-9, (same >= t).mean() + (same >= t).sum() / max(1, (same >= t).sum() + (different >= t).sum())), t)
        for t in np.linspace(0.2, 0.95, 76)
    )
    return {
        "precision_at_10": round(float(np.mean(precision)), 3),
        "cross_language_top1": round(float(np.mean(cross)), 3),
        "pair_f1": round(float(best[0]), 3),
        "best_threshold": round(float(best[1]), 2),
    }


def main() -> None:
    parser = argparse.ArgumentParser()
    parser.add_argument("--fixture", default=PROJECT_ROOT / "tests/fixtures/same_issue_clusters.json", type=Path)
    parser.add_argument("--feed", default=PROJECT_ROOT / "public/scrapedIntel.mobile.json", type=Path)
    parser.add_argument("--prompts", nargs="+", default=["document", "clustering"])
    parser.add_argument("--cache-dir", default=PROJECT_ROOT / "data/models/eval-cache", type=Path)
    args = parser.parse_args()
    args.cache_dir.mkdir(parents=True, exist_ok=True)
    ids, texts, label = load(args.fixture, args.feed)
    print(f"{len(ids)} stories; {len(label)} in {len(set(label.values()))} hand-checked groups")
    started = time.time()
    print(f"{'word overlap (current)':34} {score(word_vectors(texts), ids, texts, label)}")
    for prompt in args.prompts:
        started = time.time()
        matrix = gemma_vectors(texts, prompt, args.cache_dir / f"{prompt}-{len(texts)}.npy")
        for dimensions in (768, 256):
            head = matrix[:, :dimensions] / np.linalg.norm(matrix[:, :dimensions], axis=1, keepdims=True)
            print(f"{f'embeddinggemma-2 {prompt} {dimensions}d':34} {score(head, ids, texts, label)}  {time.time() - started:.0f}s")
            # Storylines compare centred vectors (corpus mean removed).
            centred = head - head.mean(axis=0)
            centred /= np.linalg.norm(centred, axis=1, keepdims=True)
            print(f"{f'  centred':34} {score(centred, ids, texts, label)}")


if __name__ == "__main__":
    main()
