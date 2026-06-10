from scripts.intelligence.collectors.instagram import InstagramCollector
from scripts.intelligence.collectors.web import ArticleExtractor, ScrapyDiscoveryCollector
from scripts.intelligence.collectors.x_public import XPublicCollector


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
