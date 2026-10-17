#!/usr/bin/env python3
"""Search the warehouse by meaning: with words, a photo or an audio clip.

Text, photos and audio share one embedding space, so any query can find any
kind of item.

    python3 scripts/search_intel.py "farmers protest over Cauvery water"
    python3 scripts/search_intel.py "மீனவர்கள் கைது" --days 7
    python3 scripts/search_intel.py --image rally.jpg --modality image
    python3 scripts/search_intel.py --audio speech.mp3
    python3 scripts/search_intel.py --stats
"""
from __future__ import annotations

import argparse
import json
import sys
from datetime import datetime, timedelta, timezone
from pathlib import Path

PROJECT_ROOT = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(PROJECT_ROOT))

from scripts.intelligence.vectors import VectorStore, embed_query  # noqa: E402
from scripts.intelligence.warehouse import IntelligenceWarehouse  # noqa: E402


def main() -> None:
    parser = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    parser.add_argument("query", nargs="?", help="Words to search for, in English or Tamil")
    parser.add_argument("--image", help="Find items like this photo (path or URL)")
    parser.add_argument("--audio", help="Find items like this audio clip (path or URL)")
    parser.add_argument("--modality", choices=("text", "image", "audio"), help="Only return this kind of item")
    parser.add_argument("--days", type=int, help="Only items from the last N days")
    parser.add_argument("-k", type=int, default=10)
    parser.add_argument("--database", default=PROJECT_ROOT / "data/intelligence.db", type=Path)
    parser.add_argument("--json", action="store_true")
    parser.add_argument("--stats", action="store_true", help="Show what the vector store holds")
    args = parser.parse_args()

    warehouse = IntelligenceWarehouse(args.database)
    try:
        store = VectorStore(warehouse.connection)
        if args.stats:
            print(json.dumps(store.stats(), indent=2))
            return
        if not (args.query or args.image or args.audio):
            parser.error("give a query, --image or --audio")
        vector = embed_query(args.query, image=args.image, audio=args.audio)
        since = (datetime.now(timezone.utc) - timedelta(days=args.days)).isoformat() if args.days else None
        # Syndicated copies share a headline; show each once.
        hits, seen = [], set()
        for hit in store.search(vector, k=args.k * 3, modality=args.modality, since=since):
            key = (hit.modality, (hit.title or hit.source).strip().lower())
            if key not in seen:
                seen.add(key)
                hits.append(hit)
        hits = hits[: args.k]
        urls = {}
        for hit in hits:
            if hit.raw_item_id:
                row = warehouse.connection.execute(
                    "SELECT canonical_url FROM raw_items WHERE id = ?", (hit.raw_item_id,)
                ).fetchone()
                urls[hit.item_id] = row[0] if row else None
        if args.json:
            print(json.dumps([{**hit.__dict__, "url": urls.get(hit.item_id)} for hit in hits], ensure_ascii=False, indent=2))
            return
        for hit in hits:
            when = (hit.published_at or "")[:10]
            print(f"{hit.score:.3f}  {hit.modality:5}  {when:10}  {hit.title or hit.source}")
            if urls.get(hit.item_id) or hit.modality != "text":
                print(f"{'':25}{urls.get(hit.item_id) or hit.source}")
    finally:
        warehouse.close()


if __name__ == "__main__":
    main()
