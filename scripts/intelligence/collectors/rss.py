from __future__ import annotations

from ..models import CollectedItem


class RssCollector:
    name = "rss"

    def __init__(self, jobs, fetcher):
        self.jobs = jobs
        self.fetcher = fetcher
        self.health = {"status": "ready"}

    def collect(self):
        for query, politician_id, politician_name in self.jobs:
            for item in self.fetcher(query, politician_id, politician_name):
                yield CollectedItem.from_legacy(item)

