from __future__ import annotations

import sys
from concurrent.futures import ThreadPoolExecutor, as_completed

from ..models import CollectedItem


class RssCollector:
    name = "rss"

    def __init__(self, jobs, fetcher, max_workers=6):
        self.jobs = jobs
        self.fetcher = fetcher
        self.max_workers = max_workers
        self.health = {"status": "ready", "failed_jobs": 0}

    def collect(self):
        def fetch_job(job):
            return list(self.fetcher(*job))

        self.health.update(status="ready", failed_jobs=0)
        with ThreadPoolExecutor(max_workers=self.max_workers) as executor:
            futures = {executor.submit(fetch_job, job): job for job in self.jobs}
            for future in as_completed(futures):
                try:
                    items = future.result()
                except Exception as exc:
                    self.health["failed_jobs"] += 1
                    self.health["status"] = "degraded"
                    query = futures[future][0]
                    print(f"[rss] {query!r}: {type(exc).__name__}: {exc}", file=sys.stderr)
                    continue
                for item in items:
                    yield CollectedItem.from_legacy(item)
