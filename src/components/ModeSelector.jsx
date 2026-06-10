import React from "react";
import { User, ShieldAlert, GitCommit, Award, AlertTriangle } from "lucide-react";

export default function ModeSelector({ 
  activeMode, onSelectMode, 
  filterParty, onFilterPartyChange,
  parties
}) {
  const modes = [
    { id: "mla", label: "MLAs Details", icon: <User size={15} />, className: "mode-mla" },
    { id: "criminal", label: "Criminal & Prison", icon: <ShieldAlert size={15} />, className: "mode-criminal" },
    { id: "shifts", label: "Party Shifts", icon: <GitCommit size={15} />, className: "mode-shifts" },
    { id: "good", label: "Good Deeds & Welfare", icon: <Award size={15} />, className: "mode-good" },
    { id: "bad", label: "Controversies & Scams", icon: <AlertTriangle size={15} />, className: "mode-bad" }
  ];

  return (
    <div className="mode-topbar">
      {/* 5 Analytical Modes Toggle */}
      <div className="mode-tabs">
        {modes.map((m) => (
          <button
            key={m.id}
            onClick={() => onSelectMode(m.id)}
            className={`mode-tab-btn ${m.className} ${activeMode === m.id ? "active" : ""}`}
          >
            {m.icon}
            {m.label}
          </button>
        ))}
      </div>

      {/* Quick Filter Party */}
      <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
        <span style={{ fontSize: "0.8rem", color: "var(--text-secondary)", fontWeight: 500 }}>
          Filter Party:
        </span>
        <select 
          className="select-dropdown" 
          value={filterParty} 
          onChange={(e) => onFilterPartyChange(e.target.value)}
        >
          <option value="All">All Parties</option>
          {parties.map(p => (
            <option key={p.id} value={p.id}>{p.name.split(" (")[0]}</option>
          ))}
        </select>
      </div>
    </div>
  );
}
