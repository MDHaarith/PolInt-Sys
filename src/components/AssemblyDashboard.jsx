import { useState, useMemo } from "react";
import { Landmark, FileText, ChevronRight, CheckCircle } from "lucide-react";

const PARTY_LABELS = {
  tvk: "Tamilaga Vettri Kazhagam (TVK)",
  dmk: "Dravida Munnetra Kazhagam (DMK)",
  aiadmk: "All India Anna Dravida Munnetra Kazhagam (AIADMK)",
  inc: "Indian National Congress (INC)",
  pmk: "Pattali Makkal Katchi (PMK)",
  cpi: "Communist Party of India (CPI)",
  cpm: "Communist Party of India (Marxist) (CPM)",
  iuml: "Indian Union Muslim League (IUML)",
  vck: "Viduthalai Chiruthaigal Katchi (VCK)",
  dmdk: "Desiya Murpokku Dravida Kazhagam (DMDK)",
  ammk: "Amma Makkal Munnettra Kazagam (AMMK)",
  bjp: "Bharatiya Janata Party (BJP)",
  tdk: "Tamizhaga Desiya Kazhagam (TDK)",
  ind: "Independent / Other"
};

const PARTY_COLORS = {
  tvk: "#ffd700",
  dmk: "#ff3333",
  aiadmk: "#00b074",
  inc: "#0080ff",
  pmk: "#eab308",
  cpi: "#de2c2c",
  cpm: "#c62828",
  iuml: "#2e7d32",
  vck: "#3b82f6",
  dmdk: "#a855f7",
  ammk: "#8b5cf6",
  bjp: "#ff8000",
  tdk: "#f97316",
  ind: "#94a3b8"
};

const RULING_ALLIANCE_PARTIES = ["tvk", "inc", "cpi", "cpm", "iuml", "vck"];
const RULING_PARTY_ORDER = ["tvk", "inc", "cpi", "cpm", "iuml", "vck"];
const OPPOSITION_PARTY_ORDER = ["dmk", "aiadmk", "pmk", "dmdk", "ammk", "bjp", "ind"];
const BENCH_SEATS_PER_ROW = 8;

const ADR_WINNER_SUMMARY = {
  sourceName: "Association for Democratic Reforms / Tamil Nadu Election Watch",
  sourceUrl: "https://groups.google.com/g/national-election-watch/c/Xytk-vbHVnM",
  analysed: 233,
  totalWinners: 234,
  notAnalysed: "Dr. T. Arunkumar, Thiruvallur, TVK - unclear affidavit in ECI upload at report time.",
  criminalCases: {
    tvk: { analysed: 107, cases: 41, serious: 19 },
    dmk: { analysed: 59, cases: 37, serious: 14 },
    aiadmk: { analysed: 47, cases: 33, serious: 14 },
    inc: { analysed: 5, cases: 3, serious: 2 },
    pmk: { analysed: 4, cases: 4, serious: 2 },
    cpm: { analysed: 2, cases: 2, serious: 0 },
    cpi: { analysed: 2, cases: 1, serious: 1 },
    iuml: { analysed: 2, cases: 1, serious: 1 },
    vck: { analysed: 2, cases: 2, serious: 1 },
    ammk: { analysed: 1, cases: 1, serious: 1 },
    dmdk: { analysed: 1, cases: 1, serious: 1 },
    bjp: { analysed: 1, cases: 0, serious: 0 },
  },
};

const orderIndex = (party, order) => {
  const idx = order.indexOf(party);
  return idx === -1 ? order.length + 1 : idx;
};

const sortForBench = (order) => (a, b) =>
  orderIndex(a.party, order) - orderIndex(b.party, order)
  || (a.id || 999) - (b.id || 999)
  || a.mlaName.localeCompare(b.mlaName);

const assignBenchPositions = (items, sideLabel) =>
  items.map((seat, index) => ({
    ...seat,
    chamberSide: sideLabel,
    chamberRow: Math.floor(index / BENCH_SEATS_PER_ROW) + 1,
    chamberSeat: (index % BENCH_SEATS_PER_ROW) + 1,
    chamberIndex: index + 1,
  }));

const buildChamberLayout = (seats) => {
  const occupiedSeats = seats.filter(seat => !seat.isVacant);
  const vacancies = seats.filter(seat => seat.isVacant);
  const ruling = occupiedSeats
    .filter(seat => RULING_ALLIANCE_PARTIES.includes(seat.party))
    .sort(sortForBench(RULING_PARTY_ORDER));
  const opposition = occupiedSeats
    .filter(seat => !RULING_ALLIANCE_PARTIES.includes(seat.party))
    .sort(sortForBench(OPPOSITION_PARTY_ORDER));

  const treasuryBenches = assignBenchPositions(ruling, "Treasury benches");
  const oppositionBenches = assignBenchPositions(opposition, "Opposition benches");

  return {
    treasuryBenches,
    oppositionBenches,
    vacancies,
    allSeats: [...treasuryBenches, ...oppositionBenches],
  };
};

const HISTORICAL_DATA = [
  {
    id: 1,
    name: "1st Assembly",
    years: "1952 - 1957",
    totalSeats: 375,
    rulingParty: "INC",
    chiefMinisters: "C. Rajagopalachari, K. Kamaraj",
    seatBreakdown: { inc: 152, cpi: 62, others: 161 },
    shifts: "First assembly of the composite Madras State. Rajaji served as CM initially, implementing controversial education reforms before being replaced by Kamaraj, who initiated the iconic mid-day meal scheme."
  },
  {
    id: 2,
    name: "2nd Assembly",
    years: "1957 - 1962",
    totalSeats: 205,
    rulingParty: "INC",
    chiefMinisters: "K. Kamaraj",
    seatBreakdown: { inc: 151, dmk: 15, others: 39 },
    shifts: "Congress consolidated power under Kamaraj's stable leadership. This election marked the historic entry of the DMK into the state legislature with 15 seats."
  },
  {
    id: 3,
    name: "3rd Assembly",
    years: "1962 - 1967",
    totalSeats: 206,
    rulingParty: "INC",
    chiefMinisters: "K. Kamaraj, M. Bhaktavatsalam",
    seatBreakdown: { inc: 139, dmk: 50, swatantra: 6, others: 11 },
    shifts: "Last Congress-ruled assembly in Tamil Nadu. The Kamaraj Plan saw him step down for party work; successor Bhaktavatsalam faced severe anti-Hindi agitations and food shortages."
  },
  {
    id: 4,
    name: "4th Assembly",
    years: "1967 - 1971",
    totalSeats: 234,
    rulingParty: "DMK",
    chiefMinisters: "C. N. Annadurai, M. Karunanidhi",
    seatBreakdown: { dmk: 137, inc: 51, swatantra: 20, cpm: 11, others: 15 },
    shifts: "Historic landslide: DMK swept to power under Anna, ending Congress rule permanently in TN. The state was renamed to Tamil Nadu. Karunanidhi became CM in 1969 following Anna's death."
  },
  {
    id: 5,
    name: "5th Assembly",
    years: "1971 - 1976",
    totalSeats: 234,
    rulingParty: "DMK",
    chiefMinisters: "M. Karunanidhi",
    seatBreakdown: { dmk: 184, others: 50 },
    shifts: "DMK won a massive mandate. MGR was expelled from the party in 1972 and formed the rival AIADMK. The assembly was dismissed in 1976 during the national Emergency."
  },
  {
    id: 6,
    name: "6th Assembly",
    years: "1977 - 1980",
    totalSeats: 234,
    rulingParty: "AIADMK",
    chiefMinisters: "M. G. Ramachandran",
    seatBreakdown: { aiadmk: 130, dmk: 48, inc: 27, others: 29 },
    shifts: "MGR led the AIADMK to power for the first time, establishing a bi-polar Dravidian dominance. Dismissed early by the central government in 1980."
  },
  {
    id: 7,
    name: "7th Assembly",
    years: "1980 - 1984",
    totalSeats: 234,
    rulingParty: "AIADMK",
    chiefMinisters: "M. G. Ramachandran",
    seatBreakdown: { aiadmk: 129, dmk: 37, inc: 31, cpm: 11, others: 26 },
    shifts: "MGR defeated the DMK-Congress alliance to return to power, solidifying his massive personal popularity and welfare schemes."
  },
  {
    id: 8,
    name: "8th Assembly",
    years: "1984 - 1988",
    totalSeats: 234,
    rulingParty: "AIADMK",
    chiefMinisters: "M. G. Ramachandran, Janaki Ramachandran",
    seatBreakdown: { aiadmk: 132, inc: 62, dmk: 24, cpm: 5, others: 11 },
    shifts: "AIADMK won while MGR was hospitalized in the US. Following MGR's demise in 1987, Janaki briefly became CM before the party split and the government fell."
  },
  {
    id: 9,
    name: "1989 - 1991",
    totalSeats: 234,
    rulingParty: "DMK",
    chiefMinisters: "M. Karunanidhi",
    seatBreakdown: { dmk: 150, aiadmk: 29, inc: 26, others: 29 },
    shifts: "DMK returned to power after 13 years, taking advantage of factional splits in AIADMK. Jayalalithaa subsequently unified the AIADMK."
  },
  {
    id: 10,
    name: "10th Assembly",
    years: "1991 - 1996",
    totalSeats: 234,
    rulingParty: "AIADMK",
    chiefMinisters: "J. Jayalalithaa",
    seatBreakdown: { aiadmk: 164, inc: 60, dmk: 2, pmk: 1, others: 7 },
    shifts: "AIADMK-Congress sweep following the Rajiv Gandhi assassination. Jayalalithaa served her first full term as CM, implementing the cradle baby scheme."
  },
  {
    id: 11,
    name: "11th Assembly",
    years: "1996 - 2001",
    totalSeats: 234,
    rulingParty: "DMK",
    chiefMinisters: "M. Karunanidhi",
    seatBreakdown: { dmk: 173, tmc: 39, aiadmk: 4, pmk: 4, others: 14 },
    shifts: "DMK-TMC alliance won by a landslide. Major infrastructure projects and Chennai IT corridors were initiated. Jayalalithaa was briefly imprisoned on corruption charges."
  },
  {
    id: 12,
    name: "12th Assembly",
    years: "2001 - 2006",
    totalSeats: 234,
    rulingParty: "AIADMK",
    chiefMinisters: "J. Jayalalithaa, O. Panneerselvam",
    seatBreakdown: { aiadmk: 132, dmk: 31, tmc: 23, pmk: 20, others: 28 },
    shifts: "Jayalalithaa returned as CM. OPS briefly served as stand-in CM for 6 months due to her court disqualification."
  },
  {
    id: 13,
    name: "13th Assembly",
    years: "2006 - 2011",
    totalSeats: 234,
    rulingParty: "DMK",
    chiefMinisters: "M. Karunanidhi",
    seatBreakdown: { dmk: 96, inc: 34, aiadmk: 61, pmk: 18, others: 25 },
    shifts: "First minority government in TN history: DMK ruled with outside Congress support. Noted for introducing free TV screens and subsidized rice."
  },
  {
    id: 14,
    name: "14th Assembly",
    years: "2011 - 2016",
    totalSeats: 234,
    rulingParty: "AIADMK",
    chiefMinisters: "J. Jayalalithaa, O. Panneerselvam",
    seatBreakdown: { aiadmk: 150, dmdk: 29, dmk: 23, others: 32 },
    shifts: "AIADMK sweep. Jayalalithaa stepped down in 2014 due to judicial conviction; OPS acted as CM until her acquittal and reinstatement in 2015."
  },
  {
    id: 15,
    name: "15th Assembly",
    years: "2016 - 2021",
    totalSeats: 234,
    rulingParty: "AIADMK",
    chiefMinisters: "J. Jayalalithaa, O. Panneerselvam, Edappadi K. Palaniswami",
    seatBreakdown: { aiadmk: 136, dmk: 89, inc: 8, others: 1 },
    shifts: "AIADMK won back-to-back mandates. Following Jayalalithaa's demise in Dec 2016, OPS and later EPS took the helm, navigating political crises."
  },
  {
    id: 16,
    name: "16th Assembly",
    years: "2021 - 2026",
    totalSeats: 234,
    rulingParty: "DMK",
    chiefMinisters: "M. K. Stalin",
    seatBreakdown: { dmk: 133, aiadmk: 66, inc: 18, pmk: 5, others: 12 },
    shifts: "DMK-led alliance returned to power after a decade. Stalin took office as CM focusing on Dravidian model welfare initiatives."
  },
  {
    id: 17,
    name: "17th Assembly",
    years: "2026 - Present",
    totalSeats: 233,
    rulingParty: "TVK",
    chiefMinisters: "C. Joseph Vijay",
    seatBreakdown: { tvk: 107, inc: 5, cpi: 2, cpm: 2, iuml: 2, vck: 2, dmk: 59, aiadmk: 47, pmk: 4, dmdk: 1, ammk: 1, bjp: 1 },
    shifts: "TVK won 108 seats in the ECI result, but current TVK strength is 107 after Vijay resigned Tiruchirappalli East and retained Perambur. INC, VCK, IUML, CPI and CPM support the TVK government, giving the treasury side 120 occupied seats."
  }
];

export default function AssemblyDashboard({ seats, parties, onSelectPolitician }) {
  const [selectedSeatId, setSelectedSeatId] = useState(1); // Default to Kolathur (Stalin)
  const [activeDashboardTab, setActiveDashboardTab] = useState("interactive_map"); // "interactive_map" | "historical_timeline"

  const chamberLayout = useMemo(() => buildChamberLayout(seats), [seats]);

  const selectedSeat = useMemo(() => {
    return [...chamberLayout.allSeats, ...chamberLayout.vacancies].find(s => s.id === selectedSeatId) || chamberLayout.allSeats[0] || seats[0];
  }, [chamberLayout, seats, selectedSeatId]);

  // Aggregate Stats
  const stats = useMemo(() => {
    const partyCounts = {};
    let totalAssets = 0;
    let sourcedAssetCount = 0;
    let totalCases = 0;
    let sourcedCaseCount = 0;

    const occupiedSeats = seats.filter(s => !s.isVacant);
    const vacancyCount = seats.length - occupiedSeats.length;

    occupiedSeats.forEach(s => {
      const p = s.party || "ind";
      partyCounts[p] = (partyCounts[p] || 0) + 1;
      if (typeof s.assets === "number") {
        totalAssets += s.assets;
        sourcedAssetCount++;
      }
      if (typeof s.hasCases === "boolean") {
        sourcedCaseCount++;
        if (s.hasCases) totalCases++;
      }
    });

    const rulingCount = RULING_ALLIANCE_PARTIES.reduce((sum, p) => sum + (partyCounts[p] || 0), 0);
    const oppositionCount = occupiedSeats.length - rulingCount;
    const adrTotals = Object.values(ADR_WINNER_SUMMARY.criminalCases).reduce((acc, party) => {
      acc.cases += party.cases;
      acc.serious += party.serious;
      return acc;
    }, { cases: 0, serious: 0 });

    return {
      rulingCount,
      oppositionCount,
      occupiedCount: occupiedSeats.length,
      vacancyCount,
      totalCases,
      sourcedCaseCount,
      adrTotalCases: adrTotals.cases,
      adrSeriousCases: adrTotals.serious,
      averageAssets: sourcedAssetCount > 0 ? (totalAssets / sourcedAssetCount).toFixed(1) : null,
      partyBreakdown: partyCounts,
      rosterComplete: seats.length === 234 && seats.every(s => s.sourceType === "official_eci")
    };
  }, [seats]);

  const getPartyColor = (party) => {
    const p = party.toLowerCase();
    if (PARTY_COLORS[p]) return PARTY_COLORS[p];
    if (p === 'inc') return '#0080ff';
    if (p === 'cpi' || p === 'cpm') return '#de2c2c';
    if (p === 'tmc') return '#f97316';
    if (p === 'dmdk') return '#a855f7';
    if (p === 'swatantra') return '#64748b';
    return '#475569';
  };

  const formatNumber = (value) => typeof value === "number" ? value.toLocaleString("en-IN") : "Not sourced yet";
  const formatPercent = (value) => typeof value === "number" ? `${value.toFixed(2)}%` : "Not sourced yet";
  const formatAssets = (seat) => typeof seat?.assets === "number" ? `₹${seat.assets} Crore` : "Not sourced yet";
  const formatCases = (seat) => {
    if (!seat || typeof seat.hasCases !== "boolean") return "Not sourced yet";
    return seat.hasCases ? `${seat.casesCount || "Declared"} pending` : "None declared in source";
  };

  const renderStackedCompositionBar = (seatBreakdown) => {
    const total = Object.values(seatBreakdown).reduce((a, b) => a + b, 0);
    return (
      <div className="historical-stacked-bar" style={{ display: "flex", height: "12px", borderRadius: "6px", overflow: "hidden", marginTop: "8px", backgroundColor: "rgba(255,255,255,0.05)" }}>
        {Object.entries(seatBreakdown).map(([party, seatsCount]) => {
          if (seatsCount === 0) return null;
          const percentage = ((seatsCount / total) * 100).toFixed(1);
          const color = getPartyColor(party);
          return (
            <div
              key={party}
              style={{ width: `${percentage}%`, backgroundColor: color }}
              title={`${party.toUpperCase()}: ${seatsCount} seats (${percentage}%)`}
            />
          );
        })}
      </div>
    );
  };

  if (!selectedSeat) {
    return (
      <div className="politician-space-container dashboard-layout-container" style={{ gap: "20px" }}>
        <div className="info-card glass-card">
          <span className="info-card-label">Roster Status</span>
          <span className="info-card-value">No sourced MLA roster loaded</span>
          <p style={{ fontSize: "0.8rem", color: "var(--text-secondary)", marginTop: "8px" }}>
            Run the official roster builder to load ECI constituency winners.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="assembly-dashboard-shell">
      {/* ── Compact Command Bar ── */}
      <header className="assembly-command-bar">
        <div className="assembly-command-left">
          <div className="assembly-command-identity">
            <div className="profile-avatar-placeholder" style={{ width: 36, height: 36, borderRadius: 8, color: "var(--accent-color)", borderColor: "var(--accent-color)" }}>
              <Landmark size={20} />
            </div>
            <div>
              <h1 className="assembly-command-title">17th Legislative Assembly</h1>
              <div className="assembly-command-badges">
                <span className="party-badge-pill" style={{ backgroundColor: "var(--accent-color)", color: "white", fontSize: "0.65rem", padding: "2px 8px" }}>
                  {stats.occupiedCount} occupied / {seats.length} ECI
                </span>
                {stats.vacancyCount > 0 && (
                  <span className="source-status-pill warning" style={{ fontSize: "0.65rem", padding: "2px 7px" }}>
                    {stats.vacancyCount} vacancy
                  </span>
                )}
                <span className={`source-status-pill ${stats.rosterComplete ? "verified" : ""}`} style={{ fontSize: "0.65rem", padding: "2px 7px" }}>
                  {stats.rosterComplete ? "ECI ✓" : `${seats.length} loaded`}
                </span>
              </div>
            </div>
          </div>
        </div>

        <div className="assembly-command-stats">
          <div className="assembly-stat-chip">
            <span className="assembly-stat-number text-success">{stats.rulingCount}</span>
            <span className="assembly-stat-label">Ruling</span>
          </div>
          <div className="assembly-stat-divider" />
          <div className="assembly-stat-chip">
            <span className="assembly-stat-number text-danger">{stats.oppositionCount}</span>
            <span className="assembly-stat-label">Opposition</span>
          </div>
          <div className="assembly-stat-divider" />
          <div className="assembly-stat-chip">
            <span className="assembly-stat-number text-warning">{stats.adrTotalCases}</span>
            <span className="assembly-stat-label">ADR Cases</span>
          </div>
          <div className="assembly-stat-divider" />
          <div className="assembly-stat-chip">
            <span className="assembly-stat-number" style={{ color: "var(--danger)" }}>{stats.adrSeriousCases}</span>
            <span className="assembly-stat-label">Serious</span>
          </div>
        </div>
      </header>

      {/* ── Tab Switcher ── */}
      <div className="profile-tabs-selector" style={{ borderBottom: "1px solid rgba(255, 255, 255, 0.08)", marginBottom: 0, flexShrink: 0 }}>
        <button
          className={`profile-tab-btn ${activeDashboardTab === "interactive_map" ? "active" : ""}`}
          onClick={() => setActiveDashboardTab("interactive_map")}
        >
          <Landmark size={14} />
          Chamber Seating
        </button>
        <button
          className={`profile-tab-btn ${activeDashboardTab === "historical_timeline" ? "active" : ""}`}
          onClick={() => setActiveDashboardTab("historical_timeline")}
        >
          <FileText size={14} />
          Assembly Comparison Timeline (1st - 17th)
        </button>
      </div>

      {/* ── Full-Height Content Area ── */}
      {activeDashboardTab === "interactive_map" ? (
        <div className="assembly-content-split">
          {/* Left: Chamber Grid fills available height */}
          <div className="assembly-chamber-panel glass-card">
            <div className="assembly-chamber-panel-header">
              <h3 style={{ fontFamily: "var(--font-title)", fontSize: "1rem", display: "flex", alignItems: "center", gap: "8px" }}>
                <Landmark size={16} style={{ color: "var(--accent-color)" }} />
                Legislative Chamber Seating
              </h3>
              <span style={{ fontSize: "0.72rem", color: "var(--text-muted)" }}>
                Party benches from official ECI winners
              </span>
            </div>

            <div className="assembly-seats-scroll-frame assembly-chamber-scroll">
              <div className="assembly-chamber-frame">
                <div className="speaker-dais">
                  <span className="speaker-title">Speaker</span>
                  <span className="speaker-subtitle">Tamil Nadu Legislative Assembly</span>
                </div>

                <div className="chamber-floor">
                  <div className="chamber-benches treasury-side">
                    <div className="bench-heading">
                      <span>Treasury Benches</span>
                      <strong>{chamberLayout.treasuryBenches.length}</strong>
                    </div>
                    <div className="assembly-seat-cluster">
                      {chamberLayout.treasuryBenches.map(s => {
                        const color = PARTY_COLORS[s.party] || "var(--color-ind)";
                        const isSelected = selectedSeatId === s.id;
                        return (
                          <button
                            key={s.id}
                            type="button"
                            className={`assembly-seat-cell chamber-seat ${isSelected ? "selected" : ""} ${s.isDetailed ? "has-profile" : ""}`}
                            style={{
                              backgroundColor: color,
                              boxShadow: isSelected ? `0 0 12px ${color}` : "none",
                              opacity: isSelected ? 1 : 0.88
                            }}
                            onClick={() => setSelectedSeatId(s.id)}
                            title={`${s.chamberSide}, Row ${s.chamberRow}, Seat ${s.chamberSeat}: ${s.constituency} - ${s.mlaName} (${s.party.toUpperCase()})`}
                          >
                            <span className="cell-number-inner">{s.id}</span>
                          </button>
                        );
                      })}
                    </div>
                  </div>

                  <div className="central-aisle">
                    <span>Floor</span>
                  </div>

                  <div className="chamber-benches opposition-side">
                    <div className="bench-heading">
                      <span>Opposition Benches</span>
                      <strong>{chamberLayout.oppositionBenches.length}</strong>
                    </div>
                    <div className="assembly-seat-cluster">
                      {chamberLayout.oppositionBenches.map(s => {
                        const color = PARTY_COLORS[s.party] || "var(--color-ind)";
                        const isSelected = selectedSeatId === s.id;
                        return (
                          <button
                            key={s.id}
                            type="button"
                            className={`assembly-seat-cell chamber-seat ${isSelected ? "selected" : ""} ${s.isDetailed ? "has-profile" : ""}`}
                            style={{
                              backgroundColor: color,
                              boxShadow: isSelected ? `0 0 12px ${color}` : "none",
                              opacity: isSelected ? 1 : 0.88
                            }}
                            onClick={() => setSelectedSeatId(s.id)}
                            title={`${s.chamberSide}, Row ${s.chamberRow}, Seat ${s.chamberSeat}: ${s.constituency} - ${s.mlaName} (${s.party.toUpperCase()})`}
                          >
                            <span className="cell-number-inner">{s.id}</span>
                          </button>
                        );
                      })}
                    </div>
                  </div>
                </div>

                {chamberLayout.vacancies.length > 0 && (
                  <div className="vacancy-strip">
                    <span className="bench-heading-inline">Vacant Constituency</span>
                    {chamberLayout.vacancies.map(s => {
                      const isSelected = selectedSeatId === s.id;
                      return (
                        <button
                          key={s.id}
                          type="button"
                          className={`assembly-seat-cell chamber-seat vacancy-seat ${isSelected ? "selected" : ""}`}
                          onClick={() => setSelectedSeatId(s.id)}
                          title={`${s.constituency}: vacant after ${s.vacatedBy} resignation`}
                        >
                          <span className="cell-number-inner">{s.id}</span>
                        </button>
                      );
                    })}
                  </div>
                )}
              </div>
            </div>

            {/* Legend */}
            <div className="party-legend-row">
              {parties.map(p => {
                const color = PARTY_COLORS[p.id] || "var(--color-ind)";
                return (
                  <div className="legend-item" key={p.id}>
                    <span className="legend-dot" style={{ backgroundColor: color }} />
                    <span className="legend-label">{p.id.toUpperCase()}</span>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Right: Inspector + Composition (scrollable column) */}
          <div className="assembly-inspector-column">
            {/* Inspector Card */}
            <div className="inspector-card glass-card">
              <h4 style={{ color: "var(--text-muted)", fontSize: "0.7rem", textTransform: "uppercase", letterSpacing: "0.05em", marginBottom: "8px" }}>
                Seat Inspector
              </h4>

              <div className="inspector-head">
                <span className="inspector-constituency">{selectedSeat.constituency}</span>
                <span className="inspector-number">Seat #{selectedSeat.id}</span>
              </div>

              <div className="inspector-body" style={{ marginTop: "16px" }}>
                <div className="inspector-detail-row">
                  <span className="detail-label">Chamber Placement</span>
                  <span className="detail-val">
                    {selectedSeat.isVacant
                      ? "Vacant seat - by-election pending"
                      : `${selectedSeat.chamberSide}, Row ${selectedSeat.chamberRow}, Seat ${selectedSeat.chamberSeat}`}
                  </span>
                </div>
                {selectedSeat.isVacant && (
                  <div className="inspector-detail-row">
                    <span className="detail-label">Vacancy Reason</span>
                    <span className="detail-val">{selectedSeat.vacancyReason}</span>
                  </div>
                )}
                <div className="inspector-detail-row">
                  <span className="detail-label">MLA Representative</span>
                  <span className="detail-val">{selectedSeat.isVacant ? "Vacant" : selectedSeat.mlaName}</span>
                </div>
                <div className="inspector-detail-row">
                  <span className="detail-label">Political Party</span>
                  <span className="detail-val" style={{ color: PARTY_COLORS[selectedSeat.party] }}>
                    {PARTY_LABELS[selectedSeat.party] || selectedSeat.party.toUpperCase()}
                  </span>
                </div>
                <div className="inspector-detail-row">
                  <span className="detail-label">Declared Assets</span>
                  <span className="detail-val text-success">{formatAssets(selectedSeat)}</span>
                </div>
                <div className="inspector-detail-row">
                  <span className="detail-label">Representative Age</span>
                  <span className="detail-val">{selectedSeat.age ? `${selectedSeat.age} Years` : "Not sourced yet"}</span>
                </div>
                <div className="inspector-detail-row">
                  <span className="detail-label">Criminal Cases</span>
                  <span className="detail-val" style={{ color: selectedSeat.hasCases === true ? "var(--danger)" : selectedSeat.hasCases === false ? "var(--success)" : "var(--text-muted)" }}>
                    {formatCases(selectedSeat)}
                  </span>
                </div>
                <div className="inspector-detail-row">
                  <span className="detail-label">Votes Polled</span>
                  <span className="detail-val">{formatNumber(selectedSeat.votes)}</span>
                </div>
                <div className="inspector-detail-row">
                  <span className="detail-label">Vote Share</span>
                  <span className="detail-val">{formatPercent(selectedSeat.voteShare)}</span>
                </div>
                <div className="inspector-detail-row">
                  <span className="detail-label">Winning Margin</span>
                  <span className="detail-val">{typeof selectedSeat.marginVotes === "number" ? `${formatNumber(selectedSeat.marginVotes)} votes` : "Not sourced yet"}</span>
                </div>
                <div className="inspector-detail-row">
                  <span className="detail-label">Runner-up</span>
                  <span className="detail-val">{selectedSeat.runnerUpName || "Not sourced yet"}</span>
                </div>
                <div className="inspector-detail-row">
                  <span className="detail-label">Source</span>
                  <span className={`detail-val source-mini-badge ${selectedSeat.sourceType === "official_eci" ? "verified" : ""}`}>
                    {selectedSeat.sourceType === "official_eci" ? "Official ECI" : "Not sourced"}
                  </span>
                </div>
                <div className="source-link-stack">
                  {selectedSeat.sources?.[0]?.url && (
                    <a href={selectedSeat.sources[0].url} target="_blank" rel="noreferrer">ECI detailed result source</a>
                  )}
                  <a href={ADR_WINNER_SUMMARY.sourceUrl} target="_blank" rel="noreferrer">ADR winning-candidates report</a>
                  <a href="https://www.myneta.info/TamilNadu2026/" target="_blank" rel="noreferrer">MyNeta Tamil Nadu 2026 index</a>
                  {selectedSeat.vacancySourceUrl && (
                    <a href={selectedSeat.vacancySourceUrl} target="_blank" rel="noreferrer">Vacancy / resignation source</a>
                  )}
                </div>
              </div>

              {selectedSeat.isDetailed ? (
                <button
                  className="inspector-action-btn pulse-glow"
                  onClick={() => onSelectPolitician(selectedSeat.politicianId)}
                  style={{ backgroundColor: PARTY_COLORS[selectedSeat.party] }}
                >
                  <FileText size={14} />
                  Open Full Intel Dossier
                  <ChevronRight size={14} />
                </button>
              ) : (
                <div className="inspector-no-profile-badge">
                  <CheckCircle size={14} style={{ color: "var(--text-muted)" }} />
                  <span>{selectedSeat.isVacant ? "No current MLA dossier while seat is vacant" : "No sourced profile available"}</span>
                </div>
              )}
            </div>

            {/* Party Composition Chart */}
            <div className="inspector-card glass-card" style={{ display: "flex", flexDirection: "column" }}>
              <h4 style={{ color: "var(--text-muted)", fontSize: "0.7rem", textTransform: "uppercase", letterSpacing: "0.05em", marginBottom: "12px" }}>
                Party Composition Breakdown
              </h4>

              <div className="composition-bars-container">
                {Object.entries(stats.partyBreakdown)
                  .sort((a, b) => b[1] - a[1])
                  .map(([party, count]) => {
                    if (count === 0) return null;
                    const color = PARTY_COLORS[party] || "var(--color-ind)";
                    const percentage = ((count / Math.max(stats.occupiedCount, 1)) * 100).toFixed(1);
                    return (
                      <div className="comp-bar-item" key={party}>
                        <div className="comp-bar-header">
                          <span className="comp-party-label">{party.toUpperCase()}</span>
                          <span className="comp-count-label">{count} Seats ({percentage}%)</span>
                        </div>
                        <div className="comp-bar-outer">
                          <div 
                            className="comp-bar-inner" 
                            style={{ width: `${percentage}%`, backgroundColor: color }}
                          />
                        </div>
                        {ADR_WINNER_SUMMARY.criminalCases[party] && (
                          <div className="adr-mini-row">
                            ADR: {ADR_WINNER_SUMMARY.criminalCases[party].cases}/{ADR_WINNER_SUMMARY.criminalCases[party].analysed} with cases,
                            {" "}{ADR_WINNER_SUMMARY.criminalCases[party].serious} serious
                          </div>
                        )}
                      </div>
                    );
                  })}
              </div>
              <a className="adr-report-link" href={ADR_WINNER_SUMMARY.sourceUrl} target="_blank" rel="noreferrer">
                Source: ADR analysed {ADR_WINNER_SUMMARY.analysed}/{ADR_WINNER_SUMMARY.totalWinners} winning candidates
              </a>
            </div>
          </div>
        </div>
      ) : (
        /* Historical Assembly Timeline */
        <div className="historical-timeline-panel glass-card" style={{ padding: "20px", display: "flex", flexDirection: "column", gap: "20px", flex: 1, minHeight: 0 }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
            <h3 style={{ fontFamily: "var(--font-title)", fontSize: "1.2rem", display: "flex", alignItems: "center", gap: "8px" }}>
              <Landmark size={20} style={{ color: "var(--accent-color)" }} />
              Assembly Comparison Timeline (1952 - 2026)
            </h3>
            <span style={{ fontSize: "0.78rem", color: "var(--text-muted)" }}>
              Comparing ruling party shifts, leadership changes, and seat compositions.
            </span>
          </div>

          <div className="historical-cards-list" style={{ display: "flex", flexDirection: "column", gap: "16px", overflowY: "auto", flex: 1, minHeight: 0, paddingRight: "8px" }}>
            {HISTORICAL_DATA.map(asm => {
              const rulingColor = getPartyColor(asm.rulingParty);
              return (
                <div key={asm.id} className="historical-asm-card glass-card" style={{ padding: "16px", borderLeft: `4px solid ${rulingColor}`, backgroundColor: "rgba(255,255,255,0.01)", borderRadius: "8px", border: "1px solid rgba(255,255,255,0.04)" }}>
                  <div className="historical-asm-header" style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", flexWrap: "wrap", gap: "8px" }}>
                    <div>
                      <h4 style={{ fontSize: "1.05rem", fontWeight: 600, color: "var(--text-primary)" }}>{asm.name} <span style={{ fontSize: "0.82rem", color: "var(--text-muted)", marginLeft: "6px" }}>({asm.years})</span></h4>
                      <div style={{ fontSize: "0.8rem", color: "var(--text-secondary)", marginTop: "4px" }}>
                        <span>Chief Minister: <strong>{asm.chiefMinisters}</strong></span>
                      </div>
                    </div>
                    <span className="party-badge-pill" style={{ backgroundColor: rulingColor, color: "white", fontSize: "0.7rem", padding: "3px 8px" }}>
                      Ruling: {asm.rulingParty}
                    </span>
                  </div>

                  <p style={{ fontSize: "0.85rem", color: "var(--text-secondary)", marginTop: "10px", lineHeight: 1.5 }}>
                    {asm.shifts}
                  </p>

                  <div style={{ marginTop: "12px" }}>
                    <div style={{ display: "flex", justifyContent: "space-between", fontSize: "0.72rem", color: "var(--text-muted)" }}>
                      <span>Seat Composition Breakdown (Total: {asm.totalSeats} seats)</span>
                      <span style={{ fontWeight: 500 }}>
                        {Object.entries(asm.seatBreakdown).map(([party, seatsCount]) => `${party.toUpperCase()}: ${seatsCount}`).join(" • ")}
                      </span>
                    </div>
                    {renderStackedCompositionBar(asm.seatBreakdown)}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
