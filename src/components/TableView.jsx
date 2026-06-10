import React, { useState, useMemo } from "react";
import { ArrowUpDown, AlertCircle, HelpCircle, Shield } from "lucide-react";

export default function TableView({ db, onSelectItem }) {
  const [sortField, setSortField] = useState("name");
  const [sortDirection, setSortDirection] = useState("asc");

  // Sorting Handler
  const handleSort = (field) => {
    if (sortField === field) {
      setSortDirection(sortDirection === "asc" ? "desc" : "asc");
    } else {
      setSortField(field);
      setSortDirection("asc");
    }
  };

  const sortedPoliticians = useMemo(() => {
    const list = [...db.politicians];
    list.sort((a, b) => {
      let valA = a[sortField] || "";
      let valB = b[sortField] || "";

      if (sortField === "party") {
        // Resolve party name
        const partyA = db.parties.find(p => p.id === a.party)?.name || a.party;
        const partyB = db.parties.find(p => p.id === b.party)?.name || b.party;
        valA = partyA;
        valB = partyB;
      }

      if (typeof valA === "string") {
        return sortDirection === "asc" 
          ? valA.localeCompare(valB)
          : valB.localeCompare(valA);
      } else {
        return sortDirection === "asc" ? valA - valB : valB - valA;
      }
    });
    return list;
  }, [db, sortField, sortDirection]);

  return (
    <div className="table-container">
      <div className="table-header-row">
        <div>
          <h2 className="table-title">MLA & Politician Database</h2>
          <p style={{ color: "var(--text-muted)", fontSize: "0.85rem", marginTop: "4px" }}>
            Showing {sortedPoliticians.length} registered political figures and their public profiles.
          </p>
        </div>
      </div>

      <div className="glass" style={{ overflow: "hidden", border: "1px solid var(--border-color)" }}>
        <table className="data-table">
          <thead>
            <tr>
              <th onClick={() => handleSort("name")} style={{ cursor: "pointer" }}>
                Name <ArrowUpDown size={12} style={{ marginLeft: "4px", display: "inline-block" }} />
              </th>
              <th onClick={() => handleSort("party")} style={{ cursor: "pointer" }}>
                Party <ArrowUpDown size={12} style={{ marginLeft: "4px", display: "inline-block" }} />
              </th>
              <th onClick={() => handleSort("constituency")} style={{ cursor: "pointer" }}>
                Constituency <ArrowUpDown size={12} style={{ marginLeft: "4px", display: "inline-block" }} />
              </th>
              <th>Role & Title</th>
              <th>Net Worth</th>
              <th>Cases</th>
            </tr>
          </thead>
          <tbody>
            {sortedPoliticians.length === 0 ? (
              <tr>
                <td colSpan="6" style={{ textAlign: "center", padding: "40px", color: "var(--text-muted)" }}>
                  No politicians found matching the active filters.
                </td>
              </tr>
            ) : (
              sortedPoliticians.map((p) => {
                const party = db.parties.find((pt) => pt.id === p.party) || { 
                  name: p.party.toUpperCase(), 
                  color: "var(--color-ind)" 
                };
                const hasCases = p.criminalCases && p.criminalCases.length > 0;
                
                return (
                  <tr key={p.id} onClick={() => onSelectItem({ type: "node", id: p.id })}>
                    <td style={{ fontWeight: 600, color: "var(--text-primary)" }}>{p.name}</td>
                    <td>
                      <span className="party-indicator">
                        <span className="party-dot" style={{ backgroundColor: party.color }} />
                        {party.name.split(" (")[0]}
                      </span>
                    </td>
                    <td>{p.constituency}</td>
                    <td style={{ fontSize: "0.85rem", maxWidth: "250px", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                      {p.role}
                    </td>
                    <td style={{ fontWeight: 500, color: "var(--success)" }}>{p.netWorth}</td>
                    <td>
                      {hasCases ? (
                        <span className="badge badge-cases">
                          <AlertCircle size={10} style={{ marginRight: "4px", display: "inline" }} />
                          {p.criminalCases.length} Active
                        </span>
                      ) : (
                        <span className="badge badge-clean">
                          <Shield size={10} style={{ marginRight: "4px", display: "inline" }} />
                          Clean Record
                        </span>
                      )}
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
