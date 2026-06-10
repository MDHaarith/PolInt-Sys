import { useMemo, useState } from "react";
import { AlertTriangle, ArrowRight, CalendarDays, GitBranch, Link2, Search, ShieldCheck, X } from "lucide-react";

const getEventLabel = (node) => node.name || node.title?.replace(/^\d{4}:\s*/, "") || "Untitled event";

const getEventType = (node) => {
  if (node.type === "policy") return "Policy";
  if (node.id?.includes("death") || node.id?.includes("arrest") || node.id?.includes("conviction")) return "Crisis";
  if (node.id?.includes("win") || node.id?.includes("cm") || node.id?.includes("leader")) return "Power Shift";
  return "Event";
};

export default function EventGraph({ nodes: rawNodes, edges: rawEdges }) {
  const [query, setQuery] = useState("");
  const [typeFilter, setTypeFilter] = useState("all");
  const [selectedId, setSelectedId] = useState(rawNodes?.[rawNodes.length - 1]?.id || null);

  const sortedNodes = useMemo(() => {
    return [...(rawNodes || [])].sort((a, b) => a.year - b.year || getEventLabel(a).localeCompare(getEventLabel(b)));
  }, [rawNodes]);

  const nodeById = useMemo(() => {
    return Object.fromEntries(sortedNodes.map(node => [node.id, node]));
  }, [sortedNodes]);

  const typeOptions = useMemo(() => {
    return ["all", ...Array.from(new Set(sortedNodes.map(getEventType)))];
  }, [sortedNodes]);

  const filteredNodes = useMemo(() => {
    const needle = query.trim().toLowerCase();
    return sortedNodes.filter(node => {
      const type = getEventType(node);
      if (typeFilter !== "all" && type !== typeFilter) return false;
      if (!needle) return true;
      const haystack = [
        getEventLabel(node),
        node.year,
        node.description,
        node.fallout,
        node.domain,
        node.chiefMinister,
        node.startedBy,
        node.currentCustodian,
        node.currentStatus,
        ...(node.watchItems || []),
      ].join(" ").toLowerCase();
      return haystack.includes(needle);
    });
  }, [query, sortedNodes, typeFilter]);

  const selectedEvent = nodeById[selectedId] || filteredNodes[filteredNodes.length - 1] || sortedNodes[sortedNodes.length - 1];

  const selectedLinks = useMemo(() => {
    if (!selectedEvent) return { incoming: [], outgoing: [] };
    return {
      incoming: (rawEdges || [])
        .filter(edge => edge.target === selectedEvent.id)
        .map(edge => ({ ...edge, node: nodeById[edge.source] }))
        .filter(edge => edge.node),
      outgoing: (rawEdges || [])
        .filter(edge => edge.source === selectedEvent.id)
        .map(edge => ({ ...edge, node: nodeById[edge.target] }))
        .filter(edge => edge.node),
    };
  }, [nodeById, rawEdges, selectedEvent]);

  const yearRange = useMemo(() => {
    if (!sortedNodes.length) return "No data";
    return `${sortedNodes[0].year}-${sortedNodes[sortedNodes.length - 1].year}`;
  }, [sortedNodes]);

  return (
    <section className="time-fabric-workspace">
      <div className="time-fabric-header">
        <div>
          <div className="workspace-eyebrow">
            <GitBranch size={14} />
            Event Time Fabric
          </div>
          <h1>Political Events, Scheme Lineage, and Impact Watch</h1>
          <p>
            Chronological fabric for Tamil Nadu politics: power shifts, crises, and CM-wise policies are searchable in one surface with causality links and daily follow-up hooks.
          </p>
        </div>
        <div className="time-fabric-stats">
          <div>
            <span>{sortedNodes.length}</span>
            <small>nodes</small>
          </div>
          <div>
            <span>{rawEdges?.length || 0}</span>
            <small>links</small>
          </div>
          <div>
            <span>{yearRange}</span>
            <small>range</small>
          </div>
        </div>
      </div>

      <div className="time-fabric-toolbar">
        <div className="intel-search-box">
          <Search size={15} style={{ color: "var(--text-muted)" }} />
          <input
            className="intel-search-input"
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="Search policies, events, CMs, fallout, domains..."
          />
          {query && (
            <button type="button" className="time-fabric-clear" onClick={() => setQuery("")} aria-label="Clear search">
              <X size={14} />
            </button>
          )}
        </div>
        <div className="category-pills-row">
          {typeOptions.map(option => (
            <button
              key={option}
              type="button"
              className={`category-pill ${typeFilter === option ? "active" : ""}`}
              onClick={() => setTypeFilter(option)}
            >
              {option === "all" ? "All Nodes" : option}
            </button>
          ))}
        </div>
      </div>

      <div className="time-fabric-grid">
        <div className="time-fabric-list">
          {filteredNodes.map(node => {
            const active = selectedEvent?.id === node.id;
            const type = getEventType(node);
            return (
              <button
                key={node.id}
                type="button"
                className={`time-fabric-card ${active ? "active" : ""} ${node.type === "policy" ? "policy-node" : ""}`}
                onClick={() => setSelectedId(node.id)}
              >
                <span className="time-fabric-year">{node.year}</span>
                <span className="time-fabric-card-body">
                  <span className="time-fabric-card-topline">
                    <span className={`time-fabric-type ${type.toLowerCase().replace(/\s+/g, "-")}`}>{type}</span>
                    {node.domain && <span>{node.domain}</span>}
                  </span>
                  <strong>{getEventLabel(node)}</strong>
                  <small>{node.description}</small>
                </span>
                <ArrowRight size={15} />
              </button>
            );
          })}
          {filteredNodes.length === 0 && (
            <div className="time-fabric-empty">
              <AlertTriangle size={18} />
              No events match this filter.
            </div>
          )}
        </div>

        <aside className="time-fabric-detail-panel">
          {selectedEvent ? (
            <>
              <div className="time-fabric-detail-header">
                <span className="time-fabric-detail-year">
                  <CalendarDays size={15} />
                  {selectedEvent.year}
                </span>
                <span className={`time-fabric-type ${getEventType(selectedEvent).toLowerCase().replace(/\s+/g, "-")}`}>
                  {getEventType(selectedEvent)}
                </span>
              </div>
              <h2>{getEventLabel(selectedEvent)}</h2>
              {selectedEvent.startedBy && <p className="time-fabric-origin">{selectedEvent.startedBy}</p>}
              <p>{selectedEvent.description}</p>

              <div className="time-fabric-impact-box">
                <span>Impact / Fallout</span>
                <p>{selectedEvent.fallout || "No impact note recorded yet."}</p>
              </div>

              {(selectedEvent.currentCustodian || selectedEvent.currentStatus) && (
                <div className="time-fabric-meta-grid">
                  {selectedEvent.currentCustodian && (
                    <div>
                      <span>Custodian</span>
                      <strong>{selectedEvent.currentCustodian}</strong>
                    </div>
                  )}
                  {selectedEvent.currentStatus && (
                    <div>
                      <span>Status</span>
                      <strong>{selectedEvent.currentStatus}</strong>
                    </div>
                  )}
                </div>
              )}

              {selectedEvent.watchItems?.length > 0 && (
                <div className="time-fabric-watchlist">
                  <h3>
                    <ShieldCheck size={15} />
                    Follow-Up Watch
                  </h3>
                  <ul>
                    {selectedEvent.watchItems.map(item => <li key={item}>{item}</li>)}
                  </ul>
                </div>
              )}

              <div className="time-fabric-linkage">
                <h3>
                  <GitBranch size={15} />
                  Causal Links
                </h3>
                {[...selectedLinks.incoming, ...selectedLinks.outgoing].length > 0 ? (
                  <div className="time-fabric-link-list">
                    {selectedLinks.incoming.map(link => (
                      <button key={link.id} type="button" onClick={() => setSelectedId(link.node.id)}>
                        <span>Before</span>
                        <strong>{link.node.year}: {getEventLabel(link.node)}</strong>
                      </button>
                    ))}
                    {selectedLinks.outgoing.map(link => (
                      <button key={link.id} type="button" onClick={() => setSelectedId(link.node.id)}>
                        <span>After</span>
                        <strong>{link.node.year}: {getEventLabel(link.node)}</strong>
                      </button>
                    ))}
                  </div>
                ) : (
                  <p className="time-fabric-muted">No causal link recorded yet.</p>
                )}
              </div>

              {selectedEvent.sourceLinks?.length > 0 && (
                <div className="story-actions policy-source-actions">
                  {selectedEvent.sourceLinks.map(link => (
                    <a key={link.url} href={link.url} target="_blank" rel="noreferrer">
                      <Link2 size={12} />
                      {link.label}
                    </a>
                  ))}
                </div>
              )}
            </>
          ) : (
            <div className="time-fabric-empty">Select a node to inspect its timeline record.</div>
          )}
        </aside>
      </div>
    </section>
  );
}
