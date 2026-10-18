#!/usr/bin/env python3
"""Build training and evaluation datasets from the warehouse.

    python3 scripts/build_datasets.py [--days 60] [--out data/datasets]

Writes data/datasets/polint-YYYYMMDD/ with:
  stories.jsonl       one row per published story: text, source quality,
                      politician, category and the rule reading of its move
  move_labels.jsonl   headline -> actor, action, objective, intent (weak labels
                      from the rules, with their confidence) for classifiers
  story_pairs.jsonl   anchor/positive/negative headlines for contrastive
                      training: positives share a storyline, negatives are
                      same-actor stories outside it that are also unlike it
  mined_pairs.jsonl   same-issue pairs found by meaning alone (mutual nearest
                      neighbours within three days), many across languages
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
from scripts.intelligence.vectors import MODEL_NAME, VectorStore, without_shared_directions  # noqa: E402
from scripts.intelligence.warehouse import IntelligenceWarehouse, now_utc_iso  # noqa: E402

TAMIL = re.compile(r"[஀-௿]")
GOLD_FIXTURE = PROJECT_ROOT / "tests/fixtures/same_issue_clusters.json"

# Label quality was checked against the hand-checked groups (see the dataset
# card). Storyline positives were the same issue in all 91 checkable pairs. A
# same-actor story outside the storyline is the informative negative, but
# storylines split one issue into several threads, so only 20% of those were
# really a different issue. A negative must therefore also be unlike the
# anchor: the most similar same-actor story below NEGATIVE_CEILING was a
# different issue in every checkable case. Similarities are cosines between
# story vectors with the shared directions removed.
NEGATIVE_CEILING = 0.15
# Mutual nearest neighbours published within MINED_PAIR_DAYS of each other at
# MINED_PAIR_FLOOR or above: 99% pair precision at this cut on the groups, and
# all 43 checkable mined pairs were the same issue.
MINED_PAIR_FLOOR = 0.35
MINED_PAIR_DAYS = 3


def write_jsonl(path: Path, rows) -> int:
    count = 0
    with path.open("w", encoding="utf-8") as handle:
        for row in rows:
            handle.write(json.dumps(row, ensure_ascii=False) + "\n")
            count += 1
    return count


def language(text: str) -> str:
    return "ta" if TAMIL.search(text or "") else "en"


def _epoch(value: str | None) -> float:
    try:
        return datetime.fromisoformat((value or "").replace("Z", "+00:00")).timestamp()
    except ValueError:
        return float("nan")


def label_check(triples: list[dict], mined: list[dict], gold_group: dict) -> str:
    """How often each kind of label agrees with the hand-checked groups, where both stories are in them."""
    def share(checks):
        return f"{sum(checks) / len(checks):.0%} of {len(checks)}" if checks else "none checkable"

    def same(left, right):
        return gold_group[left] == gold_group[right]

    positives = [same(t["anchorId"], t["positiveId"]) for t in triples if t["anchorId"] in gold_group and t["positiveId"] in gold_group]
    negatives = [not same(t["anchorId"], t["negativeId"]) for t in triples if t["anchorId"] in gold_group and t["negativeId"] in gold_group]
    pairs = [same(p["leftId"], p["rightId"]) for p in mined if p["leftId"] in gold_group and p["rightId"] in gold_group]
    return f"triple positives {share(positives)}, triple negatives {share(negatives)}, mined pairs {share(pairs)}"


def mined_pairs(stories: list[dict], processed: dict) -> list[dict]:
    """Stories that are each other's nearest neighbour by meaning, close in time and similar enough."""
    usable = [story for story in stories if story["id"] in processed and story["sourceTier"] != "social"]
    if len(usable) < 2:
        return []
    matrix = np.stack([processed[story["id"]] for story in usable])
    similarity = matrix @ matrix.T
    np.fill_diagonal(similarity, -np.inf)
    times = np.array([_epoch(story["publishedAt"]) for story in usable])
    similarity[~(np.abs(times[:, None] - times[None, :]) <= MINED_PAIR_DAYS * 86400)] = -np.inf
    nearest = np.argmax(similarity, axis=1)
    pairs = []
    for row, column in enumerate(nearest):
        if row < column and nearest[column] == row and similarity[row, column] >= MINED_PAIR_FLOOR:
            left, right = usable[row], usable[column]
            pairs.append({
                "leftId": left["id"], "rightId": right["id"], "left": left["title"], "right": right["title"],
                "similarity": round(float(similarity[row, column]), 3),
                "crossLanguage": left["language"] != right["language"],
                "inGoldSet": left["inGoldSet"] or right["inGoldSet"], "labelSource": "embeddings",
            })
    return pairs


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
        groups = json.loads(GOLD_FIXTURE.read_text(encoding="utf-8"))["clusters"] if GOLD_FIXTURE.exists() else {}
        gold_group = {item["rawId"]: name for name, items in groups.items() for item in items}
        gold_ids = set(gold_group)

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
                # In the hand-checked evaluation groups: leave out of training when scoring on gold_pairs.
                "inGoldSet": story["rawId"] in gold_ids,
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

        # Contrastive triples from storylines (see NEGATIVE_CEILING).
        story_ids = {story["id"] for story in stories}
        keyed = [story_id for story_id in vectors if story_id in story_ids]
        processed = dict(zip(keyed, without_shared_directions(np.stack([vectors[k] for k in keyed])))) if len(keyed) > 3 else {}

        def similarity(left, right):
            if left["id"] in processed and right["id"] in processed:
                return round(float(processed[left["id"]] @ processed[right["id"]]), 3)
            return None

        by_thread, by_actor = defaultdict(list), defaultdict(list)
        for story in stories:
            if story["threadId"]:
                by_thread[story["threadId"]].append(story)
            if story["move"]:
                by_actor[story["move"]["actor"]].append(story)
        published = [story for story in stories if story["sourceTier"] != "social"]
        triples = []
        for thread_id, members in by_thread.items():
            for anchor in members:
                positives = [item for item in members if item["id"] != anchor["id"]]
                if not positives:
                    continue
                if anchor["id"] in processed:
                    candidates = [
                        (similarity(anchor, item), item) for item in by_actor.get(anchor["move"]["actor"], [])
                        if item["threadId"] != thread_id and item["id"] in processed
                    ]
                    candidates = [pair for pair in candidates if pair[0] < NEGATIVE_CEILING]
                    negative = max(candidates, key=lambda pair: pair[0])[1] if candidates else None
                    source = "same actor, unlike the anchor"
                else:
                    # Without vectors, a random story outside the storyline (88% correct on the groups).
                    pool = [item for item in published if item["threadId"] != thread_id]
                    negative = random.choice(pool) if pool else None
                    source = "random"
                if negative is None:
                    continue
                positive = random.choice(positives)
                triples.append({
                    "anchorId": anchor["id"], "positiveId": positive["id"], "negativeId": negative["id"],
                    "anchor": anchor["title"], "positive": positive["title"], "negative": negative["title"],
                    "positiveSimilarity": similarity(anchor, positive), "negativeSimilarity": similarity(anchor, negative),
                    "crossLanguage": anchor["language"] != positive["language"], "negativeSource": source,
                    "inGoldSet": any(item["inGoldSet"] for item in (anchor, positive, negative)),
                    "labelSource": "storylines",
                })
        counts["story_pairs"] = write_jsonl(out / "story_pairs.jsonl", triples)
        mined = mined_pairs(stories, processed)
        counts["mined_pairs"] = write_jsonl(out / "mined_pairs.jsonl", mined)

        gold = []
        if groups:
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
| story_pairs.jsonl | {counts['story_pairs']} | Anchor / same-storyline positive / unlike same-actor negative, with ids and similarities |
| mined_pairs.jsonl | {counts['mined_pairs']} | Same-issue pairs found by meaning ({sum(pair['crossLanguage'] for pair in mined)} across languages) |
| gold_pairs.jsonl | {counts['gold_pairs']} | Hand-checked same-issue and different-issue headline pairs |
| image_text.jsonl | {counts['image_text']} | News photo URL with its headline |
| audio.jsonl | {counts['audio']} | Audio clip with its story or file title |
| vectors.npy / vectors.jsonl | {counts['vectors']} | {MODEL_NAME} vectors (768-d, float16, unit length) |

Languages: {dict(languages)}. Move actions: {dict(actions.most_common())}.
Label confidence: {dict(confidence)}.
Agreement with the hand-checked groups in this build: {label_check(triples, mined, gold_group)}.

## How labels were made
- **Weak labels** (`labelSource: rules`, `storylines`) come from the rule-based
  reader in `scripts/intelligence/storylines.py`. They are useful for training
  and for spotting rule gaps, but they carry the rules' mistakes; prefer
  `confidence: high` rows, and check a sample before trusting a metric.
- **Story triples**: positives share a storyline (the same issue in all 91
  pairs that could be checked against the hand-checked groups). Negatives are
  stories by the same actor outside the storyline whose similarity to the
  anchor is below {NEGATIVE_CEILING}: storylines split one issue into several
  threads, and without that check only 20% of same-actor negatives were a
  different issue; with it, all checkable ones were. Rows without vectors use
  a random story outside the storyline (`negativeSource: random`, 88% correct).
- **Mined pairs** (`labelSource: embeddings`) are mutual nearest neighbours by
  meaning, published within {MINED_PAIR_DAYS} days, at similarity
  {MINED_PAIR_FLOOR} or above (all 43 checkable pairs were the same issue).
  They come from the same model they would train, so they suit other models
  (classifiers, rerankers, translation-pair data) better than fine-tuning it.
- Similarities are cosines between {MODEL_NAME} story vectors with the shared
  directions removed (`vectors.without_shared_directions`).
- **Gold pairs** (`labelSource: hand-checked`) come from same-issue groups that
  were read and checked by hand. Use them for evaluation, not training: drop
  rows with `inGoldSet: true` from training when scoring on them.

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
