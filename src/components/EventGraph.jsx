import { useMemo, useState } from "react";
import { AlertTriangle, ArrowRight, CalendarDays, GitBranch, Link2, Search, ShieldCheck, X } from "lucide-react";

const getEventLabel = (node) => node.name || node.title?.replace(/^\d{4}:\s*/, "") || "Untitled event";

const humanize = (value = "") =>
  value
    .replace(/_/g, " ")
    .replace(/\b\w/g, letter => letter.toUpperCase());

const getEventType = (node) => {
  if (node.eventType && node.eventType !== "event") return humanize(node.eventType);
  if (node.type && !["event", "policy"].includes(node.type)) return humanize(node.type);
  if (node.type === "policy") return "Policy";
  if (node.id?.includes("death") || node.id?.includes("arrest") || node.id?.includes("conviction")) return "Crisis";
  if (node.id?.includes("win") || node.id?.includes("cm") || node.id?.includes("leader")) return "Power Shift";
  return "Event";
};

export default function EventGraph({ nodes: rawNodes, edges: rawEdges, focusEventId = null }) {
  const [query, setQuery] = useState("");
  const [typeFilter, setTypeFilter] = useState("all");
  const [verificationFilter, setVerificationFilter] = useState("all");
  const [originFilter, setOriginFilter] = useState("all");
  const [selectedId, setSelectedId] = useState(
    focusEventId || rawNodes?.[rawNodes.length - 1]?.id || null,
  );

  const sortedNodes = useMemo(() => {
    return [...(rawNodes || [])].sort((a, b) => a.year - b.year || getEventLabel(a).localeCompare(getEventLabel(b)));
  }, [rawNodes]);

  const nodeById = useMemo(() => {
    return Object.fromEntries(sortedNodes.map(node => [node.id, node]));
  }, [sortedNodes]);

  const typeOptions = useMemo(() => {
    return ["all", ...Array.from(new Set(sortedNodes.map(getEventType)))];
  }, [sortedNodes]);

  const verificationOptions = useMemo(() => {
    return [
      "all",
      ...Array.from(
        new Set(sortedNodes.map(node => node.verificationStatus).filter(Boolean)),
      ),
    ];
  }, [sortedNodes]);

  const filteredNodes = useMemo(() => {
    const needle = query.trim().toLowerCase();
    return sortedNodes.filter(node => {
      const type = getEventType(node);
      if (typeFilter !== "all" && type !== typeFilter) return false;
      if (verificationFilter !== "all" && node.verificationStatus !== verificationFilter) return false;
      if (originFilter === "curated" && !node.isCurated) return false;
      if (originFilter === "extracted" && node.isCurated) return false;
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
        node.verificationStatus,
        node.occurredAt,
        ...(node.watchItems || []),
      ].join(" ").toLowerCase();
      return haystack.includes(needle);
    });
  }, [originFilter, query, sortedNodes, typeFilter, verificationFilter]);

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
        <div className="time-fabric-filter-row">
          <label>
            Verification
            <select value={verificationFilter} onChange={event => setVerificationFilter(event.target.value)}>
              {verificationOptions.map(option => (
                <option key={option} value={option}>
                  {option === "all" ? "All verification states" : humanize(option)}
                </option>
              ))}
            </select>
          </label>
          <label>
            Origin
            <select value={originFilter} onChange={event => setOriginFilter(event.target.value)}>
              <option value="all">Curated and extracted</option>
              <option value="curated">Curated only</option>
              <option value="extracted">Extracted only</option>
            </select>
          </label>
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
                <span className="time-fabric-year">
                  {node.occurredAt || node.year}
                  {node.evidenceCount > 0 && <small>{node.evidenceCount} sources</small>}
                </span>
                <span className="time-fabric-card-body">
                  <span className="time-fabric-card-topline">
                    <span className={`time-fabric-type ${type.toLowerCase().replace(/\s+/g, "-")}`}>{type}</span>
                    {node.domain && <span>{node.domain}</span>}
                    {node.verificationStatus && <span>{humanize(node.verificationStatus)}</span>}
                    <span>{node.isCurated ? "Curated" : "Extracted"}</span>
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
                  {selectedEvent.occurredAt || selectedEvent.year}
                </span>
                <span className={`time-fabric-type ${getEventType(selectedEvent).toLowerCase().replace(/\s+/g, "-")}`}>
                  {getEventType(selectedEvent)}
                </span>
              </div>
              <h2>{getEventLabel(selectedEvent)}</h2>
              {selectedEvent.startedBy && <p className="time-fabric-origin">{selectedEvent.startedBy}</p>}
              <div className="time-fabric-verification-row">
                <span>{humanize(selectedEvent.verificationStatus || "curated")}</span>
                <span>{selectedEvent.isCurated ? "Curated record" : "Extracted cluster"}</span>
                <span>{selectedEvent.evidenceCount || 0} evidence items</span>
                <span>{selectedEvent.independentSourceCount || 0} independent sources</span>
              </div>
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

              {selectedEvent.evidence?.length > 0 && (
                <div className="time-fabric-evidence-list">
                  <h3>
                    <Link2 size={15} />
                    Evidence Sources
                  </h3>
                  {selectedEvent.evidence.map(item => (
                    <a key={item.id} href={item.url} target="_blank" rel="noreferrer">
                      <span>{item.source || "Source"}</span>
                      <strong>{item.title}</strong>
                      <small>{humanize(item.role || "evidence")}</small>
                    </a>
                  ))}
                </div>
              )}

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
