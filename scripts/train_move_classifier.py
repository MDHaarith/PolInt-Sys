#!/usr/bin/env python3
"""Train a small action classifier on EmbeddingGemma 2 story vectors.

    python3 scripts/build_datasets.py            # writes data/datasets/polint-YYYYMMDD/
    python3 scripts/train_move_classifier.py data/datasets/polint-YYYYMMDD

Learns headline vector -> action (attack, demand, deliver, ...) from the rule
labels in move_labels.jsonl, using only high- and medium-confidence rows. The
newest fifth of stories is held out, so syndicated copies of one story cannot
sit on both sides of the split. The model is a softmax regression (768 x
actions weights), small enough to ship anywhere; it is saved with a report
comparing it to always guessing the commonest action.

Because the labels come from the rules, the score measures how well the model
reproduces them, not true accuracy. Its use is reading headlines the rules miss.
"""
from __future__ import annotations

import argparse
import json
from collections import Counter
from pathlib import Path

import numpy as np


def load(dataset: Path):
    stories = {row["id"]: row for row in map(json.loads, (dataset / "stories.jsonl").read_text(encoding="utf-8").splitlines())}
    index = [json.loads(line) for line in (dataset / "vectors.jsonl").read_text(encoding="utf-8").splitlines()]
    matrix = np.load(dataset / "vectors.npy").astype(np.float32)
    vector_of = {item["storyId"]: matrix[i] for i, item in enumerate(index) if item["modality"] == "text"}
    rows = []
    for line in (dataset / "move_labels.jsonl").read_text(encoding="utf-8").splitlines():
        label = json.loads(line)
        if label["confidence"] in ("high", "medium") and label["id"] in vector_of:
            rows.append((stories[label["id"]].get("publishedAt") or "", vector_of[label["id"]], label["action"], label["language"]))
    rows.sort(key=lambda row: row[0])
    return rows


def train(x, y, classes, *, epochs=1500, rate=2.0, l2=1e-3, balanced=False):
    weights = np.zeros((x.shape[1], len(classes)), dtype=np.float32)
    bias = np.zeros(len(classes), dtype=np.float32)
    onehot = np.eye(len(classes), dtype=np.float32)[y]
    # Optionally rare actions count as much as common ones: better macro-F1, lower accuracy.
    counts = onehot.sum(axis=0)
    sample_weight = (len(y) / (len(classes) * np.maximum(counts, 1)))[y][:, None] if balanced else 1.0
    for _ in range(epochs):
        logits = x @ weights + bias
        logits -= logits.max(axis=1, keepdims=True)
        probabilities = np.exp(logits)
        probabilities /= probabilities.sum(axis=1, keepdims=True)
        gradient = (probabilities - onehot) * sample_weight / len(y)
        weights -= rate * (x.T @ gradient + l2 * weights)
        bias -= rate * gradient.sum(axis=0)
    return weights, bias


L2_CHOICES = (1e-4, 3e-4, 1e-3)


def pick_l2(x, y, classes, *, balanced=False) -> float:
    """Regularisation that does best on the newest fifth of these rows, trained on the rest.

    With about a thousand labelled stories a fixed 1e-3 underfit: on held-out
    rule labels 1e-4 agreed 0.74 of the time against 0.71, macro-F1 0.50 against 0.45.
    """
    cut = int(len(y) * 0.8)
    scores = {}
    for l2 in L2_CHOICES:
        weights, bias = train(x[:cut], y[:cut], classes, l2=l2, balanced=balanced)
        scores[l2] = float(np.mean(np.argmax(x[cut:] @ weights + bias, axis=1) == y[cut:]))
    return max(scores, key=scores.get)


def macro_f1(truth, predicted, classes):
    scores = []
    for index in range(len(classes)):
        tp = np.sum((predicted == index) & (truth == index))
        fp = np.sum((predicted == index) & (truth != index))
        fn = np.sum((predicted != index) & (truth == index))
        if tp + fn:
            scores.append(2 * tp / max(1, 2 * tp + fp + fn))
    return float(np.mean(scores))


def main() -> None:
    parser = argparse.ArgumentParser()
    parser.add_argument("dataset", type=Path)
    parser.add_argument("--out", type=Path, default=Path("data/models/move_classifier.npz"))
    parser.add_argument("--balanced", action="store_true", help="Weight rare actions up")
    args = parser.parse_args()
    rows = load(args.dataset)
    if len(rows) < 100:
        raise SystemExit(f"only {len(rows)} labelled stories with vectors; embed more first")
    classes = sorted({row[2] for row in rows})
    x = np.stack([row[1] for row in rows])
    # Centre on the corpus mean, as storylines do; without it every headline
    # shares one "Tamil Nadu politics" direction and the classes blur.
    mean = x.mean(axis=0)
    x = x - mean
    x /= np.linalg.norm(x, axis=1, keepdims=True)
    y = np.array([classes.index(row[2]) for row in rows])
    split = int(len(rows) * 0.8)
    l2 = pick_l2(x[:split], y[:split], classes, balanced=args.balanced)
    weights, bias = train(x[:split], y[:split], classes, l2=l2, balanced=args.balanced)
    predicted = np.argmax(x[split:] @ weights + bias, axis=1)
    truth = y[split:]
    majority = Counter(y[:split]).most_common(1)[0][0]
    tamil = np.array([row[3] == "ta" for row in rows[split:]])
    report = {
        "train": split, "test": len(rows) - split, "classes": classes, "l2": l2,
        "accuracy": round(float(np.mean(predicted == truth)), 3),
        "macro_f1": round(macro_f1(truth, predicted, classes), 3),
        "majority_baseline_accuracy": round(float(np.mean(truth == majority)), 3),
        "accuracy_tamil": round(float(np.mean(predicted[tamil] == truth[tamil])), 3) if tamil.any() else None,
        "accuracy_english": round(float(np.mean(predicted[~tamil] == truth[~tamil])), 3) if (~tamil).any() else None,
    }
    # Final model uses every labelled row.
    weights, bias = train(x, y, classes, l2=pick_l2(x, y, classes, balanced=args.balanced), balanced=args.balanced)
    args.out.parent.mkdir(parents=True, exist_ok=True)
    np.savez(args.out, weights=weights, bias=bias, classes=np.array(classes), mean=mean)
    args.out.with_suffix(".json").write_text(json.dumps(report, indent=2), encoding="utf-8")
    print(json.dumps(report, indent=2))


if __name__ == "__main__":
    main()
