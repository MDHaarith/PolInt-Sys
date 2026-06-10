import React, { useState, useEffect, useMemo } from "react";
import {
  User, ShieldAlert, GitCommit, Award, AlertTriangle, DollarSign,
  Calendar, Landmark, Info, Search, Filter, Newspaper, MessageSquare,
  Scale, Vote, TrendingUp, ExternalLink, ChevronDown, BarChart3,
  Zap, Eye, FileWarning, Gavel, Briefcase, Hash,
  MessageCircle, Repeat, Heart, Share2
} from "lucide-react";

const XIcon = (props) => (
  <svg viewBox="0 0 24 24" width="1em" height="1em" fill="currentColor" style={{ display: "inline-block", verticalAlign: "middle" }} {...props}>
    <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z" />
  </svg>
);

const POLITICIAN_HANDLES = {
  mk_stalin: "@mkstalin",
  j_jayalalithaa: "@DRJJayalalithaa",
  m_karunanidhi: "@kalaignar89",
  m_g_ramachandran: "@PuratchiThalaivarMGR",
  edappadi_palaniswami: "@EPSTamilNadu",
  v_k_sasikala: "@SasikalaVK",
  k_annamalai: "@annamalai_k",
  seeman: "@SeemanOfficial",
  vijay: "@actorvijay",
  o_panneerselvam: "@OfficeOfOPS",
  k_kamaraj: "@kamaraj_leader",
  c_rajagopalachari: "@rajaji_official",
  thol_thirumavalavan: "@thirumaofficial",
  s_ramadoss: "@drramadoss",
  vaiko: "@VaikoMDMK",
  udhayanidhi_stalin: "@Udhaystalin",
  senthil_balaji: "@SenthilbalajiV",
  kn_nehru: "@KN_NEHRU",
  sekar_babu: "@PKSekarBabu",
  k_ponmudy: "@kponmudymla",
  i_periyasamy: "@iperiyasamy_mla",
  thangam_thennarasu: "@ThangamThenarasu",
  anbil_mahesh: "@Anbil_Mahesh",
  ma_subramanian: "@Subramanian_Ma",
  ev_velu: "@EV_Velu_PWD",
  s_muthusamy: "@SMuthusamyErode",
  ptr: "@ptrmadurai",
  kkssr_ramachandran: "@KKSSR_Revenue",
  duraimurugan: "@DuraimuruganDMK",
  a_raja: "@ARajaoffic",
  kanimozhi: "@KanimozhiDMK",
  tr_baalu: "@TRBaaluMP",
  mk_alagiri: "@MKAlagiriOffl",
  rb_udhayakumar: "@RBUdhayakumar",
  sp_velumani: "@SPVelumanimla",
  c_ve_shanmugam: "@CVeShanmugam",
  p_thangamani: "@PThangamanimla",
  kp_anbalagan: "@KPAnbalaganmla",
  anbumani_ramadoss: "@dr_anbumani",
  ttv_dhinakaran: "@TTVDhinakaran",
  kamal_haasan: "@ikamalhaasan",
  cn_annadurai: "@arignar_anna",
  periyar: "@periyar_evr",
  janaki_ramachandran: "@JanakiMGR",
  vijayakanth: "@DirectCaptain",
  d_jayakumar: "@OfflJayakumar",
  sellur_raju: "@SellurKRaju",
  rajenthra_bhalaji: "@RajenthraBhalaj",
  m_appavu: "@SpeakerAppavu",
  senthamarai: "@SenthamaraiS",
  h_raja: "@HRajaBJP",
  tamilisai: "@DrTamilisaiGuv",
  geetha_jeevan: "@GeethaJeevanDMK"
};

const CATEGORY_CONFIG = {
  all:           { label: "All Stories",       icon: Newspaper,     color: "var(--text-secondary)" },
  social_media:  { label: "𝕏 Social Media",   icon: XIcon,         color: "#1d9bf0" },
  investigation: { label: "Investigations",    icon: FileWarning,   color: "var(--danger)" },
  election:      { label: "Elections",         icon: Vote,          color: "var(--accent-color)" },
  news:          { label: "News",              icon: Newspaper,     color: "var(--info)" },
  policy:        { label: "Policy",            icon: Scale,         color: "var(--success)" },
};

// Helper to determine deceased politician end year of political activity
const getPoliticianEndYear = (p) => {
  if (p.id === "j_jayalalithaa") return 2016;
  if (p.id === "m_karunanidhi") return 2018;
  if (p.id === "m_g_ramachandran") return 1987;
  if (p.id === "k_kamaraj") return 1975;
  if (p.id === "c_rajagopalachari") return 1972;
  if (p.id === "cn_annadurai") return 1969;
  if (p.id === "periyar") return 1973;
  if (p.id === "janaki_ramachandran") return 1996;
  if (p.id === "vijayakanth") return 2023;
  return "Present";
};

const renderFormattedPostText = (text, onHashtagClick) => {
  if (!text) return null;
  const regex = /([#@][\w-]+)/g;
  const parts = text.split(regex);
  return parts.map((part, index) => {
    if (part.startsWith("#") || part.startsWith("@")) {
      return (
        <span
          key={index}
          className="interactive-tag-link"
          onClick={(e) => {
            e.stopPropagation();
            onHashtagClick(part);
          }}
          style={{
            color: "#1d9bf0",
            cursor: "pointer",
            fontWeight: "600",
            textDecoration: "none"
          }}
        >
          {part}
        </span>
      );
    }
    return part;
  });
};

const calculateSentiment = (posts) => {
  let positive = 0, neutral = 0, negative = 0;
  posts.forEach(post => {
    const text = (post.title + " " + (post.snippet || "")).toLowerCase();
    if (text.includes("proud") || text.includes("great") || text.includes("productive") || text.includes("committed") || text.includes("justice") || text.includes("welfare") || text.includes("development") || text.includes("outreach") || text.includes("pioneered") || text.includes("achievements")) {
      positive++;
    } else if (text.includes("rumors") || text.includes("baseless") || text.includes("inquiry") || text.includes("charges") || text.includes("criminal") || text.includes("corruption") || text.includes("dvac") || text.includes("nuisance")) {
      negative++;
    } else {
      neutral++;
    }
  });
  const total = positive + neutral + negative || 1;
  return {
    positive: Math.round((positive / total) * 100),
    neutral: Math.round((neutral / total) * 100),
    negative: Math.round((negative / total) * 100),
    total
  };
};

const getTopHashtags = (posts) => {
  const counts = {};
  posts.forEach(post => {
    const matches = post.title.match(/#[\w-]+/g) || [];
    matches.forEach(tag => {
      counts[tag] = (counts[tag] || 0) + 1;
    });
  });
  return Object.entries(counts)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 5);
};

const getPostingTrend = (posts) => {
  const countsByDate = {};
  posts.forEach(post => {
    const date = post.date;
    countsByDate[date] = (countsByDate[date] || 0) + 1;
  });
  const dates = Object.keys(countsByDate).sort((a, b) => new Date(a) - new Date(b));
  const dataPoints = dates.map(d => countsByDate[d]).slice(-10);
  while (dataPoints.length < 8) {
    dataPoints.unshift(1);
  }
  return dataPoints;
};

export default function PoliticianSpace({ politician, parties }) {
  const [activeTab, setActiveTab] = useState("dossier");
  const [newsSearch, setNewsSearch] = useState("");
  const [activeCategory, setActiveCategory] = useState("all");
  const [expandedCard, setExpandedCard] = useState(null);
  const [selectedHashtag, setSelectedHashtag] = useState(null);

  useEffect(() => {
    setActiveTab("dossier");
    setNewsSearch("");
    setActiveCategory("all");
    setExpandedCard(null);
    setSelectedHashtag(null);
  }, [politician?.id]);

  if (!politician) {
    return (
      <div className="politician-space-container" style={{ justifyContent: "center", alignItems: "center", height: "100%", color: "var(--text-secondary)" }}>
        <Info size={44} strokeWidth={1.5} style={{ marginBottom: "16px", color: "var(--accent-color)" }} />
        <h3>No Politician Selected</h3>
        <p style={{ fontSize: "0.85rem", color: "var(--text-muted)", marginTop: "8px", maxWidth: "340px", textAlign: "center" }}>
          Select a politician from the navigator directory list on the left to load their dedicated workspace space.
        </p>
      </div>
    );
  }

  const party = parties.find(pt => pt.id === politician.party) || {
    name: politician.party.toUpperCase(),
    color: "var(--color-ind)"
  };
  const hasSourcedCaseData = typeof politician.criminalProfile?.hasCases === "boolean";
  const caseStatusColor = politician.criminalProfile?.hasCases === true
    ? "var(--danger)"
    : politician.criminalProfile?.hasCases === false
      ? "var(--success)"
      : "var(--text-muted)";
  const caseCountLabel = hasSourcedCaseData ? politician.criminalProfile.casesCount : "N/A";

  // Filter and search news
  const allNews = politician.newsFeed || [];
  const filteredNews = useMemo(() => {
    let list = allNews;
    if (activeCategory !== "all") {
      list = list.filter(n => n.category === activeCategory);
    }
    if (selectedHashtag) {
      const tagLower = selectedHashtag.toLowerCase();
      list = list.filter(n =>
        n.title.toLowerCase().includes(tagLower) ||
        (n.snippet && n.snippet.toLowerCase().includes(tagLower))
      );
    }
    if (newsSearch.trim()) {
      const q = newsSearch.toLowerCase();
      list = list.filter(n =>
        n.title.toLowerCase().includes(q) ||
        (n.snippet && n.snippet.toLowerCase().includes(q)) ||
        n.source.toLowerCase().includes(q)
      );
    }
    return list;
  }, [allNews, activeCategory, newsSearch, selectedHashtag]);

  // Category counts
  const categoryCounts = useMemo(() => {
    const counts = { all: allNews.length };
    allNews.forEach(n => {
      counts[n.category] = (counts[n.category] || 0) + 1;
    });
    return counts;
  }, [allNews]);

  // Stat cards for intel tab
  const intelStats = useMemo(() => {
    const sources = new Set(allNews.map(n => n.source));
    return {
      totalArticles: allNews.length,
      uniqueSources: sources.size,
      investigations: categoryCounts.investigation || 0,
      socialPosts: categoryCounts.social_media || 0,
    };
  }, [allNews, categoryCounts]);

  const tabs = [
    { id: "dossier", label: "Dossier", icon: Briefcase },
    { id: "cases", label: "Criminal Record", icon: Gavel },
    { id: "shifts", label: "Party Shifts", icon: GitCommit },
    { id: "deeds", label: "Impact", icon: Award },
    { id: "intel", label: "Live Intel", icon: Zap, badge: allNews.length },
  ];

  return (
    <div className="politician-space-container">
      {/* Header */}
      <div className="politician-space-header" style={{ borderLeft: `6px solid ${party.color}` }}>
        <div className="profile-identity-group">
          <div className="profile-avatar-placeholder" style={{ color: party.color, borderColor: party.color }}>
            <User size={28} />
          </div>
          <div>
            <h1 className="profile-name-title">{politician.name}</h1>
            <span className="party-badge-pill" style={{ backgroundColor: party.color, color: "white" }}>
              {party.name}
            </span>
          </div>
        </div>

        <div className="header-stats-row">
          <div className="header-stat-chip">
            <span className="info-card-label">Constituency</span>
            <span className="header-stat-value">{politician.constituency}</span>
          </div>
          <div className="header-stat-divider" />
          <div className="header-stat-chip">
            <span className="info-card-label">Age</span>
            <span className="header-stat-value">{politician.mlaDetails.age ? `${politician.mlaDetails.age} yrs` : "N/A"}</span>
          </div>
          <div className="header-stat-divider" />
          <div className="header-stat-chip">
            <span className="info-card-label">Cases</span>
            <span className="header-stat-value" style={{ color: caseStatusColor }}>
              {caseCountLabel}
            </span>
          </div>
          <div className="header-stat-divider" />
          <div className="header-stat-chip">
            <span className="info-card-label">Intel</span>
            <span className="header-stat-value" style={{ color: "var(--info)" }}>{allNews.length}</span>
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="profile-tabs-selector">
        {tabs.map(tab => {
          const Icon = tab.icon;
          return (
            <button
              key={tab.id}
              className={`profile-tab-btn ${activeTab === tab.id ? "active" : ""}`}
              onClick={() => setActiveTab(tab.id)}
            >
              <Icon size={14} />
              {tab.label}
              {tab.badge > 0 && (
                <span className="tab-badge-count">{tab.badge > 999 ? `${(tab.badge/1000).toFixed(1)}k` : tab.badge}</span>
              )}
            </button>
          );
        })}
      </div>

      {/* Tab Content */}
      <div style={{ flex: 1 }}>
        {/* TAB 1: Dossier */}
        {activeTab === "dossier" && (
          <div className="tab-content-animate" style={{ display: "flex", flexDirection: "column", gap: "20px" }}>
            <div className="profile-cards-grid">
              <div className="info-card glass-card">
                <span className="info-card-label">Portfolio & Office</span>
                <span className="info-card-value">{politician.mlaDetails.portfolio.replace(/Present/g, new Date().getFullYear())}</span>
              </div>
              <div className="info-card glass-card">
                <span className="info-card-label">Declared Net Worth</span>
                <span className="info-card-value" style={{ color: "var(--success)", fontWeight: 700, display: "flex", alignItems: "center", gap: "6px" }}>
                  <DollarSign size={16} /> {politician.mlaDetails.assetsText}
                </span>
              </div>
            </div>
            <div className="info-card glass-card">
              <span className="info-card-label">Political History & Bio</span>
              <p className="dossier-value-text" style={{ fontSize: "0.92rem", lineHeight: 1.6, color: "var(--text-secondary)" }}>
                {politician.mlaDetails.history}
              </p>
            </div>
          </div>
        )}

        {/* TAB 2: Criminal Record */}
        {activeTab === "cases" && (
          <div className="tab-content-animate" style={{ display: "flex", flexDirection: "column", gap: "20px" }}>
            <div className="info-card glass-card" style={{ borderLeft: `4px solid ${caseStatusColor}` }}>
              <span className="info-card-label" style={{ color: caseStatusColor }}>
                Incarceration Summary
              </span>
              <span className="dossier-value-text" style={{ fontWeight: 600, fontSize: "1.1rem" }}>
                {politician.criminalProfile.jailTimeText}
              </span>
            </div>
            <div className="info-card glass-card">
              <span className="info-card-label">Total Public Indictments: {caseCountLabel}</span>
              {politician.criminalProfile.hasCases === true ? (
                <div className="criminal-cases-list">
                  {politician.criminalProfile.majorCharges.map((c, i) => (
                    <div key={i} className={`criminal-case-card ${c.severity === "high" ? "high-severity" : ""}`}>
                      <h4 className="criminal-case-charge">{c.charge}</h4>
                      <p className="criminal-case-status">
                        Status: <strong>{c.status}</strong> | Severity: <strong style={{ color: c.severity === 'high' ? 'var(--danger)' : 'var(--warning)' }}>{c.severity.toUpperCase()}</strong>
                      </p>
                    </div>
                  ))}
                </div>
              ) : !hasSourcedCaseData ? (
                <div style={{ textAlign: "center", padding: "30px", color: "var(--text-secondary)", fontSize: "0.9rem" }}>
                  Criminal affidavit data has not been sourced yet for this MLA.
                </div>
              ) : (
                <div style={{ textAlign: "center", padding: "30px", color: "var(--text-secondary)", fontSize: "0.9rem" }}>
                  No significant criminal investigations on public record.
                </div>
              )}
            </div>
          </div>
        )}
        {/* TAB 3: Party Shifts */}
        {activeTab === "shifts" && (
          <div className="tab-content-animate info-card glass-card">
            <span className="info-card-label" style={{ marginBottom: "16px" }}>Affiliations & Duration Chronicle</span>
            <div className="shifts-timeline-tree">
              {(() => {
                const sorted = [...politician.partyShifts].sort((a, b) => a.year - b.year);
                const memberships = [];
                
                if (sorted.length > 0 && sorted[0].from !== "None") {
                  memberships.push({
                    partyId: sorted[0].from.toLowerCase(),
                    startYear: "Start",
                    endYear: sorted[0].year,
                    reason: "Initial political alignment"
                  });
                }
                
                for (let i = 0; i < sorted.length; i++) {
                  const current = sorted[i];
                  const next = sorted[i + 1];
                  memberships.push({
                    partyId: current.to.toLowerCase(),
                    startYear: current.year,
                    endYear: next ? next.year : getPoliticianEndYear(politician),
                    reason: current.reason
                  });
                }
                
                if (memberships.length === 0) {
                  memberships.push({
                    partyId: politician.party.toLowerCase(),
                    startYear: "Career Start",
                    endYear: getPoliticianEndYear(politician),
                    reason: "Continuous party membership"
                  });
                }

                return memberships.map((m, i) => {
                  const pt = parties.find(p => p.id === m.partyId) || { name: m.partyId.toUpperCase(), color: "var(--text-muted)", symbol: "Scales" };
                  const duration = (typeof m.startYear === "number" && typeof m.endYear === "number") 
                    ? `${m.endYear - m.startYear} years` 
                    : (m.endYear === "Present" && typeof m.startYear === "number") 
                    ? `${new Date().getFullYear() - m.startYear} years`
                    : "";
                  
                  return (
                    <div className="shift-timeline-node" key={i}>
                      <div className="shift-timeline-dot" style={{ backgroundColor: pt.color }} />
                      <div className="shift-timeline-year" style={{ color: pt.color }}>
                        {m.startYear} – {m.endYear}
                        {duration && <span className="shift-duration-badge" style={{ marginLeft: "8px", fontSize: "0.75rem", opacity: 0.8 }}>({duration})</span>}
                      </div>
                      <div className="shift-timeline-details">
                        <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
                          Active in <span className="shift-party-badge" style={{ backgroundColor: pt.color, color: "white" }}>{pt.name}</span>
                        </div>
                        <p style={{ marginTop: "6px", color: "var(--text-secondary)", fontStyle: "italic", fontSize: "0.88rem" }}>
                          "{m.reason}"
                        </p>
                      </div>
                    </div>
                  );
                });
              })()}
            </div>
          </div>
        )}

        {/* TAB 4: Deeds */}
        {activeTab === "deeds" && (
          <div className="tab-content-animate deeds-comparison-grid">
            <div className="deeds-column">
              <span className="info-card-label" style={{ color: "var(--success)", display: "flex", alignItems: "center", gap: "6px", fontSize: "0.8rem" }}>
                <Award size={14} /> Welfare Programs & Reforms
              </span>
              {politician.goodDeeds.map((deed, i) => (
                <div className="deed-item-card good-deed" key={i}>
                  <h4 className="deed-item-title">{deed.title}</h4>
                  <p className="deed-item-desc">{deed.description}</p>
                </div>
              ))}
              {politician.goodDeeds.length === 0 && (
                <div style={{ textAlign: "center", padding: "20px", color: "var(--text-muted)", fontSize: "0.8rem" }}>No major reforms recorded.</div>
              )}
            </div>
            <div className="deeds-column">
              <span className="info-card-label" style={{ color: "var(--danger)", display: "flex", alignItems: "center", gap: "6px", fontSize: "0.8rem" }}>
                <AlertTriangle size={14} /> Controversies & Policy Failures
              </span>
              {politician.badDeeds.map((deed, i) => (
                <div className="deed-item-card bad-deed" key={i}>
                  <h4 className="deed-item-title">{deed.title}</h4>
                  <p className="deed-item-desc">{deed.description}</p>
                </div>
              ))}
              {politician.badDeeds.length === 0 && (
                <div style={{ textAlign: "center", padding: "20px", color: "var(--text-muted)", fontSize: "0.8rem" }}>No major scandals on record.</div>
              )}
            </div>
          </div>
        )}

        {/* TAB 5: Live Intel & Evidence — UPGRADED */}
        {activeTab === "intel" && (
          <div className="tab-content-animate intel-tab-layout">

            {/* ── Stats Dashboard Row ── */}
            <div className="intel-stats-row">
              <div className="intel-stat-card">
                <BarChart3 size={20} className="stat-icon" />
                <div>
                  <span className="stat-number">{intelStats.totalArticles.toLocaleString()}</span>
                  <span className="stat-label">Total Articles</span>
                </div>
              </div>
              <div className="intel-stat-card">
                <Eye size={20} className="stat-icon" />
                <div>
                  <span className="stat-number">{intelStats.uniqueSources}</span>
                  <span className="stat-label">Unique Sources</span>
                </div>
              </div>
              <div className="intel-stat-card danger-glow">
                <FileWarning size={20} className="stat-icon" />
                <div>
                  <span className="stat-number">{intelStats.investigations}</span>
                  <span className="stat-label">Investigations</span>
                </div>
              </div>
              <div className="intel-stat-card">
                <MessageSquare size={20} className="stat-icon" />
                <div>
                  <span className="stat-number">{intelStats.socialPosts}</span>
                  <span className="stat-label">Social Posts</span>
                </div>
              </div>
            </div>

            {/* ── Main Content Split ── */}
            <div className="intel-tab-container">
              {/* Left: Affidavit Evidence OR X Analytics */}
              <div className="intel-evidence-section">
                {activeCategory === "social_media" ? (
                  <div className="x-analytics-panel glass-card" style={{ padding: "16px", display: "flex", flexDirection: "column", gap: "20px" }}>
                    <div className="intel-section-header" style={{ marginBottom: "4px" }}>
                      <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                        <TrendingUp size={18} className="intel-header-icon" style={{ color: "#1d9bf0" }} />
                        <h3 style={{ fontSize: "1rem", fontWeight: 600, color: "var(--text-primary)" }}>𝕏 Sentiment & Stats</h3>
                      </div>
                    </div>

                    {/* Sentiment meter */}
                    {(() => {
                      const sentiment = calculateSentiment(allNews.filter(n => n.category === "social_media"));
                      return (
                        <div className="sentiment-section">
                          <h4 style={{ fontSize: "0.85rem", color: "var(--text-secondary)", marginBottom: "8px", fontWeight: 500 }}>Public Sentiment Index</h4>
                          <div className="sentiment-bar-container" style={{ height: "16px", borderRadius: "8px", display: "flex", overflow: "hidden", backgroundColor: "rgba(255,255,255,0.05)" }}>
                            <div className="sentiment-bar pos" style={{ width: `${sentiment.positive}%`, backgroundColor: "var(--success, #10b981)", transition: "width 0.3s ease" }} title={`Positive: ${sentiment.positive}%`} />
                            <div className="sentiment-bar neu" style={{ width: `${sentiment.neutral}%`, backgroundColor: "var(--text-muted, #6b7280)", transition: "width 0.3s ease" }} title={`Neutral: ${sentiment.neutral}%`} />
                            <div className="sentiment-bar neg" style={{ width: `${sentiment.negative}%`, backgroundColor: "var(--danger, #ef4444)", transition: "width 0.3s ease" }} title={`Negative: ${sentiment.negative}%`} />
                          </div>
                          <div className="sentiment-labels" style={{ display: "flex", justifyContent: "space-between", marginTop: "6px", fontSize: "0.72rem", color: "var(--text-muted)" }}>
                            <span style={{ color: "#10b981" }}>Positive: {sentiment.positive}%</span>
                            <span>Neutral: {sentiment.neutral}%</span>
                            <span style={{ color: "#ef4444" }}>Negative: {sentiment.negative}%</span>
                          </div>
                        </div>
                      );
                    })()}

                    {/* Hashtag Frequency list */}
                    {(() => {
                      const topTags = getTopHashtags(allNews.filter(n => n.category === "social_media"));
                      return (
                        <div className="hashtag-freq-section">
                          <h4 style={{ fontSize: "0.85rem", color: "var(--text-secondary)", marginBottom: "8px", fontWeight: 500 }}>Top Hashtags</h4>
                          {topTags.length > 0 ? (
                            <div style={{ display: "flex", flexDirection: "column", gap: "6px" }}>
                              {topTags.map(([tag, count]) => (
                                <div
                                  key={tag}
                                  className={`hashtag-freq-item ${selectedHashtag === tag ? "active" : ""}`}
                                  onClick={() => setSelectedHashtag(selectedHashtag === tag ? null : tag)}
                                  style={{
                                    display: "flex",
                                    justifyContent: "space-between",
                                    alignItems: "center",
                                    padding: "6px 10px",
                                    borderRadius: "6px",
                                    backgroundColor: selectedHashtag === tag ? "rgba(29, 155, 240, 0.15)" : "rgba(255,255,255,0.03)",
                                    border: `1px solid ${selectedHashtag === tag ? "#1d9bf0" : "transparent"}`,
                                    fontSize: "0.78rem",
                                    cursor: "pointer",
                                    color: selectedHashtag === tag ? "#1d9bf0" : "var(--text-secondary)",
                                    transition: "all 0.2s ease"
                                  }}
                                >
                                  <span>{tag}</span>
                                  <span style={{ fontSize: "0.72rem", color: "var(--text-muted)" }}>{count} posts</span>
                                </div>
                              ))}
                            </div>
                          ) : (
                            <p style={{ fontSize: "0.75rem", color: "var(--text-muted)", fontStyle: "italic" }}>No hashtags found.</p>
                          )}
                        </div>
                      );
                    })()}

                    {/* Sparkline Graph */}
                    {(() => {
                      const trend = getPostingTrend(allNews.filter(n => n.category === "social_media"));
                      const maxVal = Math.max(...trend, 1);
                      const width = 280;
                      const height = 60;
                      const points = trend.map((val, idx) => {
                        const x = (idx / (trend.length - 1)) * width;
                        const y = height - (val / maxVal) * (height - 10) - 5;
                        return { x, y };
                      });
                      const pathD = points.reduce((acc, p, i) => acc + `${i === 0 ? 'M' : 'L'} ${p.x.toFixed(1)} ${p.y.toFixed(1)} `, "");
                      const areaD = pathD + `L ${width} ${height} L 0 ${height} Z`;
                      return (
                        <div className="sparkline-section">
                          <h4 style={{ fontSize: "0.85rem", color: "var(--text-secondary)", marginBottom: "8px", fontWeight: 500 }}>𝕏 Posting Activity (Trend)</h4>
                          <div style={{ padding: "8px", borderRadius: "8px", backgroundColor: "rgba(255,255,255,0.02)", display: "flex", justifyContent: "center" }}>
                            <svg width="100%" height={height} viewBox={`0 0 ${width} ${height}`} style={{ overflow: "visible" }}>
                              <defs>
                                <linearGradient id="sparklineGrad" x1="0" y1="0" x2="0" y2="1">
                                  <stop offset="0%" stopColor="#1d9bf0" stopOpacity="0.25" />
                                  <stop offset="100%" stopColor="#1d9bf0" stopOpacity="0.0" />
                                </linearGradient>
                              </defs>
                              {/* Area under curve */}
                              <path d={areaD} fill="url(#sparklineGrad)" />
                              {/* Curve path */}
                              <path d={pathD} fill="none" stroke="#1d9bf0" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                              {/* Dots at peaks */}
                              {points.map((p, i) => (
                                <circle key={i} cx={p.x} cy={p.y} r={i === points.length - 1 ? 4 : 2} fill="#1d9bf0" />
                              ))}
                            </svg>
                          </div>
                          <span style={{ fontSize: "0.65rem", color: "var(--text-muted)", display: "block", textAlign: "right", marginTop: "4px" }}>Last 10 active days</span>
                        </div>
                      );
                    })()}

                  </div>
                ) : (
                  <>
                    <div className="intel-section-header">
                      <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                        <Landmark size={18} className="intel-header-icon" />
                        <h3>Official Election Affidavit</h3>
                      </div>
                    </div>

                    {politician.evidenceSheet ? (
                      <div style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
                        <div className="evidence-assets-card">
                          <h4>Asset & Liability Audit</h4>
                          <div className="assets-breakdown-grid">
                            <div className="asset-stat">
                              <span className="asset-stat-label">Movable Assets</span>
                              <span className="asset-stat-val text-success">
                                {politician.evidenceSheet.assetsBreakdown ? politician.evidenceSheet.assetsBreakdown.moveable : politician.evidenceSheet.assetsText}
                              </span>
                            </div>
                            <div className="asset-stat">
                              <span className="asset-stat-label">Immovable Assets</span>
                              <span className="asset-stat-val text-accent">
                                {politician.evidenceSheet.assetsBreakdown ? politician.evidenceSheet.assetsBreakdown.immoveable : "₹0.0 Crore"}
                              </span>
                            </div>
                            <div className="asset-stat">
                              <span className="asset-stat-label">Declared Liabilities</span>
                              <span className="asset-stat-val text-danger">
                                {politician.evidenceSheet.assetsBreakdown ? politician.evidenceSheet.assetsBreakdown.liabilities : "₹0.0 Crore"}
                              </span>
                            </div>
                          </div>
                        </div>

                        <div className="evidence-cases-card">
                          <h4>Affidavit Court Case Filings</h4>
                          {politician.evidenceSheet.ipcSectionDetails?.length > 0 ? (
                            <div className="affidavit-cases-list">
                              {politician.evidenceSheet.ipcSectionDetails.map((item, index) => (
                                <div className="affidavit-case-item" key={index}>
                                  <div className="case-item-title-row">
                                    <span className="case-ipc-badge">{item.ipc}</span>
                                    <span className="case-status-badge">{item.status}</span>
                                  </div>
                                  <p className="case-offence-desc">{item.offence}</p>
                                  <span className="case-court-label">Court: {item.court}</span>
                                </div>
                              ))}
                            </div>
                          ) : politician.evidenceSheet.legalFilings?.length > 0 ? (
                            <div className="affidavit-cases-list">
                              {politician.evidenceSheet.legalFilings.map((item, index) => (
                                <div className="affidavit-case-item" key={index}>
                                  <div className="case-item-title-row">
                                    <span className="case-ipc-badge" style={{ fontSize: "0.68rem" }}>{item.caseNumber}</span>
                                    <span className="case-status-badge">{item.status}</span>
                                  </div>
                                  <p className="case-offence-desc" style={{ marginTop: "4px" }}>{item.charges}</p>
                                  <div style={{ display: "flex", flexDirection: "column", fontSize: "0.68rem", color: "var(--text-muted)", marginTop: "4px" }}>
                                    <span>Court: {item.court}</span>
                                    <span>Petitioner: {item.petitioner}</span>
                                  </div>
                                </div>
                              ))}
                            </div>
                          ) : (
                            <p style={{ fontSize: "0.85rem", color: "var(--text-muted)", fontStyle: "italic" }}>
                              No pending indictments filed under oath.
                            </p>
                          )}
                        </div>

                        {politician.evidenceSheet.affidavitUrl && (
                          <a
                            href={politician.evidenceSheet.affidavitUrl}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="news-read-more-btn"
                            style={{ width: "fit-content", display: "flex", alignItems: "center", gap: "6px", fontSize: "0.78rem" }}
                          >
                            <ExternalLink size={12} /> View ECI Affidavit PDF
                          </a>
                        )}

                        <span className="evidence-source-tag">Source: {politician.evidenceSheet.sources || "ECI Portal"}</span>
                      </div>
                    ) : (
                      <div className="no-evidence-fallback">
                        <Landmark size={32} style={{ opacity: 0.3, marginBottom: "12px" }} />
                        <p>No modern ECI election affidavit found on public record.</p>
                      </div>
                    )}
                  </>
                )}
              </div>

              {/* Right: Newsroom Feed */}
              <div className="intel-feed-section">
                <div className="intel-section-header">
                  <div className="live-indicator-group">
                    <span className="live-pulsating-dot" />
                    <h3>Intelligence Newsroom</h3>
                  </div>
                  <span className="feed-count-badge">{filteredNews.length.toLocaleString()} shown</span>
                </div>

                {/* Search + Filter Bar */}
                <div className="intel-search-filter-bar" style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
                  <div className="intel-search-box">
                    <Search size={14} style={{ color: "var(--text-muted)", flexShrink: 0 }} />
                    <input
                      type="text"
                      placeholder="Search headlines, sources..."
                      value={newsSearch}
                      onChange={(e) => setNewsSearch(e.target.value)}
                      className="intel-search-input"
                    />
                  </div>
                  {selectedHashtag && (
                    <div className="active-tag-filter-pill" style={{
                      display: "flex",
                      alignItems: "center",
                      gap: "6px",
                      padding: "4px 10px",
                      borderRadius: "12px",
                      backgroundColor: "rgba(29, 155, 240, 0.15)",
                      border: "1px solid #1d9bf0",
                      color: "#1d9bf0",
                      fontSize: "0.75rem",
                      alignSelf: "flex-start"
                    }}>
                      <span>Filtering tag: <strong>{selectedHashtag}</strong></span>
                      <button
                        onClick={() => setSelectedHashtag(null)}
                        style={{
                          background: "none",
                          border: "none",
                          color: "#1d9bf0",
                          cursor: "pointer",
                          fontWeight: "bold",
                          fontSize: "0.85rem",
                          display: "flex",
                          alignItems: "center",
                          lineHeight: "1"
                        }}
                      >
                        ×
                      </button>
                    </div>
                  )}
                </div>

                {/* Category Filter Pills */}
                <div className="category-pills-row">
                  {Object.entries(CATEGORY_CONFIG).map(([key, cfg]) => {
                    const Icon = cfg.icon;
                    const count = categoryCounts[key] || 0;
                    if (key !== "all" && count === 0) return null;
                    return (
                      <button
                        key={key}
                        className={`category-pill ${activeCategory === key ? "active" : ""}`}
                        onClick={() => {
                          setActiveCategory(key);
                          setSelectedHashtag(null);
                        }}
                        style={activeCategory === key ? { borderColor: cfg.color, color: cfg.color } : {}}
                      >
                        <Icon size={12} />
                        {cfg.label}
                        <span className="pill-count">{key === "all" ? allNews.length : count}</span>
                      </button>
                    );
                  })}
                </div>

                {/* News Cards */}
                <div className="intel-news-scroll-container">
                  {filteredNews.length > 0 ? (
                    filteredNews.map((news) => {
                      const catCfg = CATEGORY_CONFIG[news.category] || CATEGORY_CONFIG.news;
                      const CatIcon = catCfg.icon;
                      const isExpanded = expandedCard === news.id;

                      if (news.category === "social_media") {
                        const handle = POLITICIAN_HANDLES[news.politicianId] || `@${news.politicianId || 'politician'}`;
                        const charCodeSum = Array.from(news.id).reduce((sum, char) => sum + char.charCodeAt(0), 0);
                        const mockRetweets = (charCodeSum % 400) + 50;
                        const mockLikes = (charCodeSum % 3000) + 120;
                        const mockReplies = (charCodeSum % 150) + 15;
                        const mockViews = `${((charCodeSum % 900) / 10 + 10).toFixed(1)}K`;

                        return (
                          <div
                            className={`x-post-card ${isExpanded ? "expanded" : ""}`}
                            key={news.id}
                            onClick={() => setExpandedCard(isExpanded ? null : news.id)}
                          >
                            <div className="x-post-header">
                              <div className="x-post-avatar" style={{ color: party.color, borderColor: party.color }}>
                                <User size={16} />
                              </div>
                              <div className="x-post-author-info">
                                <div className="x-post-name-row">
                                  <span className="x-post-author-name">{politician.name}</span>
                                  <span className="x-post-verified-badge" title="Verified Public Figure">✓</span>
                                  <span className="x-post-handle">{handle}</span>
                                  <span className="x-post-dot">·</span>
                                  <span className="x-post-date">{news.date}</span>
                                </div>
                              </div>
                              <div className="x-logo-badge">
                                <XIcon size={12} style={{ color: "var(--text-muted)" }} />
                              </div>
                            </div>

                            <div className="x-post-content">
                              <p className="x-post-text">
                                {renderFormattedPostText(news.title, (tag) => {
                                  setActiveCategory("social_media");
                                  setSelectedHashtag(tag);
                                })}
                              </p>
                              {isExpanded && news.snippet && (
                                <div className="x-post-expanded-content">
                                  <p className="x-post-snippet">{news.snippet}</p>
                                  <a
                                    href={news.url}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="news-read-more-btn"
                                    onClick={(e) => e.stopPropagation()}
                                    style={{ marginTop: "10px", width: "fit-content" }}
                                  >
                                    <ExternalLink size={12} />
                                    View on 𝕏
                                  </a>
                                </div>
                              )}
                            </div>

                            <div className="x-post-actions">
                              <button className="x-action-btn hover-blue" onClick={(e) => { e.stopPropagation(); alert("Replied (simulation)"); }}>
                                <MessageCircle size={14} />
                                <span>{mockReplies}</span>
                              </button>
                              <button className="x-action-btn hover-green" onClick={(e) => { e.stopPropagation(); alert("Reposted (simulation)"); }}>
                                <Repeat size={14} />
                                <span>{mockRetweets}</span>
                              </button>
                              <button className="x-action-btn hover-pink" onClick={(e) => { e.stopPropagation(); alert("Liked (simulation)"); }}>
                                <Heart size={14} />
                                <span>{mockLikes}</span>
                              </button>
                              <button className="x-action-btn hover-blue" onClick={(e) => { e.stopPropagation(); alert("Viewed (simulation)"); }}>
                                <BarChart3 size={14} />
                                <span>{mockViews}</span>
                              </button>
                              <button className="x-action-btn hover-blue" onClick={(e) => { e.stopPropagation(); alert("Shared (simulation)"); }}>
                                <Share2 size={14} />
                              </button>
                            </div>
                          </div>
                        );
                      }

                      return (
                        <div
                          className={`news-feed-card ${isExpanded ? "expanded" : ""}`}
                          key={news.id}
                          onClick={() => setExpandedCard(isExpanded ? null : news.id)}
                        >
                          <div className="news-card-header">
                            <div className="news-card-meta-left">
                              <span className="news-category-chip" style={{ color: catCfg.color, borderColor: catCfg.color }}>
                                <CatIcon size={10} />
                                {catCfg.label}
                              </span>
                              <span className="news-source-tag">{news.source}</span>
                            </div>
                            <span className="news-date-tag">{news.date}</span>
                          </div>
                          <h4 className="news-card-title">{news.title}</h4>
                          {isExpanded && (
                            <div className="news-expanded-content">
                              <p className="news-card-snippet">{news.snippet}</p>
                              <a
                                href={news.url}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="news-read-more-btn"
                                onClick={(e) => e.stopPropagation()}
                              >
                                <ExternalLink size={12} />
                                Read full article
                              </a>
                            </div>
                          )}
                        </div>
                      );
                    })
                  ) : (
                    <div className="no-news-fallback">
                      <Search size={32} style={{ opacity: 0.3, marginBottom: "12px" }} />
                      <p>{newsSearch || activeCategory !== "all" ? "No articles match your filters." : "No news data available. Run the scraper."}</p>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
