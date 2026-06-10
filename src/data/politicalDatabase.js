import { policyImpactRecords } from "./policyImpactDatabase";

// Tamil Nadu Political Database structured for Politician Spaces and Event Time Fabric
const scrapedIntel = { news: [], evidence: [] };

export const seedParties = [
  {
    "id": "dmk",
    "name": "Dravida Munnetra Kazhagam (DMK)",
    "color": "#ff3333",
    "symbol": "Rising Sun"
  },
  {
    "id": "aiadmk",
    "name": "All India Anna Dravida Munnetra Kazhagam (AIADMK)",
    "color": "#00b074",
    "symbol": "Two Leaves"
  },
  {
    "id": "bjp",
    "name": "Bharatiya Janata Party (BJP)",
    "color": "#ff8000",
    "symbol": "Lotus"
  },
  {
    "id": "ntk",
    "name": "Naam Tamilar Katchi (NTK)",
    "color": "#10b981",
    "symbol": "Gavel"
  },
  {
    "id": "tvk",
    "name": "Tamilaga Vettri Kazhagam (TVK)",
    "color": "#ffd700",
    "symbol": "Elephants"
  },
  {
    "id": "inc",
    "name": "Indian National Congress (INC)",
    "color": "#0080ff",
    "symbol": "Hand"
  },
  {
    "id": "vck",
    "name": "Viduthalai Chiruthaigal Katchi (VCK)",
    "color": "#3b82f6",
    "symbol": "Ring"
  },
  {
    "id": "pmk",
    "name": "Pattali Makkal Katchi (PMK)",
    "color": "#eab308",
    "symbol": "Mango"
  },
  {
    "id": "mdmk",
    "name": "Marumalarchi Dravida Munnetra Kazhagam (MDMK)",
    "color": "#f43f5e",
    "symbol": "Top"
  },
  {
    "id": "ammk",
    "name": "Amma Makkal Munnetra Kazhagam (AMMK)",
    "color": "#8b5cf6",
    "symbol": "Pressure Cooker"
  },
  {
    "id": "mnm",
    "name": "Makkal Needhi Maiam (MNM)",
    "color": "#22d3ee",
    "symbol": "Battery Torch"
  },
  {
    "id": "dk",
    "name": "Dravidar Kazhagam (DK)",
    "color": "#d946ef",
    "symbol": "None (Social org)"
  },
  {
    "id": "dmdk",
    "name": "Desiya Murpokku Dravida Kazhagam (DMDK)",
    "color": "#c084fc",
    "symbol": "Vijayakanth Murasu"
  },
  {
    "id": "tdk",
    "name": "Tamizhaga Desiya Kazhagam (TDK)",
    "color": "#f97316",
    "symbol": "Shield"
  },
  {
    "id": "cpi",
    "name": "Communist Party of India (CPI)",
    "color": "#de2c2c",
    "symbol": "Corn and Sickle"
  },
  {
    "id": "cpm",
    "name": "Communist Party of India (Marxist) (CPM)",
    "color": "#c62828",
    "symbol": "Hammer and Sickle"
  },
  {
    "id": "iuml",
    "name": "Indian Union Muslim League (IUML)",
    "color": "#2e7d32",
    "symbol": "Ladder"
  },
  {
    "id": "ind",
    "name": "Independent / Other",
    "color": "#94a3b8",
    "symbol": "Scales"
  }
];

export const seedAdministrations = [
  {
    "id": 17,
    "name": "17th Assembly (2026-Present)",
    "years": "2026-Present",
    "cm": "Vijay"
  },
  {
    "id": 16,
    "name": "16th Assembly (2021-2026)",
    "years": "2021-2026",
    "cm": "M. K. Stalin"
  },
  {
    "id": 15,
    "name": "15th Assembly (2016-2021)",
    "years": "2016-2021",
    "cm": "J. Jayalalithaa / O. Panneerselvam / E. K. Palaniswami"
  },
  {
    "id": 14,
    "name": "14th Assembly (2011-2016)",
    "years": "2011-2016",
    "cm": "J. Jayalalithaa / O. Panneerselvam"
  },
  {
    "id": 13,
    "name": "13th Assembly (2006-2011)",
    "years": "2006-2011",
    "cm": "M. Karunanidhi"
  },
  {
    "id": 12,
    "name": "12th Assembly (2001-2006)",
    "years": "2001-2006",
    "cm": "J. Jayalalithaa / O. Panneerselvam"
  },
  {
    "id": 11,
    "name": "11th Assembly (1996-2001)",
    "years": "1996-2001",
    "cm": "M. Karunanidhi"
  },
  {
    "id": 10,
    "name": "10th Assembly (1991-1996)",
    "years": "1991-1996",
    "cm": "J. Jayalalithaa"
  },
  {
    "id": 9,
    "name": "9th Assembly (1989-1991)",
    "years": "1989-1991",
    "cm": "M. Karunanidhi"
  },
  {
    "id": 8,
    "name": "8th Assembly (1984-1988)",
    "years": "1984-1988",
    "cm": "M. G. Ramachandran / Janaki Ramachandran"
  },
  {
    "id": 7,
    "name": "7th Assembly (1980-1984)",
    "years": "1980-1984",
    "cm": "M. G. Ramachandran"
  },
  {
    "id": 6,
    "name": "6th Assembly (1977-1980)",
    "years": "1977-1980",
    "cm": "M. G. Ramachandran"
  },
  {
    "id": 5,
    "name": "5th Assembly (1971-1976)",
    "years": "1971-1976",
    "cm": "M. Karunanidhi"
  },
  {
    "id": 4,
    "name": "4th Assembly (1967-1971)",
    "years": "1967-1971",
    "cm": "C. N. Annadurai / M. Karunanidhi"
  },
  {
    "id": 3,
    "name": "3rd Assembly (1962-1967)",
    "years": "1962-1967",
    "cm": "K. Kamaraj / M. Bhaktavatsalam"
  },
  {
    "id": 2,
    "name": "2nd Assembly (1957-1962)",
    "years": "1957-1962",
    "cm": "K. Kamaraj"
  },
  {
    "id": 1,
    "name": "1st Assembly (1952-1957)",
    "years": "1952-1957",
    "cm": "C. Rajagopalachari / K. Kamaraj"
  }
];

const basePoliticians = [
  {
    "id": "mk_stalin",
    "name": "M. K. Stalin",
    "party": "dmk",
    "constituency": "Kolathur",
    "assemblies": [
      9,
      11,
      12,
      13,
      14,
      15,
      16
    ],
    "mlaDetails": {
      "portfolio": "DMK President / Former Chief Minister",
      "assetsValue": 8.9,
      "assetsText": "₹8.9 Crore (declared)",
      "age": 73,
      "history": "Active in politics since his youth; served as Mayor of Chennai (1996-2002), Deputy CM (2009-2011), and CM (2021-2026) before DMK's electoral shift."
    },
    "criminalProfile": {
      "hasCases": true,
      "casesCount": 3,
      "jailTimeText": "Detained under MISA for 1 year during the 1976 Emergency",
      "majorCharges": [
        {
          "charge": "Imprisonment under MISA (1976)",
          "status": "Completed",
          "severity": "high"
        },
        {
          "charge": "Unlawful assembly during political protests",
          "status": "Dismissed/Pending",
          "severity": "low"
        }
      ]
    },
    "partyShifts": [
      {
        "from": "None",
        "to": "dmk",
        "year": 1968,
        "reason": "Began political work in DMK as a teenager under his father Karunanidhi"
      }
    ],
    "goodDeeds": [
      {
        "title": "Free Bus Travel for Women",
        "description": "Launched in 2021, dramatically increasing female mobility, autonomy, and labor force participation."
      },
      {
        "title": "Makkalai Thedi Maruthuvam",
        "description": "Doorstep healthcare scheme that delivers essential medicines and diagnostics directly to remote rural homes."
      },
      {
        "title": "Pudhumai Penn Scheme",
        "description": "Provides \u20b91000/month to government school girls pursuing higher education to prevent dropouts."
      }
    ],
    "badDeeds": [
      {
        "title": "Dynastic Succession Promotion",
        "description": "Inducted and rapidly promoted his son Udhayanidhi Stalin to Deputy CM in 2024, sidelining several senior party veterans."
      },
      {
        "title": "North Chennai Gas Leak Response",
        "description": "Faced protests over slow and inadequate environmental response to gas leak incidents in industrial zones."
      }
    ]
  },
  {
    "id": "j_jayalalithaa",
    "name": "J. Jayalalithaa",
    "party": "aiadmk",
    "constituency": "RK Nagar (last)",
    "assemblies": [
      9,
      10,
      12,
      13,
      14,
      15
    ],
    "mlaDetails": {
      "portfolio": "Former Chief Minister (Six terms, deceased)",
      "assetsValue": 118.0,
      "assetsText": "\u20b9118 Crore (at death)",
      "age": 68,
      "history": "A leading actress who joined politics in 1982 under MGR's mentorship. Rose to lead AIADMK as absolute leader, serving as CM across multiple landslide tenures."
    },
    "criminalProfile": {
      "hasCases": true,
      "casesCount": 4,
      "jailTimeText": "Jailed in 1996 (30 days) and 2014 (21 days) in Bengaluru prison",
      "majorCharges": [
        {
          "charge": "Disproportionate Assets (Wealth Case)",
          "status": "Abated due to death; convicted in trial court",
          "severity": "high"
        },
        {
          "charge": "TANSI Land Acquisition Scam",
          "status": "Acquitted on appeal",
          "severity": "high"
        },
        {
          "charge": "Pleasant Stay Hotel case",
          "status": "Acquitted on appeal",
          "severity": "medium"
        }
      ]
    },
    "partyShifts": [
      {
        "from": "None",
        "to": "aiadmk",
        "year": 1982,
        "reason": "Joined AIADMK under the mentorship of M.G. Ramachandran (MGR)"
      }
    ],
    "goodDeeds": [
      {
        "title": "Amma Canteens",
        "description": "Introduced highly subsidized, clean community canteens serving cheap meals to the urban poor and laborers."
      },
      {
        "title": "Cradle Baby Scheme",
        "description": "Launched in 1992 to combat female infanticide by allowing anonymous adoption dropboxes."
      },
      {
        "title": "Rainwater Harvesting Mandate",
        "description": "Made rainwater harvesting compulsory in all TN buildings in 2001, saving Chennai's water table from collapse."
      }
    ],
    "badDeeds": [
      {
        "title": "Extravagant Foster Son Wedding",
        "description": "Staged a lavish \u20b9100 Crore wedding for Sasikala's nephew Sudhakaran in 1995, triggering the wealth case investigation."
      },
      {
        "title": "Midnight Arrest of Karunanidhi",
        "description": "Ordered the brutal, televised midnight arrest of elderly Karunanidhi in 2001, seen as political vendetta."
      },
      {
        "title": "Authoritarian Press Crackdown",
        "description": "Filed over a hundred defamation suits against journalists and newspapers critical of her cabinet."
      }
    ]
  },
  {
    "id": "m_karunanidhi",
    "name": "M. Karunanidhi",
    "party": "dmk",
    "constituency": "Tiruvarur (last)",
    "assemblies": [
      2,
      3,
      4,
      5,
      6,
      7,
      8,
      9,
      10,
      11,
      12,
      13,
      14,
      15
    ],
    "mlaDetails": {
      "portfolio": "Former Chief Minister (Five terms, deceased)",
      "assetsValue": 80.0,
      "assetsText": "\u20b980 Crore (family estate)",
      "age": 94,
      "history": "A screenwriter who co-founded DMK. Led the party for 50 years. Known as 'Kalaignar' for his literary works and massive reforms."
    },
    "criminalProfile": {
      "hasCases": true,
      "casesCount": 2,
      "jailTimeText": "Arrested in 2001 (midnight arrest) and jailed briefly; spent multiple terms in jail during early anti-Hindi struggles",
      "majorCharges": [
        {
          "charge": "Flyover Construction Scam (2001)",
          "status": "Dropped",
          "severity": "medium"
        },
        {
          "charge": "Sarkaria Commission Allegations (1976)",
          "status": "Dismissed/No conviction",
          "severity": "high"
        }
      ]
    },
    "partyShifts": [
      {
        "from": "Dravidar Kazhagam",
        "to": "dmk",
        "year": 1949,
        "reason": "Co-founded DMK alongside C.N. Annadurai after splitting from Periyar"
      }
    ],
    "goodDeeds": [
      {
        "title": "108 Emergency Ambulance",
        "description": "Introduced the free, centralized emergency ambulance system across the state."
      },
      {
        "title": "MBC 20% Reservation Scheme",
        "description": "Created the Most Backward Classes (MBC) category, ensuring reservation for marginalized communities."
      },
      {
        "title": "Chennai IT Corridor Development",
        "description": "Pioneered the OMR IT expressway, establishing Chennai as a major technology hub."
      }
    ],
    "badDeeds": [
      {
        "title": "Handling of Sri Lankan Civil War",
        "description": "Faced severe criticism in 2009 for failing to pressure the central government to halt the massacre of Tamil civilians in Sri Lanka."
      },
      {
        "title": "Sarkaria Commission Corrupt Indictment",
        "description": "Cabinet dismissed by Indira Gandhi under corruption charges, coined 'scientific corruption'."
      }
    ]
  },
  {
    "id": "m_g_ramachandran",
    "name": "M. G. Ramachandran",
    "party": "aiadmk",
    "constituency": "Andipatti (last)",
    "assemblies": [
      4,
      5,
      6,
      7,
      8
    ],
    "mlaDetails": {
      "portfolio": "Former Chief Minister (1977-1987, deceased)",
      "assetsValue": 20.0,
      "assetsText": "\u20b920 Crore (approx estate)",
      "age": 70,
      "history": "Legendary film actor who broke with DMK to form AIADMK. Ruled undefeated until his death in 1987. Matinee idol of the masses."
    },
    "criminalProfile": {
      "hasCases": false,
      "casesCount": 0,
      "jailTimeText": "Never jailed on criminal charges",
      "majorCharges": []
    },
    "partyShifts": [
      {
        "from": "dmk",
        "to": "aiadmk",
        "year": 1972,
        "reason": "Expelled from DMK after demanding audit audits of party funds; founded AIADMK"
      }
    ],
    "goodDeeds": [
      {
        "title": "Nutritious Midday Meal Scheme",
        "description": "Expanded Kamaraj's meal scheme into a highly nutritious lunch plan, drawing millions of poor children to schools."
      },
      {
        "title": "Women Welfare Subsidies",
        "description": "Introduced free textbooks, uniforms, and specialized bus passes for female students."
      }
    ],
    "badDeeds": [
      {
        "title": "Secret Funding of Militants",
        "description": "Bypassed central foreign policy by directly and secretly funding the LTTE in Sri Lanka with state money."
      },
      {
        "title": "Press Dialogue Censorship",
        "description": "Passed laws restricting media dialogues that mocked or criticized ministers."
      }
    ]
  },
  {
    "id": "edappadi_palaniswami",
    "name": "Edappadi K. Palaniswami",
    "party": "aiadmk",
    "constituency": "Edappadi",
    "assemblies": [
      9,
      11,
      14,
      15,
      16
    ],
    "mlaDetails": {
      "portfolio": "Leader of Opposition, Former CM (2017-2021)",
      "assetsValue": 8.0,
      "assetsText": "\u20b98 Crore (declared)",
      "age": 72,
      "history": "A grassroots AIADMK worker who rose through party ranks. Appointed CM in 2017. Sidelined Sasikala and consolidated his position as sole party leader."
    },
    "criminalProfile": {
      "hasCases": true,
      "casesCount": 2,
      "jailTimeText": "Never jailed",
      "majorCharges": [
        {
          "charge": "Highway Tender Scam (2018)",
          "status": "CBI Probe Stayed",
          "severity": "medium"
        },
        {
          "charge": "Kodanad Estate Heist Conspiracy",
          "status": "Under Investigation",
          "severity": "high"
        }
      ]
    },
    "partyShifts": [
      {
        "from": "None",
        "to": "aiadmk",
        "year": 1974,
        "reason": "Joined party under MGR; consolidated position in Kongu region"
      }
    ],
    "goodDeeds": [
      {
        "title": "7.5% NEET Reservation",
        "description": "Introduced horizontal reservation in medical admissions for government school students, enabling poor students to become doctors."
      },
      {
        "title": "Athikadavu-Avinashi Scheme",
        "description": "Executed a massive water irrigation project for drought-prone areas in western TN."
      }
    ],
    "badDeeds": [
      {
        "title": "Kodanad Estate Break-In",
        "description": "Faced allegations of covering up a break-in, heist, and mysterious murders at Jayalalithaa's Kodanad estate."
      },
      {
        "title": "Tuticorin Sterlite Protest Firing",
        "description": "His administration was heavily condemned in 2018 when police shot and killed 13 environmental protestors in Tuticorin."
      }
    ]
  },
  {
    "id": "v_k_sasikala",
    "name": "V. K. Sasikala",
    "party": "ind",
    "constituency": "None (Never contested)",
    "assemblies": [],
    "mlaDetails": {
      "portfolio": "Former AIADMK General Secretary",
      "assetsValue": 250.0,
      "assetsText": "\u20b9250 Crore (declared)",
      "age": 72,
      "history": "Close aide of Jayalalithaa who lived in Poes Garden. Managed party affairs behind the scenes. Served a 4-year prison term from 2017 to 2021."
    },
    "criminalProfile": {
      "hasCases": true,
      "casesCount": 1,
      "jailTimeText": "Jailed for 4 years in Parappana Agrahara (Bengaluru) from 2017 to 2021",
      "majorCharges": [
        {
          "charge": "Disproportionate Assets (Wealth Case)",
          "status": "Convicted and served full sentence",
          "severity": "high"
        }
      ]
    },
    "partyShifts": [
      {
        "from": "aiadmk",
        "to": "ind",
        "year": 2017,
        "reason": "Expelled from AIADMK by EPS-OPS faction while serving jail term"
      }
    ],
    "goodDeeds": [
      {
        "title": "Poes Garden Administration",
        "description": "Managed Jayalalithaa's household and security during critical illness periods, keeping the administration running."
      }
    ],
    "badDeeds": [
      {
        "title": "Koovathur Resort Hostage Drama",
        "description": "Confined 120 AIADMK MLAs in a beach resort in 2017 to prevent them from voting for rebel OPS."
      },
      {
        "title": "Massive Shell Company Network",
        "description": "Constructed dozens of paper companies to buy up prime real estate across TN using political leverage."
      }
    ]
  },
  {
    "id": "k_annamalai",
    "name": "K. Annamalai",
    "party": "tdk",
    "constituency": "Non-MLA",
    "assemblies": [],
    "mlaDetails": {
      "portfolio": "Tamizhaga Desiya Kazhagam (TDK) Founder / President",
      "assetsValue": 3.0,
      "assetsText": "₹3 Crore (approx)",
      "age": 42,
      "history": "Former Karnataka cadre IPS officer who resigned in 2019. Joined BJP in 2020 and served as State President until 2026, when he split to form Tamizhaga Desiya Kazhagam (TDK)."
    },
    "criminalProfile": {
      "hasCases": true,
      "casesCount": 2,
      "jailTimeText": "Never jailed",
      "majorCharges": [
        {
          "charge": "Defamation and political hate speech",
          "status": "Pending",
          "severity": "low"
        }
      ]
    },
    "partyShifts": [
      {
        "from": "IPS (Police)",
        "to": "bjp",
        "year": 2020,
        "reason": "Resigned from Karnataka Police service to enter national politics"
      },
      {
        "from": "bjp",
        "to": "tdk",
        "year": 2026,
        "reason": "Split from national party to form regional nationalist front Tamizhaga Desiya Kazhagam (TDK)"
      }
    ],
    "goodDeeds": [
      {
        "title": "En Mann En Makkal Padayatra",
        "description": "Conducted a massive 200-day walking tour across all assembly constituencies to highlight rural grievances."
      }
    ],
    "badDeeds": [
      {
        "title": "AIADMK Alliance Rupture",
        "description": "His aggressive attacks on Dravidian stalwarts (Annadurai, MGR) directly caused AIADMK to sever ties with the NDA in 2023."
      },
      {
        "title": "Unsubstantiated Corruption Files",
        "description": "Released the 'DMK Files' listing assets of Stalin's relatives, but faced multiple lawsuits for lack of concrete evidence."
      }
    ]
  },
  {
    "id": "seeman",
    "name": "Seeman",
    "party": "ntk",
    "constituency": "Thiruvottiyur",
    "assemblies": [],
    "mlaDetails": {
      "portfolio": "Chief Coordinator of NTK",
      "assetsValue": 4.0,
      "assetsText": "\u20b94 Crore (approx)",
      "age": 60,
      "history": "Actor and director who co-founded NTK in 2010. Fiery orator who advocates for radical Tamil nationalism, environmental defense, and self-sufficiency."
    },
    "criminalProfile": {
      "hasCases": true,
      "casesCount": 5,
      "jailTimeText": "Jailed briefly multiple times for pro-LTTE speech and street protests",
      "majorCharges": [
        {
          "charge": "Sedition for pro-LTTE speech",
          "status": "Pending",
          "severity": "high"
        },
        {
          "charge": "Blocking Kudankulam Nuclear Plant construction",
          "status": "Pending",
          "severity": "medium"
        }
      ]
    },
    "partyShifts": [
      {
        "from": "dmk supporter",
        "to": "ntk",
        "year": 2010,
        "reason": "Broke with Dravidian parties over the Sri Lankan Tamil genocide; founded NTK"
      }
    ],
    "goodDeeds": [
      {
        "title": "50% Gender Equality Rule",
        "description": "Enforced an absolute 50% candidate selection quota for women in all elections contested by NTK."
      },
      {
        "title": "Environmental Defense Campaigns",
        "description": "Consistently mobilized youth to protest destructive mining and chemical projects in delta districts."
      }
    ],
    "badDeeds": [
      {
        "title": "Extreme Xenophobic Stances",
        "description": "Promotes a controversial ideology that rejects non-native Tamils and migrant laborers from working in TN."
      },
      {
        "title": "LTTE Militant Glorification",
        "description": "Openly glorifies armed struggle and suicide bombings, drawing charges of inciting violence."
      }
    ]
  },
  {
    "id": "vijay",
    "name": "Vijay",
    "party": "tvk",
    "constituency": "Perambur",
    "assemblies": [],
    "mlaDetails": {
      "portfolio": "Chief Minister of Tamil Nadu (2026-Present)",
      "assetsValue": 600.0,
      "assetsText": "\u20b9600+ Crore (Cinema wealth)",
      "age": 51,
      "history": "Superstar of Tamil cinema who has an enormous youth fan base. Launched TVK in 2024, winning Perambur and Trichy East in the 2026 elections. TVK emerged as the single largest party with 108 seats, and Vijay was sworn in as Chief Minister on May 10, 2026."
    },
    "criminalProfile": {
      "hasCases": false,
      "casesCount": 0,
      "jailTimeText": "Never jailed",
      "majorCharges": []
    },
    "partyShifts": [
      {
        "from": "Cinema",
        "to": "tvk",
        "year": 2024,
        "reason": "Formed TVK to enter politics full-time for the 2026 assembly elections"
      }
    ],
    "goodDeeds": [
      {
        "title": "Student Education Subsidies",
        "description": "His fan network (VMI) runs free evening study centers and distributes educational aids to poor children."
      }
    ],
    "badDeeds": [
      {
        "title": "Father-Son Political Dispute",
        "description": "Sued his own father, S.A. Chandrasekhar, in court in 2020 to prevent him from using his name for a political party."
      }
    ]
  },
  {
    "id": "o_panneerselvam",
    "name": "O. Panneerselvam",
    "party": "ind",
    "constituency": "Bodinayakkanur",
    "assemblies": [
      12,
      13,
      14,
      15,
      16
    ],
    "mlaDetails": {
      "portfolio": "Former Deputy CM, Three-time CM",
      "assetsValue": 7.5,
      "assetsText": "\u20b97.5 Crore (declared)",
      "age": 75,
      "history": "A loyalist who served as CM interim placeholder whenever Jayalalithaa was disqualified. Later expelled from AIADMK in 2022 after a power struggle with EPS."
    },
    "criminalProfile": {
      "hasCases": false,
      "casesCount": 0,
      "jailTimeText": "Never jailed",
      "majorCharges": []
    },
    "partyShifts": [
      {
        "from": "aiadmk",
        "to": "ind",
        "year": 2022,
        "reason": "Expelled from AIADMK by EPS faction during leadership coup"
      }
    ],
    "goodDeeds": [
      {
        "title": "Smooth Interim CM Governance",
        "description": "Stepped in as CM during crises (2001, 2014, 2016) and maintained state stability without administrative collapse."
      }
    ],
    "badDeeds": [
      {
        "title": "Dharma Yudhham Memorial Protest",
        "description": "Staged a public rebellion at Jayalalithaa's grave in 2017, splitting the party and stalling government operations."
      }
    ]
  },
  {
    "id": "k_kamaraj",
    "name": "K. Kamaraj",
    "party": "inc",
    "constituency": "Sattur (historical)",
    "assemblies": [
      1,
      2,
      3
    ],
    "mlaDetails": {
      "portfolio": "Former Chief Minister (1954-1963, deceased)",
      "assetsValue": 0.001,
      "assetsText": "\u20b9100 (Died with negligible assets)",
      "age": 72,
      "history": "Renowned Congress leader. Opened thousands of rural schools and introduced the midday meal scheme. Known as 'Kingmaker' in national politics."
    },
    "criminalProfile": {
      "hasCases": false,
      "casesCount": 0,
      "jailTimeText": "Jailed multiple times by British during Indian Independence movement (Total 3000 days)",
      "majorCharges": []
    },
    "partyShifts": [
      {
        "from": "None",
        "to": "inc",
        "year": 1920,
        "reason": "Joined Congress during the freedom struggle"
      }
    ],
    "goodDeeds": [
      {
        "title": "Free Primary Education Scheme",
        "description": "Opened primary schools in every village with a population over 300, drastically increasing literacy."
      },
      {
        "title": "Midday Meal Scheme Launch",
        "description": "Pioneered the first midday meal scheme to feed hungry children and incentivize school attendance."
      },
      {
        "title": "TN Major Dams Construction",
        "description": "Built key reservoirs (Mettur, Lower Bhavani, Vaigai) establishing irrigation across the state."
      }
    ],
    "badDeeds": [
      {
        "title": "Kamaraj Plan Resignation",
        "description": "Forced senior cabinet CMs to resign in 1963 to do party work, which weakened Congress state governments nationally."
      }
    ]
  },
  {
    "id": "c_rajagopalachari",
    "name": "C. Rajagopalachari",
    "party": "ind",
    "constituency": "Madras MLC (historical)",
    "assemblies": [
      1
    ],
    "mlaDetails": {
      "portfolio": "Former CM (1952-1954), Governor-General of India (deceased)",
      "assetsValue": 0.01,
      "assetsText": "Minimal assets",
      "age": 94,
      "history": "Last Governor-General of India and close associate of Mahatma Gandhi. Left Congress in 1959 to form Swatantra Party."
    },
    "criminalProfile": {
      "hasCases": false,
      "casesCount": 0,
      "jailTimeText": "Jailed by British during Satyagraha protests",
      "majorCharges": []
    },
    "partyShifts": [
      {
        "from": "inc",
        "to": "ind",
        "year": 1959,
        "reason": "Left Congress due to socialist disputes with Nehru; founded Swatantra Party"
      }
    ],
    "goodDeeds": [
      {
        "title": "Abolition of Untouchability Act",
        "description": "Passed temple entry authorizations allowing Dalits to enter Hindu temples."
      }
    ],
    "badDeeds": [
      {
        "title": "Kula Kalvi Thittam",
        "description": "Introduced the controversial caste-occupation-based education scheme in 1953, leading to massive protests by Periyar and his resignation."
      }
    ]
  },
  {
    "id": "thol_thirumavalavan",
    "name": "Thol. Thirumavalavan",
    "party": "vck",
    "constituency": "Chidambaram (MP)",
    "assemblies": [
      11
    ],
    "mlaDetails": {
      "portfolio": "Member of Parliament, VCK General Secretary",
      "assetsValue": 1.5,
      "assetsText": "\u20b91.5 Crore",
      "age": 63,
      "history": "A social activist who turned the Dalit Panthers movement into a mainstream electoral party (VCK) to fight caste discrimination."
    },
    "criminalProfile": {
      "hasCases": true,
      "casesCount": 3,
      "jailTimeText": "Jailed briefly multiple times during anti-caste and political protests",
      "majorCharges": [
        {
          "charge": "Inciting street protests and blockades",
          "status": "Pending",
          "severity": "low"
        }
      ]
    },
    "partyShifts": [
      {
        "from": "Dalit Panthers",
        "to": "vck",
        "year": 1989,
        "reason": "Evolved social movement into mainstream electoral party"
      }
    ],
    "goodDeeds": [
      {
        "title": "Dalit Land Rights Mobilization",
        "description": "Led struggles that reclaimed thousands of acres of Panchami lands for landless Dalits in northern TN."
      }
    ],
    "badDeeds": [
      {
        "title": "Alliance Seat Compromises",
        "description": "Faced criticism from Dalit activists for accepting very few seats in coalitions with DMK to maintain power."
      }
    ]
  },
  {
    "id": "s_ramadoss",
    "name": "S. Ramadoss",
    "party": "pmk",
    "constituency": "None (Never contested)",
    "assemblies": [],
    "mlaDetails": {
      "portfolio": "Founder-Leader of PMK",
      "assetsValue": 5.0,
      "assetsText": "\u20b95 Crore (approx)",
      "age": 86,
      "history": "A physician who organized the Vanniyar community reservation agitations in the late 1980s, founding the PMK."
    },
    "criminalProfile": {
      "hasCases": true,
      "casesCount": 2,
      "jailTimeText": "Jailed in 2013 (12 days) over inciting caste riots in Mahabalipuram",
      "majorCharges": [
        {
          "charge": "Incinement of violence and rioting",
          "status": "Acquitted",
          "severity": "high"
        }
      ]
    },
    "partyShifts": [
      {
        "from": "None",
        "to": "pmk",
        "year": 1989,
        "reason": "Founded PMK to represent Vanniyar community after the reservation agitations"
      }
    ],
    "goodDeeds": [
      {
        "title": "Vanniyar 20% Reservation Agitation",
        "description": "Organized massive agitations in 1987, forcing the government to grant 20% MBC reservation."
      }
    ],
    "badDeeds": [
      {
        "title": "Frequent Alliance Swings",
        "description": "Switches alliances between DMK, AIADMK, and BJP every election to maximize seat shares, labeled opportunistic."
      },
      {
        "title": "Incitement of Marakkanam Caste Riots",
        "description": "His speeches in 2013 led to violent clashes, arson, and bus burnings targeting Dalit settlements in Marakkanam."
      }
    ]
  },
  {
    "id": "vaiko",
    "name": "Vaiko",
    "party": "mdmk",
    "constituency": "Rajya Sabha MP",
    "assemblies": [],
    "mlaDetails": {
      "portfolio": "MDMK General Secretary",
      "assetsValue": 5.0,
      "assetsText": "\u20b95 Crore",
      "age": 82,
      "history": "Once DMK's star orator. Expelled in 1994 over a feud with Stalin. Formed MDMK. Highly vocal supporter of Sri Lankan Tamil rights."
    },
    "criminalProfile": {
      "hasCases": true,
      "casesCount": 2,
      "jailTimeText": "Jailed under POTA for 19 months (2002-2004); Jailed in 2009 for sedition",
      "majorCharges": [
        {
          "charge": "Support of banned LTTE under POTA",
          "status": "Released",
          "severity": "high"
        },
        {
          "charge": "Sedition for pro-LTTE speech (2009)",
          "status": "Convicted, sentence suspended on appeal",
          "severity": "high"
        }
      ]
    },
    "partyShifts": [
      {
        "from": "dmk",
        "to": "mdmk",
        "year": 1994,
        "reason": "Expelled from DMK due to growing profile and rivalry with Stalin; founded MDMK"
      }
    ],
    "goodDeeds": [
      {
        "title": "Kalingapatty Alcohol Ban Campaign",
        "description": "Led a massive campaign that shut down state liquor shops in his home village, starting a state-wide prohibition debate."
      }
    ],
    "badDeeds": [
      {
        "title": "Armed Struggle Support",
        "description": "Faced international and domestic condemnation for defending suicide bombing tactics of Sri Lankan Tamil rebels."
      }
    ]
  },
  {
    "id": "udhayanidhi_stalin",
    "name": "Udhayanidhi Stalin",
    "party": "dmk",
    "constituency": "Chepauk-Thiruvallikeni",
    "assemblies": [
      16
    ],
    "mlaDetails": {
      "portfolio": "Deputy Chief Minister (2024-Present), Youth Welfare & Sports Minister",
      "assetsValue": 33.0,
      "assetsText": "\u20b933 Crore (declared)",
      "age": 48,
      "history": "Grandson of Karunanidhi and son of Stalin. Former film actor and producer. Elected as MLA in 2021, inducted into cabinet in 2022, and elevated to Deputy CM in 2024."
    },
    "criminalProfile": {
      "hasCases": true,
      "casesCount": 1,
      "jailTimeText": "Briefly detained during political protests",
      "majorCharges": [
        {
          "charge": "Sanatana Dharma controversial remarks",
          "status": "Pending",
          "severity": "medium"
        }
      ]
    },
    "partyShifts": [
      {
        "from": "Cinema",
        "to": "dmk",
        "year": 2019,
        "reason": "Appointed DMK Youth Wing Secretary, stepping into active politics"
      }
    ],
    "goodDeeds": [
      {
        "title": "Sports Development Schemes",
        "description": "Established sports arenas in rural constituencies and successfully hosted international chess and surfing championships."
      }
    ],
    "badDeeds": [
      {
        "title": "Sanatana Dharma Speech",
        "description": "Made comments comparing Sanatana Dharma to malaria and dengue in 2023, causing national political backlash and legal disputes."
      },
      {
        "title": "Rapid Dynastic Rise",
        "description": "Elevated to Deputy CM in just 3 years as MLA, bypassing many senior DMK ministers with decades of service."
      }
    ]
  },
  {
    "id": "senthil_balaji",
    "name": "V. Senthil Balaji",
    "party": "dmk",
    "constituency": "Karur",
    "assemblies": [
      13,
      14,
      15,
      16
    ],
    "mlaDetails": {
      "portfolio": "Minister for Electricity & Excise (2021-2023, 2024-Present)",
      "assetsValue": 3.5,
      "assetsText": "\u20b93.5 Crore (declared)",
      "age": 50,
      "history": "A powerful politician from Karur. Served as Transport Minister under Jayalalithaa (AIADMK). Arrested by Enforcement Directorate in 2023. Re-induated into cabinet after bail in 2024."
    },
    "criminalProfile": {
      "hasCases": true,
      "casesCount": 4,
      "jailTimeText": "Jailed for 471 days in Puzhal Central Prison (2023-2024)",
      "majorCharges": [
        {
          "charge": "Enforcement Directorate PMLA Cash-for-Jobs Case",
          "status": "Bail granted, pending trial",
          "severity": "high"
        },
        {
          "charge": "Job Racket Scam under IPC 420 (2014)",
          "status": "Pending",
          "severity": "high"
        }
      ]
    },
    "partyShifts": [
      {
        "from": "aiadmk",
        "to": "ammk",
        "year": 2017,
        "reason": "Sided with TTV Dhinakaran after Jayalalithaa's death"
      },
      {
        "from": "ammk",
        "to": "dmk",
        "year": 2018,
        "reason": "Joined DMK under Stalin to regain influence in Kongu region"
      }
    ],
    "goodDeeds": [
      {
        "title": "Karur Water Distribution Works",
        "description": "Resolved drinking water scarcity in rural parts of Karur through specialized pipeline connections."
      }
    ],
    "badDeeds": [
      {
        "title": "Cash for Jobs Transport Scandal",
        "description": "Accused of taking bribes from job aspirants when serving as Transport Minister under AIADMK in 2014."
      },
      {
        "title": "Electricity Bill Hike Defense",
        "description": "Defended steep increases in power tariffs and consumer fees, prompting widespread protests."
      }
    ]
  },
  {
    "id": "kn_nehru",
    "name": "K. N. Nehru",
    "party": "dmk",
    "constituency": "Tiruchirappalli West",
    "assemblies": [
      9,
      10,
      11,
      13,
      15,
      16
    ],
    "mlaDetails": {
      "portfolio": "Minister for Municipal Administration & Water Supply",
      "assetsValue": 28.5,
      "assetsText": "\u20b928.5 Crore (declared)",
      "age": 73,
      "history": "Strongman of the DMK in Trichy district. MLA since 1989 and former Minister for Transport. Currently holds key Municipal Admin portfolio."
    },
    "criminalProfile": {
      "hasCases": true,
      "casesCount": 2,
      "jailTimeText": "Jailed in 2011 (45 days) in land grab cases filed during AIADMK regime",
      "majorCharges": [
        {
          "charge": "Land grabbing allegations (2011)",
          "status": "Acquitted",
          "severity": "medium"
        }
      ]
    },
    "partyShifts": [
      {
        "from": "None",
        "to": "dmk",
        "year": 1970,
        "reason": "Began as a grassroot DMK worker in Trichy under Kalaignar's tenure"
      }
    ],
    "goodDeeds": [
      {
        "title": "Trichy Cauvery Water Scheme",
        "description": "Spearheaded drinking water projects tapping Cauvery riverbeds for Trichy municipality and suburbs."
      }
    ],
    "badDeeds": [
      {
        "title": "Voter Distribution Allegations",
        "description": "Accused of running highly structured money distribution operations in Trichy during local body polls."
      }
    ]
  },
  {
    "id": "sekar_babu",
    "name": "P. K. Sekar Babu",
    "party": "dmk",
    "constituency": "Harbour",
    "assemblies": [
      12,
      13,
      14,
      15,
      16
    ],
    "mlaDetails": {
      "portfolio": "Minister for Hindu Religious & Charitable Endowments (HR&CE)",
      "assetsValue": 4.2,
      "assetsText": "\u20b94.2 Crore",
      "age": 63,
      "history": "Began in AIADMK under Jayalalithaa. Shifted to DMK in 2011. Known for his intense control over North Chennai constituencies and active temple renovation management."
    },
    "criminalProfile": {
      "hasCases": true,
      "casesCount": 3,
      "jailTimeText": "Briefly arrested during political protests",
      "majorCharges": [
        {
          "charge": "Unlawful assembly and blocking traffic",
          "status": "Pending",
          "severity": "low"
        }
      ]
    },
    "partyShifts": [
      {
        "from": "aiadmk",
        "to": "dmk",
        "year": 2011,
        "reason": "Broke with AIADMK leadership over constituency allocation issues"
      }
    ],
    "goodDeeds": [
      {
        "title": "Temple Land Recovery Drive",
        "description": "Recovered over \u20b93000 Crore worth of encroached temple lands and properties back to HR&CE control."
      },
      {
        "title": "Archakar training reforms",
        "description": "Appointed non-Brahmin and female temple priests under Dravidian equality reforms."
      }
    ],
    "badDeeds": [
      {
        "title": "Temple Administration Control Dispute",
        "description": "Criticized by conservative groups for state overreach in religious institutions and temple gold monetization schemes."
      }
    ]
  },
  {
    "id": "k_ponmudy",
    "name": "K. Ponmudy",
    "party": "dmk",
    "constituency": "Tirukkoyilur",
    "assemblies": [
      9,
      10,
      11,
      13,
      14,
      15,
      16
    ],
    "mlaDetails": {
      "portfolio": "Minister for Higher Education",
      "assetsValue": 9.3,
      "assetsText": "\u20b99.3 Crore",
      "age": 75,
      "history": "Senior leader and academician from Villupuram. Convicted in a DA case in December 2023 by Madras High Court, resulting in temporary disqualification. Conviction was stayed by SC in March 2024, reinstating him as minister."
    },
    "criminalProfile": {
      "hasCases": true,
      "casesCount": 2,
      "jailTimeText": "Jailed briefly in 2011 over land grab cases; spent 2 days in custody during wealth probe",
      "majorCharges": [
        {
          "charge": "Disproportionate Assets Case (DA Case)",
          "status": "Conviction stayed by SC, pending final appeal",
          "severity": "high"
        },
        {
          "charge": "Red sand mining quarrying case",
          "status": "Under trial",
          "severity": "high"
        }
      ]
    },
    "partyShifts": [
      {
        "from": "None",
        "to": "dmk",
        "year": 1980,
        "reason": "Academic who joined DMK, quickly rising due to educational policymaking skills"
      }
    ],
    "goodDeeds": [
      {
        "title": "Villupuram University Construction",
        "description": "Established Thiruvalluvar University and several state arts colleges in backward Villupuram districts."
      }
    ],
    "badDeeds": [
      {
        "title": "Disproportionate Assets Conviction",
        "description": "Convicted of acquiring assets 65% beyond his known income source during 2006-2011 ministership."
      },
      {
        "title": "Arrogant Public Behavior",
        "description": "Mocked welfare beneficiaries in public meetings, calling them 'oc-la' (freebie consumers), which went viral."
      }
    ]
  },
  {
    "id": "i_periyasamy",
    "name": "I. Periyasamy",
    "party": "dmk",
    "constituency": "Attur",
    "assemblies": [
      9,
      11,
      12,
      13,
      14,
      15,
      16
    ],
    "mlaDetails": {
      "portfolio": "Minister for Cooperation, former Revenue Minister",
      "assetsValue": 5.1,
      "assetsText": "\u20b95.1 Crore",
      "age": 73,
      "history": "Powerful DMK leader in Dindigul district. Served as Revenue Minister (2006-2011). Underwent corruption inquiries by DVAC, acquitted then reviewed by High Court."
    },
    "criminalProfile": {
      "hasCases": true,
      "casesCount": 1,
      "jailTimeText": "Never jailed",
      "majorCharges": [
        {
          "charge": "Housing Board plot allocation irregularity",
          "status": "Discharged, review pending",
          "severity": "medium"
        }
      ]
    },
    "partyShifts": [
      {
        "from": "None",
        "to": "dmk",
        "year": 1972,
        "reason": "Began as DMK cadre, aligning with Karunanidhi faction during AIADMK split"
      }
    ],
    "goodDeeds": [
      {
        "title": "Cooperative Loan Waiver Schemes",
        "description": "Implemented jewel loan waivers and agricultural loan relief schemes through cooperative banks in 2021."
      }
    ],
    "badDeeds": [
      {
        "title": "DVAC Plot Allocation Scam",
        "description": "Accused of illegally allocating a Chennai housing board plot to Karunanidhi's personal security officer under discretionary quota."
      }
    ]
  },
  {
    "id": "thangam_thennarasu",
    "name": "Thangam Thennarasu",
    "party": "dmk",
    "constituency": "Tiruchuli",
    "assemblies": [
      13,
      14,
      15,
      16
    ],
    "mlaDetails": {
      "portfolio": "Minister for Finance & Human Resources, former Industries Minister",
      "assetsValue": 6.2,
      "assetsText": "\u20b96.2 Crore",
      "age": 60,
      "history": "A soft-spoken, highly-educated minister from Virudhunagar. Handled Industries portfolio, and took over Finance in 2023 when PTR was shifted."
    },
    "criminalProfile": {
      "hasCases": false,
      "casesCount": 0,
      "jailTimeText": "Never jailed",
      "majorCharges": []
    },
    "partyShifts": [
      {
        "from": "None",
        "to": "dmk",
        "year": 1997,
        "reason": "Entered politics following the demise of his father, DMK MLA V. Thangapandian"
      }
    ],
    "goodDeeds": [
      {
        "title": "Industrial Park Investments",
        "description": "Attracted multi-billion dollar electronics and EV automobile investments to SIPCOT parks in Virudhunagar, Krishnagiri and Thoothukudi."
      },
      {
        "title": "Keezhadi Archaeological Excavations",
        "description": "As School Education minister (2006-11), pushed for archaeological funding that unearthed ancient Sangam structures in Keezhadi."
      }
    ],
    "badDeeds": [
      {
        "title": "DVAC Disproportionate Assets Inquiry",
        "description": "Investigated by DVAC during AIADMK rule in 2012, but case was subsequently quashed due to lack of evidence."
      }
    ]
  },
  {
    "id": "anbil_mahesh",
    "name": "Anbil Mahesh Poyyamozhi",
    "party": "dmk",
    "constituency": "Tiruverumbur",
    "assemblies": [
      15,
      16
    ],
    "mlaDetails": {
      "portfolio": "Minister for School Education",
      "assetsValue": 2.6,
      "assetsText": "\u20b92.6 Crore",
      "age": 48,
      "history": "Third-generation DMK politician. Grandson of Anbil Dharmalingam and close friend of Udhayanidhi Stalin. Elected in 2016 and 2021, appointed minister in 2021."
    },
    "criminalProfile": {
      "hasCases": false,
      "casesCount": 0,
      "jailTimeText": "Never jailed",
      "majorCharges": []
    },
    "partyShifts": [
      {
        "from": "None",
        "to": "dmk",
        "year": 2000,
        "reason": "Began youth wing mobilization due to family heritage in Trichy DMK division"
      }
    ],
    "goodDeeds": [
      {
        "title": "Illam Thedi Kalvi Scheme",
        "description": "Implemented the volunteer-led doorstep education program to bridge learning gaps caused by COVID-19."
      },
      {
        "title": "Hi-Tech Labs in Govt Schools",
        "description": "Set up computer labs and smart classrooms in over 6,000 government schools."
      }
    ],
    "badDeeds": [
      {
        "title": "Teacher Salary Protest Stances",
        "description": "Criticized for failing to implement electoral promises of equal pay for equal work for government teachers, leading to protests."
      }
    ]
  },
  {
    "id": "ma_subramanian",
    "name": "Ma. Subramanian",
    "party": "dmk",
    "constituency": "Saidapet",
    "assemblies": [
      14,
      15,
      16
    ],
    "mlaDetails": {
      "portfolio": "Minister for Health & Family Welfare, former Mayor of Chennai",
      "assetsValue": 6.8,
      "assetsText": "\u20b96.8 Crore",
      "age": 66,
      "history": "Long-time DMK worker. Mayor of Chennai (2006-2011). Appointed Health Minister in 2021, leading the state's post-second-wave COVID-19 management. Passionate marathon runner."
    },
    "criminalProfile": {
      "hasCases": true,
      "casesCount": 1,
      "jailTimeText": "Never jailed",
      "majorCharges": [
        {
          "charge": "Encroaching on housing board land (Guindy)",
          "status": "Acquitted",
          "severity": "medium"
        }
      ]
    },
    "partyShifts": [
      {
        "from": "None",
        "to": "dmk",
        "year": 1976,
        "reason": "Joined DMK student wing as a youth worker in Saidapet"
      }
    ],
    "goodDeeds": [
      {
        "title": "Mega Vaccination Camps",
        "description": "Conducted state-wide vaccination drives that successfully vaccinated over 95% of TN adults during the COVID pandemic."
      },
      {
        "title": "Inniyavai Kaappom Scheme",
        "description": "Launched emergency golden hour medical aid coverage up to \u20b91 Lakh for accident victims regardless of nationality."
      }
    ],
    "badDeeds": [
      {
        "title": "Guindy Land Allotment Feud",
        "description": "Accused of illegally using political influence to construct a private mansion on SIDCO/Housing board land in Guindy."
      }
    ]
  },
  {
    "id": "ev_velu",
    "name": "E. V. Velu",
    "party": "dmk",
    "constituency": "Tiruvannamalai",
    "assemblies": [
      12,
      13,
      14,
      15,
      16
    ],
    "mlaDetails": {
      "portfolio": "Minister for Public Works, Highways and Minor Ports",
      "assetsValue": 22.3,
      "assetsText": "\u20b922.3 Crore",
      "age": 75,
      "history": "Began political life in AIADMK under MGR. Switched to DMK in 1997. Built a massive education empire in Tiruvannamalai. DVAC and Income Tax department conducted multiple raids on his properties."
    },
    "criminalProfile": {
      "hasCases": true,
      "casesCount": 1,
      "jailTimeText": "Never jailed",
      "majorCharges": [
        {
          "charge": "Disproportionate assets DVAC investigation",
          "status": "DVAC enquiry, pending charge sheet",
          "severity": "high"
        }
      ]
    },
    "partyShifts": [
      {
        "from": "aiadmk",
        "to": "dmk",
        "year": 1997,
        "reason": "Expelled from AIADMK during Jayalalithaa's reorganization; joined DMK"
      }
    ],
    "goodDeeds": [
      {
        "title": "Tiruvannamalai Girivalam Pathway",
        "description": "Renovated and expanded the holy walkaway around Tiruvannamalai hill with street lights and basic facilities."
      }
    ],
    "badDeeds": [
      {
        "title": "Massive Income Tax Raids",
        "description": "Subjected to IT raids in 2021 and 2023 across 80 locations including his educational trust over unaccounted money."
      },
      {
        "title": "Highway Tender Favoritism",
        "description": "Faced allegations of awarding major government highway and bypass tenders to companies owned by his close relatives."
      }
    ]
  },
  {
    "id": "s_muthusamy",
    "name": "S. Muthusamy",
    "party": "dmk",
    "constituency": "Erode West",
    "assemblies": [
      6,
      7,
      8,
      9,
      14,
      16
    ],
    "mlaDetails": {
      "portfolio": "Minister for Housing and Urban Development",
      "assetsValue": 4.8,
      "assetsText": "\u20b94.8 Crore",
      "age": 78,
      "history": "A veteran politician from Erode. Served as Transport and Health Minister under MGR (AIADMK) in 1977. Switched to DMK in 2010. Respected for administrative experience."
    },
    "criminalProfile": {
      "hasCases": false,
      "casesCount": 0,
      "jailTimeText": "Never jailed",
      "majorCharges": []
    },
    "partyShifts": [
      {
        "from": "aiadmk",
        "to": "dmk",
        "year": 2010,
        "reason": "Left AIADMK after dispute with local leadership over district control"
      }
    ],
    "goodDeeds": [
      {
        "title": "Erode Ring Road Project",
        "description": "Initiated and completed Erode city's bypass ring road, reducing heavy vehicle traffic congestion."
      }
    ],
    "badDeeds": [
      {
        "title": "TASMAC Bar Bribery Claims",
        "description": "Briefly held Excise portfolio where he faced allegations from bar owners of demanding monthly bribe quotas."
      }
    ]
  },
  {
    "id": "ptr",
    "name": "Palanivel Thiaga Rajan (PTR)",
    "party": "dmk",
    "constituency": "Madurai Central",
    "assemblies": [
      15,
      16
    ],
    "mlaDetails": {
      "portfolio": "Minister for Information Technology and Digital Services, former Finance Minister",
      "assetsValue": 29.0,
      "assetsText": "\u20b929 Crore",
      "age": 60,
      "history": "Former international investment banker (Lehman Brothers, Standard Chartered). Grandson of P.T. Rajan (Justice Party CM). Served as TN Finance Minister (2021-2023), before being shifted to IT after audio tape leak."
    },
    "criminalProfile": {
      "hasCases": false,
      "casesCount": 0,
      "jailTimeText": "Never jailed",
      "majorCharges": []
    },
    "partyShifts": [
      {
        "from": "Banking",
        "to": "dmk",
        "year": 2015,
        "reason": "Returned from abroad to continue family political legacy in Madurai Justice Party lineage"
      }
    ],
    "goodDeeds": [
      {
        "title": "TN Revenue Deficit Reduction",
        "description": "Successfully reduced the state's revenue deficit by \u20b915,000 Crore in his first budget through financial restructuring."
      },
      {
        "title": "Transparent Budgeting Reforms",
        "description": "Digitized treasury records and implemented transparent data systems to track leaks in local allocations."
      }
    ],
    "badDeeds": [
      {
        "title": "Leaked Audio Tape Controversy",
        "description": "An audio clip leaked in 2023 allegedly featured PTR discussing \u20b930,000 Crore corruption by Stalin's family, leading to his removal as Finance Minister."
      },
      {
        "title": "Abrasive Public Debates",
        "description": "Known for direct, sarcastic verbal clashes with bureaucrats and opposition leaders, sometimes labeled elitist."
      }
    ]
  },
  {
    "id": "kkssr_ramachandran",
    "name": "KKSSR Ramachandran",
    "party": "dmk",
    "constituency": "Aruppukottai",
    "assemblies": [
      7,
      8,
      9,
      10,
      12,
      13,
      14,
      15,
      16
    ],
    "mlaDetails": {
      "portfolio": "Minister for Revenue and Disaster Management",
      "assetsValue": 12.5,
      "assetsText": "\u20b912.5 Crore",
      "age": 78,
      "history": "Senior leader from Virudhunagar, popularly known as 'District Board'. Began with AIADMK under MGR, shifted to DMK in 1997. Holds major sway in southern districts."
    },
    "criminalProfile": {
      "hasCases": true,
      "casesCount": 1,
      "jailTimeText": "Never jailed",
      "majorCharges": [
        {
          "charge": "Disproportionate assets DVAC investigation",
          "status": "Acquitted",
          "severity": "high"
        }
      ]
    },
    "partyShifts": [
      {
        "from": "aiadmk",
        "to": "dmk",
        "year": 1997,
        "reason": "Rebelled against Jayalalithaa after election defeat, joining DMK"
      }
    ],
    "goodDeeds": [
      {
        "title": "Disaster Relief Automation",
        "description": "Modernized flood and cyclone warning systems and disbursed relief directly to bank accounts within 48 hours."
      }
    ],
    "badDeeds": [
      {
        "title": "Slapping a Petitioner",
        "description": "Filmed hitting a poor village woman on the head with a petition paper in 2022, causing public outrage."
      }
    ]
  },
  {
    "id": "duraimurugan",
    "name": "Duraimurugan",
    "party": "dmk",
    "constituency": "Katpadi",
    "assemblies": [
      5,
      6,
      7,
      8,
      9,
      11,
      12,
      13,
      14,
      15,
      16
    ],
    "mlaDetails": {
      "portfolio": "Minister for Water Resources, DMK General Secretary",
      "assetsValue": 10.5,
      "assetsText": "\u20b910.5 Crore",
      "age": 87,
      "history": "DMK veteran. First elected as MLA in 1971, serving 10 terms. Known for his unmatched wit and procedural expertise in the Tamil Nadu Assembly."
    },
    "criminalProfile": {
      "hasCases": true,
      "casesCount": 1,
      "jailTimeText": "Never jailed",
      "majorCharges": [
        {
          "charge": "Vellore MP Election cash storage (2019)",
          "status": "Pending DVAC",
          "severity": "medium"
        }
      ]
    },
    "partyShifts": [
      {
        "from": "None",
        "to": "dmk",
        "year": 1965,
        "reason": "Student leader who joined DMK during anti-Hindi agitations"
      }
    ],
    "goodDeeds": [
      {
        "title": "Hogenakkal Drinking Water Project",
        "description": "As PWD minister, executed the Hogenakkal water scheme supplying fluoride-free water to Dharmapuri districts."
      }
    ],
    "badDeeds": [
      {
        "title": "Vellore Cash Seizure Raid",
        "description": "Income Tax raids at his house in 2019 seized \u20b911 Crore in cash linked to his son's MP election campaign, stalling polls."
      }
    ]
  },
  {
    "id": "a_raja",
    "name": "A. Raja",
    "party": "dmk",
    "constituency": "Nilgiris (MP)",
    "assemblies": [],
    "mlaDetails": {
      "portfolio": "Member of Parliament, DMK Deputy General Secretary",
      "assetsValue": 4.8,
      "assetsText": "\u20b94.8 Crore",
      "age": 63,
      "history": "Former Union Minister for Telecom. Arrested in 2011 in connection with the 2G Spectrum allocation case. Spent 15 months in Tihar jail. Acquitted by CBI special court in 2017."
    },
    "criminalProfile": {
      "hasCases": true,
      "casesCount": 1,
      "jailTimeText": "Jailed in Tihar jail for 15 months (2011-2012)",
      "majorCharges": [
        {
          "charge": "2G Spectrum Allocation Scam",
          "status": "Acquitted, CBI appeal pending",
          "severity": "high"
        }
      ]
    },
    "partyShifts": [
      {
        "from": "None",
        "to": "dmk",
        "year": 1989,
        "reason": "Began as DMK advocate and student wing leader in Perambalur"
      }
    ],
    "goodDeeds": [
      {
        "title": "Mobile Connectivity Expansion",
        "description": "As Telecom Minister, introduced policies that drove down mobile call tariffs to the lowest rates in the world."
      }
    ],
    "badDeeds": [
      {
        "title": "2G Spectrum Scam Arrest",
        "description": "Charged with causing a presumptive loss of \u20b91.76 Lakh Crore to the exchequer, creating a massive national scandal."
      },
      {
        "title": "Anti-Hindu Speech Controversy",
        "description": "Made comments criticizing Hindu caste structures in 2022, leading to BJP protests and cases."
      }
    ]
  },
  {
    "id": "kanimozhi",
    "name": "Kanimozhi Karunanidhi",
    "party": "dmk",
    "constituency": "Thoothukudi (MP)",
    "assemblies": [],
    "mlaDetails": {
      "portfolio": "Member of Parliament, DMK Deputy General Secretary",
      "assetsValue": 30.2,
      "assetsText": "\u20b930.2 Crore",
      "age": 58,
      "history": "Daughter of Karunanidhi. Poet, journalist, and activist. Arrested in 2011 in connection with the 2G case (Kalaignar TV transaction). Spent 6 months in Tihar jail. Acquitted in 2017."
    },
    "criminalProfile": {
      "hasCases": true,
      "casesCount": 1,
      "jailTimeText": "Jailed for 6 months in Tihar jail in 2011",
      "majorCharges": [
        {
          "charge": "2G money laundering conspiracy (Kalaignar TV transaction)",
          "status": "Acquitted, appeal pending",
          "severity": "high"
        }
      ]
    },
    "partyShifts": [
      {
        "from": "Journalism",
        "to": "dmk",
        "year": 2007,
        "reason": "Nominated to Rajya Sabha by Karunanidhi, managing DMK's English press face"
      }
    ],
    "goodDeeds": [
      {
        "title": "DMK Women Wing Mobilization",
        "description": "Formulated policies for women's representation and ran campaigns against domestic violence."
      },
      {
        "title": "Thoothukudi Development",
        "description": "Funded local smart class setups, water desiltation, and harbor logistics in her constituency."
      }
    ],
    "badDeeds": [
      {
        "title": "2G Case Imprisonment",
        "description": "Accused of facilitating \u20b9200 Crore kickbacks from DB Realty to Kalaignar TV, damaging party reputation."
      }
    ]
  },
  {
    "id": "tr_baalu",
    "name": "T. R. Baalu",
    "party": "dmk",
    "constituency": "Sriperumbudur (MP)",
    "assemblies": [],
    "mlaDetails": {
      "portfolio": "Member of Parliament, DMK Treasurer, former Union PWD Minister",
      "assetsValue": 14.5,
      "assetsText": "\u20b914.5 Crore",
      "age": 84,
      "history": "Veteran DMK leader and loyalist. Served as Union Minister for Shipping, Road Transport, and Highways (2004-2009)."
    },
    "criminalProfile": {
      "hasCases": false,
      "casesCount": 0,
      "jailTimeText": "Never jailed on criminal charges",
      "majorCharges": []
    },
    "partyShifts": [
      {
        "from": "None",
        "to": "dmk",
        "year": 1957,
        "reason": "Joined DMK under Annadurai, active in student struggles"
      }
    ],
    "goodDeeds": [
      {
        "title": "Golden Quadrilateral TN Highway Linkages",
        "description": "As Union Minister, secured national highway connectivity and expressways across TN."
      }
    ],
    "badDeeds": [
      {
        "title": "Sethusamudram Canal Controversy",
        "description": "Pushed for dredging Rama's Bridge (Adam's Bridge) under the Sethusamudram project, sparking religious protests."
      }
    ]
  },
  {
    "id": "mk_alagiri",
    "name": "M. K. Alagiri",
    "party": "ind",
    "constituency": "Madurai (former)",
    "assemblies": [],
    "mlaDetails": {
      "portfolio": "Former Union Minister of Chemicals & Fertilizers, Expelled DMK Leader",
      "assetsValue": 20.5,
      "assetsText": "\u20b920.5 Crore",
      "age": 75,
      "history": "Eldest son of Karunanidhi. Based in Madurai, he controlled DMK's southern TN operations. Expelled from DMK in 2014 by Karunanidhi for anti-party activities and rivalry with Stalin."
    },
    "criminalProfile": {
      "hasCases": true,
      "casesCount": 1,
      "jailTimeText": "Briefly detained during investigations",
      "majorCharges": [
        {
          "charge": "T. Kiruttinan murder case conspiracy",
          "status": "Acquitted",
          "severity": "high"
        }
      ]
    },
    "partyShifts": [
      {
        "from": "dmk",
        "to": "ind",
        "year": 2014,
        "reason": "Expelled from DMK due to leadership clash with Stalin and factional rebellion"
      }
    ],
    "goodDeeds": [
      {
        "title": "Madurai IT Park Creation",
        "description": "Lobbied for infrastructure that established the ELCOT IT park in Madurai."
      }
    ],
    "badDeeds": [
      {
        "title": "Thirumangalam Formula",
        "description": "Accused of pioneering the systematic cash-for-votes formula during the 2009 Thirumangalam by-election."
      },
      {
        "title": "Dinakaran Office Arson Attack",
        "description": "His supporters attacked the Dinakaran newspaper office in Madurai in 2007 over a survey showing Stalin as preferred successor, killing 3 staff."
      }
    ]
  },
  {
    "id": "rb_udhayakumar",
    "name": "R. B. Udhayakumar",
    "party": "aiadmk",
    "constituency": "Thirumangalam",
    "assemblies": [
      14,
      15,
      16
    ],
    "mlaDetails": {
      "portfolio": "Deputy Leader of Opposition, former Revenue Minister",
      "assetsValue": 3.2,
      "assetsText": "\u20b93.2 Crore",
      "age": 52,
      "history": "AIADMK leader from Madurai. Served as Revenue and Disaster Management Minister under Jayalalithaa and EPS. Outspoken critic of DMK governance."
    },
    "criminalProfile": {
      "hasCases": false,
      "casesCount": 0,
      "jailTimeText": "Never jailed",
      "majorCharges": []
    },
    "partyShifts": [
      {
        "from": "None",
        "to": "aiadmk",
        "year": 1992,
        "reason": "Joined student wing of AIADMK under Jayalalithaa"
      }
    ],
    "goodDeeds": [
      {
        "title": "Disaster Response Center Setup",
        "description": "Set up the State Emergency Operations Center and modernized the state's first responder network."
      }
    ],
    "badDeeds": [
      {
        "title": "Jaya Deification Acts",
        "description": "Faced criticism for performing extreme deification acts (rolling on floors, shaving head) for Jayalalithaa during her trial."
      }
    ]
  },
  {
    "id": "sp_velumani",
    "name": "S. P. Velumani",
    "party": "aiadmk",
    "constituency": "Thondamuthur",
    "assemblies": [
      13,
      14,
      15,
      16
    ],
    "mlaDetails": {
      "portfolio": "Former Minister for Municipal Administration, Rural Development",
      "assetsValue": 9.2,
      "assetsText": "\u20b99.2 Crore",
      "age": 57,
      "history": "Strongman of the AIADMK in Coimbatore/Kongu belt. Handled the key Municipal Admin portfolio under EPS. Multiple corruption cases and DVAC raids conducted."
    },
    "criminalProfile": {
      "hasCases": true,
      "casesCount": 3,
      "jailTimeText": "Never jailed",
      "majorCharges": [
        {
          "charge": "Coimbatore Corporation Smart City Tender Corruption",
          "status": "Under DVAC Investigation",
          "severity": "high"
        },
        {
          "charge": "Chennai Corporation Streetlight LED Tender graft",
          "status": "Under Investigation",
          "severity": "high"
        }
      ]
    },
    "partyShifts": [
      {
        "from": "None",
        "to": "aiadmk",
        "year": 1989,
        "reason": "Joined AIADMK, backing Jayalalithaa faction in western TN"
      }
    ],
    "goodDeeds": [
      {
        "title": "Coimbatore Infrastructure Expansion",
        "description": "Constructed multi-level flyovers and executed drinking water distribution works in Coimbatore city."
      }
    ],
    "badDeeds": [
      {
        "title": "Tender Corruption & Favoritism",
        "description": "Accused of awarding municipal corporation construction and streetlight tenders worth \u20b9800 Crore to shell companies owned by his brother and close aides."
      }
    ]
  },
  {
    "id": "c_ve_shanmugam",
    "name": "C. Ve. Shanmugam",
    "party": "aiadmk",
    "constituency": "Villupuram",
    "assemblies": [
      12,
      13,
      14,
      15,
      16
    ],
    "mlaDetails": {
      "portfolio": "Rajya Sabha MP, former Law Minister",
      "assetsValue": 5.6,
      "assetsText": "\u20b95.6 Crore",
      "age": 61,
      "history": "Powerful AIADMK leader in northern TN. Served as Law Minister (2016-2021). Known for aggressive speeches targeting DMK."
    },
    "criminalProfile": {
      "hasCases": true,
      "casesCount": 1,
      "jailTimeText": "Briefly detained during political agitations",
      "majorCharges": [
        {
          "charge": "Political clash with DMK cadre",
          "status": "Pending",
          "severity": "low"
        }
      ]
    },
    "partyShifts": [
      {
        "from": "None",
        "to": "aiadmk",
        "year": 1985,
        "reason": "Entered politics through student wing under MGR's guidance"
      }
    ],
    "goodDeeds": [
      {
        "title": "Government Law Colleges Expansion",
        "description": "Sanctioned and opened six new government law colleges in rural areas of TN during his tenure as Law Minister."
      }
    ],
    "badDeeds": [
      {
        "title": "Vanniyar Reservation Rushed Bill",
        "description": "Rushed a 10.5% internal reservation bill for Vanniyars hours before the 2021 election code of conduct, which was later struck down by the Supreme Court."
      }
    ]
  },
  {
    "id": "p_thangamani",
    "name": "P. Thangamani",
    "party": "aiadmk",
    "constituency": "Kumarapalayam",
    "assemblies": [
      13,
      14,
      15,
      16
    ],
    "mlaDetails": {
      "portfolio": "Former Minister for Electricity and Prohibition",
      "assetsValue": 7.1,
      "assetsText": "\u20b97.1 Crore",
      "age": 68,
      "history": "Close confidant of EPS. Served as Electricity Minister (2016-2021). DVAC raided his properties over disproportionate assets."
    },
    "criminalProfile": {
      "hasCases": true,
      "casesCount": 2,
      "jailTimeText": "Never jailed",
      "majorCharges": [
        {
          "charge": "Disproportionate assets and money laundering DVAC enquiry",
          "status": "DVAC enquiry, pending charge sheet",
          "severity": "high"
        }
      ]
    },
    "partyShifts": [
      {
        "from": "None",
        "to": "aiadmk",
        "year": 1980,
        "reason": "Began as local worker in Namakkal AIADMK branch"
      }
    ],
    "goodDeeds": [
      {
        "title": "Solar Power Parks Setups",
        "description": "Initiated long-term solar power purchase agreements to diversify Tamil Nadu's energy grid."
      }
    ],
    "badDeeds": [
      {
        "title": "Coal Import Corruption Allegations",
        "description": "Accused of importing low-quality coal at inflated prices, causing a loss of crores of rupees to TANGEDCO."
      }
    ]
  },
  {
    "id": "kp_anbalagan",
    "name": "K. P. Anbalagan",
    "party": "aiadmk",
    "constituency": "Palacode",
    "assemblies": [
      12,
      13,
      14,
      15,
      16
    ],
    "mlaDetails": {
      "portfolio": "Former Minister for Higher Education",
      "assetsValue": 8.6,
      "assetsText": "\u20b98.6 Crore",
      "age": 66,
      "history": "AIADMK leader from Dharmapuri. Handled Higher Education portfolio under EPS. Properties raided by DVAC."
    },
    "criminalProfile": {
      "hasCases": true,
      "casesCount": 2,
      "jailTimeText": "Never jailed",
      "majorCharges": [
        {
          "charge": "DVAC disproportionate assets case (declared assets mismatch)",
          "status": "DVAC investigation",
          "severity": "high"
        }
      ]
    },
    "partyShifts": [
      {
        "from": "None",
        "to": "aiadmk",
        "year": 1982,
        "reason": "Joined AIADMK under MGR's tenure, active in Dharmapuri region"
      }
    ],
    "goodDeeds": [
      {
        "title": "Dharmapuri Arts College building expansions",
        "description": "Upgraded government colleges in backward tribal belt of Dharmapuri and Hogenakkal."
      }
    ],
    "badDeeds": [
      {
        "title": "DVAC Assets Accumulation Raid",
        "description": "DVAC raids in 2022 uncovered unaccounted assets valued at \u20b911 Crore accumulated during his ministership."
      }
    ]
  },
  {
    "id": "anbumani_ramadoss",
    "name": "Anbumani Ramadoss",
    "party": "pmk",
    "constituency": "Dharmapuri (former MP)",
    "assemblies": [],
    "mlaDetails": {
      "portfolio": "President of PMK, former Union Health Minister (2004-2009)",
      "assetsValue": 3.9,
      "assetsText": "\u20b93.9 Crore",
      "age": 57,
      "history": "Son of PMK founder S. Ramadoss. Served as Union Health Minister under UPA-1. Credited with introducing the national ban on smoking in public places."
    },
    "criminalProfile": {
      "hasCases": true,
      "casesCount": 2,
      "jailTimeText": "Jailed briefly in 2013 over political protests",
      "majorCharges": [
        {
          "charge": "Indore Medical College clearance irregularity (CBI case)",
          "status": "Discharged by court",
          "severity": "high"
        }
      ]
    },
    "partyShifts": [
      {
        "from": "None",
        "to": "pmk",
        "year": 1995,
        "reason": "Assumed leadership of PMK youth wing to modernize the party image"
      }
    ],
    "goodDeeds": [
      {
        "title": "Public Smoking Ban (2008)",
        "description": "Implemented a landmark ban on smoking in all public places in India, saving countless lives."
      },
      {
        "title": "108 Ambulance National Launch",
        "description": "As Union Minister, funded and scaled the 108 emergency model across multiple states in India."
      }
    ],
    "badDeeds": [
      {
        "title": "CBI Indore College Case",
        "description": "Accused of illegally giving permissions to Index Medical College in Indore despite infrastructure deficiencies."
      }
    ]
  },
  {
    "id": "ttv_dhinakaran",
    "name": "T. T. V. Dhinakaran",
    "party": "ammk",
    "constituency": "Kovilpatti",
    "assemblies": [
      15,
      16
    ],
    "mlaDetails": {
      "portfolio": "General Secretary of AMMK, former RK Nagar MLA",
      "assetsValue": 10.2,
      "assetsText": "\u20b910.2 Crore",
      "age": 62,
      "history": "Nephew of V.K. Sasikala. Expelled from AIADMK in 2017. Won the high-profile RK Nagar bypoll as an independent in 2017. Founded AMMK in 2018."
    },
    "criminalProfile": {
      "hasCases": true,
      "casesCount": 2,
      "jailTimeText": "Detained under COFEPOSA in 1996; arrested in 2017 over Election Commission bribery case",
      "majorCharges": [
        {
          "charge": "FEMA violation cases by Enforcement Directorate",
          "status": "Under trial",
          "severity": "high"
        },
        {
          "charge": "Two Leaves Symbol Bribery Case (Delhi Police)",
          "status": "Pending trial",
          "severity": "high"
        }
      ]
    },
    "partyShifts": [
      {
        "from": "aiadmk",
        "to": "ammk",
        "year": 2018,
        "reason": "Expelled from AIADMK by EPS-OPS faction; founded AMMK"
      }
    ],
    "goodDeeds": [
      {
        "title": "RK Nagar Bypoll Victory",
        "description": "Defeated both DMK and AIADMK in a direct electoral battle as an independent candidate in 2017."
      }
    ],
    "badDeeds": [
      {
        "title": "EC Two-Leaves Bribe Scam",
        "description": "Accused of hiring middleman Sukesh Chandrashekhar to bribe Election Commission officials to secure the 'Two Leaves' symbol."
      }
    ]
  },
  {
    "id": "kamal_haasan",
    "name": "Kamal Haasan",
    "party": "mnm",
    "constituency": "Coimbatore South (lost)",
    "assemblies": [],
    "mlaDetails": {
      "portfolio": "President of Makkal Needhi Maiam (MNM)",
      "assetsValue": 176.0,
      "assetsText": "\u20b9176 Crore (declared)",
      "age": 71,
      "history": "Legendary actor, screenwriter, and filmmaker. Founded MNM in 2018 to offer a centrist alternative to Dravidian parties. Contested Coimbatore South in 2021, losing by a narrow margin of 1,728 votes to BJP."
    },
    "criminalProfile": {
      "hasCases": false,
      "casesCount": 0,
      "jailTimeText": "Never jailed",
      "majorCharges": []
    },
    "partyShifts": [
      {
        "from": "Cinema",
        "to": "mnm",
        "year": 2018,
        "reason": "Founded MNM to provide clean, centrist governance free of corruption"
      }
    ],
    "goodDeeds": [
      {
        "title": "Disaster Relief Operations",
        "description": "His fan welfare association (Narpani Iyakkam) regularly conducts blood drives and provided relief during the Chennai floods."
      }
    ],
    "badDeeds": [
      {
        "title": "Opportunistic DMK Alignment",
        "description": "Criticized for forming an alliance with DMK in 2024 (receiving one Rajya Sabha seat nomination) after campaigning against them as corrupt."
      }
    ]
  },
  {
    "id": "cn_annadurai",
    "name": "C. N. Annadurai",
    "party": "dmk",
    "constituency": "Madras MLC (historical)",
    "assemblies": [
      2,
      3
    ],
    "mlaDetails": {
      "portfolio": "First Dravidian CM of Tamil Nadu (1967-1969, deceased)",
      "assetsValue": 0.05,
      "assetsText": "Negligible assets",
      "age": 59,
      "history": "DMK founder and intellectual writer, affectionately known as 'Anna' (Elder Brother). Led the first Dravidian government in Madras State. Renamed the state to Tamil Nadu."
    },
    "criminalProfile": {
      "hasCases": false,
      "casesCount": 0,
      "jailTimeText": "Jailed multiple times by Congress government for anti-Hindi agitations",
      "majorCharges": []
    },
    "partyShifts": [
      {
        "from": "Dravidar Kazhagam",
        "to": "dmk",
        "year": 1949,
        "reason": "Broke away from Periyar over ideological and marriage disputes; founded DMK"
      }
    ],
    "goodDeeds": [
      {
        "title": "State Renaming to Tamil Nadu",
        "description": "Officially renamed Madras State to 'Tamil Nadu' in 1969, fulfilling a long-standing Dravidian demand."
      },
      {
        "title": "Two-Language Policy Mandate",
        "description": "Legally established Tamil and English in the state, removing Hindi from government school curricula."
      }
    ],
    "badDeeds": [
      {
        "title": "Secessionist Dravida Nadu Stance",
        "description": "Early advocate for a separate Dravida Nadu state, which he later dropped due to national security laws."
      }
    ]
  },
  {
    "id": "periyar",
    "name": "Periyar E. V. Ramasamy",
    "party": "dk",
    "constituency": "None (Never contested)",
    "assemblies": [],
    "mlaDetails": {
      "portfolio": "Founder of Dravidar Kazhagam (Self-Respect movement, deceased)",
      "assetsValue": 0.1,
      "assetsText": "Minimal assets",
      "age": 94,
      "history": "Social reformer, rationalist, father of the Dravidian movement. Started the Self-Respect movement in 1925 to eradicate caste hierarchies and empower women. Refused to enter electoral politics."
    },
    "criminalProfile": {
      "hasCases": false,
      "casesCount": 0,
      "jailTimeText": "Imprisoned multiple times by British and Congress regimes for rationalist campaigns",
      "majorCharges": []
    },
    "partyShifts": [
      {
        "from": "inc",
        "to": "ind",
        "year": 1925,
        "reason": "Resigned from Congress over their refusal to accept communal reservations for non-Brahmins"
      }
    ],
    "goodDeeds": [
      {
        "title": "Self-Respect Marriages Act",
        "description": "Pioneered contract marriages without priests or religious rites, later legalized by Anna in 1967."
      },
      {
        "title": "Vaikom Satyagraha Victory",
        "description": "Led the famous Vaikom temple street entry struggle in Kerala (1924-25), earning the title 'Vaikom Veerar'."
      }
    ],
    "badDeeds": [
      {
        "title": "Radical anti-religious agitations",
        "description": "His public campaigns breaking Ganesha idols and slipper-garlanding Rama images deeply offended believers."
      }
    ]
  },
  {
    "id": "janaki_ramachandran",
    "name": "Janaki Ramachandran",
    "party": "aiadmk",
    "constituency": "Andipatti",
    "assemblies": [
      8
    ],
    "mlaDetails": {
      "portfolio": "First Female Chief Minister of Tamil Nadu (1988, deceased)",
      "assetsValue": 2.0,
      "assetsText": "\u20b92 Crore (approx)",
      "age": 73,
      "history": "Former actress and wife of MGR. Appointed CM in January 1988 following MGR's death. Her government lasted only 24 days before being dismissed."
    },
    "criminalProfile": {
      "hasCases": false,
      "casesCount": 0,
      "jailTimeText": "Never jailed",
      "majorCharges": []
    },
    "partyShifts": [
      {
        "from": "None",
        "to": "aiadmk",
        "year": 1987,
        "reason": "Entered politics to lead the MGR loyalist faction after his death"
      }
    ],
    "goodDeeds": [
      {
        "title": "MGR Welfare Legacy Continuation",
        "description": "Ensured that MGR's free meal and school funding allocations remained active during transition."
      }
    ],
    "badDeeds": [
      {
        "title": "Assembly Violence Trust Vote",
        "description": "Won a controversial trust vote in January 1988 amid massive police action and physical violence inside the assembly floor."
      }
    ]
  },
  {
    "id": "vijayakanth",
    "name": "Vijayakanth",
    "party": "dmdk",
    "constituency": "Rishivandiyam",
    "assemblies": [
      13,
      14
    ],
    "mlaDetails": {
      "portfolio": "Founder of DMDK, Leader of the Opposition (2011-2016, deceased)",
      "assetsValue": 40.0,
      "assetsText": "\u20b940 Crore (approx estate)",
      "age": 71,
      "history": "Popular action hero actor known as 'Captain'. Founded DMDK in 2005 as a third alternative. Won 29 seats in 2011, becoming Opposition Leader, displacing DMK. Passed away in 2023."
    },
    "criminalProfile": {
      "hasCases": false,
      "casesCount": 0,
      "jailTimeText": "Never jailed",
      "majorCharges": []
    },
    "partyShifts": [
      {
        "from": "Cinema",
        "to": "dmdk",
        "year": 2005,
        "reason": "Launched DMDK to challenge corruption in both Dravidian parties"
      }
    ],
    "goodDeeds": [
      {
        "title": "Captain's Kitchen Charities",
        "description": "Provided free meals to thousands of needy artists and public citizens throughout his career."
      },
      {
        "title": "2011 Election Breakthrough",
        "description": "Emerging as Opposition Leader, breaking the hold of DMK and AIADMK."
      }
    ],
    "badDeeds": [
      {
        "title": "Erratic Public behavior",
        "description": "Known for losing his temper, spitting, and making aggressive gestures at journalists and party workers in his later years."
      }
    ]
  },
  {
    "id": "d_jayakumar",
    "name": "D. Jayakumar",
    "party": "aiadmk",
    "constituency": "Royapuram",
    "assemblies": [
      10,
      11,
      12,
      13,
      14,
      15
    ],
    "mlaDetails": {
      "portfolio": "Former Minister for Fisheries, Finance, and Assembly Speaker",
      "assetsValue": 6.8,
      "assetsText": "\u20b96.8 Crore",
      "age": 65,
      "history": "Veteran AIADMK leader from Royapuram. Served as Speaker of Assembly and Minister of Fisheries under Jayalalithaa and EPS. Outspoken press face of AIADMK."
    },
    "criminalProfile": {
      "hasCases": true,
      "casesCount": 2,
      "jailTimeText": "Jailed briefly in 2022 (20 days) in land grabbing and attack cases filed by DMK regime",
      "majorCharges": [
        {
          "charge": "Assaulting and parading a DMK worker",
          "status": "Bail granted",
          "severity": "medium"
        }
      ]
    },
    "partyShifts": [
      {
        "from": "None",
        "to": "aiadmk",
        "year": 1980,
        "reason": "Joined AIADMK, backing MGR's leadership in Chennai"
      }
    ],
    "goodDeeds": [
      {
        "title": "Fishermen Relief Subsidies",
        "description": "Formulated direct subsidy transfers to fishermen during the annual 45-day fishing ban period."
      }
    ],
    "badDeeds": [
      {
        "title": "DMK Worker Parade Controversy",
        "description": "Arrested in 2022 for allegedly stripping and parading a DMK agent accused of bogus voting during local polls."
      }
    ]
  },
  {
    "id": "sellur_raju",
    "name": "Sellur K. Raju",
    "party": "aiadmk",
    "constituency": "Madurai West",
    "assemblies": [
      14,
      15,
      16
    ],
    "mlaDetails": {
      "portfolio": "Former Minister for Cooperatives",
      "assetsValue": 4.1,
      "assetsText": "\u20b94.1 Crore",
      "age": 63,
      "history": "AIADMK leader from Madurai. Served as Cooperatives Minister under Jayalalithaa and EPS. Known for his colorful and meme-worthy statements."
    },
    "criminalProfile": {
      "hasCases": false,
      "casesCount": 0,
      "jailTimeText": "Never jailed",
      "majorCharges": []
    },
    "partyShifts": [
      {
        "from": "None",
        "to": "aiadmk",
        "year": 1982,
        "reason": "Grassroots worker in Madurai who joined AIADMK under Jayalalithaa's guidance"
      }
    ],
    "goodDeeds": [
      {
        "title": "Cooperative Bank digitalization",
        "description": "Expanded small loan systems and digitized local credit registers for rural farmers."
      }
    ],
    "badDeeds": [
      {
        "title": "Thermocol Dam Controversy",
        "description": "Faced national mockery in 2017 when he placed \u20b910 Lakh worth of thermocol sheets on the Vaigai Dam water to prevent evaporation, which blew away in minutes."
      }
    ]
  },
  {
    "id": "rajenthra_bhalaji",
    "name": "K. T. Rajenthra Bhalaji",
    "party": "aiadmk",
    "constituency": "Sivakasi",
    "assemblies": [
      14,
      15
    ],
    "mlaDetails": {
      "portfolio": "Former Minister for Milk and Dairy Development",
      "assetsValue": 5.5,
      "assetsText": "\u20b95.5 Crore",
      "age": 60,
      "history": "AIADMK strongman in Virudhunagar district. Served as Milk Minister under Jayalalithaa and EPS. Ran into legal trouble over dairy jobs scam."
    },
    "criminalProfile": {
      "hasCases": true,
      "casesCount": 2,
      "jailTimeText": "Arrested and jailed in 2022 (15 days) in Karnataka after escaping police search",
      "majorCharges": [
        {
          "charge": "Aavin Dairy Jobs Bribe Scam (IPC 420)",
          "status": "Bail granted, pending trial",
          "severity": "high"
        }
      ]
    },
    "partyShifts": [
      {
        "from": "None",
        "to": "aiadmk",
        "year": 1985,
        "reason": "Entered politics as a local AIADMK youth wing volunteer in Sivakasi"
      }
    ],
    "goodDeeds": [
      {
        "title": "Sivakasi Firecracker Defense",
        "description": "Lobbied with national agencies to protect Sivakasi fireworks factories from bans, saving local jobs."
      }
    ],
    "badDeeds": [
      {
        "title": "Aavin Job Racket scam",
        "description": "Accused of taking \u20b93 Crore from job seekers, promising them jobs in the state-run Aavin milk cooperative."
      },
      {
        "title": "Escaping Arrest Drama",
        "description": "Went missing in 2021 when police issued an arrest warrant, leading to a multi-state police chase before arrest in Karnataka."
      }
    ]
  },
  {
    "id": "m_appavu",
    "name": "M. Appavu",
    "party": "dmk",
    "constituency": "Radhapuram",
    "assemblies": [
      11,
      12,
      13,
      15,
      16
    ],
    "mlaDetails": {
      "portfolio": "Speaker of the Tamil Nadu Legislative Assembly (2021-Present)",
      "assetsValue": 3.1,
      "assetsText": "\u20b93.1 Crore",
      "age": 74,
      "history": "Elected as MLA from Radhapuram. Joined DMK in 2006. Elected Speaker in 2021, overseeing assembly debates."
    },
    "criminalProfile": {
      "hasCases": false,
      "casesCount": 0,
      "jailTimeText": "Never jailed",
      "majorCharges": []
    },
    "partyShifts": [
      {
        "from": "tMC",
        "to": "dmk",
        "year": 2006,
        "reason": "Joined DMK after Tamil Maanila Congress merged back into Congress"
      }
    ],
    "goodDeeds": [
      {
        "title": "Radhapuram Canal Irrigation",
        "description": "Fought legal battles to bring irrigation canal access to dry agricultural zones in Tirunelveli district."
      }
    ],
    "badDeeds": [
      {
        "title": "2016 Vote Count Dispute",
        "description": "Lost the 2016 assembly polls by just 49 votes, leading to a massive 5-year court battle over postal vote counting irregularities."
      }
    ]
  },
  {
    "id": "senthamarai",
    "name": "Senthamarai S.",
    "party": "aiadmk",
    "constituency": "Andipatti",
    "assemblies": [
      14
    ],
    "mlaDetails": {
      "portfolio": "Local AIADMK Leader and Candidate",
      "assetsValue": 2.1,
      "assetsText": "\u20b92.1 Crore",
      "age": 55,
      "history": "Grassroots organizer and candidate in southern Tamil Nadu AIADMK divisions."
    },
    "criminalProfile": {
      "hasCases": false,
      "casesCount": 0,
      "jailTimeText": "Never jailed",
      "majorCharges": []
    },
    "partyShifts": [
      {
        "from": "None",
        "to": "aiadmk",
        "year": 1990,
        "reason": "Began organizing under Jayalalithaa's leadership in the Madurai-Andipatti belt"
      }
    ],
    "goodDeeds": [
      {
        "title": "Rural Self-Help Groups support",
        "description": "Formed and funded local women self-help cooperative savings programs in rural Andipatti."
      }
    ],
    "badDeeds": [
      {
        "title": "Inter-Faction disputes",
        "description": "Involved in local skirmishes during AIADMK factional split, blocking party headquarters."
      }
    ]
  },
  {
    "id": "h_raja",
    "name": "H. Raja",
    "party": "bjp",
    "constituency": "Karaikudi (lost)",
    "assemblies": [
      12
    ],
    "mlaDetails": {
      "portfolio": "Former BJP National Secretary, former MLA (2001-2006)",
      "assetsValue": 2.1,
      "assetsText": "\u20b92.1 Crore",
      "age": 69,
      "history": "Known for his provocative statements. Elected as MLA from Karaikudi in 2001. Pushed BJP's growth in southern TN."
    },
    "criminalProfile": {
      "hasCases": true,
      "casesCount": 5,
      "jailTimeText": "Never jailed",
      "majorCharges": [
        {
          "charge": "Contempt of Court for abusing Tamil Nadu Police",
          "status": "Pending",
          "severity": "medium"
        },
        {
          "charge": "Hate speech and promoting communal enmity",
          "status": "Pending",
          "severity": "medium"
        }
      ]
    },
    "partyShifts": [
      {
        "from": "RSS",
        "to": "bjp",
        "year": 1989,
        "reason": "Chartered accountant who joined active politics as BJP District Convener"
      }
    ],
    "goodDeeds": [
      {
        "title": "Temple Heritage protection lobbying",
        "description": "Led campaigns calling for freeing temples from government control and auditing temple property records."
      }
    ],
    "badDeeds": [
      {
        "title": "Abusing Police and Judiciary",
        "description": "Recorded yelling abuses at police officers and calling the High Court 'anti-Hindu' in 2018 during a festival dispute."
      },
      {
        "title": "Periyar Statue Comment",
        "description": "Controversially posted that Periyar's statues would meet the same fate as Lenin's statues in Russia, sparking state-wide riots."
      }
    ]
  },
  {
    "id": "tamilisai",
    "name": "Tamilisai Soundararajan",
    "party": "bjp",
    "constituency": "Thoothukudi (lost)",
    "assemblies": [],
    "mlaDetails": {
      "portfolio": "Former Governor of Telangana, State BJP President",
      "assetsValue": 3.6,
      "assetsText": "\u20b93.6 Crore",
      "age": 65,
      "history": "A physician who joined BJP. State President (2014-2019). Served as Governor of Telangana and Lt. Governor of Puducherry (2019-2024) before resigning to re-enter active politics."
    },
    "criminalProfile": {
      "hasCases": false,
      "casesCount": 0,
      "jailTimeText": "Never jailed",
      "majorCharges": []
    },
    "partyShifts": [
      {
        "from": "None",
        "to": "bjp",
        "year": 1999,
        "reason": "Broke with her family's Congress legacy (daughter of Congress veteran Kumari Ananthan) to join BJP"
      }
    ],
    "goodDeeds": [
      {
        "title": "Free Medical Camps",
        "description": "Conducted thousands of free health and cardiac check-up camps for poor families in South Chennai."
      }
    ],
    "badDeeds": [
      {
        "title": "Coimbatore Flight Protest Controversy",
        "description": "Faced criticism for filing a police complaint against a student (Sofia) who shouted anti-fascist slogans on a flight she was traveling in."
      }
    ]
  },
  {
    "id": "geetha_jeevan",
    "name": "P. Geetha Jeevan",
    "party": "dmk",
    "constituency": "Thoothukudi",
    "assemblies": [
      11,
      13,
      15,
      16
    ],
    "mlaDetails": {
      "portfolio": "Minister for Social Welfare and Women Empowerment",
      "assetsValue": 4.1,
      "assetsText": "\u20b94.1 Crore",
      "age": 55,
      "history": "Elected as MLA from Thoothukudi. Served as Social Welfare Minister (2006-2011) and re-appointed in 2021. Pushes women welfare initiatives in southern TN."
    },
    "criminalProfile": {
      "hasCases": false,
      "casesCount": 0,
      "jailTimeText": "Never jailed",
      "majorCharges": []
    },
    "partyShifts": [
      {
        "from": "None",
        "to": "dmk",
        "year": 1996,
        "reason": "Entered politics following the footsteps of her father, DMK leader N. Periyasamy"
      }
    ],
    "goodDeeds": [
      {
        "title": "Transgender Pension Reforms",
        "description": "Introduced and expanded monthly financial assistance pensions and housing schemes for transgenders in TN."
      }
    ],
    "badDeeds": [
      {
        "title": "DVAC Corruption inquiry",
        "description": "Subject of DVAC inquiry in 2012 over assets, but case dropped due to lack of prosecution sanction."
      }
    ]
  }
];

export const seedPoliticians = basePoliticians.map(p => {
  const newsFeed = (scrapedIntel.news || []).filter(item => item.politicianId === p.id);
  const evidenceSheet = (scrapedIntel.evidence || []).find(item => item.politicianId === p.id) || null;
  
  // Assembly 17 membership comes exclusively from the scraped MLA roster
  // (scrapedIntel.json) via mergeIntelAndRoster() in App.jsx.
  // Do NOT auto-inject assembly 17 based on 16th assembly membership —
  // that caused 23 ghost entries inflating the seat count to 257.
  const updatedAssemblies = p.assemblies ? [...p.assemblies] : [];

  return {
    ...p,
    assemblies: updatedAssemblies,
    newsFeed,
    evidenceSheet
  };
});

export const seedEvents = [
  {
    id: "event_hindi_agitation",
    name: "Anti-Hindi Imposition Agitations",
    year: 1965,
    description: "State-wide student-led protests and strikes against making Hindi the sole official language of India.",
    fallout: "Congress lost power permanently in Madras State, paving the way for Dravidian governance."
  },
  {
    id: "event_dmk_1967_win",
    name: "First Dravidian Govt Victory (DMK)",
    year: 1967,
    description: "DMK won a landslide victory under C.N. Annadurai, replacing the Congress administration.",
    fallout: "Marked the beginning of Dravidian hegemony in Tamil Nadu politics."
  },
  {
    id: "event_aiadmk_split",
    name: "The AIADMK Split & MGR Exit",
    year: 1972,
    description: "M.G. Ramachandran expelled from DMK after questioning party finances. He went on to found the rival AIADMK.",
    fallout: "Split the Dravidian base into a bipolar rivalry between MGR and Karunanidhi."
  },
  {
    id: "event_emergency",
    name: "Emergency & DMK Dismissal",
    year: 1975,
    description: "PM Indira Gandhi declared national Emergency; DMK government dismissed in 1976 over corruption allegations.",
    fallout: "Led to the Sarkaria Commission and Stalin's MISA imprisonment, creating political martyrs."
  },
  {
    id: "event_mgr_1977_win",
    name: "MGR's First CM Victory",
    year: 1977,
    description: "AIADMK won its first assembly election. MGR took oath as Chief Minister.",
    fallout: "Established MGR's undefeated ten-year rule and cemented AIADMK's survival."
  },
  {
    id: "event_mgr_death",
    name: "Death of MGR & Vacuum",
    year: 1987,
    description: "CM MGR passed away in office, leading to a major power vacuum and split in the AIADMK.",
    fallout: "Began a bitter succession battle between Janaki Ramachandran and Jayalalithaa."
  },
  {
    id: "event_janaki_brief_cm",
    name: "Janaki Ramachandran CM Term",
    year: 1988,
    description: "MGR's wife Janaki Ramachandran appointed CM for 24 days amidst assembly chaos.",
    fallout: "Her government was dismissed by the Center, triggering fresh elections in 1989."
  },
  {
    id: "event_jayalalithaa_leader",
    name: "Jayalalithaa Takes AIADMK Control",
    year: 1989,
    description: "Jayalalithaa united the AIADMK factions after Janaki retired, taking absolute control of the party.",
    fallout: "Consolidated Jayalalithaa as the sole challenger to Karunanidhi's DMK."
  },
  {
    id: "event_rajiv_assassination",
    name: "Rajiv Gandhi Assassination",
    year: 1991,
    description: "Former PM Rajiv Gandhi assassinated by an LTTE suicide bomber at an election rally in Sriperumbudur.",
    fallout: "DMK government dismissed over LTTE sympathy allegations, causing massive public backlash."
  },
  {
    id: "event_jayalalithaa_landslide_1991",
    name: "AIADMK-Congress Landslide Win",
    year: 1991,
    description: "Jayalalithaa swept the 1991 polls, winning 225 out of 234 seats under a sympathy wave.",
    fallout: "Jayalalithaa took office as CM with absolute unchecked power, seeding future scandals."
  },
  {
    id: "event_sudhakaran_wedding",
    name: "Foster Son's Lavish Wedding",
    year: 1995,
    description: "Jayalalithaa staged a massive public wedding for foster son V.N. Sudhakaran, spending crores of rupees.",
    fallout: "Outraged the public, leading directly to her 1996 electoral rout."
  },
  {
    id: "event_wealth_case_arrest",
    name: "Wealth Case & 1996 Arrest",
    year: 1996,
    description: "Following her electoral defeat, Jayalalithaa was arrested and charged with accumulating ₹66 Crore in assets.",
    fallout: "Launched a 21-year legal battle and triggered future political vendettas."
  },
  {
    id: "event_midnight_arrest",
    name: "Midnight Arrest of Karunanidhi",
    year: 2001,
    description: "CM Jayalalithaa ordered police to raid Karunanidhi's house at midnight, dragging the 77-year-old leader to jail.",
    fallout: " televised drama caused national outrage, strengthening DMK's future opposition alliance."
  },
  {
    id: "event_wealth_case_conviction_2014",
    name: "Jayalalithaa Conviction & Jail",
    year: 2014,
    description: "A Bengaluru special court convicted Jayalalithaa in the wealth case, forcing her to step down as CM.",
    fallout: "OPS stepped in as CM placeholder; Jayalalithaa's health declined during prison confinement."
  },
  {
    id: "event_jayalalithaa_death",
    name: "Death of J. Jayalalithaa",
    year: 2016,
    description: "CM Jayalalithaa passed away in Apollo Hospital Chennai after a prolonged illness.",
    fallout: "Triggered a massive leadership crisis inside the AIADMK."
  },
  {
    id: "event_sasikala_rebellion",
    name: "Sasikala's Bid & OPS Rebellion",
    year: 2017,
    description: "Sasikala attempted to take over as CM, prompting interim CM OPS to rebel at Jayalalithaa's memorial.",
    fallout: "Split the AIADMK into EPS and OPS factions."
  },
  {
    id: "event_sasikala_conviction",
    name: "Sasikala Conviction & Jailing",
    year: 2017,
    description: "Supreme Court restored Sasikala's conviction in the wealth case, sentencing her to 4 years in prison.",
    fallout: "Ended Sasikala's immediate bid to become CM, forcing her to appoint a proxy."
  },
  {
    id: "event_koovathur_resort",
    name: "Koovathur Resort MLA Lockup",
    year: 2017,
    description: "Sasikala confined 120 AIADMK MLAs in a beach resort in Koovathur to prevent them from deflecting to OPS.",
    fallout: "EPS was selected as leader at the resort, securing the support needed to form a government."
  },
  {
    id: "event_eps_cm",
    name: "EPS Takes CM Oath",
    year: 2017,
    description: "Edappadi Palaniswami took oath as CM, winning the trust vote under heavy security in the assembly.",
    fallout: "Stabilized the AIADMK government for the next four years."
  },
  {
    id: "event_tvk_launch",
    name: "TVK Party Launch by Vijay",
    year: 2024,
    description: "Superstar actor Vijay launched TVK, holding a massive state conference in Vikravandi.",
    fallout: "Challenged both DMK and BJP, altering the forecast for the 2026 elections."
  },
  {
    id: "event_election_2026_preps",
    name: "2026 Election Campaigns",
    year: 2026,
    description: "Current assembly campaign preparations showing major alliances: DMK front vs AIADMK vs TVK.",
    fallout: "Sets up a three-cornered electoral struggle for Tamil Nadu's future."
  }
];

export const seedTriggers = [
  { source: "event_hindi_agitation", target: "event_dmk_1967_win" },
  { source: "event_dmk_1967_win", target: "event_aiadmk_split" },
  { source: "event_aiadmk_split", target: "event_mgr_1977_win" },
  { source: "event_emergency", target: "event_mgr_1977_win" },
  { source: "event_mgr_1977_win", target: "event_mgr_death" },
  { source: "event_mgr_death", target: "event_janaki_brief_cm" },
  { source: "event_janaki_brief_cm", target: "event_jayalalithaa_leader" },
  { source: "event_rajiv_assassination", target: "event_jayalalithaa_landslide_1991" },
  { source: "event_jayalalithaa_landslide_1991", target: "event_sudhakaran_wedding" },
  { source: "event_sudhakaran_wedding", target: "event_wealth_case_arrest" },
  { source: "event_wealth_case_arrest", target: "event_midnight_arrest" },
  { source: "event_wealth_case_arrest", target: "event_wealth_case_conviction_2014" },
  { source: "event_wealth_case_conviction_2014", target: "event_jayalalithaa_death" },
  { source: "event_jayalalithaa_death", target: "event_sasikala_rebellion" },
  { source: "event_sasikala_rebellion", target: "event_sasikala_conviction" },
  { source: "event_sasikala_conviction", target: "event_koovathur_resort" },
  { source: "event_koovathur_resort", target: "event_eps_cm" },
  { source: "event_tvk_launch", target: "event_election_2026_preps" }
];

// Helper to generate Time Fabric Event Graph data
export function generateEventGraphData() {
  const nodes = [];
  const edges = [];
  const minYear = 1952;
  const maxYear = 2026;

  const getPolicyYear = (period = "") => {
    const match = String(period).match(/\d{4}/);
    return match ? Number(match[0]) : 2026;
  };

  const policyEvents = policyImpactRecords.map((policy) => ({
    id: `policy_${policy.id}`,
    name: policy.title,
    year: getPolicyYear(policy.startPeriod),
    description: `${policy.startedBy}. ${policy.convertedInto?.[0] || policy.currentStatus}`,
    fallout: policy.impactSummary,
    type: "policy",
    domain: policy.domain,
    chiefMinister: policy.chiefMinister,
    startedBy: policy.startedBy,
    currentCustodian: policy.currentCustodian,
    currentStatus: policy.currentStatus,
    watchItems: policy.watchItems || [],
    sourceLinks: policy.sourceLinks || [],
  }));

  // Position event nodes along a horizontal axis proportional to their year
  // x goes from 50 (1952) to 850 (2026)
  [...seedEvents, ...policyEvents].forEach((ev) => {
    const scaleX = (ev.year - minYear) / (maxYear - minYear);
    
    // Distribute y-positions to avoid overlaps
    let yOffset = 180; // default baseline
    if (ev.type === "policy") {
      yOffset = 215;
    }
    if (ev.id.includes("win") || ev.id.includes("leader") || ev.id.includes("eps_cm") || ev.id.includes("preps")) {
      yOffset = 80; // upper row for victories/alignments
    } else if (ev.id.includes("split") || ev.id.includes("death") || ev.id.includes("arrest") || ev.id.includes("conviction") || ev.id.includes("resort") || ev.id.includes("wedding")) {
      yOffset = 280; // lower row for scandals/arrests/deaths
    }

    nodes.push({
      id: ev.id,
      title: `${ev.year}: ${ev.name}`,
      year: ev.year,
      description: ev.description,
      fallout: ev.fallout,
      type: ev.type || "event",
      domain: ev.domain || "Political Event",
      chiefMinister: ev.chiefMinister || null,
      startedBy: ev.startedBy || null,
      currentCustodian: ev.currentCustodian || null,
      currentStatus: ev.currentStatus || null,
      watchItems: ev.watchItems || [],
      sourceLinks: ev.sourceLinks || [],
      // Target layout coordinates
      fx: 80 + scaleX * 740, // Locked X coordinate to enforce the time fabric!
      y: yOffset,
      vx: 0,
      vy: 0
    });
  });

  seedTriggers.forEach((trig) => {
    edges.push({
      id: `trigger_${trig.source}_${trig.target}`,
      source: trig.source,
      target: trig.target,
      label: "triggers"
    });
  });

  [
    { source: "event_dmk_1967_win", target: "policy_annadurai_identity_language_marriage" },
    { source: "event_aiadmk_split", target: "policy_mgr_nutritious_noon_meal" },
    { source: "event_mgr_1977_win", target: "policy_mgr_nutritious_noon_meal" },
    { source: "event_janaki_brief_cm", target: "policy_janaki_transition_government" },
    { source: "event_jayalalithaa_landslide_1991", target: "policy_jayalalithaa_branded_welfare_admin_mandates" },
    { source: "event_eps_cm", target: "policy_eps_delivery_infrastructure_quota" },
    { source: "event_tvk_launch", target: "policy_tvk_436_project_review" },
  ].forEach((trig) => {
    edges.push({
      id: `policy_trigger_${trig.source}_${trig.target}`,
      source: trig.source,
      target: trig.target,
      label: "policy lineage"
    });
  });

  return { nodes, edges };
}

// Generate seats only from sourced active MLA profiles. Missing roster data stays missing.
const CURRENT_ASSEMBLY_STATUS = {
  vacantConstituencies: {
    141: {
      status: "vacant",
      vacancyReason: "C. Joseph Vijay resigned Tiruchirappalli (East) after winning both Perambur and Tiruchirappalli (East). He retained Perambur.",
      vacatedBy: "C. Joseph Vijay",
      vacatedOn: "2026-05-10",
      sourceUrl: "https://www.newindianexpress.com/states/tamil-nadu/2026/May/10/vijay-resigns-as-member-of-trichy-east-assembly-constituency",
    }
  }
};

export const generateAssemblySeats = (politicians) => {
  const activeMlas = politicians.filter(p => p.assemblies && p.assemblies.includes(17));
  const hasNumberValue = (value) => typeof value === "number" && Number.isFinite(value);
  
  return [...activeMlas]
    .sort((a, b) => {
      const aSeat = a.officialRoster?.constituencyNumber || a.constituencyNumber || 999;
      const bSeat = b.officialRoster?.constituencyNumber || b.constituencyNumber || 999;
      return aSeat - bSeat || a.name.localeCompare(b.name);
    })
    .map((mla, idx) => {
      const roster = mla.officialRoster || {};
      const constituencyNumber = roster.constituencyNumber || mla.constituencyNumber || idx + 1;
      const vacancy = CURRENT_ASSEMBLY_STATUS.vacantConstituencies[constituencyNumber] || null;
      return {
        id: constituencyNumber,
        constituency: roster.constituency || mla.constituency,
        mlaName: roster.candidateName || mla.name || mla.mlaName,
        party: mla.party,
        partyName: roster.partyName,
        partyCode: roster.partyCode,
        politicianId: mla.id,
        assets: hasNumberValue(mla.mlaDetails?.assetsValue) ? mla.mlaDetails.assetsValue : null,
        assetsText: mla.mlaDetails?.assetsText || "Not sourced yet",
        age: hasNumberValue(mla.mlaDetails?.age) ? mla.mlaDetails.age : null,
        hasCases: typeof mla.criminalProfile?.hasCases === "boolean" ? mla.criminalProfile.hasCases : null,
        casesCount: hasNumberValue(mla.criminalProfile?.casesCount) ? mla.criminalProfile.casesCount : null,
        votes: roster.votes,
        voteShare: roster.voteShare,
        marginVotes: roster.marginVotes,
        runnerUpName: roster.runnerUpName,
        runnerUpParty: roster.runnerUpParty,
        runnerUpVotes: roster.runnerUpVotes,
        totalElectors: roster.totalElectors,
        reservationCategory: roster.reservationCategory,
        sourceType: roster.sourceType,
        sources: roster.sources || [],
        isVacant: Boolean(vacancy),
        currentStatus: vacancy?.status || "occupied",
        vacancyReason: vacancy?.vacancyReason,
        vacatedBy: vacancy?.vacatedBy,
        vacatedOn: vacancy?.vacatedOn,
        vacancySourceUrl: vacancy?.sourceUrl,
        isSourcedRoster: Boolean(roster.sourceType),
        isDetailed: !vacancy
      };
    });
};
