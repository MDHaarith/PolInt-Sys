#!/usr/bin/env python3
from __future__ import annotations

import argparse
import json
import subprocess
import tempfile
from pathlib import Path

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
from scripts.intelligence.source_config import (
    DEFAULT_X_QUERIES,
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
):
    from scripts import scrape_political_intel as legacy

    rss_jobs = [
        (query, politician_id, data["name"])
        for politician_id, data in legacy.POLITICIANS.items()
        for query in data["queries"]
    ]
    rss_jobs.extend(
        (query, "general", "Tamil Nadu Politics")
        for query in legacy.TOPIC_QUERIES
    )
    if max_rss_queries is not None:
        rss_jobs = rss_jobs[:max_rss_queries]

    social_jobs = legacy.build_social_jobs(
        database_document, max_queries=max_social_queries
    )
    collectors = [
        RssCollector(rss_jobs, legacy.fetch_rss),
        RedditCollector(social_jobs, legacy.fetch_reddit, limit=social_limit),
        BlueskyCollector(social_jobs, legacy.fetch_bluesky, limit=social_limit),
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
    return collectors


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
) -> dict:
    warehouse = IntelligenceWarehouse(database)
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

    if snapshot:
        result["snapshots"] = generate_snapshots(
            warehouse, output_dir, recent_news_limit=recent_news_limit
        )
    warehouse.close()
    return result


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
    parser.add_argument("--backfill-from", type=int, default=1952)
    parser.add_argument("--max-rss-queries", type=int)
    parser.add_argument("--max-social-queries", type=int, default=80)
    parser.add_argument("--social-limit", type=int, default=15)
    parser.add_argument("--extended-public", action="store_true")
    args = parser.parse_args()

    project_root = Path(__file__).resolve().parents[1]
    run_all = args.all or not any(
        (args.migrate, args.collect, args.extract_events, args.snapshot)
    )
    source = Path(args.source)
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
        )
        if args.collect or run_all
        else []
    )
    result = run_pipeline(
        source=source,
        database=Path(args.database),
        output_dir=Path(args.output_dir),
        quarantine_dir=Path(args.quarantine_dir),
        collectors=collectors,
        curated_payload=export_curated_payload(project_root),
        migrate_existing=args.migrate or run_all,
        collect=args.collect or run_all,
        extract_events=args.extract_events or run_all,
        snapshot=args.snapshot or run_all,
    )
    result["historicalBackfillStart"] = max(1952, args.backfill_from)
    print(json.dumps(result, indent=2))


if __name__ == "__main__":
    main()
