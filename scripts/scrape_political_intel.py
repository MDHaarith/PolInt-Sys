#!/usr/bin/env python3
"""
Massive Tamil Nadu Political Intelligence Scraper
Fetches thousands of articles from Google News RSS across hundreds of query
variations covering every politician, scandal, party event, and topic.
"""
import os
import json
import urllib.request
import urllib.parse
import xml.etree.ElementTree as ET
import re
import time
import random
import argparse
from datetime import datetime, timezone
import hashlib
import sys
import threading
from concurrent.futures import ThreadPoolExecutor, as_completed

# ─────────────────────────────────────────────────────────────────────
# CONFIGURATION: Politicians + Search Query Expansion
# ─────────────────────────────────────────────────────────────────────

POLITICIANS = {
    "mk_stalin": {
        "name": "M. K. Stalin",
        "queries": [
            "M.K. Stalin Tamil Nadu",
            "M.K. Stalin Chief Minister",
            "Stalin DMK party",
            "Stalin corruption allegations",
            "Stalin welfare scheme",
            "Stalin free bus women",
            "M.K. Stalin Kolathur constituency",
            "M.K. Stalin assembly speech",
            "Stalin DMK alliance 2026",
            "M.K. Stalin Udhayanidhi",
            "Stalin DMK dynasty politics",
            "Stalin Karunanidhi family",
            "M.K. Stalin MISA arrest emergency",
            "Stalin Mayor Chennai",
            "M.K. Stalin Deputy CM 2009",
            "Stalin Opposition Leader Tamil Nadu",
            "DMK government performance 2026",
            "DMK government corruption 2026",
            "M.K. Stalin election campaign 2026",
            "Stalin vs Annamalai debate",
            "M.K. Stalin interview latest",
            "Stalin DMK cabinet reshuffle",
            "M.K. Stalin foreign visits",
            "Stalin Pudhumai Penn scheme",
            "Stalin Makkalai Thedi Maruthuvam",
            "M.K. Stalin NEET opposition",
            "Stalin Dravidian model governance",
            "DMK Stalin policy announcement",
            "M.K. Stalin press conference latest",
            "Stalin birthday celebration",
        ],
    },
    "j_jayalalithaa": {
        "name": "J. Jayalalithaa",
        "queries": [
            "Jayalalithaa wealth case verdict",
            "Jayalalithaa disproportionate assets",
            "Jayalalithaa death mystery",
            "Jayalalithaa Apollo Hospital",
            "Jayalalithaa AIADMK legacy",
            "Amma canteen scheme",
            "Jayalalithaa Poes Garden",
            "Jayalalithaa Sasikala relationship",
            "Jayalalithaa MGR mentorship",
            "Jayalalithaa arrested 1996",
            "Jayalalithaa midnight arrest Karunanidhi",
            "Jayalalithaa Sudhakaran wedding",
            "Jayalalithaa TANSI land case",
            "Jayalalithaa conviction Bengaluru",
            "Jayalalithaa cradle baby scheme",
            "Jayalalithaa rainwater harvesting",
            "Jayalalithaa funeral Marina beach",
            "Jayalalithaa biopic movie",
            "Jayalalithaa memorial RK Nagar",
            "AIADMK Jayalalithaa death anniversary",
        ],
    },
    "m_karunanidhi": {
        "name": "M. Karunanidhi",
        "queries": [
            "Karunanidhi DMK founder",
            "Karunanidhi midnight arrest 2001",
            "Karunanidhi Sarkaria Commission",
            "Karunanidhi death legacy",
            "Karunanidhi 108 ambulance scheme",
            "Karunanidhi IT corridor Chennai",
            "Karunanidhi anti-Hindi agitation",
            "Karunanidhi literary works Kalaignar",
            "Karunanidhi family dynasty DMK",
            "Karunanidhi Alagiri Stalin rivalry",
            "Karunanidhi memorial",
            "Karunanidhi Dravidian movement",
            "Kalaignar TV controversy",
            "Karunanidhi Sri Lanka Tamil crisis",
            "Karunanidhi flyover scam",
        ],
    },
    "m_g_ramachandran": {
        "name": "M. G. Ramachandran",
        "queries": [
            "MGR AIADMK founder",
            "MGR Chief Minister Tamil Nadu",
            "MGR midday meal scheme",
            "MGR death 1987 aftermath",
            "MGR DMK split 1972",
            "MGR film career politics",
            "MGR LTTE secret funding",
            "MGR Janaki Ramachandran succession",
            "MGR memorial anniversary",
            "MGR legacy AIADMK party",
        ],
    },
    "edappadi_palaniswami": {
        "name": "Edappadi K. Palaniswami",
        "queries": [
            "Edappadi Palaniswami AIADMK",
            "Edappadi Palaniswami CM Tamil Nadu",
            "Edappadi Palaniswami Kodanad case",
            "EPS NEET reservation 7.5%",
            "Edappadi Palaniswami highway scam",
            "EPS vs OPS leadership fight",
            "Edappadi Palaniswami Tuticorin firing",
            "Edappadi Palaniswami Sterlite protest",
            "EPS AIADMK general secretary",
            "Edappadi Palaniswami election 2026",
            "Edappadi Palaniswami interview latest",
            "EPS trust vote assembly 2017",
            "EPS Athikadavu Avinashi scheme",
            "EPS Salem expressway controversy",
            "Edappadi Palaniswami BJP alliance",
            "Edappadi Palaniswami NDA alliance 2026",
            "EPS campaign rally latest",
            "Edappadi Palaniswami press conference",
            "EPS AIADMK party meeting",
            "EPS corruption charges latest",
        ],
    },
    "v_k_sasikala": {
        "name": "V. K. Sasikala",
        "queries": [
            "Sasikala Jayalalithaa aide",
            "Sasikala conviction wealth case",
            "Sasikala Parappana Agrahara jail",
            "Sasikala AIADMK takeover attempt",
            "Sasikala Koovathur resort MLA lockup",
            "Sasikala expelled AIADMK",
            "Sasikala shell companies raid",
            "Sasikala Kodanad estate mystery",
            "Sasikala released from prison 2021",
            "Sasikala political comeback latest",
            "Sasikala Mannargudi mafia",
            "Sasikala family properties seized",
            "Sasikala OPS rebellion",
            "Sasikala nephew Sudhakaran wedding",
            "Sasikala Poes Garden politics",
        ],
    },
    "k_annamalai": {
        "name": "K. Annamalai",
        "queries": [
            "Annamalai BJP Tamil Nadu",
            "Annamalai DMK files corruption",
            "Annamalai IPS police career",
            "Annamalai padayatra yatra",
            "Annamalai AIADMK alliance breakdown",
            "Annamalai vs Stalin debate",
            "Annamalai BJP election 2026",
            "Annamalai press conference latest",
            "Annamalai defamation cases",
            "Annamalai BJP vote share Tamil Nadu",
            "Annamalai interview latest",
            "Annamalai rally speech",
            "Annamalai BJP manifesto Tamil Nadu",
            "Annamalai Modi Tamil Nadu visit",
            "Annamalai social media controversy",
            "K. Annamalai BJP campaign strategy",
            "Annamalai Lok Sabha results analysis",
            "Annamalai BJP Tamil Nadu growth",
            "Annamalai Karnataka police background",
            "Annamalai BJP southern strategy",
        ],
    },
    "seeman": {
        "name": "Seeman",
        "queries": [
            "Seeman Naam Tamilar Katchi",
            "Seeman sedition LTTE speech",
            "Seeman NTK election results",
            "Seeman women 50% reservation NTK",
            "Seeman anti-methane protest",
            "Seeman NSA arrest",
            "Seeman Kudankulam nuclear protest",
            "Seeman filmmaker director career",
            "Seeman NTK rally latest",
            "Seeman Tamil nationalism speech",
            "Seeman Eelam Tamil cause",
            "Seeman NTK 2026 election",
            "Seeman press meet latest",
            "Seeman environmental campaign delta",
            "Seeman xenophobia migrant controversy",
        ],
    },
    "vijay": {
        "name": "Vijay",
        "queries": [
            "Vijay TVK political party",
            "Vijay Tamilaga Vettri Kazhagam",
            "Vijay political entry 2024",
            "Vijay TVK Vikravandi conference",
            "Vijay TVK election 2026",
            "Vijay actor politics Tamil Nadu",
            "Vijay TVK party manifesto",
            "Vijay TVK alliance talks",
            "Vijay fan club politics",
            "Vijay TVK office bearers",
            "Vijay political speech rally",
            "Vijay TVK booth workers",
            "Vijay SA Chandrasekhar lawsuit",
            "Vijay TVK seat allocation 2026",
            "Vijay politics latest news",
            "Vijay TVK organizational structure",
            "Vijay GOAT movie political",
            "TVK party registration ECI",
            "Vijay TVK social media campaign",
            "Vijay TVK Tamil Nadu polls",
        ],
    },
    "o_panneerselvam": {
        "name": "O. Panneerselvam",
        "queries": [
            "O. Panneerselvam OPS AIADMK",
            "OPS rebel Jayalalithaa memorial",
            "OPS expelled AIADMK 2022",
            "OPS vs EPS leadership fight",
            "OPS interim CM 2017",
            "Panneerselvam Bodinayakkanur constituency",
            "OPS Dharma Yudhham protest",
            "OPS Supreme Court AIADMK case",
            "OPS political future latest",
            "OPS Sasikala confrontation",
        ],
    },
    "thol_thirumavalavan": {
        "name": "Thol. Thirumavalavan",
        "queries": [
            "Thirumavalavan VCK party",
            "Thirumavalavan Dalit rights Tamil Nadu",
            "Thirumavalavan DMK alliance",
            "VCK election performance",
            "Thirumavalavan caste violence protest",
            "Thirumavalavan Panchami land struggle",
            "Thirumavalavan Parliament speech",
            "VCK party Chidambaram constituency",
            "Thirumavalavan interview latest",
            "VCK Dalit Panthers movement",
        ],
    },
    "s_ramadoss": {
        "name": "S. Ramadoss",
        "queries": [
            "Ramadoss PMK party",
            "Ramadoss Vanniyar reservation agitation",
            "PMK alliance BJP NDA",
            "Ramadoss alcohol prohibition Tamil Nadu",
            "Ramadoss medical doctor politician",
            "PMK Anbumani Ramadoss",
            "Ramadoss caste riots Marakkanam",
            "PMK BJP alliance 2026",
            "Ramadoss press statement latest",
            "PMK internal reservation demand",
        ],
    },
    "vaiko": {
        "name": "Vaiko",
        "queries": [
            "Vaiko MDMK party",
            "Vaiko POTA arrest LTTE",
            "Vaiko sedition conviction",
            "Vaiko Sri Lanka Tamil protest",
            "Vaiko DMK expelled 1994",
            "Vaiko Rajya Sabha speech",
            "Vaiko MDMK DMK alliance",
            "Vaiko prohibition campaign",
            "Vaiko political career latest",
            "Vaiko MDMK election 2026",
        ],
    },
    "k_kamaraj": {
        "name": "K. Kamaraj",
        "queries": [
            "Kamaraj Chief Minister Tamil Nadu",
            "Kamaraj kingmaker Indian politics",
            "Kamaraj midday meal education scheme",
            "Kamaraj Congress leader legacy",
            "Kamaraj Kamaraj Plan resignation",
            "Kamaraj dam irrigation projects",
            "Kamaraj memorial anniversary",
            "Kamaraj Nehru relationship",
        ],
    },
    "c_rajagopalachari": {
        "name": "C. Rajagopalachari",
        "queries": [
            "Rajagopalachari Governor General India",
            "Rajaji Swatantra Party",
            "Rajagopalachari Kula Kalvi Thittam",
            "Rajaji temple entry Dalits",
            "Rajagopalachari Madras Presidency CM",
        ],
    },
    # ── NEW MLAs & POLITICIANS ──
    "udhayanidhi_stalin": {
        "name": "Udhayanidhi Stalin",
        "queries": [
            "Udhayanidhi Stalin Deputy CM",
            "Udhayanidhi Stalin tweet Twitter",
            "Udhayanidhi Stalin youth welfare minister",
            "Udhayanidhi Stalin DMK dynasty",
            "Udhayanidhi Stalin Chepauk constituency",
            "Udhayanidhi Stalin actor politics",
            "Udhayanidhi Stalin controversy latest",
            "Udhayanidhi Stalin Sanatana statement",
            "Udhayanidhi Stalin X post latest",
            "Udhayanidhi Stalin speech rally",
        ],
    },
    "senthil_balaji": {
        "name": "Senthil Balaji",
        "queries": [
            "Senthil Balaji arrested ED PMLA",
            "Senthil Balaji Karur MLA",
            "Senthil Balaji money laundering case",
            "Senthil Balaji Supreme Court bail",
            "Senthil Balaji DMK minister arrested",
            "Senthil Balaji transport scam",
            "Senthil Balaji AIADMK DMK party shift",
            "Senthil Balaji latest court hearing",
            "Senthil Balaji tweet X social media",
        ],
    },
    "k_ponmudy": {
        "name": "K. Ponmudy",
        "queries": [
            "Ponmudy convicted disproportionate assets",
            "Ponmudy higher education minister",
            "Ponmudy Thirukkovilur MLA DMK",
            "Ponmudy Supreme Court conviction",
            "Ponmudy DMK corruption case latest",
        ],
    },
    "duraimurugan": {
        "name": "Duraimurugan",
        "queries": [
            "Duraimurugan DMK senior leader",
            "Duraimurugan water resources minister",
            "Duraimurugan Katpadi constituency",
            "Duraimurugan DMK party elder",
            "Duraimurugan son controversy",
        ],
    },
    "a_raja": {
        "name": "A. Raja",
        "queries": [
            "A. Raja 2G spectrum scam",
            "A. Raja DMK telecom minister",
            "A. Raja acquitted 2G case",
            "A. Raja Nilgiris MP",
            "A. Raja trial verdict CBI",
            "A. Raja tweet social media X",
        ],
    },
    "kanimozhi": {
        "name": "Kanimozhi",
        "queries": [
            "Kanimozhi DMK MP Thoothukudi",
            "Kanimozhi 2G scam case acquitted",
            "Kanimozhi women empowerment DMK",
            "Kanimozhi Karunanidhi daughter",
            "Kanimozhi tweet X social media latest",
            "Kanimozhi Tamil language advocacy",
        ],
    },
    "m_k_alagiri": {
        "name": "M.K. Alagiri",
        "queries": [
            "Alagiri DMK expelled Madurai",
            "Alagiri Kiruttinan murder case",
            "Alagiri Stalin rivalry DMK",
            "Alagiri Karunanidhi son family feud",
            "M.K. Alagiri political comeback",
        ],
    },
    "sp_velumani": {
        "name": "S.P. Velumani",
        "queries": [
            "S.P. Velumani corruption case CBI",
            "Velumani AIADMK Thondamuthur MLA",
            "Velumani municipal administration scam",
            "Velumani contractor kickback allegations",
            "SP Velumani disproportionate assets raid",
        ],
    },
    "ttv_dhinakaran": {
        "name": "T.T.V. Dhinakaran",
        "queries": [
            "TTV Dhinakaran AMMK party",
            "Dhinakaran Sasikala nephew AIADMK",
            "TTV Dhinakaran RK Nagar by-election",
            "Dhinakaran ECI bribery case",
            "TTV Dhinakaran party latest news",
            "TTV Dhinakaran tweet X social media",
        ],
    },
    "kamal_haasan": {
        "name": "Kamal Haasan",
        "queries": [
            "Kamal Haasan MNM party politics",
            "Kamal Haasan Makkal Needhi Maiam",
            "Kamal Haasan election Tamil Nadu",
            "Kamal Haasan political speech latest",
            "Kamal Haasan tweet X social media",
            "Kamal Haasan BJP DMK criticism",
            "Kamal Haasan Coimbatore constituency",
        ],
    },
    "cn_annadurai": {
        "name": "C.N. Annadurai",
        "queries": [
            "C.N. Annadurai DMK founder",
            "Annadurai first Dravidian Chief Minister",
            "Annadurai Madras renamed Tamil Nadu",
            "Annadurai Anna legacy history",
            "Annadurai Periyar Dravidar Kazhagam split",
        ],
    },
    "periyar": {
        "name": "Periyar E.V. Ramasamy",
        "queries": [
            "Periyar Dravidar Kazhagam founder",
            "Periyar self-respect movement Tamil Nadu",
            "Periyar anti-caste rationalism",
            "Periyar legacy controversy BJP",
            "Periyar statue debate latest",
        ],
    },
    "anbumani_ramadoss": {
        "name": "Anbumani Ramadoss",
        "queries": [
            "Anbumani Ramadoss PMK Dharmapuri MP",
            "Anbumani Ramadoss health minister India",
            "Anbumani Ramadoss smoking ban public places",
            "Anbumani PMK youth wing Vanniyar",
            "Anbumani Ramadoss tweet X social media",
        ],
    },
    "palanivel_thiaga_rajan": {
        "name": "Palanivel Thiaga Rajan",
        "queries": [
            "PTR Palanivel Thiaga Rajan Madurai",
            "PTR finance minister removed DMK",
            "PTR IT minister Tamil Nadu",
            "PTR Goldman Sachs background politics",
            "PTR tweet X controversial social media",
            "PTR transparency governance DMK",
        ],
    },
    "kn_nehru": {
        "name": "K.N. Nehru",
        "queries": [
            "K.N. Nehru DMK Trichy",
            "K.N. Nehru Municipal Administration Minister",
            "KN Nehru smart city Trichy",
            "K.N. Nehru urban development Tamil Nadu",
        ],
    },
    "ma_subramanian": {
        "name": "Ma. Subramanian",
        "queries": [
            "Ma Subramanian health minister Tamil Nadu",
            "Ma Subramanian COVID response DMK",
            "Ma Subramanian Saidapet MLA",
            "Ma Subramanian healthcare policy latest",
        ],
    },
    "ev_velu": {
        "name": "E.V. Velu",
        "queries": [
            "E.V. Velu highways minister Tamil Nadu",
            "EV Velu Thiruvallur MLA DMK",
            "EV Velu road infrastructure projects",
            "EV Velu corruption allegations highway",
        ],
    },
    "cv_shanmugam": {
        "name": "C. Ve. Shanmugam",
        "queries": [
            "C Ve Shanmugam AIADMK Villupuram",
            "Shanmugam law minister Tamil Nadu",
            "C Ve Shanmugam BJP AIADMK alliance",
            "Shanmugam Vanniyar politics AIADMK",
        ],
    },
    "tr_baalu": {
        "name": "T.R. Baalu",
        "queries": [
            "T.R. Baalu DMK shipping minister",
            "TR Baalu union minister highways",
            "TR Baalu DMK veteran leader",
            "TR Baalu Sriperumbudur MP DMK",
        ],
    },
}

# Broad topic queries — with heavy X/Twitter focus
TOPIC_QUERIES = [
    # ── X / Twitter Social Media Intelligence ──
    "Tamil Nadu politician tweet X controversy",
    "DMK leader tweet Twitter latest",
    "AIADMK leader social media post X",
    "Udhayanidhi Stalin tweet viral X",
    "Annamalai BJP tweet X Tamil Nadu",
    "Seeman NTK tweet X controversial",
    "Vijay TVK social media X post",
    "Tamil Nadu MLA tweet deleted controversy",
    "Tamil Nadu politics X Twitter war",
    "DMK IT wing social media troll army",
    "BJP Tamil Nadu IT cell Twitter",
    "Tamil Nadu political meme war X Twitter",
    "Stalin tweet X official latest",
    "Edappadi Palaniswami tweet X AIADMK",
    "Tamil Nadu minister social media statement",
    "Kamal Haasan tweet X MNM latest",
    "PTR Palanivel Thiaga Rajan tweet X controversy",
    "Tamil Nadu politician social media trolling",
    "DMK AIADMK social media fight X",
    "Tamil Nadu election 2026 Twitter campaign",
    "Kanimozhi tweet X DMK women",
    "Senthil Balaji supporters tweet X free",
    "Thirumavalavan VCK tweet X Dalit rights",
    "Vaiko MDMK tweet X Tamil Eelam",
    "TTV Dhinakaran tweet X AMMK",
    # ── Election 2026 coverage ──
    "Tamil Nadu election 2026 latest",
    "Tamil Nadu assembly election 2026 candidates",
    "Tamil Nadu election 2026 alliance",
    "Tamil Nadu election 2026 opinion poll",
    "Tamil Nadu election 2026 DMK",
    "Tamil Nadu election 2026 AIADMK",
    "Tamil Nadu election 2026 BJP",
    "Tamil Nadu election 2026 TVK Vijay",
    "Tamil Nadu election 2026 NTK Seeman",
    "Tamil Nadu election 2026 campaign rally",
    "Tamil Nadu election 2026 manifesto",
    "Tamil Nadu election 2026 seat prediction",
    # ── Party-level ──
    "DMK party Tamil Nadu news",
    "AIADMK party Tamil Nadu news",
    "BJP Tamil Nadu latest news",
    "NTK Naam Tamilar party news",
    "TVK Tamilaga Vettri Kazhagam news",
    "VCK party Tamil Nadu Dalit",
    "PMK party Tamil Nadu Vanniyar",
    "MDMK party Tamil Nadu news",
    "Congress Tamil Nadu INC news",
    "AMMK TTV Dhinakaran party news",
    "MNM Kamal Haasan party news",
    "DMK AIADMK rivalry latest",
    # ── Scandal & corruption coverage ──
    "Tamil Nadu politician corruption case",
    "Tamil Nadu minister arrested",
    "Tamil Nadu political scandal latest",
    "Tamil Nadu MLA assets wealth case",
    "Tamil Nadu politician criminal case FIR",
    "Tamil Nadu liquor scam TASMAC",
    "Tamil Nadu sand mining illegal",
    "Tamil Nadu hawala scandal",
    "Tamil Nadu government scam latest 2026",
    "Tamil Nadu government scam June 2026",
    "Tamil Nadu politician dynastic succession",
    "Tamil Nadu freebies election scheme",
    "Senthil Balaji ED PMLA arrested",
    "Ponmudy convicted disproportionate assets",
    "SP Velumani CBI corruption probe",
    "2G spectrum scam A Raja DMK acquitted",
    # ── Policy & governance ──
    "Tamil Nadu welfare scheme latest",
    "Tamil Nadu NEET examination controversy",
    "Tamil Nadu caste violence latest",
    "Tamil Nadu farmers protest",
    "Tamil Nadu environmental protest Sterlite",
    "Tamil Nadu Cauvery water dispute",
    "Tamil Nadu education policy latest",
    "Tamil Nadu healthcare policy",
    "Tamil Nadu budget 2026 analysis",
    "Tamil Nadu jobs unemployment crisis",
    "Tamil Nadu IT industry growth",
    "Tamil Nadu infrastructure development",
    # ── Historical & investigative ──
    "Dravidian movement Tamil Nadu history",
    "Anti-Hindi agitation Tamil Nadu 1965",
    "Periyar Dravidar Kazhagam legacy",
    "Rajiv Gandhi assassination Sriperumbudur",
    "LTTE Sri Lanka Tamil Nadu connection",
    "Sterlite Tuticorin firing CBI probe",
    "Kodanad estate mystery murder",
    "Tamil Nadu governor controversy",
    "DMK 2G spectrum scam Tamil Nadu",
    "Granite mining scam Tamil Nadu",
    "Tamil Nadu police encounter politics",
    # ── MLA specific queries ──
    "Tamil Nadu MLA criminal record 2026",
    "Tamil Nadu MLA assets declaration 2026",
    "Tamil Nadu MLA constituency development 2026",
    "Tamil Nadu MLA attendance assembly 2026",
    "Tamil Nadu MLA party switch defection 2026",
    "Tamil Nadu MLA arrested latest 2026",
    # ── June 2026 Fresh Queries ──
    "Tamil Nadu election results 2026 June",
    "Tamil Nadu 17th assembly MLAs 2026",
    "Tamil Nadu new government June 2026",
    "Vijay Chief Minister Tamil Nadu 2026",
    "TVK government formation June 2026",
    "Tamil Nadu new cabinet ministers 2026",
    "Tamil Nadu assembly session June 2026",
    "Tamil Nadu MLA list 2026 all constituencies",
    "Tamil Nadu election winners 2026 party wise",
    "DMK election loss 2026",
    "AIADMK election results 2026",
    "BJP Tamil Nadu seats won 2026",
    "NTK seats won 2026 Tamil Nadu",
    "Tamil Nadu opposition leader 2026",
    "Tamil Nadu new CM Vijay swearing in",
    "Tamil Nadu coalition government 2026",
    "Tamil Nadu MLA controversy June 2026",
    "Tamil Nadu politics today June 2026",
    "Tamil Nadu latest political news today",
    "Tamil Nadu MLA wealth declaration 2026",
    # ── Platform-indexed social discovery through Google News/RSS ──
    'site:x.com "Tamil Nadu politics"',
    'site:x.com "TVK Vijay"',
    'site:x.com "DMK"',
    'site:x.com "AIADMK"',
    'site:instagram.com "Tamil Nadu politics"',
    'site:instagram.com "TVK Vijay"',
    'site:instagram.com "DMK Tamil Nadu"',
    'site:instagram.com "AIADMK Tamil Nadu"',
    'site:facebook.com "Tamil Nadu politics"',
    'site:youtube.com "Tamil Nadu politics"',
    '"Tamil Nadu politics" "Instagram"',
    '"Tamil Nadu politics" "X post"',
    '"Tamil Nadu politics" "viral video"',
]

SOCIAL_QUERIES = [
    "Tamil Nadu politics",
    "Tamil Nadu election 2026",
    "Tamil Nadu MLA",
    "Tamil Nadu assembly",
    "TVK Vijay politics",
    "DMK Tamil Nadu",
    "AIADMK Tamil Nadu",
    "BJP Tamil Nadu",
    "NTK Seeman",
    "Tamil Nadu political rumour",
    "Tamil Nadu political leak",
    "Tamil Nadu political viral",
    "Tamil Nadu social media politics",
    "Tamil Nadu opposition leader",
    "Tamil Nadu cabinet 2026",
]

# ─────────────────────────────────────────────────────────────────────
# SCRAPER ENGINE
# ─────────────────────────────────────────────────────────────────────

USER_AGENTS = [
    "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/125.0.0.0 Safari/537.36",
    "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.5 Safari/605.1.15",
    "Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/125.0.0.0 Safari/537.36",
    "Mozilla/5.0 (Windows NT 10.0; Win64; x64; rv:126.0) Gecko/20100101 Firefox/126.0",
]

lock = threading.Lock()
stats = {
    "fetched": 0,
    "social_fetched": 0,
    "errors": 0,
    "queries_done": 0,
    "total_queries": 0,
}


def clean_html(text):
    if not text:
        return ""
    cleaned = re.sub(r"<.*?>", "", text)
    cleaned = re.sub(r"\s+", " ", cleaned)
    return cleaned.strip()


def parse_date(date_str):
    try:
        parsed_dt = datetime.strptime(date_str, "%a, %d %b %Y %H:%M:%S %Z")
        return parsed_dt.strftime("%B %d, %Y")
    except Exception:
        return date_str


def detect_unverified_signal(text):
    signal_terms = [
        "rumour",
        "rumor",
        "speculation",
        "buzz",
        "unverified",
        "alleged",
        "leak",
        "viral",
        "social media",
        "x post",
        "tweet",
        "hashtag",
        "claim",
    ]
    lowered = text.lower()
    return any(term in lowered for term in signal_terms)


def iso_to_display_date(value):
    if not value:
        return ""
    try:
        normalized = value.replace("Z", "+00:00")
        parsed_dt = datetime.fromisoformat(normalized)
        return parsed_dt.strftime("%B %d, %Y")
    except Exception:
        return value


def now_utc_iso():
    return datetime.now(timezone.utc).isoformat(timespec="seconds").replace("+00:00", "Z")


def load_json_url(url, timeout=12):
    req = urllib.request.Request(
        url,
        headers={
            "User-Agent": random.choice(USER_AGENTS),
            "Accept": "application/json",
        },
    )
    with urllib.request.urlopen(req, timeout=timeout) as response:
        return json.loads(response.read().decode("utf-8"))


def bluesky_post_url(post):
    uri = post.get("uri", "")
    author = post.get("author", {})
    handle = author.get("handle") or author.get("did") or "unknown"
    if "/app.bsky.feed.post/" not in uri:
        return f"https://bsky.app/profile/{handle}"
    post_id = uri.rsplit("/", 1)[-1]
    return f"https://bsky.app/profile/{handle}/post/{post_id}"


def fetch_bluesky(query, pol_id, pol_name, limit=25):
    """Fetch public Bluesky posts via app.bsky.feed.searchPosts."""
    encoded_query = urllib.parse.quote(query)
    url = (
        "https://public.api.bsky.app/xrpc/app.bsky.feed.searchPosts"
        f"?q={encoded_query}&sort=latest&limit={limit}&lang=en"
    )

    items = []
    try:
        payload = load_json_url(url)
        for post in payload.get("posts", []):
            record = post.get("record", {})
            text = clean_html(record.get("text", ""))
            if not text:
                continue
            author = post.get("author", {})
            created_at = record.get("createdAt") or post.get("indexedAt") or ""
            uri = post.get("uri") or post.get("cid") or text
            article_id = f"bsky_{hashlib.md5(uri.encode('utf-8')).hexdigest()[:12]}"
            handle = author.get("handle") or author.get("did") or "unknown"
            source_name = f"Bluesky @{handle}"

            items.append({
                "id": article_id,
                "politicianId": pol_id,
                "title": text[:160] + ("..." if len(text) > 160 else ""),
                "source": source_name,
                "date": iso_to_display_date(created_at),
                "publishedAtRaw": created_at,
                "snippet": text,
                "url": bluesky_post_url(post),
                "category": "social_media",
                "sourceType": "bluesky_search",
                "platform": "bluesky",
                "author": {
                    "displayName": author.get("displayName") or handle,
                    "handle": handle,
                    "did": author.get("did"),
                },
                "engagement": {
                    "likes": post.get("likeCount", 0),
                    "replies": post.get("replyCount", 0),
                    "reposts": post.get("repostCount", 0),
                    "quotes": post.get("quoteCount", 0),
                },
                "query": query,
                "retrievedAt": now_utc_iso(),
                "isRumor": True,
                "verificationStatus": "unverified_chatter",
            })
    except Exception:
        with lock:
            stats["errors"] += 1

    time.sleep(random.uniform(0.15, 0.35))
    return items


def reddit_submission_to_item(data, query, pol_id):
    title = clean_html(data.get("title", ""))
    if not title:
        return None
    permalink = data.get("permalink") or ""
    post_url = f"https://www.reddit.com{permalink}" if permalink.startswith("/") else data.get("url", "")
    reddit_id = data.get("id") or post_url or title
    article_id = f"reddit_{hashlib.md5(str(reddit_id).encode('utf-8')).hexdigest()[:12]}"
    created_utc = data.get("created_utc") or data.get("created")
    created_raw = (
        datetime.fromtimestamp(created_utc, timezone.utc).isoformat().replace("+00:00", "Z")
        if created_utc else ""
    )
    selftext = clean_html(data.get("selftext", ""))
    subreddit = data.get("subreddit_name_prefixed") or f"r/{data.get('subreddit', 'reddit')}"

    return {
        "id": article_id,
        "politicianId": pol_id,
        "title": title,
        "source": f"Reddit {subreddit}",
        "date": iso_to_display_date(created_raw),
        "publishedAtRaw": created_raw,
        "snippet": selftext or title,
        "url": post_url,
        "category": "social_media",
        "sourceType": "reddit_search",
        "platform": "reddit",
        "author": {
            "displayName": data.get("author") or "reddit user",
            "handle": data.get("author"),
        },
        "engagement": {
            "score": data.get("score", 0),
            "comments": data.get("num_comments", 0),
            "upvoteRatio": data.get("upvote_ratio"),
        },
        "query": query,
        "retrievedAt": now_utc_iso(),
        "isRumor": True,
        "verificationStatus": "unverified_chatter",
    }


def fetch_reddit(query, pol_id, pol_name, limit=25):
    """Fetch public Reddit submissions through PullPush, with Reddit JSON as a fallback."""
    encoded_query = urllib.parse.quote(query)
    items = []

    pullpush_url = (
        "https://api.pullpush.io/reddit/search/submission/"
        f"?q={encoded_query}&size={limit}"
    )
    try:
        payload = load_json_url(pullpush_url, timeout=20)
        for submission in payload.get("data", []):
            item = reddit_submission_to_item(submission, query, pol_id)
            if item:
                item["sourceType"] = "pullpush_reddit_search"
                items.append(item)
    except Exception:
        items = []

    if items:
        time.sleep(random.uniform(0.25, 0.6))
        return items

    reddit_url = (
        "https://www.reddit.com/search.json"
        f"?q={encoded_query}&sort=new&limit={limit}&raw_json=1"
    )
    try:
        payload = load_json_url(reddit_url)
        for child in payload.get("data", {}).get("children", []):
            item = reddit_submission_to_item(child.get("data", {}), query, pol_id)
            if item:
                items.append(item)
    except Exception:
        items = []

    if items:
        time.sleep(random.uniform(0.25, 0.6))
        return items
    with lock:
        stats["errors"] += 1

    time.sleep(random.uniform(0.25, 0.6))
    return items


def fetch_social(query, pol_id, pol_name, limit=25):
    items = []
    items.extend(fetch_bluesky(query, pol_id, pol_name, limit=limit))
    items.extend(fetch_reddit(query, pol_id, pol_name, limit=limit))
    with lock:
        stats["social_fetched"] += len(items)
        stats["queries_done"] += 1
        done = stats["queries_done"]
        total = stats["total_queries"]
        fetched = stats["social_fetched"]
        if done % 10 == 0 or done == total:
            print(f"  ▸ Social progress: {done}/{total} queries | {fetched} posts fetched")
    return items


def fetch_rss(query, pol_id, pol_name):
    """Fetch a single Google News RSS feed and return parsed articles."""
    encoded_query = urllib.parse.quote(query)
    url = f"https://news.google.com/rss/search?q={encoded_query}&hl=en-IN&gl=IN&ceid=IN:en"

    req = urllib.request.Request(
        url,
        headers={"User-Agent": random.choice(USER_AGENTS)},
    )

    items = []
    try:
        with urllib.request.urlopen(req, timeout=12) as response:
            xml_data = response.read()

        root = ET.fromstring(xml_data)

        for item in root.findall(".//item")[:100]:  # Google max ~100 per feed
            title_el = item.find("title")
            link_el = item.find("link")
            pub_date_el = item.find("pubDate")
            desc_el = item.find("description")
            source_el = item.find("source")

            raw_title = title_el.text if title_el is not None else ""
            link = link_el.text if link_el is not None else ""
            pub_date = pub_date_el.text if pub_date_el is not None else ""
            desc = desc_el.text if desc_el is not None else ""
            source_name = source_el.text if source_el is not None else "Google News"

            clean_title = raw_title
            if " - " in raw_title:
                clean_title = " - ".join(raw_title.split(" - ")[:-1])

            hash_object = hashlib.md5(link.encode("utf-8"))
            article_id = f"scraped_{hash_object.hexdigest()[:12]}"

            snippet = clean_html(desc)
            if not snippet or len(snippet) < 10:
                snippet = f"News coverage regarding {pol_name} from {source_name}."

            # Auto-detect category from title/query — social media FIRST priority
            category = "news"
            lower_title = (raw_title + " " + query).lower()
            # Social media gets highest priority
            if any(kw in lower_title for kw in [
                "tweet", "twitter", "x.com", "social media", "instagram", "facebook",
                "viral post", "troll", "meme", "trending", "IT cell", "IT wing",
                "x post", "retweet", "hashtag", "viral video", "online war",
                "deleted tweet", "social media war", "digital campaign",
            ]):
                category = "social_media"
            elif any(kw in lower_title for kw in ["scam", "corruption", "arrest", "jail", "convicted", "fir", "chargesheet", "raid", "ed raid", "cbi probe", "pmla", "disproportionate assets"]):
                category = "investigation"
            elif any(kw in lower_title for kw in ["election", "campaign", "alliance", "manifesto", "poll", "vote", "constituency", "candidate", "ballot"]):
                category = "election"
            elif any(kw in lower_title for kw in [
                "scheme", "welfare scheme", "policy announcement", "government order",
                "g.o.", "budget allocation", "beneficiary", "subsidy", "rollout",
                "implementation", "impact", "cabinet review", "project review",
                "department circular", "neet exemption",
            ]):
                category = "policy"

            is_unverified_signal = detect_unverified_signal(raw_title + " " + snippet + " " + query)

            items.append({
                "id": article_id,
                "politicianId": pol_id,
                "title": clean_title,
                "source": source_name,
                "date": parse_date(pub_date),
                "publishedAtRaw": pub_date,
                "snippet": snippet,
                "url": link,
                "category": category,
                "sourceType": "google_news_rss",
                "query": query,
                "retrievedAt": now_utc_iso(),
                "isRumor": is_unverified_signal,
                "verificationStatus": "unverified_chatter" if is_unverified_signal else "source_reported",
            })

        with lock:
            stats["fetched"] += len(items)
            stats["queries_done"] += 1
            done = stats["queries_done"]
            total = stats["total_queries"]
            fetched = stats["fetched"]
            if done % 10 == 0 or done == total:
                print(f"  ▸ Progress: {done}/{total} queries | {fetched} articles fetched")

    except Exception as e:
        with lock:
            stats["errors"] += 1
            stats["queries_done"] += 1

    # Small delay to be polite to RSS endpoint
    time.sleep(random.uniform(0.15, 0.4))
    return items


def build_social_jobs(db, max_queries):
    jobs = []

    for pol_id, pol_data in POLITICIANS.items():
        name = pol_data["name"]
        jobs.append((f'"{name}" Tamil Nadu politics', pol_id, name))
        jobs.append((f'"{name}" social media', pol_id, name))

    for mla in db.get("mlas", []):
        name = mla.get("candidateName") or mla.get("mlaName")
        constituency = mla.get("constituency", "")
        pol_id = mla.get("politicianId")
        if name and pol_id:
            jobs.append((f'"{name}" "{constituency}" MLA Tamil Nadu', pol_id, name))

    for query in SOCIAL_QUERIES:
        jobs.append((query, "general", "Tamil Nadu Politics"))

    seen = set()
    deduped = []
    for query, pol_id, pol_name in jobs:
        key = (query.lower(), pol_id)
        if key in seen:
            continue
        seen.add(key)
        deduped.append((query, pol_id, pol_name))

    return deduped[:max_queries]


def main():
    parser = argparse.ArgumentParser(description="Harvest Tamil Nadu political news and public social posts.")
    parser.add_argument(
        "--social-only",
        action="store_true",
        help="Fetch only public social posts from Bluesky and Reddit.",
    )
    parser.add_argument(
        "--skip-social",
        action="store_true",
        help="Skip the public social-post harvest and fetch only Google News RSS.",
    )
    parser.add_argument(
        "--social-limit",
        type=int,
        default=15,
        help="Maximum posts to request per social platform per query.",
    )
    parser.add_argument(
        "--max-social-queries",
        type=int,
        default=80,
        help="Maximum social-search queries to execute per run.",
    )
    args = parser.parse_args()

    script_dir = os.path.dirname(os.path.abspath(__file__))
    json_path = os.path.normpath(
        os.path.join(script_dir, "../public/scrapedIntel.json")
    )

    print("═" * 60)
    print("  POLITICAL INTELLIGENCE SCRAPER — MAXIMUM HARVEST")
    print("═" * 60)
    print(f"Target: {json_path}\n")

    # Load existing DB
    db = {"news": [], "evidence": []}
    if os.path.exists(json_path):
        try:
            with open(json_path, "r", encoding="utf-8") as f:
                db = json.load(f)
                print(f"Loaded existing database: {len(db.get('news', []))} articles, {len(db.get('evidence', []))} evidence sheets.\n")
        except Exception as e:
            print(f"Error loading DB: {e}")
    else:
        os.makedirs(os.path.dirname(json_path), exist_ok=True)

    # Build the job lists: (query, politician_id, politician_name)
    rss_jobs = []
    if not args.social_only:
        for pol_id, pol_data in POLITICIANS.items():
            for q in pol_data["queries"]:
                rss_jobs.append((q, pol_id, pol_data["name"]))

        for q in TOPIC_QUERIES:
            rss_jobs.append((q, "general", "Tamil Nadu Politics"))

    social_jobs = []
    if not args.skip_social:
        social_jobs = build_social_jobs(db, max_queries=args.max_social_queries)

    stats["total_queries"] = len(rss_jobs) + len(social_jobs)
    print(f"Total RSS queries to execute   : {len(rss_jobs)}")
    print(f"Total social queries to execute: {len(social_jobs)}")
    print(f"Threads: 8 RSS workers, 5 social workers\n")

    # Existing dedup sets
    existing_urls = {item["url"] for item in db.get("news", []) if "url" in item}
    existing_titles = {item["title"].lower() for item in db.get("news", []) if "title" in item}
    existing_ids = {item["id"] for item in db.get("news", []) if "id" in item}

    all_new_items = []

    # Execute RSS jobs with thread pool
    with ThreadPoolExecutor(max_workers=8) as executor:
        futures = {executor.submit(fetch_rss, q, pid, pname): (q, pid) for q, pid, pname in rss_jobs}
        for future in as_completed(futures):
            try:
                articles = future.result()
                for article in articles:
                    if (
                        article["url"] not in existing_urls
                        and article["title"].lower() not in existing_titles
                    ):
                        all_new_items.append(article)
                        existing_urls.add(article["url"])
                        existing_titles.add(article["title"].lower())
            except Exception:
                pass

    # Execute public social jobs with a smaller pool to stay polite.
    with ThreadPoolExecutor(max_workers=5) as executor:
        futures = {
            executor.submit(fetch_social, q, pid, pname, args.social_limit): (q, pid)
            for q, pid, pname in social_jobs
        }
        for future in as_completed(futures):
            try:
                posts = future.result()
                for post in posts:
                    post_id = post.get("id")
                    post_url = post.get("url")
                    post_title = post.get("title", "").lower()
                    if (
                        post_id not in existing_ids
                        and post_url not in existing_urls
                        and post_title not in existing_titles
                    ):
                        all_new_items.append(post)
                        if post_id:
                            existing_ids.add(post_id)
                        if post_url:
                            existing_urls.add(post_url)
                        if post_title:
                            existing_titles.add(post_title)
            except Exception:
                pass

    # Prepend new items
    if "news" not in db:
        db["news"] = []
    db["news"] = all_new_items + db["news"]

    # Preserve existing evidence only. MLA affidavits, assets, and criminal
    # filings must come from a real affidavit ingestion step, not this news crawl.
    if "evidence" not in db:
        db["evidence"] = []

    db["coverageMeta"] = {
        "storyTarget": 100000,
        "currentStories": len(db["news"]),
        "newStoriesThisRun": len(all_new_items),
        "autoReloadThreshold": 10,
        "scheduledServerSyncMinutes": 30,
        "directPublicSocialPlatforms": ["Bluesky", "Reddit"],
        "indexedSocialDiscovery": ["X/Twitter", "Instagram", "Facebook", "YouTube"],
        "restrictedWithoutOfficialApi": [
            "full Instagram posts and comments",
            "full X/Twitter firehose",
            "private Facebook/Instagram content",
        ],
        "lastRunAt": now_utc_iso(),
    }

    # Save
    try:
        with open(json_path, "w", encoding="utf-8") as f:
            json.dump(db, f, indent=2, ensure_ascii=False)
        print(f"\n{'═' * 60}")
        print(f"  SCRAPE COMPLETE")
        print(f"{'═' * 60}")
        print(f"  New unique articles added : {len(all_new_items)}")
        print(f"  Total articles in database: {len(db['news'])}")
        print(f"  Public social posts seen  : {stats['social_fetched']}")
        print(f"  Evidence sheets preserved : {len(db.get('evidence', []))}")
        print(f"  Errors encountered        : {stats['errors']}")
        print(f"{'═' * 60}")
    except Exception as e:
        print(f"Error writing to database: {e}")


if __name__ == "__main__":
    main()
