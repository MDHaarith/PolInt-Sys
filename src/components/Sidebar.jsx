import React from "react";
import { 
  X, User, Building2, AlertTriangle, Calendar, 
  DollarSign, ShieldAlert, FileText, Info, Link2 
} from "lucide-react";

export default function Sidebar({ selectedItem, onClose, db }) {
  if (!selectedItem) {
    return (
      <div className="dossier-panel">
        <div className="dossier-header">
          <h3 className="dossier-heading">Dossier Inspector</h3>
        </div>
        <div className="dossier-body" style={{ justifyContent: "center", alignItems: "center", color: "var(--text-muted)", textAlign: "center" }}>
          <Info size={48} strokeWidth={1.5} style={{ marginBottom: "16px", color: "var(--accent-color)" }} />
          <p>Select a node or connection line in the graph or click an MLA in the database to inspect deep political intelligence.</p>
        </div>
      </div>
    );
  }

  const { type, id, data, edge } = selectedItem;

  // Let's resolve the actual entity from db if it was select from graph
  let entity = null;
  let partyDetails = null;

  if (type === "node") {
    // Check if it's a politician, party, or event
    entity = db.politicians.find(p => p.id === id);
    if (entity) {
      partyDetails = db.parties.find(p => p.id === entity.party);
    } else {
      entity = db.parties.find(p => p.id === id);
      if (!entity) {
        entity = db.events.find(e => e.id === id);
      }
    }
  }

  // Render for Politician node
  const renderPolitician = (p) => {
    const party = partyDetails || { name: p.party.toUpperCase(), color: "var(--color-ind)" };
    return (
      <>
        <div className="dossier-block" style={{ borderLeft: `4px solid ${party.color || "var(--color-ind)"}` }}>
          <div style={{ display: "flex", gap: "12px", alignItems: "center", marginBottom: "8px" }}>
            <div style={{ padding: "8px", borderRadius: "8px", background: "rgba(255,255,255,0.03)", color: party.color }}>
              <User size={24} />
            </div>
            <div>
              <span className="dossier-subheading" style={{ color: party.color }}>{party.name}</span>
              <h2 className="dossier-heading" style={{ marginTop: 0 }}>{p.name}</h2>
            </div>
          </div>
          <p className="dossier-val" style={{ fontWeight: 600, color: "var(--text-primary)" }}>{p.role}</p>
        </div>

        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "12px" }}>
          <div className="dossier-block">
            <span className="dossier-label">Constituency</span>
            <p className="dossier-val" style={{ fontWeight: 600 }}>{p.constituency}</p>
          </div>
          <div className="dossier-block">
            <span className="dossier-label">Electorate Info</span>
            <p className="dossier-val">
              <Calendar size={12} style={{ marginRight: "4px", display: "inline" }} />
              Born {p.birthYear} {p.deathYear ? `- Died ${p.deathYear}` : ""}
            </p>
          </div>
        </div>

        <div className="dossier-block">
          <span className="dossier-label">Estimated Wealth / Assets</span>
          <p className="dossier-val" style={{ color: "var(--success)", fontWeight: 700, display: "flex", alignItems: "center", gap: "4px", fontSize: "1.1rem" }}>
            <DollarSign size={16} /> {p.netWorth}
          </p>
        </div>

        <div className="dossier-block">
          <span className="dossier-label">Political Biography</span>
          <p className="dossier-val" style={{ fontSize: "0.88rem", color: "var(--text-secondary)", marginTop: "6px" }}>{p.bio}</p>
        </div>

        {p.criminalCases && p.criminalCases.length > 0 ? (
          <div className="dossier-block">
            <span className="dossier-label" style={{ color: "var(--danger)", display: "flex", alignItems: "center", gap: "6px" }}>
              <ShieldAlert size={14} /> Criminal Investigations & Cases
            </span>
            <div style={{ marginTop: "10px" }}>
              {p.criminalCases.map((c, i) => (
                <div className="case-card" key={i}>
                  <p className="case-charge">{c.charge}</p>
                  <p className="case-status">Status: {c.status}</p>
                </div>
              ))}
            </div>
          </div>
        ) : (
          <div className="dossier-block" style={{ background: "rgba(16, 185, 129, 0.03)", borderColor: "rgba(16, 185, 129, 0.1)" }}>
            <span className="dossier-label" style={{ color: "var(--success)" }}>Case History</span>
            <p className="dossier-val" style={{ fontSize: "0.85rem", color: "var(--text-secondary)", marginTop: "4px" }}>No significant criminal convictions or active corruption indictments found on public record.</p>
          </div>
        )}

        {p.nuances && p.nuances.length > 0 && (
          <div className="dossier-block" style={{ borderLeft: "4px solid var(--warning)", background: "rgba(245, 158, 11, 0.02)" }}>
            <span className="dossier-label" style={{ color: "var(--warning)" }}>Deep Intelligence & Nuances</span>
            <div style={{ display: "flex", flexDirection: "column", gap: "8px", marginTop: "4px" }}>
              {p.nuances.map((n, i) => (
                <p className="nuance-item" key={i}>{n}</p>
              ))}
            </div>
          </div>
        )}
      </>
    );
  };

  // Render for Party node
  const renderParty = (party) => {
    return (
      <>
        <div className="dossier-block" style={{ borderTop: `4px solid ${party.color || "var(--color-ind)"}` }}>
          <div style={{ display: "flex", gap: "12px", alignItems: "center", marginBottom: "8px" }}>
            <div style={{ padding: "8px", borderRadius: "8px", background: "rgba(255,255,255,0.03)", color: party.color }}>
              <Building2 size={24} />
            </div>
            <div>
              <span className="dossier-subheading" style={{ color: party.color }}>Political Entity</span>
              <h2 className="dossier-heading" style={{ marginTop: 0 }}>{party.name}</h2>
            </div>
          </div>
        </div>

        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "12px" }}>
          <div className="dossier-block">
            <span className="dossier-label">Founded</span>
            <p className="dossier-val" style={{ fontWeight: 600 }}>{party.founded} by {party.founder}</p>
          </div>
          <div className="dossier-block">
            <span className="dossier-label">Current Leader</span>
            <p className="dossier-val" style={{ fontWeight: 600 }}>{party.currentLeader}</p>
          </div>
        </div>

        <div className="dossier-block">
          <span className="dossier-label">Electoral Symbol</span>
          <p className="dossier-val" style={{ fontWeight: 600 }}>{party.symbol}</p>
        </div>

        <div className="dossier-block">
          <span className="dossier-label">Ideology</span>
          <p className="dossier-val" style={{ color: "var(--text-primary)" }}>{party.ideology}</p>
        </div>

        <div className="dossier-block">
          <span className="dossier-label">History & Profile</span>
          <p className="dossier-val" style={{ fontSize: "0.88rem", color: "var(--text-secondary)", lineHeight: 1.5 }}>{party.history}</p>
        </div>
      </>
    );
  };

  // Render for Event node
  const renderEvent = (ev) => {
    return (
      <>
        <div className="dossier-block" style={{ borderLeft: "4px solid var(--danger)", background: "rgba(239, 68, 68, 0.02)" }}>
          <div style={{ display: "flex", gap: "12px", alignItems: "center", marginBottom: "8px" }}>
            <div style={{ padding: "8px", borderRadius: "8px", background: "rgba(255,255,255,0.03)", color: "var(--danger)" }}>
              <AlertTriangle size={24} />
            </div>
            <div>
              <span className="dossier-subheading" style={{ color: "var(--danger)" }}>{ev.type.replace("_", " ").toUpperCase()}</span>
              <h2 className="dossier-heading" style={{ marginTop: 0 }}>{ev.name}</h2>
            </div>
          </div>
          <span className="dossier-label">Year of Occurrence</span>
          <p className="dossier-val" style={{ fontWeight: 700, fontSize: "1.1rem" }}>{ev.year}</p>
        </div>

        <div className="dossier-block">
          <span className="dossier-label">Event Description</span>
          <p className="dossier-val" style={{ fontSize: "0.88rem", color: "var(--text-secondary)", lineHeight: 1.5 }}>{ev.description}</p>
        </div>

        <div className="dossier-block" style={{ borderLeft: "4px solid var(--warning)", background: "rgba(245, 158, 11, 0.02)" }}>
          <span className="dossier-label" style={{ color: "var(--warning)" }}>Electoral & Political Fallout</span>
          <p className="dossier-val" style={{ fontSize: "0.88rem", color: "var(--warning)", lineHeight: 1.5 }}>{ev.nuances}</p>
        </div>
      </>
    );
  };

  // Render for Relationship (Edge)
  const renderEdge = (e) => {
    const sourceNode = db.politicians.find(p => p.id === e.source) || 
                       db.parties.find(p => p.id === e.source) || 
                       db.events.find(p => p.id === e.source);

    const targetNode = db.politicians.find(p => p.id === e.target) || 
                       db.parties.find(p => p.id === e.target) || 
                       db.events.find(p => p.id === e.target);

    return (
      <>
        <div className="dossier-block" style={{ borderLeft: "4px solid var(--accent-color)", background: "rgba(99, 102, 241, 0.02)" }}>
          <div style={{ display: "flex", gap: "12px", alignItems: "center", marginBottom: "8px" }}>
            <div style={{ padding: "8px", borderRadius: "8px", background: "rgba(255,255,255,0.03)", color: "var(--accent-color)" }}>
              <Link2 size={24} />
            </div>
            <div>
              <span className="dossier-subheading" style={{ color: "var(--accent-color)" }}>Relationship Link</span>
              <h2 className="dossier-heading" style={{ marginTop: 0 }}>{e.label}</h2>
            </div>
          </div>
        </div>

        <div className="dossier-block" style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
          <div>
            <span className="dossier-label">From Entity</span>
            <p className="dossier-val" style={{ fontWeight: 600 }}>{sourceNode?.name || e.source}</p>
          </div>
          <div style={{ alignSelf: "center", color: "var(--text-muted)", fontSize: "0.8rem" }}>↓ ({e.label})</div>
          <div>
            <span className="dossier-label">To Entity</span>
            <p className="dossier-val" style={{ fontWeight: 600 }}>{targetNode?.name || e.target}</p>
          </div>
        </div>

        <div className="dossier-block" style={{ borderLeft: "4px solid var(--warning)", background: "rgba(245, 158, 11, 0.02)" }}>
          <span className="dossier-label" style={{ color: "var(--warning)" }}>Nuances & Intel Context</span>
          <p className="dossier-val" style={{ fontSize: "0.88rem", color: "var(--text-primary)", lineHeight: 1.5, marginTop: "6px" }}>
            {e.nuance}
          </p>
        </div>
      </>
    );
  };

  return (
    <div className="dossier-panel">
      <div className="dossier-header">
        <h3 className="dossier-heading">Dossier Details</h3>
        <button 
          onClick={onClose} 
          className="dossier-close" 
          style={{ background: "none", border: "none" }}
          aria-label="Close dossier"
        >
          <X size={20} />
        </button>
      </div>
      <div className="dossier-body">
        {edge ? renderEdge(edge) : null}
        {!edge && entity && entity.party ? renderPolitician(entity) : null}
        {!edge && entity && entity.founded ? renderParty(entity) : null}
        {!edge && entity && entity.description ? renderEvent(entity) : null}
      </div>
    </div>
  );
}
