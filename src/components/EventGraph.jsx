import { useMemo, useState } from "react";
import { AlertTriangle, ArrowRight, CalendarDays, GitBranch, Link2, Search, ShieldCheck, X } from "lucide-react";

import { formatDate, textLanguage, indianNumber } from "./dateLabels";
import Provenance from "./Provenance";

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

const TIMELINE_PAGE = 100;

export default function EventGraph({ nodes: rawNodes, edges: rawEdges, focusEventId = null }) {
  const [detailOpen, setDetailOpen] = useState(() => matchMedia("(min-width: 769px)").matches);
  const [query, setQuery] = useState("");
  const [typeFilter, setTypeFilter] = useState("all");
  const [verificationFilter, setVerificationFilter] = useState("all");
  const [originFilter, setOriginFilter] = useState("all");
  const [visibleLimit, setVisibleLimit] = useState(TIMELINE_PAGE);
  const sortedNodes = useMemo(() => {
    // Newest first; undated records sink to the end.
    const when = node => String(node.occurredAt || node.year || "");
    return [...(rawNodes || [])].sort((a, b) => when(b).localeCompare(when(a)) || getEventLabel(a).localeCompare(getEventLabel(b)));
  }, [rawNodes]);

  const [selectedId, setSelectedId] = useState(() => focusEventId || sortedNodes[0]?.id || null);

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
    const years = sortedNodes.map(node => node.year).filter(year => Number.isFinite(year) && year > 0);
    return years.length ? `${Math.min(...years)}–${Math.max(...years)}` : "Undated";
  }, [sortedNodes]);

  return (
    <section className="time-fabric-workspace">
      <div className="time-fabric-header">
        <div>
          <div className="workspace-eyebrow">
            <GitBranch size={14} />
            Political timeline
          </div>
          <h1>How we got here</h1>
          <p>
            Connect the moments that shaped Tamil Nadu. Explore power shifts, policy decisions and their lasting impact.
          </p>
        </div>
        <div className="time-fabric-stats">
          <div>
            <span>{indianNumber(sortedNodes.length)}</span>
            <small>events</small>
          </div>
          <div>
            <span>{indianNumber(rawEdges?.length || 0)}</span>
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
            type="search"
            aria-label="Search events and policy history"
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
        <details className="filter-disclosure">
          <summary>Filter the timeline <span>{typeFilter === "all" ? "All event types" : typeFilter}</span></summary>
        <div className="category-pills-row">
          {typeOptions.map(option => (
            <button
              key={option}
              type="button"
              className={`category-pill ${typeFilter === option ? "active" : ""}`}
              aria-pressed={typeFilter === option}
              onClick={() => setTypeFilter(option)}
            >
              {option === "all" ? "All events" : option}
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
        </details>
      </div>

      <div className="time-fabric-grid">
        <div className="time-fabric-list">
          {filteredNodes.slice(0, visibleLimit).map(node => {
            const active = selectedEvent?.id === node.id;
            const type = getEventType(node);
            return (
              <button
                key={node.id}
                type="button"
                className={`time-fabric-card ${active ? "active" : ""} ${node.type === "policy" ? "policy-node" : ""}`}
                onClick={() => {
                  setSelectedId(node.id);
                  setDetailOpen(true);
                  if (matchMedia("(max-width: 768px)").matches) requestAnimationFrame(() => document.querySelector(".time-fabric-selection")?.scrollIntoView({ block: "start" }));
                }}
              >
                <span className="time-fabric-year">
                  {node.occurredAt || node.year ? formatDate(node.occurredAt || node.year) : "Undated"}
                  {node.evidenceCount > 0 && <small>{node.evidenceCount} sources</small>}
                </span>
                <span className="time-fabric-card-body">
                  <span className="time-fabric-card-topline">
                    <span className={`time-fabric-type ${type.toLowerCase().replace(/\s+/g, "-")}`}>{type}</span>
                    {node.domain && <span>{node.domain}</span>}
                    {node.verificationStatus && <span>{humanize(node.verificationStatus)}</span>}
                    <span>{node.isCurated ? "Curated" : "Extracted"}</span>
                  </span>
                  <strong lang={textLanguage(getEventLabel(node))}>{getEventLabel(node)}</strong>
                  <small lang={textLanguage(node.description)}>{node.description}</small>
                  <Provenance linked={false} item={node} sources={node.evidence?.length ? node.evidence : node.sourceLinks} status={node.verificationStatus || "curated"} date={node.occurredAt || node.year} />
                </span>
                <ArrowRight size={15} />
              </button>
            );
          })}
          {visibleLimit < filteredNodes.length && (
            <button type="button" className="load-more-intel-btn" onClick={() => setVisibleLimit(limit => limit + TIMELINE_PAGE)}>
              Show {Math.min(TIMELINE_PAGE, filteredNodes.length - visibleLimit)} more events
            </button>
          )}
          {filteredNodes.length === 0 && (
            <div className="time-fabric-empty">
              <AlertTriangle size={18} />
              No events match this filter.
            </div>
          )}
        </div>

        <details className="time-fabric-selection" open={detailOpen} onToggle={event => setDetailOpen(event.currentTarget.open)}>
          <summary>Selected record <span>{selectedEvent ? getEventLabel(selectedEvent) : "Choose an event"}</span></summary>
        <aside className="time-fabric-detail-panel">
          {selectedEvent ? (
            <>
              <div className="time-fabric-detail-header">
                <span className="time-fabric-detail-year">
                  <CalendarDays size={15} />
                  {formatDate(selectedEvent.occurredAt || selectedEvent.year)}
                </span>
                <span className={`time-fabric-type ${getEventType(selectedEvent).toLowerCase().replace(/\s+/g, "-")}`}>
                  {getEventType(selectedEvent)}
                </span>
              </div>
              <h2 lang={textLanguage(getEventLabel(selectedEvent))}>{getEventLabel(selectedEvent)}</h2>
              <Provenance item={selectedEvent} sources={selectedEvent.evidence?.length ? selectedEvent.evidence : selectedEvent.sourceLinks} status={selectedEvent.verificationStatus || "curated"} date={selectedEvent.occurredAt || selectedEvent.year} />
              {selectedEvent.startedBy && <p className="time-fabric-origin">{selectedEvent.startedBy}</p>}
              <div className="time-fabric-verification-row">
                <span>{humanize(selectedEvent.verificationStatus || "curated")}</span>
                <span>{selectedEvent.isCurated ? "Curated record" : "Extracted cluster"}</span>
                <span>{selectedEvent.evidenceCount || 0} evidence items</span>
                <span>{selectedEvent.independentSourceCount || 0} independent sources</span>
              </div>
              <p lang={textLanguage(selectedEvent.description)}>{selectedEvent.description}</p>

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
                      <strong lang={textLanguage(item.title)}>{item.title}</strong>
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
        </details>
      </div>
    </section>
  );
}
