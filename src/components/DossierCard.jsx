import React from "react";
import { X, Calendar, Shield, DollarSign, Award, AlertTriangle, AlertCircle, FileText, Info } from "lucide-react";

export default function DossierCard({ selectedItem, activeMode, onClose, db }) {
  if (!selectedItem) {
    return (
      <div className="dossier-panel">
        <div className="dossier-header">
          <span className="dossier-title">Dossier Details</span>
        </div>
        <div className="dossier-body" style={{ justifyContent: "center", alignItems: "center", color: "var(--text-muted)", textAlign: "center" }}>
          <Info size={40} strokeWidth={1.5} style={{ marginBottom: "12px", color: "var(--accent-color)" }} />
          <p style={{ fontSize: "0.85rem" }}>Select a node in the graph to inspect detailed dossiers in this pane.</p>
        </div>
      </div>
    );
  }

  const { id, type } = selectedItem;
  
  // 1. Resolve Politician Profile
  const politician = db.politicians.find(p => p.id === id);
  const party = politician ? db.parties.find(pt => pt.id === politician.party) : null;

  // 2. Resolve Party Profile
  const partyDetails = !politician ? db.parties.find(pt => pt.id === id) : null;

  // 3. Resolve Special Node Profile (if clicked a sub-node like charge, good deed, controversy)
  let subNode = null;
  if (!politician && !partyDetails) {
    // Look up in politicians' sub-records
    db.politicians.forEach(p => {
      // Check charges
      p.criminalProfile.majorCharges.forEach((c, idx) => {
        if (`charge_${p.id}_${idx}` === id) {
          subNode = {
            title: c.charge,
            type: "Criminal Charge",
            parentName: p.name,
            subtext: `Status: ${c.status} | Severity: ${c.severity.toUpperCase()}`,
            color: c.severity === "high" ? "var(--danger)" : "var(--warning)"
          };
        }
      });
      // Check good deeds
      p.goodDeeds.forEach((d, idx) => {
        if (`deed_${p.id}_${idx}` === id) {
          subNode = {
            title: d.title,
            type: "Welfare Scheme / Contribution",
            parentName: p.name,
            subtext: d.description,
            color: "var(--success)"
          };
        }
      });
      // Check bad deeds
      p.badDeeds.forEach((d, idx) => {
        if (`cont_${p.id}_${idx}` === id) {
          subNode = {
            title: d.title,
            type: "Controversy / Scandal",
            parentName: p.name,
            subtext: d.description,
            color: "var(--danger)"
          };
        }
      });
    });
  }

  // Render for Politician node based on current active graph mode
  const renderPoliticianDossier = (p) => {
    const partyColor = party ? party.color : "var(--color-ind)";
    
    return (
      <>
        {/* Politician Identity Card */}
        <div className="dossier-block" style={{ borderLeft: `4px solid ${partyColor}` }}>
          <span className="dossier-label" style={{ color: partyColor }}>{party?.name || "Independent"}</span>
          <h2 className="dossier-value-text" style={{ fontSize: "1.35rem", fontWeight: 700, marginTop: "4px" }}>
            {p.name}
          </h2>
          <p style={{ fontSize: "0.8rem", color: "var(--text-secondary)", marginTop: "2px" }}>
            Constituency: <strong>{p.constituency}</strong> | Age: <strong>{p.mlaDetails.age}</strong>
          </p>
        </div>

        {/* MODE 1: MLA Details */}
        {activeMode === "mla" && (
          <>
            <div className="dossier-block">
              <span className="dossier-label">Current Role / Portfolio</span>
              <p className="dossier-value-text" style={{ fontWeight: 600 }}>{p.mlaDetails.portfolio}</p>
            </div>
            
            <div className="dossier-block">
              <span className="dossier-label">Declared Assets & Net Worth</span>
              <p className="dossier-value-text" style={{ color: "var(--success)", fontWeight: 700, fontSize: "1.2rem", display: "flex", alignItems: "center", gap: "6px" }}>
                <DollarSign size={16} /> {p.mlaDetails.assetsText}
              </p>
            </div>

            <div className="dossier-block">
              <span className="dossier-label">Biography Brief</span>
              <p className="dossier-value-text" style={{ fontSize: "0.85rem", color: "var(--text-secondary)" }}>
                Active leader representing the electoral interests of {p.constituency}.
              </p>
            </div>
          </>
        )}

        {/* MODE 2: Criminal Profile */}
        {activeMode === "criminal" && (
          <>
            <div className="dossier-block" style={{ borderLeft: `4px solid ${p.criminalProfile.hasCases ? "var(--danger)" : "var(--success)"}` }}>
              <span className="dossier-label" style={{ color: p.criminalProfile.hasCases ? "var(--danger)" : "var(--success)" }}>
                Incarceration & Jail Time
              </span>
              <p className="dossier-value-text" style={{ fontWeight: 600, color: p.criminalProfile.hasCases ? "var(--danger)" : "var(--text-primary)" }}>
                {p.criminalProfile.jailTimeText}
              </p>
            </div>

            <div className="dossier-block">
              <span className="dossier-label">Total Public Indictments</span>
              <p className="dossier-value-text" style={{ fontSize: "1.1rem", fontWeight: 700 }}>
                {p.criminalProfile.casesCount} Cases
              </p>
            </div>

            {p.criminalProfile.majorCharges && p.criminalProfile.majorCharges.length > 0 && (
              <div className="dossier-block">
                <span className="dossier-label">Prosecution Details</span>
                <div style={{ display: "flex", flexDirection: "column", gap: "8px", marginTop: "8px" }}>
                  {p.criminalProfile.majorCharges.map((c, i) => (
                    <div className="case-item-card" key={i} style={{ borderLeftColor: c.severity === 'high' ? 'var(--danger)' : 'var(--warning)' }}>
                      <p className="case-item-title">{c.charge}</p>
                      <p className="case-item-status">Status: {c.status}</p>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </>
        )}

        {/* MODE 3: Party Shifts & Defections */}
        {activeMode === "shifts" && (
          <div className="dossier-block">
            <span className="dossier-label" style={{ marginBottom: "12px" }}>Affiliations & shifts Timeline</span>
            <div className="shifts-timeline">
              {p.partyShifts.map((shift, i) => (
                <div className="shift-node-point" key={i}>
                  <div className="shift-node-dot" />
                  <div className="shift-node-year">{shift.year}</div>
                  <div className="shift-node-desc">
                    {shift.from !== "None" ? (
                      <>Left <span className="party-badge-inline" style={{ backgroundColor: `var(--color-${shift.from.toLowerCase()})`, color: "white" }}>{shift.from.toUpperCase()}</span> to join </>
                    ) : (
                      <>Affiliated with </>
                    )}
                    <span className="party-badge-inline" style={{ backgroundColor: `var(--color-${shift.to.toLowerCase()})`, color: "white" }}>{shift.to.toUpperCase()}</span>:
                    <p style={{ marginTop: "4px", fontSize: "0.8rem", color: "var(--text-secondary)", fontStyle: "italic" }}>
                      "{shift.reason}"
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* MODE 4: Good Deeds & Reforms */}
        {activeMode === "good" && (
          <div className="dossier-block">
            <span className="dossier-label" style={{ color: "var(--success)", marginBottom: "10px" }}>Welfare Schemes & Achievements</span>
            {p.goodDeeds.map((deed, i) => (
              <div className="deed-card" key={i}>
                <p className="deed-card-title">{deed.title}</p>
                <p className="deed-card-desc">{deed.description}</p>
              </div>
            ))}
          </div>
        )}

        {/* MODE 5: Bad Deeds & Scams */}
        {activeMode === "bad" && (
          <div className="dossier-block">
            <span className="dossier-label" style={{ color: "var(--danger)", marginBottom: "10px" }}>Controversies & Scams</span>
            {p.badDeeds.map((deed, i) => (
              <div className="controversy-card" key={i}>
                <p className="controversy-card-title">{deed.title}</p>
                <p className="controversy-card-desc">{deed.description}</p>
              </div>
            ))}
          </div>
        )}
      </>
    );
  };

  // Render for Party node
  const renderPartyDossier = (party) => {
    return (
      <>
        <div className="dossier-block" style={{ borderTop: `4px solid ${party.color}` }}>
          <span className="dossier-label" style={{ color: party.color }}>Party Organization</span>
          <h2 className="dossier-value-text" style={{ fontSize: "1.3rem", fontWeight: 700 }}>{party.name}</h2>
          <p style={{ fontSize: "0.8rem", color: "var(--text-secondary)", marginTop: "4px" }}>
            Electoral Symbol: <strong>{party.symbol}</strong>
          </p>
        </div>

        <div className="dossier-block">
          <span className="dossier-label">Ideological Base</span>
          <p className="dossier-value-text" style={{ fontSize: "0.85rem", color: "var(--text-secondary)" }}>
            A key force in Tamil Nadu's political structure.
          </p>
        </div>
      </>
    );
  };

  // Render for Sub-node items (Good/Bad deed specific card detail)
  const renderSubNodeDossier = (node) => {
    return (
      <>
        <div className="dossier-block" style={{ borderLeft: `4px solid ${node.color}` }}>
          <span className="dossier-label" style={{ color: node.color }}>{node.type}</span>
          <h2 className="dossier-value-text" style={{ fontSize: "1.2rem", fontWeight: 700 }}>{node.title}</h2>
          <p style={{ fontSize: "0.8rem", color: "var(--text-secondary)", marginTop: "4px" }}>
            Associated Leader: <strong>{node.parentName}</strong>
          </p>
        </div>

        <div className="dossier-block">
          <span className="dossier-label">Intelligence dossier Details</span>
          <p className="dossier-value-text" style={{ fontSize: "0.9rem", lineHeight: 1.5 }}>
            {node.subtext}
          </p>
        </div>
      </>
    );
  };

  return (
    <div className="dossier-panel">
      <div className="dossier-header">
        <span className="dossier-title">Dossier Dossier</span>
        <button 
          onClick={onClose} 
          className="dossier-close" 
          aria-label="Close dossier"
        >
          <X size={18} />
        </button>
      </div>
      <div className="dossier-body">
        {politician ? renderPoliticianDossier(politician) : null}
        {partyDetails ? renderPartyDossier(partyDetails) : null}
        {subNode ? renderSubNodeDossier(subNode) : null}
        
        {!politician && !partyDetails && !subNode && (
          <div style={{ textAlign: "center", padding: "40px 10px", color: "var(--text-muted)" }}>
            <Info size={30} style={{ marginBottom: "10px" }} />
            <p>Selected node does not contain detailed dossiers for this view mode.</p>
          </div>
        )}
      </div>
    </div>
  );
}
