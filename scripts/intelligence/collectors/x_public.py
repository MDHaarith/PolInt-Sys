from __future__ import annotations

import asyncio

from ..models import CollectedItem, now_utc_iso


class XPublicCollector:
    name = "x_public"

    def __init__(self, queries, client_factory=None, limit_per_query=20):
        self.queries = queries
        self.client_factory = client_factory
        self.limit_per_query = limit_per_query
        self.health = {"status": "ready", "mode": "anonymous_public_only"}

    def _client(self):
        if self.client_factory:
            return self.client_factory()
        from twikit import Client

        return Client("en-US")

    async def _collect_async(self):
        client = self._client()
        items = []
        for query in self.queries:
            tweets = await client.search_tweet(query, "Latest", count=self.limit_per_query)
            for tweet in tweets:
                user = getattr(tweet, "user", None)
                handle = getattr(user, "screen_name", None) or getattr(user, "name", "unknown")
                tweet_id = str(getattr(tweet, "id", ""))
                text = getattr(tweet, "text", "") or ""
                items.append(
                    CollectedItem(
                        canonical_url=f"https://x.com/{handle}/status/{tweet_id}",
                        collector="twikit",
                        source_name=f"X @{handle}",
                        source_type="x_public",
                        platform="x",
                        external_id=tweet_id,
                        title=text[:180],
                        body=text,
                        author_name=handle,
                        published_at=str(getattr(tweet, "created_at", "") or ""),
                        retrieved_at=now_utc_iso(),
                        politician_id=None,
                        category="social_media",
                        verification_status="unverified_chatter",
                        raw_metadata={},
                    )
                )
        return items

    def collect(self):
        try:
            items = asyncio.run(self._collect_async())
        except Exception as exc:
            self.health = {
                "status": "unavailable",
                "mode": "anonymous_public_only",
                "reason": str(exc),
            }
            return
        yield from items
