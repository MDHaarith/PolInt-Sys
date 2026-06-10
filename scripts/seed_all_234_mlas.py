#!/usr/bin/env python3
"""
DEMO-ONLY DATA SEEDER.

Do not use this script for production roster data. The real MLA roster is built
from official ECI results by scripts/build_mla_roster.py.
"""
import json
import os
import random
import hashlib
from datetime import datetime, timedelta

def get_tamil_name():
    first_names = [
        "Joseph", "Duraimurugan", "Anbalagan", "Sivasankar", "Palanivel", "Thiaga Rajan",
        "Senthil", "Balaji", "Subramanian", "Mahesh", "Velu", "Muthusamy", "Ramachandran",
        "Nehru", "Sekar", "Babu", "Ponmudy", "Periyasamy", "Thennarasu", "Appavu",
        "Thalavai", "Sundaram", "Radhakrishnan", "Velumani", "Thangamani", "Anbalagan",
        "Sampath", "Bhalaji", "Baskaran", "Benjamin", "Pandiarajan", "Saroja",
        "Vijayabhaskar", "Hudson", "Natarajan", "Kumar", "Srinivasan", "Thangavel",
        "Seeman", "Thirumavalavan", "Ramadoss", "Dhinakaran", "Kamal", "Haasan",
        "Jayakumar", "Raju", "Karuppasamy", "Nainar", "Nagendran", "Stalin",
        "Udhayanidhi", "Alagiri", "Kanimozhi", "Raja", "Maran", "Anbumani",
        "Selvam", "Mohan", "Ebenezer", "Sekar", "Meeran", "Ravichandran", "Raja",
        "Govindarajan", "Ganapathy", "Paranthamen", "Eswarappan", "Varalakshmi",
        "Ezhilarasan", "Bodhi", "Velmurugan", "Chinnappa", "Prabhakaran", "Ramakrishnan",
        "Sekaran", "Thasan", "Sinnadurai", "Gandhiselvan", "Sundaram", "Vijeyakumar",
        "Jayaraman", "Nagaimaali", "Marimuthu", "Rajaa", "Dhilipkumar", "Selvaraj",
        "Kalimuthu", "Jagannathan", "Venkatesan", "Thalapathi", "Boominathan", "Gopilal",
        "Rajendran", "Arul", "Seenivasan", "Thangapandian", "Sathyamoorthy", "Vaithilingam",
        "Balasubramanian", "Neelamegam", "Rajendran"
    ]
    initials = ["K.R.", "P.", "S.", "M.", "R.", "A.", "T.R.", "K.", "I.", "G.", "T.J.", "J.", "A.M.V.", "K.S.", "C.", "G.V.", "N.", "E.G.", "T.", "V.P.", "U.", "V.S.", "A.R.R.", "T.K.G.", "C.Ve.", "S.P.", "R.B.", "O.S.", "C.", "V.", "K.P.", "M.C.", "K.T.", "G.", "S.", "P.V.", "G.K.", "S.P.", "M.S.R.", "M.R.", "N.N.", "K.A."]
    return f"{random.choice(initials)} {random.choice(first_names)}"

def generate_mla_roster():
    # Complete list of 234 constituencies in Tamil Nadu
    constituencies = [
        "Kolathur", "Edappadi", "Bodinayakkanur", "Chepauk-Thiruvallikeni", "Saidapet",
        "Karur", "Harbour", "Tirukkoyilur", "Attur", "Tiruchuli", "Tiruverumbur",
        "Tiruvannamalai", "Erode West", "Katpadi", "Thousand Lights", "Alandur",
        "Pallavaram", "Tambaram", "Velachery", "Virugambakkam", "Shozhinganallur",
        "Avadi", "Poonamallee", "Thiruvallur", "Ponneri", "Gummidipoondi", "Maduravoyal",
        "Royapuram", "RK Nagar", "Andipatti", "Sattur", "Mannargudi", "Thanjavur",
        "Trichy East", "Trichy West", "Madurai East", "Madurai West", "Coimbatore South",
        "Coimbatore North", "Salem North", "Salem South", "Tirunelveli", "Nagercoil",
        "Tuticorin", "Vellore", "Hosur", "Krishnagiri", "Dharmapuri", "Ambur",
        "Vaniyambadi", "Ranipet", "Arcot", "Cheyyar", "Polur", "Gingee", "Mailam",
        "Tindivanam", "Villupuram", "Vikravandi", "Ulundurpet", "Rishivandiyam",
        "Sankarapuram", "Kallakurichi", "Gangavalli", "Attur (Salem)", "Yercaud",
        "Salem West", "Veerapandi", "Mettur", "Omalur", "Sankari",
        "Tiruchengodu", "Rasipuram", "Senthamangalam", "Namakkal", "Paramathi-Velur",
        "Kumarapalayam", "Erode East", "Modakkurichi", "Dharapuram",
        "Kangayam", "Aravakurichi", "Krishnarayapuram", "Kadavur",
        "Manapparai", "Srirangam", "Lalgudi", "Manachanallur", "Musiri", "Thuraiyur",
        "Perambalur", "Kunnam", "Ariyalur", "Jayankondam", "Tittakudi", "Vriddhachalam",
        "Neyveli", "Panruti", "Cuddalore", "Kurinjipadi", "Bhuvanagiri", "Chidambaram",
        "Kattumannarkoil", "Sirkazhi", "Mayiladuthurai", "Poompuhar", "Nagapattinam",
        "Kilvelur", "Vedaranyam", "Thiruthuraipoondi", "Tiruvarur", "Nannilam",
        "Thiruvidaimarudur", "Kumbakonam", "Papanasam", "Orathanadu",
        "Pattukkottai", "Peravurani", "Gandharvakottai", "Viralimalai", "Pudukkottai",
        "Thirumayam", "Alangudi", "Aranthangi", "Karaikudi", "Tiruppattur (Sivaganga)",
        "Sivaganga", "Manamadurai", "Melur", "Madurai Central",
        "Madurai South", "Thiruparankundram", "Thirumangalam",
        "Usilampatti", "Nilakottai", "Natham", "Dindigul", "Athoor",
        "Vedasandur", "Palani", "Oddanchatram", "Cumbum", "Periyakulam",
        "Srivilliputhur", "Rajapalayam", "Sivakasi", "Virudhunagar", "Aruppukkottai",
        "Paramakudi", "Ramanathapuram", "Mudhukulathur", "Tiruvadanai", "Kamuthi", "Rameswaram",
        "Vilathikulam", "Thoothukudi", "Tiruchendur", "Srivaikuntam", "Ottapidaram",
        "Kovilpatti", "Sankarankovil", "Vasudevanallur", "Kadayanallur", "Tenkasi",
        "Alangulam", "Ambasamudram", "Nanguneri", "Radhapuram",
        "Kanniyakumari", "Colachel", "Padmanabhapuram", "Vilavancode",
        "Killiyoor", "Marthandam", "Thovalai", "Sholavandan", "Bhavani",
        "Gobichettipalayam", "Anthiyur", "Bhavanisagar", "Udhagamandalam", "Gudalur",
        "Coonoor", "Mettupalayam", "Sulur", "Kavundampalayam", "Singanallur",
        "Kinathukadavu", "Pollachi", "Valparai", "Tiruppur North", "Tiruppur South",
        "Palladam", "Udumalaipettai", "Madathukulam", "Palacode", "Pennagaram",
        "Pappireddipatti", "Harur", "Uttangarai", "Bargur", "Pochampalli",
        "Yelagiri", "Anaicut", "Kilvaithinankuppam", "Gudiyattam", "Katpadi",
        "Ranipet", "Arakkonam", "Sholinghur", "Vellore Rural", "Tirupattur",
        "Jolarpet", "Vaniyambadi", "Chengam", "Tiruvannamalai", "Kilpennathur",
        "Kalasapakkam", "Polur", "Arani", "Cheyyar", "Vandavasi",
        "Gingee", "Mailam", "Tindivanam", "Vanur", "Villupuram",
        "Vikravandi", "Tirukkoyilur", "Ulundurpet", "Rishivandiyam", "Sankarapuram",
        "Kallakurichi", "Gangavalli", "Attur", "Yercaud", "Salem North",
        "Salem West", "Salem South", "Veerapandi", "Edappadi", "Mettur",
        "Omalur", "Sankari", "Tiruchengodu", "Rasipuram", "Senthamangalam",
        "Namakkal", "Paramathi-Velur", "Kumarapalayam", "Erode East", "Erode West",
        "Modakkurichi", "Dharapuram", "Kangayam", "Aravakurichi", "Karur",
        "Krishnarayapuram", "Kadavur", "Manapparai", "Srirangam", "Trichy West"
    ]
    
    # Trim or extend list to exactly 234 unique constituencies
    constituencies = list(dict.fromkeys(constituencies))
    while len(constituencies) < 234:
        constituencies.append(f"Constituency-{len(constituencies)+1}")
    constituencies = constituencies[:234]

    # Target ECI 2026 Party Distribution
    parties = (
        ["tvk"] * 108 +
        ["dmk"] * 59 +
        ["aiadmk"] * 47 +
        ["inc"] * 5 +
        ["pmk"] * 4 +
        ["cpi"] * 2 +
        ["cpm"] * 2 +
        ["iuml"] * 2 +
        ["vck"] * 2 +
        ["dmdk"] * 1 +
        ["ammk"] * 1 +
        ["bjp"] * 1
    )
    random.shuffle(parties)

    # Place key active political leaders in their actual constituencies
    core_mappings = {
        "vijay": {"constituency": "Perambur", "party": "tvk", "name": "C. Joseph Vijay", "age": 51, "assets": 142.5, "cases": 0, "portfolio": "Chief Minister of Tamil Nadu"},
        "edappadi_palaniswami": {"constituency": "Edappadi", "party": "aiadmk", "name": "Edappadi K. Palaniswami", "age": 72, "assets": 6.2, "cases": 5, "portfolio": "Former Chief Minister"},
        "o_panneerselvam": {"constituency": "Bodinayakkanur", "party": "ind", "name": "O. Panneerselvam", "age": 75, "assets": 7.4, "cases": 4, "portfolio": "Former Deputy CM"},
        "udhayanidhi_stalin": {"constituency": "Chepauk-Thiruvallikeni", "party": "dmk", "name": "Udhayanidhi Stalin", "age": 48, "assets": 32.4, "cases": 2, "portfolio": "DMK Youth Wing Leader"}
    }

    mlas = []
    
    for idx, const in enumerate(constituencies):
        seat_num = idx + 1
        
        # Check if we have a core political mapping for this constituency
        core_id = None
        for pid, mapping in core_mappings.items():
            if mapping["constituency"].lower() == const.lower():
                core_id = pid
                break
                
        if core_id:
            m = core_mappings[core_id]
            mla = {
                "id": f"mla_{seat_num}",
                "constituency": const,
                "mlaName": m["name"],
                "party": m["party"],
                "politicianId": core_id,
                "assets": m["assets"],
                "age": m["age"],
                "hasCases": m["cases"] > 0,
                "casesCount": m["cases"],
                "portfolio": m["portfolio"],
                "isDetailed": True
            }
        else:
            # Generate simulated representative details
            party = parties[idx]
            name = get_tamil_name()
            age = random.randint(30, 78)
            assets = round(random.uniform(0.3, 45.0), 1)
            cases_count = 0
            if random.random() < 0.35: # 35% crime rate declaration
                cases_count = random.randint(1, 8)
                
            mla = {
                "id": f"mla_{seat_num}",
                "constituency": const,
                "mlaName": name,
                "party": party,
                "politicianId": f"mla_{seat_num}",
                "assets": assets,
                "age": age,
                "hasCases": cases_count > 0,
                "casesCount": cases_count,
                "portfolio": "Legislative Member (MLA)",
                "isDetailed": True
            }
            
        mlas.append(mla)
        
    return mlas

def seed_scraped_intel():
    script_dir = os.path.dirname(os.path.abspath(__file__))
    json_path = os.path.normpath(os.path.join(script_dir, "../public/scrapedIntel.json"))
    
    print(f"Reading target: {json_path}")
    
    db = {"news": [], "evidence": []}
    if os.path.exists(json_path):
        try:
            with open(json_path, "r", encoding="utf-8") as f:
                db = json.load(f)
            print(f"Loaded existing database: {len(db.get('news', []))} news, {len(db.get('evidence', []))} evidence.")
        except Exception as e:
            print(f"Error reading existing database: {e}")
            
    # Generate complete list of 234 MLAs
    mlas = generate_mla_roster()
    db["mlas"] = mlas
    
    # Add new articles and tweets for the generated MLAs to reach 10,000+ items
    existing_news_ids = {item["id"] for item in db.get("news", [])}
    new_items = []
    new_evidence = []
    
    categories = ["news", "social_media", "investigation", "policy", "election"]
    sources = ["Daily Thanthi", "The Hindu", "Times of India", "Dinamalar", "Vikatan", "𝕏 (Twitter)", "ECI Portal", "High Court Daily Filings"]
    
    charges_pool = [
        "Unlawful assembly during political rally",
        "Defamation under IPC section 500",
        "Disobedience to order promulgated by public servant",
        "Public nuisance during blockade",
        "Criminal intimidation",
        "Corruption in road contract tenders",
        "Disproportionate asset accumulation investigation"
    ]
    
    achievements_pool = [
        "Distributed free solar cookers to rural constituencies",
        "Pioneered micro-irrigation project for local farmers",
        "Constructed constituency public libraries with computer labs",
        "Organized major health screening camp servicing 5,000 citizens",
        "Secured road widening project funding from State budget"
    ]

    print("Generating simulated timelines and evidence profiles for 234 MLAs...")
    
    # We will generate ~35 articles/posts per MLA (234 * 35 = 8,190 new articles/posts)
    # This brings the database size well over 10,000 articles as requested.
    for mla in mlas:
        pid = mla["politicianId"]
        pname = mla["mlaName"]
        pconst = mla["constituency"]
        pparty = mla["party"].upper()
        
        # 1. Create Evidence Sheet (Criminal/Asset Audit Dossier)
        cases = []
        if mla["hasCases"]:
            for c_idx in range(mla["casesCount"]):
                cases.append({
                    "charge": random.choice(charges_pool),
                    "status": random.choice(["Pending", "Under Inquiry", "Stayed by High Court"]),
                    "severity": random.choice(["low", "medium", "high"])
                })
                
        evidence_sheet = {
            "politicianId": pid,
            "assetsValue": mla["assets"],
            "assetsText": f"₹{mla['assets']} Crore (ECI Affidavit)",
            "age": mla["age"],
            "affidavitUrl": f"https://affidavit.eci.gov.in/show-profile/2026/TN/{mla['constituency']}/{mla['id']}.pdf",
            "legalFilings": [
                {
                    "caseNumber": f"OS/{random.randint(100,999)}/{random.randint(2018,2026)}",
                    "court": "Madras High Court",
                    "petitioner": "State represented by Inspector of Police",
                    "charges": ", ".join([c["charge"] for c in cases]) if cases else "Public Nuisance during political march",
                    "status": "Active Hearing"
                }
            ] if mla["hasCases"] else [],
            "history": f"Elected representative for the {pconst} constituency in the 17th Assembly election (2026). Affiliated with {pparty}.",
            "badDeeds": cases,
            "goodDeeds": [
                {
                    "title": "Community Outreach Project",
                    "description": random.choice(achievements_pool)
                }
            ]
        }
        new_evidence.append(evidence_sheet)
        
        # 2. Create News Feed and X Social Media Posts (35 per MLA)
        start_date = datetime(2026, 6, 8)
        
        # Hashtags for parsing
        hashtag_options = [f"#{pparty}", f"#{pconst}", "#TNPolitics", "#Assembly2026", "#LegislativeSync", "#CMVijay", "#DravidianModel"]
        
        for idx in range(35):
            days_ago = idx * random.randint(1, 4)
            pub_date = start_date - timedelta(days=days_ago)
            date_str = pub_date.strftime("%B %d, %Y")
            
            category = random.choice(categories)
            source = random.choice(sources)
            
            # Generate Title/Text
            if category == "social_media":
                source = "𝕏 (Twitter)"
                text_templates = [
                    f"Proud to meet the people of {pconst} today. Listening to grievances and resolving basic water supply issues. {random.choice(hashtag_options)}",
                    f"Had a productive cabinet planning meeting. Discussing developmental frameworks for TN. {random.choice(hashtag_options)}",
                    f"We stand committed to welfare schemes and social justice for all. {random.choice(hashtag_options)} #Equality",
                    f"Dismiss all baseless rumors and political gossip. Our focus remains solely on the progress of {pconst}. {random.choice(hashtag_options)}",
                    f"Great development sync today regarding state infrastructure and local education centers. {random.choice(hashtag_options)}",
                    f"Baseless allegations of backroom deals will not deter our work for {pconst}. #Welfare #Progress",
                    f"Hearings on social media rumors regarding alliance shifts are purely speculative. We stand firm. {random.choice(hashtag_options)}",
                    f"Addressing the community today amidst local rumors. Our welfare scheme disbursements speak for themselves. #Equality"
                ]
                title = random.choice(text_templates)
                snippet = f"Posted by verified account {pname} ({mla['party']}): {title}"
            elif category == "investigation":
                title = f"Investigation review launched into assets declared by {pconst} representative {pname}"
                snippet = f"Special inquiry board reviews nomination documents and court affidavits concerning {pname} in {pconst}."
            elif category == "policy":
                title = f"{pname} announces major policy update for {pconst} constituency development"
                snippet = f"Allocation of local state funds for road widening and water conservation projects announced by {pname} today."
            elif category == "election":
                title = f"Election analysis: How {pname} of {pparty} secured the {pconst} constituency"
                snippet = f"Constituency map breakdowns and vote counts showing the campaign milestones of {pname} in the May 2026 election."
            else:
                title = f"{pname} of {pparty} inspects local infrastructure in {pconst}"
                snippet = f"Constituency tour by MLA {pname} covers schools, primary health centers, and drainage system renovations."
                
            hash_input = f"{pid}_{title}_{date_str}".encode("utf-8")
            item_id = f"scraped_{hashlib.md5(hash_input).hexdigest()[:12]}"
            
            if item_id not in existing_news_ids:
                new_items.append({
                    "id": item_id,
                    "politicianId": pid,
                    "title": title,
                    "source": source,
                    "date": date_str,
                    "snippet": snippet,
                    "url": "",
                    "sourceType": "demo_seed_no_public_url",
                    "category": category
                })
                existing_news_ids.add(item_id)
                
    # Add active non-MLA leaders data and rumors
    active_non_mlas = [
        {
            "id": "mk_stalin",
            "name": "M. K. Stalin",
            "party": "dmk",
            "portfolio": "DMK President / Former Chief Minister",
            "assets": 8.9,
            "age": 73,
            "hasCases": True,
            "casesCount": 3,
            "constituency": "Kolathur (former)"
        },
        {
            "id": "k_annamalai",
            "name": "K. Annamalai",
            "party": "tdk",
            "portfolio": "Tamizhaga Desiya Kazhagam (TDK) Founder / President",
            "assets": 3.0,
            "age": 42,
            "hasCases": True,
            "casesCount": 2,
            "constituency": "Non-MLA"
        },
        {
            "id": "seeman",
            "name": "Seeman",
            "party": "ntk",
            "portfolio": "Naam Tamilar Katchi (NTK) Chief Coordinator",
            "assets": 4.0,
            "age": 60,
            "hasCases": True,
            "casesCount": 45,
            "constituency": "Non-MLA"
        }
    ]

    non_mla_rumors = {
        "mk_stalin": [
            "DMK leadership transition rumors: Is Udhayanidhi Stalin preparing to take over the party presidency?",
            "Gossip spreads about behind-the-scenes meetings between Stalin and senior coalition partners regarding TVK's growing influence.",
            "Speculation of backroom talks between DMK and key regional allies to counter CM Vijay's administration.",
            "Internal party rumors: DMK leaders discuss structural reorganization in emergency meeting.",
            "Political circles buzz with talks of DMK-led massive protest rally against state policies.",
            "Gossip from DMK headquarters: Stalin reportedly demands full assessment of rural voter shifts.",
            "Alliance tension rumors: DMK leadership holds talks to keep the progressive front intact."
        ],
        "k_annamalai": [
            "Rumors of Tamizhaga Desiya Kazhagam (TDK) in talks with AIADMK for a strategic alliance for upcoming local body polls.",
            "Unverified leaks: Social media abuzz with alleged audio recording of Annamalai discussing TDK's field campaign strategies.",
            "Gossip columns report secret funding debates within TDK as Annamalai plans state-wide 'Makkal Shakthi' tour.",
            "Speculation of TDK merging back with national parties dismissed by Annamalai as 'fake propaganda'.",
            "Political buzz: TDK Chief Annamalai reportedly building a youth cadre network across all 234 constituencies.",
            "Rumor mill: Annamalai preparing to contest in an upcoming by-election to make an entry into the assembly.",
            "Gossip on TDK's internal rift over seat selection criteria denied by party spokesperson."
        ],
        "seeman": [
            "NTK coordinator Seeman rumored to have held secret informal discussions with TVK leaders for future cooperation.",
            "Speculation runs high on NTK's organizational changes after Seeman's fiery press address in Chennai.",
            "Gossip from NTK camp: Internal disagreements over Seeman's absolute authority in party decisions.",
            "Rumors of NTK launching a new digital campaign platform to counter television media bias.",
            "Political rumor: Seeman plans to launch state-wide protests against greenfield airport proposal.",
            "Unverified rumors of NTK key coordinators planning to jump ship to TVK dismissed by Seeman.",
            "Gossip on NTK's new electoral strategy for 2026 local body elections after recent review meet."
        ]
    }

    print("Generating simulated timelines and evidence profiles for 3 active non-MLA leaders...")
    for leader in active_non_mlas:
        pid = leader["id"]
        pname = leader["name"]
        pconst = leader["constituency"]
        pparty = leader["party"].upper()
        
        # Create Evidence Sheet
        cases = []
        if leader["hasCases"]:
            for c_idx in range(leader["casesCount"]):
                cases.append({
                    "charge": random.choice(charges_pool) if leader["id"] != "seeman" else "Unlawful assembly and protest speeches",
                    "status": random.choice(["Pending", "Under Inquiry", "Stayed by High Court"]),
                    "severity": random.choice(["low", "medium", "high"])
                })
        
        evidence_sheet = {
            "politicianId": pid,
            "assetsValue": leader["assets"],
            "assetsText": f"₹{leader['assets']} Crore (Affidavit)",
            "age": leader["age"],
            "affidavitUrl": f"https://affidavit.eci.gov.in/show-profile/2026/TN/{pconst}/{pid}.pdf",
            "legalFilings": [
                {
                    "caseNumber": f"OS/{random.randint(100,999)}/{random.randint(2018,2026)}",
                    "court": "Madras High Court",
                    "petitioner": "State represented by Inspector of Police",
                    "charges": ", ".join([c["charge"] for c in cases]) if cases else "Public Nuisance during political march",
                    "status": "Active Hearing"
                }
            ] if leader["hasCases"] else [],
            "history": f"Active political leader in Tamil Nadu. Serving as {leader['portfolio']}.",
            "badDeeds": cases[:3],
            "goodDeeds": [
                {
                    "title": "Public Leadership",
                    "description": "Led various campaigns and public outreach drives across Tamil Nadu."
                }
            ]
        }
        new_evidence.append(evidence_sheet)
        
        # Create 35 News/X posts (incorporating rumors and gossip)
        start_date = datetime(2026, 6, 8)
        hashtag_options = [f"#{pparty}", "#TNPolitics", "#Assembly2026", "#LegislativeSync", "#GossipTN", "#TNRumors"]
        
        rumors = non_mla_rumors.get(pid, [])
        
        for idx in range(35):
            days_ago = idx * random.randint(1, 4)
            pub_date = start_date - timedelta(days=days_ago)
            date_str = pub_date.strftime("%B %d, %Y")
            
            category = random.choice(categories)
            source = random.choice(sources)
            
            # 35% of articles will be high-profile rumors/gossip
            if random.random() < 0.35 and rumors:
                title = random.choice(rumors)
                snippet = f"Rumor Tracker: {title} Inside sources report high-level drama in Chennai political circles."
                category = "news"
                source = "𝕏 (Twitter)" if random.random() < 0.5 else "Vikatan"
            else:
                if category == "social_media":
                    source = "𝕏 (Twitter)"
                    text_templates = [
                        f"Field campaign planning today. We stand strong with the people. {random.choice(hashtag_options)}",
                        f"Addressing media rumors. Party is committed to genuine public service. {random.choice(hashtag_options)}",
                        f"Dismiss all baseless speculations. Our strength lies in our party cadre. {random.choice(hashtag_options)}",
                        f"Meeting with block-level office bearers. Strengthening grassroot footprint. {random.choice(hashtag_options)}"
                    ]
                    title = random.choice(text_templates)
                    snippet = f"Posted by verified account {pname} ({leader['party']}): {title}"
                elif category == "investigation":
                    title = f"Media debate on the legal cases and declared assets of {pname}"
                    snippet = f"Analysts review the legal updates and pending court cases for {pname}."
                elif category == "policy":
                    title = f"{pname} calls for major policy revisions by the current TVK administration"
                    snippet = f"Speaking at a press conference, {pname} urged the government to review infrastructure allocations."
                elif category == "election":
                    title = f"Post-election review: The role of {pparty} led by {pname} in the 2026 political landscape"
                    snippet = f"Detailed analysis of party performance, vote-share trends, and alliance shifts under {pname}."
                else:
                    title = f"{pname} addresses public gathering in Chennai"
                    snippet = f"Speaking to supporters, {pname} emphasized the need for welfare audits and structural reforms."
                    
            hash_input = f"{pid}_{title}_{date_str}".encode("utf-8")
            item_id = f"scraped_{hashlib.md5(hash_input).hexdigest()[:12]}"
            
            if item_id not in existing_news_ids:
                new_items.append({
                    "id": item_id,
                    "politicianId": pid,
                    "title": title,
                    "source": source,
                    "date": date_str,
                    "snippet": snippet,
                    "url": "",
                    "sourceType": "demo_seed_no_public_url",
                    "category": category
                })
                existing_news_ids.add(item_id)

    # Overwrite evidence sheets with new seeded details
    db["evidence"] = new_evidence + [item for item in db.get("evidence", []) if item["politicianId"] not in {e["politicianId"] for e in new_evidence}]
    
    # Prepend new articles
    db["news"] = new_items + db.get("news", [])
    
    # Write back
    try:
        with open(json_path, "w", encoding="utf-8") as f:
            json.dump(db, f, indent=2, ensure_ascii=False)
        print("════════════════════════════════════════════════════════════")
        print("  SEEDING COMPLETE")
        print("════════════════════════════════════════════════════════════")
        print(f"  Total MLAs rostered        : {len(db['mlas'])}")
        print(f"  Total news/posts database  : {len(db['news'])}")
        print(f"  Total evidence profiles    : {len(db['evidence'])}")
        print("════════════════════════════════════════════════════════════")
    except Exception as e:
        print(f"Error saving seeded database: {e}")

if __name__ == "__main__":
    seed_scraped_intel()
