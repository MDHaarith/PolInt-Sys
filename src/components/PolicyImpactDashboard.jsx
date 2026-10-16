import { useMemo, useState } from "react";
import { ArrowUpRight, ClipboardList, GitBranch, Search, ShieldCheck, UserRoundCheck } from "lucide-react";
import { formatDate, textLanguage, indianNumber } from "./dateLabels";
import Provenance from "./Provenance";
import { chiefMinisterPolicyIndex, policyImpactRecords } from "../data/policyImpactDatabase";

const domains = ["all", ...Array.from(new Set(policyImpactRecords.map(item => item.domain)))];

export default function PolicyImpactDashboard() {
  const [query, setQuery] = useState("");
  const [domain, setDomain] = useState("all");

  const filteredPolicies = useMemo(() => {
    const needle = query.trim().toLowerCase();
    return policyImpactRecords.filter(policy => {
      if (domain !== "all" && policy.domain !== domain) return false;
      if (!needle) return true;
      const text = [
        policy.title,
        policy.domain,
        policy.startedBy,
        policy.currentCustodian,
        policy.currentStatus,
        policy.impactSummary,
        ...(policy.convertedInto || []),
        ...(policy.watchItems || []),
      ].join(" ").toLowerCase();
      return text.includes(needle);
    });
  }, [domain, query]);

  return (
    <section className="policy-impact-workspace">
      <div className="global-intel-header">
        <div>
          <div className="workspace-eyebrow">
            <ClipboardList size={14} />
            Public policy
          </div>
          <h1>Policies, over time</h1>
          <p>
            Trace the schemes, people and decisions behind public policy. Track what changed and what to watch next.
          </p>
        </div>
      </div>

      <div className="policy-toolbar">
        <div className="intel-search-box">
          <Search size={15} style={{ color: "var(--text-muted)" }} />
          <input
            className="intel-search-input"
            type="search"
            aria-label="Search policies"
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="Search schemes, departments, impacts..."
          />
        </div>
        <details className="filter-disclosure">
          <summary>Policy domains <span>{domain === "all" ? "All domains" : domain}</span></summary>
        <div className="category-pills-row">
          {domains.map(item => (
            <button
              key={item}
              type="button"
              className={`category-pill ${domain === item ? "active" : ""}`}
              aria-pressed={domain === item}
              onClick={() => setDomain(item)}
            >
              {item === "all" ? "All Domains" : item}
            </button>
          ))}
        </div>
        </details>
      </div>

      <details className="cm-policy-index-panel">
        <summary className="cm-policy-summary">Chief Minister policy map <span>{chiefMinisterPolicyIndex.length} lineage records · expand to explore</span></summary>
        <div className="cm-policy-index-header">
          <div>
            <span className="policy-domain">Chief Minister policy map</span>
            <h2>Policy across administrations</h2>
          </div>
          <span className="verification-pill">{chiefMinisterPolicyIndex.length} CMs / acting CMs</span>
        </div>
        <div className="cm-policy-index-grid">
          {chiefMinisterPolicyIndex.map(item => (
            <article key={`${item.cm}-${item.tenure}`} className="cm-policy-mini-card">
              <div className="cm-policy-mini-title">
                <UserRoundCheck size={15} />
                <strong>{item.cm}</strong>
              </div>
              <div className="cm-policy-mini-meta">
                <span>{item.party}</span>
                <span>{item.tenure}</span>
              </div>
              <p lang={textLanguage(item.intelligenceNote)}>{item.intelligenceNote}</p>
              <Provenance item={item} status="curated" />
              <div className="cm-policy-tags">
                {item.headlinePolicies.slice(0, 4).map(policy => <span key={policy}>{policy}</span>)}
              </div>
            </article>
          ))}
        </div>
      </details>

      <div className="policy-results-count" role="status">{indianNumber(filteredPolicies.length)} policies{domain !== "all" ? ` · ${domain}` : " across all domains"}</div>
      <div className="policy-impact-grid">
        {filteredPolicies.length === 0 && <div className="no-news-fallback"><ClipboardList size={28} /><h3>No matching policies</h3><p>Try another scheme or explore all domains.</p><button type="button" className="load-more-intel-btn" onClick={() => { setQuery(""); setDomain("all"); }}>Clear filters</button></div>}
        {filteredPolicies.map(policy => (
          <article key={policy.id} className="policy-impact-card">
            <div className="policy-card-header">
              <div>
                <span className="policy-domain">{policy.domain}</span>
                <h2 lang={textLanguage(policy.title)}>{policy.title}</h2>
              </div>
              <span className="verification-pill">Curated record</span>
            </div>

            <Provenance item={policy} sources={policy.sourceLinks} status="curated" />
            <div className="policy-lineage">
              <div>
                <span>Started by</span>
                <strong>{policy.startedBy}</strong>
                <small>{policy.startPeriod}</small>
              </div>
              <GitBranch size={18} />
              <div>
                <span>Current custodian</span>
                <strong>{policy.currentCustodian}</strong>
                <small>{policy.currentStatus}</small>
              </div>
            </div>

            <p lang={textLanguage(policy.impactSummary)} className="policy-impact-summary">{policy.impactSummary}</p>

            <div className="policy-section">
              <h3>Converted Into</h3>
              <ul>
                {policy.convertedInto.map(item => <li key={item}>{item}</li>)}
              </ul>
            </div>

            <div className="policy-section">
              <h3>Impact Watch</h3>
              <ul>
                {policy.watchItems.map(item => <li key={item}>{item}</li>)}
              </ul>
            </div>

            <div className="policy-followups">
              {policy.followUps.map(item => (
                <div key={`${policy.id}-${item.date}`} className="policy-followup-row">
                  <ShieldCheck size={14} />
                  <span>{formatDate(item.date)}</span>
                  <p>{item.note}</p>
                </div>
              ))}
            </div>

            <div className="story-actions policy-source-actions">
              {policy.sourceLinks.map(link => (
                <a key={link.url} href={link.url} target="_blank" rel="noreferrer">
                  {link.label} <ArrowUpRight size={12} />
                </a>
              ))}
            </div>
          </article>
        ))}
      </div>
    </section>
  );
}
