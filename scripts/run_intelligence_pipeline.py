#!/usr/bin/env python3
from __future__ import annotations

import argparse
import json
import subprocess
import sys
import tempfile
from functools import partial
from pathlib import Path

PROJECT_ROOT = Path(__file__).resolve().parents[1]
if str(PROJECT_ROOT) not in sys.path:
    sys.path.insert(0, str(PROJECT_ROOT))

from scripts.intelligence.collectors.base import CollectorRunner
from scripts.intelligence.collectors.bluesky import BlueskyCollector
from scripts.intelligence.collectors.instagram import InstagramCollector
from scripts.intelligence.collectors.reddit import RedditCollector
from scripts.intelligence.collectors.rss import RssCollector
from scripts.intelligence.collectors.web import (
    ArticleExtractor,
    ScrapyDiscoveryCollector,
    WebArticleCollector,
)
from scripts.intelligence.collectors.x_public import XPublicCollector
from scripts.intelligence.curated_seed import upsert_curated_payload
from scripts.intelligence.events import EventExtractor
from scripts.intelligence.snapshots import generate_snapshots
from scripts.intelligence.vectors import EmbeddingUnavailable, VectorStore
from scripts.intelligence.source_config import (
    DEFAULT_X_QUERIES,
    NEWS_RSS_FEEDS,
    PUBLIC_WEB_ALLOWED_DOMAINS,
    PUBLIC_WEB_START_URLS,
    instagram_profiles,
)
from scripts.intelligence.warehouse import IntelligenceWarehouse, recover_json_document


def export_curated_payload(project_root: Path) -> dict:
    with tempfile.TemporaryDirectory() as temporary:
        destination = Path(temporary) / "curated.json"
        subprocess.run(
            [
                "node",
                str(project_root / "scripts/export_curated_intelligence.mjs"),
                str(destination),
            ],
            cwd=project_root,
            check=True,
            capture_output=True,
            text=True,
        )
        return json.loads(destination.read_text(encoding="utf-8"))


def build_default_collectors(
    database_document: dict,
    *,
    max_rss_queries: int | None,
    max_social_queries: int,
    social_limit: int,
    include_extended_public: bool,
    collector_names: list[str] | None = None,
):
    from scripts import scrape_political_intel as legacy

    rss_jobs = legacy.build_rss_jobs()
    if max_rss_queries is not None:
        rss_jobs = rss_jobs[:max_rss_queries]

    social_jobs = legacy.build_social_jobs(
        database_document, max_queries=max_social_queries
    )
    collectors = [
        RssCollector(rss_jobs, partial(legacy.fetch_rss, raise_errors=True)),
        RssCollector(
            [(url, "general", name) for url, name in NEWS_RSS_FEEDS],
            legacy.fetch_direct_rss, name="rss_direct",
        ),
        RedditCollector(social_jobs, partial(legacy.fetch_reddit, raise_errors=True), limit=social_limit),
        BlueskyCollector(social_jobs, partial(legacy.fetch_bluesky, raise_errors=True), limit=social_limit),
    ]
    if include_extended_public:
        discovery = ScrapyDiscoveryCollector(
            PUBLIC_WEB_START_URLS,
            PUBLIC_WEB_ALLOWED_DOMAINS,
        )
        collectors.extend(
            [
                WebArticleCollector(discovery, ArticleExtractor(), max_articles=25),
                InstagramCollector(instagram_profiles(), max_posts_per_profile=10),
                XPublicCollector(DEFAULT_X_QUERIES, limit_per_query=10),
            ]
        )
    if collector_names is not None:
        collectors = [collector for collector in collectors if collector.name in collector_names]
    with legacy.lock:
        legacy.stats.update(
            fetched=0, queries_done=0,
            total_queries=sum(len(collector.jobs) for collector in collectors if collector.name in {"rss", "rss_direct"}),
        )
    return collectors


def embed_media(warehouse, *, limit: int, seconds: float, days: int) -> dict:
    """Register new stories, photos and audio, then embed the newest first.

    Each run spends at most `seconds` on the model, so a large backlog fills
    in over several runs. Without Node or the model the step is skipped and
    the rest of the pipeline is unaffected.
    """
    from datetime import datetime, timedelta, timezone

    store = VectorStore(warehouse.connection)
    since = (datetime.now(timezone.utc) - timedelta(days=days)).isoformat() if days else None
    discovered = store.discover(since=since)
    try:
        counts = store.embed_pending(limit=limit, deadline_seconds=seconds)
    except EmbeddingUnavailable as error:
        return {"status": "unavailable", "reason": str(error)[:300], "discovered": discovered}
    return {"status": "ready", "discovered": discovered, **counts, "store": store.stats()}


def run_pipeline(
    *,
    source: Path,
    database: Path,
    output_dir: Path,
    quarantine_dir: Path,
    collectors=None,
    curated_payload=None,
    migrate_existing=True,
    collect=True,
    extract_events=True,
    snapshot=True,
    recent_news_limit=25000,
    embed=False,
    embed_limit=3000,
    embed_seconds=900,
    embed_days=120,
) -> dict:
    warehouse = IntelligenceWarehouse(database)
    try:
        result = {}

        if migrate_existing and source.exists():
            document, trailing = recover_json_document(source)
            result["migration"] = warehouse.import_legacy_document(document)
            if trailing.strip():
                quarantine_dir.mkdir(parents=True, exist_ok=True)
                quarantine_path = quarantine_dir / f"{source.stem}.trailing.txt"
                quarantine_path.write_text(trailing, encoding="utf-8")
                result["migration"]["quarantined_trailing_bytes"] = len(
                    trailing.encode("utf-8")
                )

        if curated_payload is not None:
            result["curated"] = upsert_curated_payload(warehouse, curated_payload)

        if collect and collectors:
            result["collection"] = CollectorRunner(warehouse).run(collectors)

        if extract_events:
            result["events"] = EventExtractor(warehouse).extract_all()

        if embed:
            result["embeddings"] = embed_media(
                warehouse, limit=embed_limit, seconds=embed_seconds, days=embed_days
            )

        if snapshot:
            result["snapshots"] = generate_snapshots(
                warehouse, output_dir, recent_news_limit=recent_news_limit
            )
        return result
    finally:
        warehouse.close()


def main() -> None:
    parser = argparse.ArgumentParser(description="Run the integrated intelligence pipeline.")
    parser.add_argument("--source", default="public/scrapedIntel.json")
    parser.add_argument("--database", default="data/intelligence.db")
    parser.add_argument("--output-dir", default="public")
    parser.add_argument("--quarantine-dir", default="data/quarantine")
    parser.add_argument("--migrate", action="store_true")
    parser.add_argument("--collect", action="store_true")
    parser.add_argument("--extract-events", action="store_true")
    parser.add_argument("--snapshot", action="store_true")
    parser.add_argument("--all", action="store_true")
    parser.add_argument("--max-rss-queries", type=int)
    parser.add_argument("--max-social-queries", type=int, default=80)
    parser.add_argument("--social-limit", type=int, default=15)
    parser.add_argument("--extended-public", action="store_true")
    parser.add_argument("--embed", action="store_true",
                        help="Embed stories, photos and audio with EmbeddingGemma 2 (also part of --all)")
    parser.add_argument("--no-embed", action="store_true", help="Skip embedding during --all")
    parser.add_argument("--embed-limit", type=int, default=3000, help="Most items to embed in one run")
    parser.add_argument("--embed-seconds", type=int, default=900, help="Time budget for embedding")
    parser.add_argument("--embed-days", type=int, default=120, help="Only embed items from the last N days (0 for all)")
    parser.add_argument(
        "--collectors", nargs="+",
        choices=("rss", "rss_direct", "reddit", "bluesky", "scrapy_newspaper", "instagram", "x_public"),
        help="Run only these collectors (extended collectors also need --extended-public).",
    )
    args = parser.parse_args()

    project_root = PROJECT_ROOT
    run_all = args.all or not any(
        (args.migrate, args.collect, args.extract_events, args.snapshot, args.embed)
    )
    source = project_root / args.source
    document = {}
    if source.exists():
        document, _ = recover_json_document(source)
    collectors = (
        build_default_collectors(
            document,
            max_rss_queries=args.max_rss_queries,
            max_social_queries=args.max_social_queries,
            social_limit=args.social_limit,
            include_extended_public=args.extended_public,
            collector_names=args.collectors,
        )
        if args.collect or run_all
        else []
    )
    result = run_pipeline(
        source=source,
        database=project_root / args.database,
        output_dir=project_root / args.output_dir,
        quarantine_dir=project_root / args.quarantine_dir,
        collectors=collectors,
        curated_payload=export_curated_payload(project_root),
        migrate_existing=args.migrate or run_all,
        collect=args.collect or run_all,
        extract_events=args.extract_events or run_all,
        snapshot=args.snapshot or run_all,
        embed=(args.embed or run_all) and not args.no_embed,
        embed_limit=args.embed_limit,
        embed_seconds=args.embed_seconds,
        embed_days=args.embed_days,
    )
    print(json.dumps(result, indent=2))


if __name__ == "__main__":
    main()
