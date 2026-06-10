import React from "react";
import { Calendar, Eye } from "lucide-react";

export default function TimelineView({ db, onSelectItem, onSwitchTab }) {
  // Sort events chronologically
  const sortedEvents = [...db.events].sort((a, b) => a.year - b.year);

  const handleShowOnGraph = (eventId, e) => {
    e.stopPropagation(); // Prevent card selection click
    onSelectItem({ type: "node", id: eventId });
    onSwitchTab("graph");
  };

  return (
    <div className="timeline-container">
      <div>
        <h2 className="table-title">Tamil Nadu Political Chronicle</h2>
        <p style={{ color: "var(--text-muted)", fontSize: "0.85rem", marginTop: "4px" }}>
          Explore key milestones, political splits, governance shifts, and scandals that shaped the state since 1947.
        </p>
      </div>

      <div className="timeline-tree">
        {sortedEvents.map((ev) => {
          const typeLabel = ev.type.replace("_", " ").toUpperCase();
          const isScandal = ev.type === "scandal" || ev.type === "tragedy";
          
          return (
            <div className="timeline-node-item" key={ev.id}>
              <div 
                className="timeline-dot" 
                style={{ 
                  borderColor: isScandal ? "var(--danger)" : "var(--accent-color)",
                  boxShadow: isScandal ? "0 0 10px rgba(239, 68, 68, 0.4)" : "0 0 10px var(--accent-glow)"
                }} 
              />
              <div className="timeline-year">{ev.year}</div>
              <div className="timeline-card glass glass-hover" onClick={() => onSelectItem({ type: "node", id: ev.id })}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: "8px" }}>
                  <span 
                    className="badge" 
                    style={{ 
                      backgroundColor: isScandal ? "rgba(239, 68, 68, 0.1)" : "rgba(99, 102, 241, 0.1)", 
                      color: isScandal ? "var(--danger)" : "var(--accent-color)" 
                    }}
                  >
                    {typeLabel}
                  </span>
                  
                  <button 
                    className="button-btn button-secondary" 
                    style={{ padding: "4px 8px", fontSize: "0.75rem", display: "flex", alignItems: "center", gap: "4px" }}
                    onClick={(e) => handleShowOnGraph(ev.id, e)}
                  >
                    <Eye size={12} />
                    View on Graph
                  </button>
                </div>
                
                <h3>{ev.name}</h3>
                <p className="timeline-desc">{ev.description}</p>
                
                {ev.nuances && (
                  <div className="timeline-nuance">
                    <strong>Nuance:</strong> {ev.nuances}
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
