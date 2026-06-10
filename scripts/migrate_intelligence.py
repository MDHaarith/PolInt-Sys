#!/usr/bin/env python3
import argparse
from pathlib import Path

from scripts.intelligence.snapshots import generate_snapshots
from scripts.intelligence.warehouse import IntelligenceWarehouse, recover_json_document


def migrate(source: Path, database: Path, quarantine_dir: Path, output_dir: Path | None = None) -> dict:
    document, trailing = recover_json_document(source)
    warehouse = IntelligenceWarehouse(database)
    result = warehouse.import_legacy_document(document)

    if trailing.strip():
        quarantine_dir.mkdir(parents=True, exist_ok=True)
        (quarantine_dir / f"{source.stem}.trailing.txt").write_text(
            trailing, encoding="utf-8"
        )
        result["quarantined_trailing_bytes"] = len(trailing.encode("utf-8"))
    else:
        result["quarantined_trailing_bytes"] = 0
    if output_dir:
        result.update(generate_snapshots(warehouse, output_dir))
    warehouse.close()
    return result


def main() -> None:
    parser = argparse.ArgumentParser(description="Import existing intelligence JSON into SQLite.")
    parser.add_argument("--source", default="public/scrapedIntel.json")
    parser.add_argument("--database", default="data/intelligence.db")
    parser.add_argument("--quarantine-dir", default="data/quarantine")
    parser.add_argument("--output-dir", default="public")
    args = parser.parse_args()

    result = migrate(
        Path(args.source),
        Path(args.database),
        Path(args.quarantine_dir),
        Path(args.output_dir),
    )
    print(result)


if __name__ == "__main__":
    main()
