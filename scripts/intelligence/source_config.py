import os


# Verified RSS endpoints. State-desk feeds are Tamil Nadu by construction;
# regional and national feeds also carry other states, so their items must
# mention Tamil Nadu or a tracked politician (see REGIONAL_FEED_URLS).
NEWS_RSS_FEEDS = [
    ("https://www.thehindu.com/news/national/tamil-nadu/feeder/default.rss", "The Hindu"),
    ("https://www.newindianexpress.com/api/v1/collections/tamil-nadu-states.rss?getXmlFeed=true&id=178", "The New Indian Express"),
    ("https://www.dtnext.in/feed", "DT Next"),
    ("https://thesouthfirst.com/category/tamilnadu/feed/", "The South First"),
    ("https://timesofindia.indiatimes.com/rssfeeds/2950623.cms", "Times of India"),
    ("https://www.puthiyathalaimurai.com/feed", "Puthiya Thalaimurai"),
    ("https://www.hindutamil.in/stories.rss", "Hindu Tamil Thisai"),
    ("https://feeds.bbci.co.uk/tamil/rss.xml", "BBC Tamil"),
    ("https://tamil.oneindia.com/rss/feeds/tamil-news-fb.xml", "Oneindia Tamil"),
    ("https://indianexpress.com/section/cities/chennai/feed/", "The Indian Express"),
    ("https://www.thenewsminute.com/stories.rss", "The News Minute"),
    ("https://feeds.feedburner.com/ndtvnews-south", "NDTV"),
    ("https://theprint.in/category/politics/feed/", "ThePrint"),
]

REGIONAL_FEED_URLS = {
    "https://www.hindutamil.in/stories.rss",
    "https://feeds.bbci.co.uk/tamil/rss.xml",
    "https://tamil.oneindia.com/rss/feeds/tamil-news-fb.xml",
    "https://www.thenewsminute.com/stories.rss",
    "https://feeds.feedburner.com/ndtvnews-south",
    "https://theprint.in/category/politics/feed/",
}

RECENT_NEWS_QUERIES = [
    "Tamil Nadu politics",
    "தமிழ்நாடு அரசியல்",
    "Tamil Nadu Chief Minister",
    "Tamil Nadu cabinet minister",
    "Tamil Nadu assembly",
    "தமிழக அரசு சட்டசபை",
    "Tamil Nadu government scheme",
    "Tamil Nadu corruption case",
    "Tamil Nadu MLA",
    "DMK Tamil Nadu", "திமுக ஸ்டாலின்", "AIADMK", "அதிமுக எடப்பாடி பழனிசாமி",
    "TVK Vijay politics", "தவெக விஜய் அரசியல்", "BJP Tamil Nadu", "தமிழக பாஜக",
    "NTK Seeman", "நாம் தமிழர் சீமான்", "VCK Thirumavalavan", "விசிக திருமாவளவன்",
    "PMK Ramadoss", "பாமக ராமதாஸ்", "Tamil Nadu Congress",
    "தமிழ்நாடு காங்கிரஸ்", "MDMK Vaiko", "மதிமுக வைகோ", "AMMK Dhinakaran",
    "அமமுக தினகரன்", "MNM Kamal Haasan", "மக்கள் நீதி மய்யம் கமல்ஹாசன்",
    "உதயநிதி ஸ்டாலின்", "அண்ணாமலை பாஜக", "கனிமொழி திமுக",
]


PUBLIC_WEB_START_URLS = [
    "https://www.assembly.tn.gov.in/whatsnew.php",
]

PUBLIC_WEB_ALLOWED_DOMAINS = [
    "assembly.tn.gov.in",
    "www.assembly.tn.gov.in",
]

DEFAULT_INSTAGRAM_PROFILES = [
    "dmkparty",
    "aiadmkofficial",
    "bjp4tamilnadu",
    "tvkvijayhq",
]

DEFAULT_X_QUERIES = [
    "Tamil Nadu politics",
    "Tamil Nadu assembly",
    "Tamil Nadu MLA",
    "TVK Vijay",
    "DMK",
    "AIADMK",
    "NTK Seeman",
]


def instagram_profiles():
    configured = os.getenv("INTEL_INSTAGRAM_PROFILES")
    if not configured:
        return DEFAULT_INSTAGRAM_PROFILES
    return [item.strip() for item in configured.split(",") if item.strip()]

