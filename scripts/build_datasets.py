#!/usr/bin/env python3
"""Build training and evaluation datasets from the warehouse.

    python3 scripts/build_datasets.py [--days 60] [--out data/datasets]

Writes data/datasets/polint-YYYYMMDD/ with:
  stories.jsonl       one row per published story: text, source quality,
                      politician, category and the rule reading of its move
  move_labels.jsonl   headline -> actor, action, objective, intent (weak labels
                      from the rules, with their confidence) for classifiers
  story_pairs.jsonl   anchor/positive/negative headlines for contrastive
                      training: positives share a storyline, negatives share
                      an actor but not a storyline
  gold_pairs.jsonl    same-issue pairs from the hand-checked groups in
                      tests/fixtures/same_issue_clusters.json
  image_text.jsonl    news photo URL paired with its headline
  audio.jsonl         audio clips with the story or file they came from
  vectors.npy         EmbeddingGemma 2 vectors (float16) for embedded items,
  vectors.jsonl       with their ids, modality and story ids in the same order
  README.md           dataset card: counts, schema, provenance, limits
"""
from __future__ import annotations

import argparse
import json
import random
import re
import sys
from collections import Counter, defaultdict
from datetime import datetime, timedelta, timezone
from pathlib import Path

import numpy as np

PROJECT_ROOT = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(PROJECT_ROOT))

from scripts.intelligence.snapshots import _frontend_news, story_vectors  # noqa: E402
from scripts.intelligence.storylines import build_storylines, read_move  # noqa: E402
from scripts.intelligence.vectors import MODEL_NAME, VectorStore  # noqa: E402
from scripts.intelligence.warehouse import IntelligenceWarehouse, now_utc_iso  # noqa: E402

TAMIL = re.compile(r"[஀-௿]")


def write_jsonl(path: Path, rows) -> int:
    count = 0
    with path.open("w", encoding="utf-8") as handle:
        for row in rows:
            handle.write(json.dumps(row, ensure_ascii=False) + "\n")
            count += 1
    return count


def language(text: str) -> str:
    return "ta" if TAMIL.search(text or "") else "en"


def build(database: Path, out_root: Path, *, days: int, seed: int = 7) -> dict:
    random.seed(seed)
    generated_at = now_utc_iso()
    out = out_root / f"polint-{generated_at[:10].replace('-', '')}"
    out.mkdir(parents=True, exist_ok=True)
    since = (datetime.now(timezone.utc) - timedelta(days=days)).isoformat() if days else None

    warehouse = IntelligenceWarehouse(database)
    try:
        news = [
            story for story in _frontend_news(warehouse, 1_000_000)
            if not since or (story.get("publishedAt") or "") >= since[:19]
        ]
        vectors = story_vectors(warehouse, [story["rawId"] for story in news])
        storylines = build_storylines(
            news, generated_at, window_days=max(days, 1) if days else 3650, max_threads=10_000, vectors=vectors,
        )
        moves = storylines["storyMoves"]
        thread_of = {story_id: move["threadId"] for story_id, move in moves.items() if move.get("threadId")}

        stories = []
        for story in news:
            move = moves.get(story["rawId"])
            stories.append({
                "id": story["rawId"],
                "title": story["title"],
                "snippet": story.get("snippet", ""),
                "language": language(story["title"]),
                "url": story.get("url"),
                "source": story.get("source"),
                "sourceTier": story.get("sourceTier"),
                "outletCount": story.get("outletCount", 1),
                "importance": story.get("importance"),
                "publishedAt": story.get("publishedAt"),
                "politicianId": story.get("politicianId"),
                "category": story.get("category"),
                "unverified": story.get("isRumor", False),
                "move": move,
                "threadId": thread_of.get(story["rawId"]),
            })
        counts = {"stories": write_jsonl(out / "stories.jsonl", stories)}

        # Weak labels: the rules' reading of every headline they could read.
        labels = []
        for story in stories:
            if story["sourceTier"] == "social":
                continue
            reading = read_move({"title": story["title"], "snippet": story["snippet"]})
            if reading:
                labels.append({
                    "id": story["id"], "text": story["title"], "language": story["language"],
                    "actor": reading["actor"], "action": reading["action"], "objective": reading["objective"],
                    "intent": reading["intent"], "counterparts": reading["counterparts"],
                    "confidence": reading["confidence"], "labelSource": "rules",
                })
        counts["move_labels"] = write_jsonl(out / "move_labels.jsonl", labels)

        # Contrastive triples from storylines.
        by_thread, by_actor = defaultdict(list), defaultdict(list)
        for story in stories:
            if story["threadId"]:
                by_thread[story["threadId"]].append(story)
            if story["move"]:
                by_actor[story["move"]["actor"]].append(story)
        triples = []
        for thread_id, members in by_thread.items():
            for anchor in members:
                positives = [item for item in members if item["id"] != anchor["id"]]
                negatives = [item for item in by_actor.get(anchor["move"]["actor"], []) if item["threadId"] != thread_id]
                if positives and negatives:
                    positive, negative = random.choice(positives), random.choice(negatives)
                    triples.append({
                        "anchor": anchor["title"], "positive": positive["title"], "negative": negative["title"],
                        "crossLanguage": anchor["language"] != positive["language"], "labelSource": "storylines",
                    })
        counts["story_pairs"] = write_jsonl(out / "story_pairs.jsonl", triples)

        fixture = PROJECT_ROOT / "tests/fixtures/same_issue_clusters.json"
        gold = []
        if fixture.exists():
            groups = json.loads(fixture.read_text(encoding="utf-8"))["clusters"]
            for name, items in groups.items():
                for left_index, left in enumerate(items):
                    for right in items[left_index + 1:]:
                        gold.append({"left": left["title"], "right": right["title"], "group": name, "same": True, "labelSource": "hand-checked"})
            names = list(groups)
            for _ in range(len(gold)):
                first, second = random.sample(names, 2)
                gold.append({
                    "left": random.choice(groups[first])["title"], "right": random.choice(groups[second])["title"],
                    "group": f"{first}|{second}", "same": False, "labelSource": "hand-checked",
                })
        counts["gold_pairs"] = write_jsonl(out / "gold_pairs.jsonl", gold)

        store = VectorStore(warehouse.connection)
        media = warehouse.connection.execute(
            "SELECT id, raw_item_id, modality, source, title, published_at FROM media_items WHERE modality != 'text'"
        ).fetchall()
        counts["image_text"] = write_jsonl(out / "image_text.jsonl", (
            {"image": row["source"], "text": row["title"], "storyId": row["raw_item_id"], "publishedAt": row["published_at"]}
            for row in media if row["modality"] == "image"
        ))
        counts["audio"] = write_jsonl(out / "audio.jsonl", (
            {"audio": row["source"], "text": row["title"], "storyId": row["raw_item_id"], "publishedAt": row["published_at"]}
            for row in media if row["modality"] == "audio"
        ))

        meta, matrix = store.load(since=since)
        np.save(out / "vectors.npy", matrix.astype(np.float16))
        counts["vectors"] = write_jsonl(out / "vectors.jsonl", (
            {"id": item["id"], "modality": item["modality"], "storyId": item["raw_item_id"]} for item in meta
        ))
    finally:
        warehouse.close()

    actions = Counter(label["action"] for label in labels)
    confidence = Counter(label["confidence"] for label in labels)
    languages = Counter(story["language"] for story in stories)
    card = f"""# PolInt dataset, {generated_at[:10]}

Built by `scripts/build_datasets.py` from the PolInt warehouse
({'last ' + str(days) + ' days' if days else 'all dates'}).

| File | Rows | What it is |
| --- | ---: | --- |
| stories.jsonl | {counts['stories']} | Published stories with source tier, politician, category and the rule reading of the move |
| move_labels.jsonl | {counts['move_labels']} | Headline → actor, action, objective, intent (weak labels) |
| story_pairs.jsonl | {counts['story_pairs']} | Anchor / same-storyline positive / same-actor negative headlines |
| gold_pairs.jsonl | {counts['gold_pairs']} | Hand-checked same-issue and different-issue headline pairs |
| image_text.jsonl | {counts['image_text']} | News photo URL with its headline |
| audio.jsonl | {counts['audio']} | Audio clip with its story or file title |
| vectors.npy / vectors.jsonl | {counts['vectors']} | {MODEL_NAME} vectors (768-d, float16, unit length) |

Languages: {dict(languages)}. Move actions: {dict(actions.most_common())}.
Label confidence: {dict(confidence)}.

## How labels were made
- **Weak labels** (`labelSource: rules`, `storylines`) come from the rule-based
  reader in `scripts/intelligence/storylines.py`. They are useful for training
  and for spotting rule gaps, but they carry the rules' mistakes; prefer
  `confidence: high` rows, and check a sample before trusting a metric.
- **Gold pairs** (`labelSource: hand-checked`) come from same-issue groups that
  were read and checked by hand. Use them for evaluation, not training.

## Limits and use
Headlines, summaries and photos belong to their publishers. This dataset is for
research and for improving PolInt; do not redistribute the text or images.
Photos and audio are stored as links, not copies.
"""
    (out / "README.md").write_text(card, encoding="utf-8")
    return {"out": str(out), **counts}


def main() -> None:
    parser = argparse.ArgumentParser()
    parser.add_argument("--database", default=PROJECT_ROOT / "data/intelligence.db", type=Path)
    parser.add_argument("--out", default=PROJECT_ROOT / "data/datasets", type=Path)
    parser.add_argument("--days", type=int, default=60, help="Only stories from the last N days (0 for all)")
    args = parser.parse_args()
    print(json.dumps(build(args.database, args.out, days=args.days), indent=2))


if __name__ == "__main__":
    main()
