import os


PUBLIC_WEB_START_URLS = [
    "https://www.tn.gov.in/pressrelease.php",
    "https://www.assembly.tn.gov.in/",
]

PUBLIC_WEB_ALLOWED_DOMAINS = [
    "tn.gov.in",
    "www.tn.gov.in",
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

