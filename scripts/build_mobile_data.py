#!/usr/bin/env python3
"""Assemble mobile-public/: the trimmed data bundled into the Android app."""
from __future__ import annotations

import shutil
import sys
from pathlib import Path

PROJECT_ROOT = Path(__file__).resolve().parents[1]
if str(PROJECT_ROOT) not in sys.path:
    sys.path.insert(0, str(PROJECT_ROOT))

from scripts.intelligence.snapshots import atomic_write_json, mobile_intel
from scripts.intelligence.warehouse import recover_json_document

SOURCE = PROJECT_ROOT / "public"
DESTINATION = PROJECT_ROOT / "mobile-public"
COPIED_FILES = ("favicon.svg", "icons.svg", "timeFabric.json", "policyUpdates.json", "intelStatus.json")


def main() -> None:
    DESTINATION.mkdir(exist_ok=True)
    for name in COPIED_FILES:
        if (SOURCE / name).exists():
            shutil.copy2(SOURCE / name, DESTINATION / name)
    document, _ = recover_json_document(SOURCE / "scrapedIntel.json")
    trimmed = mobile_intel(document)
    atomic_write_json(DESTINATION / "scrapedIntel.mobile.json", trimmed)
    print(f"mobile-public: {len(trimmed['news'])} of {len(document.get('news', []))} stories bundled")


if __name__ == "__main__":
    main()
