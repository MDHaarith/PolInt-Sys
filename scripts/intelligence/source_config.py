import os


# Verified RSS endpoints; broad Tamil Nadu feeds also cover regional policy news.
NEWS_RSS_FEEDS = [
    ("https://www.thehindu.com/news/national/tamil-nadu/feeder/default.rss", "The Hindu"),
    ("https://www.dtnext.in/feed", "DT Next"),
    ("https://www.puthiyathalaimurai.com/feed", "Puthiya Thalaimurai"),
    ("https://timesofindia.indiatimes.com/rssfeeds/2950623.cms", "Times of India"),
]

RECENT_NEWS_QUERIES = [
    "Tamil Nadu politics",
    "தமிழ்நாடு அரசியல்",
    "Tamil Nadu government cabinet assembly",
    "தமிழக அரசு சட்டசபை",
    "Tamil Nadu policy welfare corruption",
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

