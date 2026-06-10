import React from "react";
import { 
  Network, Database, Clock, Upload, 
  Search, ShieldAlert, AlertTriangle, Building2, Users 
} from "lucide-react";

export default function Dashboard({ 
  currentTab, onSwitchTab,
  searchQuery, onSearchChange,
  assemblyYear, onAssemblyYearChange,
  db, children
}) {

  // Dynamic Statistics based on CURRENT FILTERED database
  const totalPoliticians = db.politicians.length;
  const totalParties = db.parties.length;
  const totalEvents = db.events.length;
  const totalCases = db.politicians.reduce((sum, p) => sum + (p.criminalCases?.length || 0), 0);

  return (
    <div className="app-container">
      {/* Sidebar Navigation */}
      <aside className="sidebar-nav">
        <div className="brand">
          <div className="brand-icon">I</div>
          <span className="brand-title">Intelligence Graph</span>
        </div>

        <nav>
          <ul className="nav-menu">
            <li 
              className={`nav-item ${currentTab === "graph" ? "active" : ""}`}
              onClick={() => onSwitchTab("graph")}
            >
              <Network size={18} />
              Interactive Graph
            </li>
            <li 
              className={`nav-item ${currentTab === "table" ? "active" : ""}`}
              onClick={() => onSwitchTab("table")}
            >
              <Database size={18} />
              Database Explorer
            </li>
            <li 
              className={`nav-item ${currentTab === "timeline" ? "active" : ""}`}
              onClick={() => onSwitchTab("timeline")}
            >
              <Clock size={18} />
              Political Timeline
            </li>
            <li 
              className={`nav-item ${currentTab === "import" ? "active" : ""}`}
              onClick={() => onSwitchTab("import")}
            >
              <Upload size={18} />
              Data Hub
            </li>
          </ul>
        </nav>

        {/* Global Statistics */}
        <div className="dashboard-stats">
          <div className="stat-box">
            <div className="stat-label">Politicians / MLAs</div>
            <div className="stat-val" style={{ display: "flex", alignItems: "center", gap: "6px" }}>
              <Users size={16} style={{ color: "var(--accent-color)" }} />
              {totalPoliticians}
            </div>
          </div>
          <div className="stat-box">
            <div className="stat-label">Registered Parties</div>
            <div className="stat-val" style={{ display: "flex", alignItems: "center", gap: "6px" }}>
              <Building2 size={16} style={{ color: "var(--info)" }} />
              {totalParties}
            </div>
          </div>
          <div className="stat-box">
            <div className="stat-label">Active Indictments</div>
            <div className="stat-val" style={{ display: "flex", alignItems: "center", gap: "6px", color: "var(--danger)" }}>
              <ShieldAlert size={16} />
              {totalCases}
            </div>
          </div>
          <div className="stat-box">
            <div className="stat-label">Key Milestones</div>
            <div className="stat-val" style={{ display: "flex", alignItems: "center", gap: "6px", color: "var(--warning)" }}>
              <AlertTriangle size={16} />
              {totalEvents}
            </div>
          </div>
        </div>
      </aside>

      {/* Main Container */}
      <main className="main-content">
        {/* Topbar */}
        <header className="topbar">
          <div className="search-container">
            <Search size={16} style={{ color: "var(--text-muted)" }} />
            <input 
              type="text" 
              className="search-input" 
              placeholder="Search politicians, parties, events..." 
              value={searchQuery}
              onChange={(e) => onSearchChange(e.target.value)}
            />
          </div>

          <div className="filter-bar">
            <span style={{ fontSize: "0.85rem", color: "var(--text-secondary)" }}>Assembly Era:</span>
            <select 
              className="select-dropdown"
              value={assemblyYear}
              onChange={(e) => onAssemblyYearChange(e.target.value)}
            >
              <option value="All">All History (1947 - 2026)</option>
              <option value="2021">16th Assembly (2021 - 2026)</option>
              <option value="2016">15th Assembly (2016 - 2021)</option>
              <option value="2011">14th Assembly (2011 - 2016)</option>
              <option value="2006">13th Assembly (2006 - 2011)</option>
              <option value="2001">12th Assembly (2001 - 2006)</option>
              <option value="1996">11th Assembly (1996 - 2001)</option>
              <option value="1991">10th Assembly (1991 - 1996)</option>
              <option value="1984">8th Assembly (1984 - 1989)</option>
              <option value="1977">6th Assembly (1977 - 1980)</option>
              <option value="1967">5th Assembly (1967 - 1971)</option>
              <option value="1954">Kamaraj Administration (1954 - 1963)</option>
              <option value="1952">1st Assembly (1952 - 1954)</option>
            </select>
          </div>
        </header>

        {/* Dynamic Inner Tab Content */}
        <div style={{ flex: 1, display: "flex", overflow: "hidden" }}>
          {children}
        </div>
      </main>
    </div>
  );
}
