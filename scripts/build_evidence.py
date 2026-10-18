#!/usr/bin/env python3
"""Build the evidence store and the phone's evidence pack.

    python3 scripts/build_evidence.py [--database data/intelligence.db | --feed public/scrapedIntel.json]
                                      [--store data/evidence.db] [--days 30] [--limit 2000]
                                      [--out public/evidencePack.json]

Stories go through the proof gate (scripts/intelligence/evidence.py), are cut
into quotable passages and embedded with EmbeddingGemma 2; a run embeds only
passages it has not seen. The pack holds the last --days of passages with their
outlet, tier, link, date and the other outlets that reported the same thing.
"""
from __future__ import annotations

import argparse
import json
import sqlite3
import sys
from datetime import datetime, timedelta, timezone
from pathlib import Path

PROJECT_ROOT = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(PROJECT_ROOT))

from scripts.intelligence.evidence import (  # noqa: E402
    EvidenceStore, evidence_pack, stories_from_feed, stories_from_warehouse,
)
from scripts.intelligence.snapshots import atomic_write_json  # noqa: E402


def main() -> None:
    parser = argparse.ArgumentParser()
    source = parser.add_mutually_exclusive_group()
    source.add_argument("--database", type=Path, help="Intelligence warehouse (full story text)")
    source.add_argument("--feed", type=Path, help="Published feed, when there is no warehouse (mostly headlines)")
    parser.add_argument("--store", default=PROJECT_ROOT / "data/evidence.db", type=Path)
    parser.add_argument("--days", type=int, default=30, help="Embed and export passages from the last N days")
    parser.add_argument("--limit", type=int, help="Embed at most this many new passages this run")
    parser.add_argument("--deadline", type=float, help="Stop embedding after this many seconds")
    parser.add_argument("--out", default=PROJECT_ROOT / "public/evidencePack.json", type=Path)
    args = parser.parse_args()

    since = (datetime.now(timezone.utc) - timedelta(days=args.days)).strftime("%Y-%m-%dT%H:%M:%SZ")
    database = args.database or (None if args.feed else PROJECT_ROOT / "data/intelligence.db")
    if database:
        with sqlite3.connect(database) as warehouse:
            stories = stories_from_warehouse(warehouse, since=since)
    else:
        stories = [story for story in stories_from_feed(args.feed) if story.published_at >= since]

    args.store.parent.mkdir(parents=True, exist_ok=True)
    with sqlite3.connect(args.store) as connection:
        store = EvidenceStore(connection)
        added = store.add(stories)
        embedded = store.embed_pending(since=since, limit=args.limit, deadline_seconds=args.deadline)
        pack = evidence_pack(store, days=args.days)
        report = {"read": len(stories), "added": added, "embedding": embedded, "store": store.stats(),
                  "pack": {"passages": len(pack["passages"]),
                           "corroborated": sum(bool(item["corroboratedBy"]) for item in pack["passages"])}}
    atomic_write_json(args.out, pack)
    report["pack"]["bytes"] = args.out.stat().st_size
    print(json.dumps(report, indent=2, ensure_ascii=False))


if __name__ == "__main__":
    main()
