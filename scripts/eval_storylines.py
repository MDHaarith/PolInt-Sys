#!/usr/bin/env python3
"""Score storyline linking end to end on the hand-checked same-issue groups.

Builds storylines from the warehouse as the snapshot step does, for the 45 days
ending with the groups' week, and checks the gold stories that the rules read
as moves:
  pair_precision / pair_recall  of "in the same storyline" against "in the same
                                group" (big groups weigh more: pairs grow with size squared)
  group_completeness            per group, the share of its moves in its
                                biggest storyline, averaged over groups
Run it before and after changing thresholds in scripts/intelligence/storylines.py.

    python3 scripts/eval_storylines.py [--database data/intelligence.db]
"""
from __future__ import annotations

import argparse
import itertools
import json
import sys
from collections import Counter, defaultdict
from datetime import datetime, timedelta
from pathlib import Path

PROJECT_ROOT = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(PROJECT_ROOT))

from scripts.intelligence.snapshots import _frontend_news, story_vectors  # noqa: E402
from scripts.intelligence.storylines import build_storylines  # noqa: E402
from scripts.intelligence.warehouse import IntelligenceWarehouse  # noqa: E402


def linking_scores(lines: dict, label: dict) -> dict:
    thread = {story_id: move.get("threadId") for story_id, move in lines["storyMoves"].items()}
    gold = [story_id for story_id in thread if story_id in label]
    hits = Counter()
    for left, right in itertools.combinations(gold, 2):
        same, linked = label[left] == label[right], thread[left] is not None and thread[left] == thread[right]
        hits["tp"] += same and linked
        hits["fp"] += linked and not same
        hits["fn"] += same and not linked
    by_group = defaultdict(list)
    for story_id in gold:
        by_group[label[story_id]].append(thread[story_id])
    completeness = [
        max(Counter(t for t in threads if t).values(), default=0) / len(threads) for threads in by_group.values()
    ]
    return {
        "gold_moves": len(gold),
        "pair_precision": round(hits["tp"] / max(1, hits["tp"] + hits["fp"]), 3),
        "pair_recall": round(hits["tp"] / max(1, hits["tp"] + hits["fn"]), 3),
        "group_completeness": round(sum(completeness) / max(1, len(completeness)), 3),
        "storylines": len({t for t in thread.values() if t}),
        "moves_in_storylines": sum(1 for t in thread.values() if t),
    }


def main() -> None:
    parser = argparse.ArgumentParser()
    parser.add_argument("--database", default=PROJECT_ROOT / "data/intelligence.db", type=Path)
    parser.add_argument("--fixture", default=PROJECT_ROOT / "tests/fixtures/same_issue_clusters.json", type=Path)
    args = parser.parse_args()
    groups = json.loads(args.fixture.read_text(encoding="utf-8"))["clusters"]
    label = {item["rawId"]: name for name, items in groups.items() for item in items}
    warehouse = IntelligenceWarehouse(args.database)
    try:
        news = _frontend_news(warehouse, 1_000_000)
        last = max(story.get("publishedAt") or "" for story in news if story["rawId"] in label)
        reference = (datetime.fromisoformat(last.replace("Z", "+00:00")) + timedelta(days=1)).isoformat()
        news = [story for story in news if (story.get("publishedAt") or "") <= reference]
        vectors = story_vectors(warehouse, [story["rawId"] for story in news])
    finally:
        warehouse.close()
    print(f"{len(news)} stories, {len(vectors)} with vectors; window ends {reference[:10]}")
    print("with vectors ", linking_scores(build_storylines(news, reference, vectors=vectors), label))
    print("words only   ", linking_scores(build_storylines(news, reference, vectors={}), label))


if __name__ == "__main__":
    main()
