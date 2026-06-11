from __future__ import annotations

from html.parser import HTMLParser
from urllib.parse import urljoin, urlsplit
from urllib.request import Request, urlopen

from ..models import CollectedItem, now_utc_iso


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
        request = Request(url, headers={"User-Agent": "IntelligenceGraph/1.0"})
        with urlopen(request, timeout=20) as response:
            return response.read().decode("utf-8", errors="replace")

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
                absolute = urljoin(start_url, href)
                if urlsplit(absolute).hostname not in self.allowed_domains:
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
        return CollectedItem(
            canonical_url=canonical_url,
            collector="newspaper",
            source_name=source_name or urlsplit(url).hostname or "Web",
            source_type="article_extraction",
            platform=None,
            external_id=canonical_url,
            title=getattr(article, "title", "") or "",
            body=getattr(article, "text", "") or "",
            author_name=", ".join(authors) if authors else None,
            published_at=publish_date.isoformat() if publish_date else None,
            retrieved_at=now_utc_iso(),
            politician_id=None,
            category="news",
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
        for index, url in enumerate(self.discovery.discover()):
            if index >= self.max_articles:
                break
            try:
                yield self.extractor.extract(url)
            except Exception:
                failures += 1
        if failures:
            self.health["article_failures"] = failures
