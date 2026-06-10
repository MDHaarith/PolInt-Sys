import { useMemo, useState } from "react";
import { ArrowUpRight, ClipboardList, GitBranch, Search, ShieldCheck, UserRoundCheck } from "lucide-react";
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
            Policy impact intelligence
          </div>
          <h1>Scheme Lineage and Daily Follow-Up</h1>
          <p>
            Policies are separated from filler headlines. Each record tracks who started it,
            what it converted into, what to measure, and what needs repeated follow-up.
          </p>
        </div>
      </div>

      <div className="policy-toolbar">
        <div className="intel-search-box">
          <Search size={15} style={{ color: "var(--text-muted)" }} />
          <input
            className="intel-search-input"
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="Search schemes, departments, impacts..."
          />
        </div>
        <div className="category-pills-row">
          {domains.map(item => (
            <button
              key={item}
              type="button"
              className={`category-pill ${domain === item ? "active" : ""}`}
              onClick={() => setDomain(item)}
            >
              {item === "all" ? "All Domains" : item}
            </button>
          ))}
        </div>
      </div>

      <div className="cm-policy-index-panel">
        <div className="cm-policy-index-header">
          <div>
            <span className="policy-domain">Chief Minister policy map</span>
            <h2>Every CM Has a Lineage Record</h2>
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
              <p>{item.intelligenceNote}</p>
              <div className="cm-policy-tags">
                {item.headlinePolicies.slice(0, 4).map(policy => <span key={policy}>{policy}</span>)}
              </div>
            </article>
          ))}
        </div>
      </div>

      <div className="policy-impact-grid">
        {filteredPolicies.map(policy => (
          <article key={policy.id} className="policy-impact-card">
            <div className="policy-card-header">
              <div>
                <span className="policy-domain">{policy.domain}</span>
                <h2>{policy.title}</h2>
              </div>
              <span className="verification-pill">Tracked</span>
            </div>

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

            <p className="policy-impact-summary">{policy.impactSummary}</p>

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
                  <span>{item.date}</span>
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
