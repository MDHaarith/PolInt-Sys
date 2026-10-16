import sys
from datetime import datetime
from types import SimpleNamespace

from scripts.intelligence.collectors.instagram import InstagramCollector
from scripts.intelligence.collectors.web import ArticleExtractor, ScrapyDiscoveryCollector, WebArticleCollector
from scripts.intelligence.collectors.x_public import XPublicCollector
from scripts.intelligence.models import CollectedItem


def test_article_extractor_normalizes_newspaper_result():
    class FakeArticle:
        title = "Tamil Nadu protest"
        text = "A detailed report about a political protest."
        authors = ["Reporter One"]
        publish_date = None
        canonical_link = "https://example.test/canonical"
        meta_lang = "en"

        def download(self):
            return None

        def parse(self):
            return None

    extractor = ArticleExtractor(article_factory=lambda url: FakeArticle())
    item = extractor.extract("https://example.test/original", source_name="Example News")

    assert item.title == "Tamil Nadu protest"
    assert item.canonical_url == "https://example.test/canonical"
    assert item.author_name == "Reporter One"
    assert item.collector == "newspaper"


def test_scrapy_discovery_uses_injected_fetcher_without_network():
    collector = ScrapyDiscoveryCollector(
        start_urls=["https://example.test/politics"],
        page_fetcher=lambda url: """
            <html><body>
              <a href="/article-one">One</a>
              <a href="https://other.test/outside">Outside</a>
            </body></html>
        """,
        allowed_domains=["example.test"],
    )

    discovered = list(collector.discover())

    assert discovered == ["https://example.test/article-one"]


def test_scrapy_discovery_skips_failed_start_url():
    def fetcher(url):
        if "broken" in url:
            raise RuntimeError("404")
        return '<a href="/article-one">One</a>'

    collector = ScrapyDiscoveryCollector(
        start_urls=["https://broken.test/politics", "https://example.test/politics"],
        page_fetcher=fetcher,
        allowed_domains=["broken.test", "example.test"],
    )

    assert list(collector.discover()) == ["https://example.test/article-one"]
    assert collector.health["page_failures"] == 1


def test_instagram_collector_disables_cleanly_when_library_or_access_is_unavailable():
    collector = InstagramCollector(
        profiles=["public_profile"],
        loader_factory=lambda: (_ for _ in ()).throw(RuntimeError("login required")),
    )

    assert list(collector.collect()) == []
    assert collector.health["status"] == "unavailable"


def test_x_collector_disables_cleanly_without_anonymous_client():
    collector = XPublicCollector(
        queries=["Tamil Nadu politics"],
        client_factory=lambda: (_ for _ in ()).throw(RuntimeError("authentication required")),
    )

    assert list(collector.collect()) == []
    assert collector.health["status"] == "unavailable"
    assert collector.health["collection_failures"] == 1


def test_discovery_filters_navigation_schemes_and_exact_hosts():
    skipped = [
        "mailto:reader@example.test", "javascript:void(0)", "tel:1234",
        "ftp://example.test/article", "/", "/#header", "/login", "/signin",
        "/register", "/search?q=politics", "/tag/politics", "/category/news",
        "/politics/page/2", "/sitemap.xml", "/contact", "/about/", "/rss", "/feed/",
        "https://example.test.evil.test/article", "https://sub.example.test/article",
    ]
    links = skipped + ["/story#first", "/story#second", "/politics/first-election", "/about-face-in-politics"]
    collector = ScrapyDiscoveryCollector(
        ["https://example.test/politics"], ["example.test"],
        page_fetcher=lambda url: "".join(f'<a href="{link}">Link</a>' for link in links),
    )

    assert list(collector.discover()) == [
        "https://example.test/story", "https://example.test/politics/first-election",
        "https://example.test/about-face-in-politics",
    ]


def test_web_articles_count_successes_skip_non_html_and_attribute(capsys):
    attempted = []
    urls = [f"https://example.test/file{extension}?download=1" for extension in (
        ".PDF", ".jpg", ".jpeg", ".png", ".gif", ".zip", ".doc", ".docx", ".xls", ".xlsx", ".mp4",
    )] + [f"https://example.test/{name}" for name in ("broken", "one", "two", "unused")]

    def extract(url):
        attempted.append(url)
        if url.endswith("broken"):
            raise ValueError("no article")
        return CollectedItem.from_legacy({
            "url": url, "title": "New schemes announced", "snippet": "Stalin discusses welfare",
            "politicianId": "explicit" if url.endswith("two") else None,
        })

    collector = WebArticleCollector(
        SimpleNamespace(discover=lambda: iter(urls)), SimpleNamespace(extract=extract), max_articles=2,
    )
    items = list(collector.collect())

    assert len(items) == 2
    assert [item.politician_id for item in items] == ["mk_stalin", "explicit"]
    assert all(item.category == "policy" for item in items)
    assert attempted == urls[-4:-1]
    assert collector.health["skipped_non_html"] == 11
    assert collector.health["article_failures"] == 1
    assert collector.health["last_error"] == "ValueError: no article"
    assert collector.health["status"] == "degraded"
    assert "[web:article]" in capsys.readouterr().err


def test_web_article_attempts_are_bounded():
    attempted = []

    def extract(url):
        attempted.append(url)
        raise ValueError("no article")

    collector = WebArticleCollector(
        SimpleNamespace(discover=lambda: (f"https://example.test/{i}" for i in range(20))),
        SimpleNamespace(extract=extract), max_articles=2,
    )

    assert list(collector.collect()) == []
    assert len(attempted) == 6
    assert collector.health["article_failures"] == 6


def test_article_extractor_classifies_and_resolves_politician():
    article = SimpleNamespace(
        title="Elections announced", text="Stalin discusses the schedule",
        download=lambda: None, parse=lambda: None,
    )

    item = ArticleExtractor(article_factory=lambda url: article).extract("https://example.test/story")

    assert item.politician_id == "mk_stalin"
    assert item.category == "election"


def test_instagram_profile_failure_keeps_partial_posts_and_continues(monkeypatch, capsys):
    def posts():
        yield SimpleNamespace(shortcode="one", caption="Public post", date_utc=datetime(2026, 6, 10))
        raise RuntimeError("public access blocked")

    def profile(context, name):
        return SimpleNamespace(get_posts=posts if name == "partial" else lambda: iter([
            SimpleNamespace(shortcode="two", caption="Another post", date_utc=datetime(2026, 6, 11)),
        ]))

    monkeypatch.setitem(sys.modules, "instaloader", SimpleNamespace(
        Profile=SimpleNamespace(from_username=profile),
    ))
    collector = InstagramCollector(["partial", "working"], loader_factory=lambda: SimpleNamespace(context=None))

    assert [item.external_id for item in collector.collect()] == ["one", "two"]
    assert collector.health["profile_failures"] == 1
    assert collector.health["status"] == "degraded"
    assert "RuntimeError: public access blocked" in capsys.readouterr().err


def test_x_query_failure_preserves_posts_and_continues(capsys):
    class Client:
        async def search_tweet(self, query, mode, count):
            if query == "broken":
                raise RuntimeError("public access blocked")
            return [SimpleNamespace(id=query, text="Public post", user=SimpleNamespace(screen_name="public"))]

    collector = XPublicCollector(["one", "broken", "two"], client_factory=Client)

    assert [item.external_id for item in collector.collect()] == ["one", "two"]
    assert collector.health["query_failures"] == 1
    assert collector.health["status"] == "degraded"
    assert "RuntimeError: public access blocked" in capsys.readouterr().err
