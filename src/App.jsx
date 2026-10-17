import { useState, useMemo, useEffect, useRef, useCallback } from "react";
import PoliticianSpace from "./components/PoliticianSpace";
import EventGraph from "./components/EventGraph";
import IntelligenceFeed from "./components/IntelligenceFeed";
import PolicyImpactDashboard from "./components/PolicyImpactDashboard";
import { 
  seedPoliticians, seedParties, generateEventGraphData, seedAdministrations 
} from "./data/politicalDatabase";
import { mergeTimeFabricData } from "./data/timeFabricData";
import { fullIntelFile, isMobileBuild, loadData, normalizeStory, recentIntelFile, statusFile, storylinesFile } from "./dataSource";
import { relativeTime, formatDateTime, textLanguage, indianNumber } from "./components/dateLabels";
import { 
  Users, GitBranch, Search, ChevronRight, Newspaper, ClipboardList, RefreshCw, ChevronDown
} from "lucide-react";

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
  return new Date().getFullYear();
};

// Formats active assembly terms and years
const formatAssemblySummary = (p) => {
  if (!p.assemblies || p.assemblies.length === 0) return "Non-MLA";
  
  const sorted = [...p.assemblies].sort((a, b) => a - b);
  const startAssemblyId = sorted[0];
  const endAssemblyId = sorted[sorted.length - 1];
  
  const assemblyStartYears = {
    1: 1952, 2: 1957, 3: 1962, 4: 1967, 5: 1971, 6: 1977, 7: 1980, 8: 1984,
    9: 1989, 10: 1991, 11: 1996, 12: 2001, 13: 2006, 14: 2011, 15: 2016, 16: 2021, 17: 2026
  };
  
  const startYear = assemblyStartYears[startAssemblyId] || 1952;
  const politicianEndYear = getPoliticianEndYear(p);
  let endYear;
  if (politicianEndYear < new Date().getFullYear()) {
    endYear = politicianEndYear.toString();
  } else {
    const assemblyEndYears = {
      1: 1957, 2: 1962, 3: 1967, 4: 1971, 5: 1976, 6: 1980, 7: 1984, 8: 1988,
      9: 1991, 10: 1996, 11: 2001, 12: 2006, 13: 2011, 14: 2016, 15: 2021, 16: 2026, 17: "Present"
    };
    endYear = assemblyEndYears[endAssemblyId] || "Present";
  }
  
  const rangeStr = startAssemblyId === endAssemblyId ? `${startAssemblyId}th` : `${startAssemblyId}th-${endAssemblyId}th`;
  return `${rangeStr} Asm (${startYear}-${endYear})`;
};

// Formats party shifts summary
const formatPartyShiftsSummary = (p) => {
  if (!p.partyShifts || p.partyShifts.length === 0) {
    return `${p.party.toUpperCase()} (Continuous)`;
  }
  
  const sortedShifts = [...p.partyShifts].sort((a, b) => a.year - b.year);
  const parts = [];
  
  if (sortedShifts[0].from && sortedShifts[0].from !== "None" && sortedShifts[0].from !== "Cinema" && sortedShifts[0].from !== "IPS (Police)") {
    parts.push(sortedShifts[0].from.toUpperCase());
  }
  
  sortedShifts.forEach(s => {
    parts.push(`${s.to.toUpperCase()} (${s.year})`);
  });
  
  return parts.join(" → ");
};

const normalizePersonName = (value = "") =>
  value
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "")
    .trim();

const hasNumberValue = (value) => typeof value === "number" && Number.isFinite(value);

const formatVoteCount = (value) => hasNumberValue(value) ? value.toLocaleString("en-IN") : "Not sourced yet";

const buildOfficialRoster = (mla) => mla ? {
  id: mla.id,
  politicianId: mla.politicianId,
  sourceType: mla.sourceType,
  sources: mla.sources || [],
  constituencyNumber: mla.constituencyNumber,
  constituency: mla.constituency,
  reservationCategory: mla.reservationCategory,
  totalElectors: mla.totalElectors,
  candidateName: mla.candidateName || mla.mlaName,
  partyName: mla.partyName,
  partyCode: mla.partyCode,
  symbol: mla.symbol,
  votes: mla.votes,
  voteShare: mla.voteShare,
  electorShare: mla.electorShare,
  marginVotes: mla.marginVotes,
  runnerUpName: mla.runnerUpName,
  runnerUpParty: mla.runnerUpParty,
  runnerUpPartyCode: mla.runnerUpPartyCode,
  runnerUpVotes: mla.runnerUpVotes,
  resultStatus: mla.resultStatus,
  retrievedAt: mla.sources?.[0]?.retrievedAt,
} : null;

const buildPoliticianIdAliases = (mlas = []) => {
  const aliases = {};
  mlas.forEach(mla => {
    if (!mla?.politicianId) return;
    aliases[mla.politicianId] = mla.politicianId;
    if (mla.id) {
      aliases[mla.id] = mla.politicianId;
    }
    if (mla.constituencyNumber) {
      aliases[`mla_${mla.constituencyNumber}`] = mla.politicianId;
      aliases[`mla_17_${mla.constituencyNumber}`] = mla.politicianId;
      aliases[`assembly_17_${mla.constituencyNumber}`] = mla.politicianId;
    }
  });
  return aliases;
};

const canonicalizePoliticianId = (politicianId, aliases) => {
  if (!politicianId || politicianId === "general") return politicianId;
  return aliases[politicianId] || politicianId;
};

const normalizeIntelRecords = (records = [], aliases = {}) =>
  records.map(normalizeStory).map(item => {
    const canonicalPoliticianId = canonicalizePoliticianId(item.politicianId, aliases);
    if (canonicalPoliticianId === item.politicianId) return item;
    return {
      ...item,
      legacyPoliticianId: item.politicianId,
      politicianId: canonicalPoliticianId
    };
  });

// Merges fetched ECI 17th Assembly roster and intelligence dossiers into basePoliticians
const mergeIntelAndRoster = (freshIntel, basePoliticians) => {
  const mlas = freshIntel.mlas || [];
  const politicianAliases = buildPoliticianIdAliases(mlas);
  const news = normalizeIntelRecords(freshIntel.news || [], politicianAliases);
  const evidence = normalizeIntelRecords(freshIntel.evidence || [], politicianAliases);
  const usedMlaIds = new Set();

  const mlaByPoliticianId = {};
  const mlaByName = {};
  mlas.forEach(mla => {
    if (mla.politicianId) {
      mlaByPoliticianId[mla.politicianId] = mla;
    }
    const normalizedCandidate = normalizePersonName(mla.candidateName || mla.mlaName);
    if (normalizedCandidate) {
      mlaByName[normalizedCandidate] = mla;
    }
  });

  const evidenceMap = {};
  evidence.forEach(ev => {
    if (ev.politicianId) {
      evidenceMap[ev.politicianId] = ev;
    }
  });

  const mergedPoliticians = basePoliticians.map(p => {
    const mla = mlaByPoliticianId[p.id] || mlaByName[normalizePersonName(p.name)];
    const ev = evidenceMap[p.id];
    const newsFeed = news.filter(item => item.politicianId === p.id);
    if (mla?.id) {
      usedMlaIds.add(mla.id);
    }
    const officialRoster = buildOfficialRoster(mla);

    let updatedAssemblies = p.assemblies ? [...p.assemblies] : [];
    if (mla && !updatedAssemblies.includes(17)) {
      updatedAssemblies.push(17);
    }

    const mlaDetails = {
      ...(p.mlaDetails || {}),
      ...(mla ? {
        age: mla.age || p.mlaDetails?.age,
        portfolio: mla.portfolio || "Member of Legislative Assembly",
        assetsValue: hasNumberValue(mla.assets) ? mla.assets : p.mlaDetails?.assetsValue,
        assetsText: hasNumberValue(mla.assets) ? `₹${mla.assets} Crore` : (p.mlaDetails?.assetsText || "Not sourced yet"),
        history: `Won ${mla.constituency} in the 17th Assembly election with ${formatVoteCount(mla.votes)} votes${hasNumberValue(mla.marginVotes) ? `, a margin of ${formatVoteCount(mla.marginVotes)}` : ""}. Source: ECI detailed results.`,
      } : {}),
      ...(ev ? {
        affidavitUrl: ev.affidavitUrl || p.mlaDetails?.affidavitUrl,
        legalFilings: ev.legalFilings || p.mlaDetails?.legalFilings,
        history: ev.history || p.mlaDetails?.history,
      } : {})
    };

    const criminalProfile = {
      ...(p.criminalProfile || {}),
      ...(mla ? {
        hasCases: typeof mla.hasCases === "boolean" ? mla.hasCases : (p.criminalProfile?.hasCases ?? null),
        casesCount: hasNumberValue(mla.casesCount) ? mla.casesCount : (p.criminalProfile?.casesCount ?? null),
        jailTimeText: typeof mla.hasCases === "boolean" ? (mla.hasCases ? "Pending judicial hearings" : "No declared cases in current roster data") : (p.criminalProfile?.jailTimeText || "Not sourced yet")
      } : {}),
      majorCharges: ev && ev.badDeeds ? ev.badDeeds : (p.criminalProfile?.majorCharges || [])
    };

    return {
      ...p,
      assemblies: updatedAssemblies,
      mlaDetails,
      criminalProfile,
      goodDeeds: ev && ev.goodDeeds ? ev.goodDeeds : (p.goodDeeds || []),
      badDeeds: ev && ev.badDeeds ? ev.badDeeds : (p.badDeeds || []),
      newsFeed,
      evidenceSheet: ev || null,
      officialRoster,
      isSourcedRoster: Boolean(officialRoster)
    };
  });

  const newMlaPoliticians = [];

  mlas.forEach(mla => {
    if (mla.politicianId && !usedMlaIds.has(mla.id)) {
      const pid = mla.politicianId;
      const ev = evidenceMap[pid];
      const newsFeed = news.filter(item => item.politicianId === pid);
      const officialRoster = buildOfficialRoster(mla);

      const mlaDetails = {
        age: mla.age || null,
        portfolio: mla.portfolio || "Member of Legislative Assembly",
        assetsValue: null,
        assetsText: "Not sourced yet",
        history: ev ? ev.history : `Won ${mla.constituency} in the 17th Assembly election with ${formatVoteCount(mla.votes)} votes${hasNumberValue(mla.marginVotes) ? `, a margin of ${formatVoteCount(mla.marginVotes)}` : ""}. Source: ECI detailed results.`,
        affidavitUrl: ev ? ev.affidavitUrl : "",
        legalFilings: ev ? ev.legalFilings : []
      };

      const criminalProfile = {
        hasCases: null,
        casesCount: null,
        jailTimeText: "Not sourced yet",
        majorCharges: ev && ev.badDeeds ? ev.badDeeds : []
      };

      newMlaPoliticians.push({
        id: pid,
        name: mla.mlaName || mla.candidateName,
        party: mla.party,
        constituency: mla.constituency,
        constituencyNumber: mla.constituencyNumber,
        assemblies: [17],
        mlaDetails,
        criminalProfile,
        goodDeeds: ev && ev.goodDeeds ? ev.goodDeeds : [],
        badDeeds: ev && ev.badDeeds ? ev.badDeeds : [],
        partyShifts: [],
        newsFeed,
        evidenceSheet: ev || null,
        officialRoster,
        isSourcedRoster: true
      });
    }
  });

  return [...mergedPoliticians, ...newMlaPoliticians];
};

export default function App() {
  const [db, setDb] = useState(() => {
    return {
      politicians: seedPoliticians,
      parties: seedParties,
      administrations: seedAdministrations,
      news: [],
      rosterMeta: null,
      intelUpdatedAt: null,
      lastIntelSync: null
    };
  });

  const [workspaceMode, setWorkspaceMode] = useState("intelligence"); // "intelligence" | "policies" | "politician" | "events"
  const [theme, setTheme] = useState(() => {
    try { return ["light", "dark", "system"].includes(localStorage.getItem("polint-theme")) ? localStorage.getItem("polint-theme") : "light"; }
    catch { return "light"; }
  });
  useEffect(() => {
    const preference = matchMedia("(prefers-color-scheme: dark)");
    const apply = () => {
      const mode = theme === "system" ? (preference.matches ? "dark" : "light") : theme;
      document.documentElement.dataset.theme = mode;
      document.querySelector('meta[name="theme-color"]')?.setAttribute("content", mode === "dark" ? "#211e1a" : "#fbf6ed");
    };
    apply();
    try { localStorage.setItem("polint-theme", theme); } catch { /* Storage may be disabled. */ }
    preference.addEventListener("change", apply);
    return () => preference.removeEventListener("change", apply);
  }, [theme]);
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedAdminId, setSelectedAdminId] = useState("all");
  // Opens on the sitting Chief Minister.
  const [selectedPoliticianId, setSelectedPoliticianId] = useState("vijay");
  const [timeFabricSnapshot, setTimeFabricSnapshot] = useState(null);
  const [storylines, setStorylines] = useState(null);
  const [intelStatus, setIntelStatus] = useState(null);
  const [focusedEventId, setFocusedEventId] = useState(null);
  const [toast, setToast] = useState({ show: false, message: "", type: "info" });
  const [directoryOpen, setDirectoryOpen] = useState(false);
  const [refreshing, setRefreshing] = useState(true);
  const [intelLoadState, setIntelLoadState] = useState("loading");
  const [offline, setOffline] = useState(() => !navigator.onLine);
  const [now, setNow] = useState(() => Date.now());
  const refreshingRef = useRef(false);

  useEffect(() => {
    document.querySelector("#main-content")?.scrollTo(0, 0);
  }, [workspaceMode, selectedPoliticianId, focusedEventId]);


  const showToast = useCallback((message, type = "info") => {
    setToast({ show: true, message, type });
    setTimeout(() => {
      setToast(prev => prev.message === message ? { ...prev, show: false } : prev);
    }, 4000);
  }, []);

  const statusRef = useRef(null);
  const latestSnapshotTimeRef = useRef(0);

  const applyFreshIntel = useCallback((freshIntel, updatedAt) => {
    const aliases = buildPoliticianIdAliases(freshIntel.mlas || []);
    const merged = mergeIntelAndRoster(freshIntel, seedPoliticians);
    setDb(prev => ({
      ...prev,
      politicians: merged,
      news: normalizeIntelRecords(freshIntel.news || [], aliases),
      rosterMeta: freshIntel.rosterMeta || null,
      intelUpdatedAt: updatedAt,
      lastIntelSync: new Date().toISOString()
    }));
  }, []);

  // Checks the small status file first and downloads stories only when a new snapshot exists.
  const refreshIntel = useCallback(async ({ force = false } = {}) => {
    if (refreshingRef.current) return false;
    refreshingRef.current = true;
    setRefreshing(true);
    try {
      const status = await loadData(statusFile).catch(() => null);
      const previous = statusRef.current;
      if (!force && status && previous && status.generatedAt === previous.generatedAt) {
        setOffline(!navigator.onLine);
        setNow(Date.now());
        return false;
      }
      const [intel, fabric, threads] = await Promise.allSettled([
        loadData(recentIntelFile),
        loadData("/timeFabric.json"),
        loadData(storylinesFile),
      ]);
      if (intel.status === "rejected") throw intel.reason;
      if (!Array.isArray(intel.value?.news)) throw new Error("The intelligence snapshot has no story list");
      const freshIntel = intel.value;
      const updatedAt = status?.generatedAt || freshIntel.coverageMeta?.lastSnapshotAt || freshIntel.coverageMeta?.lastRunAt;
      const snapshotTime = Date.parse(updatedAt) || 0;
      // The mobile loader can fall back to an older bundled snapshot after a network failure.
      if (isMobileBuild && snapshotTime < latestSnapshotTimeRef.current) {
        setOffline(true);
        return false;
      }
      if (fabric.status === "fulfilled") setTimeFabricSnapshot(fabric.value);
      if (threads.status === "fulfilled") setStorylines(threads.value);
      applyFreshIntel(freshIntel, updatedAt);
      latestSnapshotTimeRef.current = snapshotTime;
      statusRef.current = status;
      setIntelStatus(status);
      setIntelLoadState("ready");
      setOffline(!navigator.onLine || fabric.status === "rejected");
      setNow(Date.now());
      const added = (status?.rawItemCount || 0) - (previous?.rawItemCount || 0);
      if (previous && added > 0) showToast(`${indianNumber(added)} new stories loaded`, "success");
      if (fullIntelFile) {
        // Dossiers need the full archive; it streams in after the recent stories render.
        loadData(fullIntelFile)
          .then(full => {
            if (statusRef.current === status && Array.isArray(full?.news)) applyFreshIntel(full, updatedAt);
          })
          .catch(error => console.warn("Full archive unavailable; showing recent stories:", error));
      }
      return true;
    } catch (error) {
      console.warn("Intelligence refresh unavailable; keeping saved data:", error);
      setIntelLoadState(previous => previous === "ready" ? previous : "error");
      setOffline(true);
      return false;
    } finally {
      refreshingRef.current = false;
      setRefreshing(false);
    }
  }, [applyFreshIntel, showToast]);

  useEffect(() => {
    let active = true;
    // Deferring also avoids a duplicate launch request during StrictMode's setup check.
    queueMicrotask(() => {
      if (active) void refreshIntel();
    });
    const refreshVisible = () => {
      if (document.visibilityState === "visible") void refreshIntel();
    };
    const markOffline = () => setOffline(true);
    const interval = setInterval(refreshVisible, 5 * 60 * 1000);
    const clock = setInterval(() => setNow(Date.now()), 60 * 1000);
    document.addEventListener("visibilitychange", refreshVisible);
    window.addEventListener("online", refreshVisible);
    window.addEventListener("offline", markOffline);
    return () => {
      active = false;
      clearInterval(interval);
      clearInterval(clock);
      document.removeEventListener("visibilitychange", refreshVisible);
      window.removeEventListener("online", refreshVisible);
      window.removeEventListener("offline", markOffline);
    };
  }, [refreshIntel]);

  // 1. Filter Politicians based on Selected Assembly and Search Query
  const filteredPoliticians = useMemo(() => {
    let list = db.politicians;

    if (selectedAdminId !== "all") {
      const adminId = parseInt(selectedAdminId, 10);
      list = list.filter(p => p.assemblies && p.assemblies.includes(adminId));
    }

    if (searchQuery.trim() !== "") {
      const q = searchQuery.toLowerCase();
      list = list.filter(p => 
        (p.name || "").toLowerCase().includes(q) ||
        (p.constituency || "").toLowerCase().includes(q)
      );
    }
    return list;
  }, [db, selectedAdminId, searchQuery]);

  // 2. Group the Filtered Politicians
  const groupedPoliticians = useMemo(() => {
    const mlas = [];
    const emlas = [];
    const leaders = [];

    filteredPoliticians.forEach(p => {
      if (p.assemblies && p.assemblies.includes(17)) {
        mlas.push(p);
      } else if (p.assemblies && p.assemblies.length > 0) {
        emlas.push(p);
      } else {
        leaders.push(p);
      }
    });

    return { mlas, emlas, leaders };
  }, [filteredPoliticians]);

  // 3. Retrieve Selected Politician Details
  const activePolitician = useMemo(() => {
    return db.politicians.find(p => p.id === selectedPoliticianId);
  }, [db, selectedPoliticianId]);

  // 4. Generate Event Graph Nodes & Edges (Time Fabric)
  const { nodes: eventNodes, edges: eventEdges } = useMemo(() => {
    return mergeTimeFabricData(generateEventGraphData(), timeFabricSnapshot);
  }, [timeFabricSnapshot]);

  const activePoliticianEvents = useMemo(
    () => eventNodes.filter(event => event.politicianId === selectedPoliticianId),
    [eventNodes, selectedPoliticianId],
  );

  const handleSelectPolitician = (id) => {
    setSelectedPoliticianId(id);
    setDirectoryOpen(false);
    setWorkspaceMode("politician"); // Auto shift to profile view
  };

  const handleSelectEvent = (id) => {
    setFocusedEventId(id);
    setWorkspaceMode("events");
  };

  const renderPoliticianItem = (p) => {
    const isActive = selectedPoliticianId === p.id;
    const party = db.parties.find(pt => pt.id === p.party) || { color: "var(--color-ind)" };
    return (
      <button
        type="button"
        key={p.id}
        className={`politician-list-item ${isActive ? "active" : ""}`}
        onClick={() => handleSelectPolitician(p.id)}
      >
        <span className="directory-party" title={party.name}><i className="party-badge-dot" style={{ backgroundColor: party.color }} />{p.party.toUpperCase()}</span>
        <div style={{ display: "flex", flexDirection: "column", flex: 1, minWidth: 0 }}>
          <span lang={textLanguage(p.name)} className="politician-item-name" style={{ overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", fontWeight: 600 }}>
            {p.name}
          </span>
          <span className="politician-item-meta" style={{ fontSize: "0.7rem", color: "var(--text-secondary)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", marginTop: "2px" }}>
            {p.constituency} • {formatAssemblySummary(p)}
          </span>
          <span className="politician-item-shifts" style={{ fontSize: "0.62rem", color: "var(--text-muted)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", fontStyle: "italic", marginTop: "1px" }}>
            {formatPartyShiftsSummary(p)}
          </span>
        </div>
        <ChevronRight size={12} style={{ color: "var(--text-muted)", opacity: isActive ? 1 : 0 }} />
      </button>
    );
  };

  return (
    <div className="app-workspace-layout">
      <a className="skip-link" href="#main-content">Skip to content</a>
      {/* 1. Left Sidebar: Mode Selector & Politician List Explorer */}
      <aside className="app-sidebar">
        <div className="sidebar-brand-group">
          
          <div className="sidebar-brand-copy">
            <span className="sidebar-logo-text">PolInt<span>.</span></span>
            <span className="brand-tagline">Tamil Nadu, in context</span>
            <span className={`app-freshness ${offline ? "is-offline" : ""}`} role="status" title={db.intelUpdatedAt ? `Data updated ${formatDateTime(db.intelUpdatedAt)}` : undefined}>
              
              {offline ? (db.lastIntelSync ? "Offline · showing saved data" : "Offline · unable to load feed") : refreshing ? "Checking for updates…" : db.intelUpdatedAt ? `Updated ${relativeTime(db.intelUpdatedAt, now)}` : "Saved intelligence snapshot"}
            </span>
          </div>
          <button type="button" className="app-refresh-btn" onClick={() => refreshIntel({ force: true })} disabled={refreshing} aria-label={refreshing ? "Refreshing intelligence" : "Refresh intelligence"} title="Refresh intelligence">
            <RefreshCw size={18} className={refreshing ? "spin-icon" : ""} aria-hidden="true" />
          </button>
        </div>

        <label className="theme-control">Theme
          <select aria-label="Appearance" value={theme} onChange={event => setTheme(event.target.value)}>
            <option value="light">Light</option><option value="dark">Dark</option><option value="system">System</option>
          </select>
        </label>

        {/* Global Workspace Mode Toggle */}
        <nav className="sidebar-mode-toggle" aria-label="Workspaces">
          <button
            className={`sidebar-mode-btn ${workspaceMode === "intelligence" ? "active" : ""}`}
            aria-current={workspaceMode === "intelligence" ? "page" : undefined}
            aria-label="Intelligence Feed"
            onClick={() => setWorkspaceMode("intelligence")}
          >
            <Newspaper size={16} />
            <span className="mode-label-desktop">Feed</span><span className="mode-label-mobile">Feed</span>
          </button>
          <button
            className={`sidebar-mode-btn ${workspaceMode === "policies" ? "active" : ""}`}
            aria-current={workspaceMode === "policies" ? "page" : undefined}
            aria-label="Policy Impact"
            onClick={() => setWorkspaceMode("policies")}
          >
            <ClipboardList size={16} />
            <span className="mode-label-desktop">Policies</span><span className="mode-label-mobile">Policies</span>
          </button>
          <button 
            className={`sidebar-mode-btn ${workspaceMode === "politician" ? "active" : ""}`}
            aria-current={workspaceMode === "politician" ? "page" : undefined}
            aria-label="Politician Directory"
            onClick={() => setWorkspaceMode("politician")}
          >
            <Users size={16} />
            <span className="mode-label-desktop">People</span><span className="mode-label-mobile">People</span>
          </button>
          <button 
            className={`sidebar-mode-btn ${workspaceMode === "events" ? "active" : ""}`}
            aria-current={workspaceMode === "events" ? "page" : undefined}
            aria-label="Event Time Fabric"
            onClick={() => setWorkspaceMode("events")}
          >
            <GitBranch size={16} />
            <span className="mode-label-desktop">Timeline</span><span className="mode-label-mobile">Timeline</span>
          </button>
        </nav>

        {workspaceMode === "politician" && (
          <button type="button" className="directory-toggle" aria-expanded={directoryOpen} aria-controls="politician-directory" onClick={() => setDirectoryOpen(open => !open)}>
            <Search size={17} /><span>Find a politician <small>{indianNumber(filteredPoliticians.length)} profiles</small></span><ChevronDown size={17} />
          </button>
        )}

        {/* Workspace Side Panels */}
        {workspaceMode === "politician" ? (
          <div id="politician-directory" className={`sidebar-directory-panel ${directoryOpen ? "is-open" : ""}`} style={{ flex: 1, display: "flex", flexDirection: "column", overflow: "hidden" }}>
            {/* Assembly Filter Selector */}
            <span className="sidebar-section-title">Assembly Administration</span>
            <div className="sidebar-admin-selector">
              <select 
                value={selectedAdminId} 
                onChange={(e) => {
                  setSelectedAdminId(e.target.value);
                  const adminId = e.target.value;
                  if (adminId !== "all") {
                    const parsedId = parseInt(adminId, 10);
                    const matching = db.politicians.filter(p => p.assemblies && p.assemblies.includes(parsedId));
                    if (matching.length > 0 && !matching.some(p => p.id === selectedPoliticianId)) {
                      setSelectedPoliticianId(matching[0].id);
                    }
                  }
                }}
                className="sidebar-select-dropdown"
                aria-label="Filter directory by assembly"
              >
                <option value="all">All Administrations (1st - 17th)</option>
                {db.administrations.map(admin => {
                  const currentYear = new Date().getFullYear();
                  const displayName = admin.name.replace("Present", currentYear);
                  const displayYears = admin.years.replace("Present", currentYear);
                  return (
                    <option key={admin.id} value={admin.id.toString()}>
                      {displayName} ({displayYears})
                    </option>
                  );
                })}
              </select>
            </div>

            {/* Search Input */}
            <span className="sidebar-section-title">Search Directory</span>
            <div className="sidebar-search-box">
              <Search size={14} style={{ color: "var(--text-muted)" }} />
              <input 
                type="text" 
                className="sidebar-search-field" 
                aria-label="Search politicians or constituencies"
                placeholder="Search politicians or constituencies..." 
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
            </div>

            {/* Segregated Scroll List */}
            <div className="politicians-scroll-list">
              {groupedPoliticians.mlas.length > 0 && (
                <div className="sidebar-catalog-group">
                  <span className="sidebar-group-heading">
                    MLAs (Current 17th Assembly) 
                    <span className="group-count">{groupedPoliticians.mlas.length}</span>
                  </span>
                  <div className="sidebar-group-items">
                    {groupedPoliticians.mlas.map(p => renderPoliticianItem(p))}
                  </div>
                </div>
              )}

              {groupedPoliticians.emlas.length > 0 && (
                <div className="sidebar-catalog-group" style={{ marginTop: "12px" }}>
                  <span className="sidebar-group-heading">
                    EMLAs (Ex-MLAs / Former) 
                    <span className="group-count">{groupedPoliticians.emlas.length}</span>
                  </span>
                  <div className="sidebar-group-items">
                    {groupedPoliticians.emlas.map(p => renderPoliticianItem(p))}
                  </div>
                </div>
              )}

              {groupedPoliticians.leaders.length > 0 && (
                <div className="sidebar-catalog-group" style={{ marginTop: "12px" }}>
                  <span className="sidebar-group-heading">
                    Non-MLA Leaders 
                    <span className="group-count">{groupedPoliticians.leaders.length}</span>
                  </span>
                  <div className="sidebar-group-items">
                    {groupedPoliticians.leaders.map(p => renderPoliticianItem(p))}
                  </div>
                </div>
              )}

              {filteredPoliticians.length === 0 && (
                <div style={{ textAlign: "center", padding: "20px", color: "var(--text-muted)", fontSize: "0.8rem" }}>
                  No politicians found.
                </div>
              )}
            </div>
          </div>
        ) : null}
      </aside>

      {/* 2. Center Workspace Panel: Dashboard OR Tabbed Profile Space OR Event Graph Canvas */}
      <main className="workspace-content-pane" id="main-content" aria-label="Selected workspace">
        {workspaceMode === "intelligence" ? (
          <IntelligenceFeed
            news={db.news}
            politicians={db.politicians}
            parties={db.parties}
            events={eventNodes}
            storylines={storylines}
            lastIntelSync={db.lastIntelSync}
            loading={intelLoadState === "loading"}
            loadError={intelLoadState === "error"}
            onRefresh={() => refreshIntel({ force: true })}
            status={intelStatus}
            refreshing={refreshing}
            now={now}
            onSelectPolitician={handleSelectPolitician}
            onSelectEvent={handleSelectEvent}
          />
        ) : workspaceMode === "policies" ? (
          <PolicyImpactDashboard />
        ) : workspaceMode === "politician" ? (
          <PoliticianSpace 
            key={activePolitician?.id || "no-politician"}
            politician={activePolitician} 
            parties={db.parties} 
            events={activePoliticianEvents}
            onSelectEvent={handleSelectEvent}
            playbook={storylines?.people?.[activePolitician?.id]}
            storylines={storylines}
            now={now}
            isKnownPolitician={(id) => db.politicians.some(p => p.id === id)}
            onSelectPolitician={handleSelectPolitician}
          />
        ) : (
          <EventGraph 
            key={focusedEventId || "time-fabric"}
            nodes={eventNodes} 
            edges={eventEdges} 
            focusEventId={focusedEventId}
          />
        )}
      </main>

      {/* Dynamic Toast Notification */}
      {toast.show && (
        <div className={`toast-notification ${toast.type}`}>
          <span className="toast-icon">
            {toast.type === 'success' ? '✓' : toast.type === 'error' ? '✕' : 'ℹ'}
          </span>
          <span className="toast-message">{toast.message}</span>
        </div>
      )}
    </div>
  );
}
