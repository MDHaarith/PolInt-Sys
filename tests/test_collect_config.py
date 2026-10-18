import json
from pathlib import Path

from scripts.build_collect_config import OUTPUT, PARITY, config, parity_cases


def test_phone_collector_config_matches_the_python_rules():
    # Regenerate with: python3 scripts/build_collect_config.py
    assert json.loads(Path(OUTPUT).read_text(encoding="utf-8")) == json.loads(json.dumps(config(), ensure_ascii=False))
    assert json.loads(Path(PARITY).read_text(encoding="utf-8")) == json.loads(json.dumps(parity_cases(), ensure_ascii=False))
