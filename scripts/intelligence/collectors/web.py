from __future__ import annotations

import re
import sys
from html.parser import HTMLParser
from urllib.parse import urldefrag, urljoin, urlsplit

from ..classify import classify_category
from ..models import CollectedItem, now_utc_iso
from ..people import resolve_politician


_NAVIGATION_PATH = re.compile(
    r"(?:^|/)(?:login|signin|register|search|tag|category|page|sitemap|contact|about|rss|feed)"
    r"(?:/|\.|$)",
    re.IGNORECASE,
)
_NON_HTML_EXTENSIONS = (
    ".pdf", ".jpg", ".jpeg", ".png", ".gif", ".zip", ".doc", ".docx",
    ".xls", ".xlsx", ".mp4",
)


class _LinkParser(HTMLParser):
    def __init__(self):
        super().__init__()
        self.links = []

    def handle_starttag(self, tag, attrs):
        if tag.lower() != "a":
            return
        href = dict(attrs).get("href")
        if href:
            self.links.append(href)


class ScrapyDiscoveryCollector:
    name = "scrapy"

    def __init__(self, start_urls, allowed_domains, page_fetcher=None):
        self.start_urls = start_urls
        self.allowed_domains = set(allowed_domains)
        self.page_fetcher = page_fetcher or self._fetch
        self.health = {"status": "ready", "engine": "scrapy-compatible"}

    @staticmethod
    def _fetch(url):
        from ...scrape_political_intel import http_get

        return http_get(url, headers={"User-Agent": "IntelligenceGraph/1.0"}, timeout=20).decode(
            "utf-8", errors="replace"
        )

    def _links(self, html):
        try:
            from scrapy import Selector

            return Selector(text=html).css("a::attr(href)").getall()
        except ImportError:
            parser = _LinkParser()
            parser.feed(html)
            return parser.links

    def discover(self):
        seen = set()
        for start_url in self.start_urls:
            try:
                html = self.page_fetcher(start_url)
            except Exception as exc:
                print(f"[web:discovery] {start_url!r}: {type(exc).__name__}: {exc}", file=sys.stderr)
                failures = self.health.setdefault("pageFailures", [])
                failures.append(
                    {
                        "url": start_url,
                        "errorType": type(exc).__name__,
                        "message": str(exc),
                    }
                )
                self.health["page_failures"] = len(failures)
                self.health["status"] = "degraded"
                continue
            for href in self._links(html):
                absolute, _ = urldefrag(urljoin(start_url, href))
                parsed = urlsplit(absolute)
                if parsed.scheme not in ("http", "https"):
                    continue
                if parsed.hostname not in self.allowed_domains:
                    continue
                if parsed.path in ("", "/") or _NAVIGATION_PATH.search(parsed.path):
                    continue
                if absolute in seen:
                    continue
                seen.add(absolute)
                yield absolute

    def collect(self):
        for url in self.discover():
            yield CollectedItem(
                canonical_url=url,
                collector="scrapy",
                source_name=urlsplit(url).hostname or "Web",
                source_type="web_discovery",
                platform=None,
                external_id=url,
                title=url,
                body="",
                author_name=None,
                published_at=None,
                retrieved_at=now_utc_iso(),
                politician_id=None,
                category="news",
                verification_status="discovered",
                raw_metadata={"discoveredUrl": url},
            )


class ArticleExtractor:
    def __init__(self, article_factory=None):
        self.article_factory = article_factory

    def extract(self, url, source_name=None):
        if self.article_factory:
            article = self.article_factory(url)
        else:
            from newspaper import Article

            article = Article(url)
        article.download()
        article.parse()
        canonical_url = getattr(article, "canonical_link", None) or url
        authors = getattr(article, "authors", None) or []
        publish_date = getattr(article, "publish_date", None)
        title = getattr(article, "title", "") or ""
        body = getattr(article, "text", "") or ""
        return CollectedItem(
            canonical_url=canonical_url,
            collector="newspaper",
            source_name=source_name or urlsplit(url).hostname or "Web",
            source_type="article_extraction",
            platform=None,
            external_id=canonical_url,
            title=title,
            body=body,
            author_name=", ".join(authors) if authors else None,
            published_at=publish_date.isoformat() if publish_date else None,
            retrieved_at=now_utc_iso(),
            politician_id=resolve_politician(f"{title} {body[:2000]}"),
            category=classify_category(title + " " + body[:500]),
            verification_status="source_reported",
            raw_metadata={"originalUrl": url},
            language=getattr(article, "meta_lang", None),
        )


class WebArticleCollector:
    name = "scrapy_newspaper"

    def __init__(self, discovery, extractor, max_articles=25):
        self.discovery = discovery
        self.extractor = extractor
        self.max_articles = max_articles
        self.health = {
            "status": "ready",
            "discovery": "scrapy",
            "extraction": "newspaper",
        }

    def collect(self):
        failures = 0
        attempts = 0
        successes = 0
        for url in self.discovery.discover():
            if successes >= self.max_articles or attempts >= self.max_articles * 3:
                break
            if urlsplit(url).path.lower().endswith(_NON_HTML_EXTENSIONS):
                self.health["skipped_non_html"] = self.health.get("skipped_non_html", 0) + 1
                continue
            attempts += 1
            try:
                item = self.extractor.extract(url)
            except Exception as exc:
                print(f"[web:article] {url!r}: {type(exc).__name__}: {exc}", file=sys.stderr)
                failures += 1
                self.health["article_failures"] = failures
                self.health["last_error"] = f"{type(exc).__name__}: {exc}"
                self.health["status"] = "degraded"
                continue
            if item.politician_id is None:
                item.politician_id = resolve_politician(f"{item.title} {item.body[:2000]}")
            item.category = classify_category(item.title + " " + item.body[:500])
            successes += 1
            yield item
