from __future__ import annotations

from ..models import CollectedItem


class BlueskyCollector:
    name = "bluesky"

    def __init__(self, jobs, fetcher, limit=15):
        self.jobs = jobs
        self.fetcher = fetcher
        self.limit = limit
        self.health = {"status": "ready"}

    def collect(self):
        for query, politician_id, politician_name in self.jobs:
            for item in self.fetcher(query, politician_id, politician_name, self.limit):
                yield CollectedItem.from_legacy(item)

