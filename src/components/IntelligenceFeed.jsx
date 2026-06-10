import { useMemo, useState } from "react";
import {
  AlertTriangle,
  ArrowUpRight,
  Database,
  Filter,
  GitBranch,
  Newspaper,
  Radio,
  Search,
  ShieldAlert,
  UserRoundSearch,
} from "lucide-react";

const INITIAL_LIMIT = 350;
const LOAD_STEP = 350;

const RUMOR_TERMS = [
  "rumour",
  "rumor",
  "speculation",
  "buzz",
  "unverified",
  "alleged",
  "leak",
  "viral",
  "social media",
  "x post",
  "tweet",
  "hashtag",
  "claim",
];

const CATEGORY_CONFIG = {
  all: { label: "All", color: "#94a3b8" },
  news: { label: "News", color: "#38bdf8" },
  social_media: { label: "Social", color: "#22c55e" },
  investigation: { label: "Probe", color: "#ef4444" },
  election: { label: "Election", color: "#a78bfa" },
  policy: { label: "Policy", color: "#f59e0b" },
  rumor: { label: "Rumor Watch", color: "#fb7185" },
};

const formatNumber = (value) => Number(value || 0).toLocaleString("en-IN");

const parseStoryDate = (value) => {
  if (!value) return 0;
  const parsed = Date.parse(value);
  return Number.isNaN(parsed) ? 0 : parsed;
};

const normalizeText = (value = "") => value.toString().toLowerCase();

const detectRumor = (story) => {
  if (story.isRumor || story.verificationStatus === "unverified_chatter") return true;
  const haystack = normalizeText(`${story.title || ""} ${story.snippet || ""} ${story.category || ""}`);
  return RUMOR_TERMS.some(term => haystack.includes(term));
};

const cleanSnippet = (value = "") =>
  value
    .replace(/&nbsp;/g, " ")
    .replace(/\s+/g, " ")
    .trim();

const getStoryKey = (story) => story.url || story.id || `${story.politicianId || "general"}-${story.title}`;

export default function IntelligenceFeed({
  news = [],
  politicians = [],
  parties = [],
  events = [],
  onSelectPolitician,
  onSelectEvent,
  lastIntelSync = null,
}) {
  const [query, setQuery] = useState("");
  const [activeCategory, setActiveCategory] = useState("all");
  const [visibleLimit, setVisibleLimit] = useState(INITIAL_LIMIT);

  const politicianById = useMemo(() => {
    const map = new Map();
    politicians.forEach(p => map.set(p.id, p));
    return map;
  }, [politicians]);

  const partyById = useMemo(() => {
    const map = new Map();
    parties.forEach(party => map.set(party.id, party));
    return map;
  }, [parties]);

  const eventByEvidenceId = useMemo(() => {
    const map = new Map();
    events.forEach(event => {
      (event.evidence || []).forEach(item => {
        if (item.id) map.set(item.id, event);
      });
    });
    return map;
  }, [events]);

  const allStories = useMemo(() => {
    const seen = new Set();
    const combined = [];

    news.forEach(story => {
      const key = getStoryKey(story);
      if (!key || seen.has(key)) return;
      seen.add(key);
      combined.push(story);
    });

    politicians.forEach(politician => {
      (politician.newsFeed || []).forEach(story => {
        const key = getStoryKey(story);
        if (!key || seen.has(key)) return;
        seen.add(key);
        combined.push({ ...story, politicianId: story.politicianId || politician.id });
      });
    });

    return combined
      .map(story => {
        const politician = politicianById.get(story.politicianId);
        const isGeneral = !story.politicianId || story.politicianId === "general";
        const isRumor = detectRumor(story);
        return {
          ...story,
          id: story.id || getStoryKey(story),
          snippet: cleanSnippet(story.snippet || story.title || ""),
          politicianName: isGeneral ? "General Tamil Nadu politics" : (politician?.name || story.politicianName || story.politicianId || "Unknown subject"),
          partyId: politician?.party,
          category: isRumor ? "rumor" : (story.category || "news"),
          isGeneral,
          isRumor,
          timestamp: parseStoryDate(story.date || story.publishedAt || story.retrievedAt),
          sourceType: story.sourceType || "google_news_rss",
          verificationStatus: story.verificationStatus || (isRumor ? "unverified_chatter" : "source_reported"),
        };
      })
      .sort((a, b) => b.timestamp - a.timestamp);
  }, [news, politicians, politicianById]);

  const categoryCounts = useMemo(() => {
    const counts = Object.fromEntries(Object.keys(CATEGORY_CONFIG).map(key => [key, 0]));
    counts.all = allStories.length;
    allStories.forEach(story => {
      const key = story.category in CATEGORY_CONFIG ? story.category : "news";
      counts[key] = (counts[key] || 0) + 1;
    });
    return counts;
  }, [allStories]);

  const filteredStories = useMemo(() => {
    const needle = query.trim().toLowerCase();
    return allStories.filter(story => {
      if (activeCategory !== "all" && story.category !== activeCategory) return false;
      if (!needle) return true;
      const searchable = `${story.title || ""} ${story.snippet || ""} ${story.source || ""} ${story.politicianName || ""}`.toLowerCase();
      return searchable.includes(needle);
    });
  }, [activeCategory, allStories, query]);

  const visibleStories = filteredStories.slice(0, visibleLimit);
  const sourceCount = useMemo(() => new Set(allStories.map(story => story.source).filter(Boolean)).size, [allStories]);
  const coveredPoliticians = useMemo(() => new Set(allStories.filter(story => !story.isGeneral).map(story => story.politicianId)).size, [allStories]);
  const directSocialCount = useMemo(() => allStories.filter(story => ["bluesky", "reddit"].includes(story.platform)).length, [allStories]);
  const rumorCount = categoryCounts.rumor || 0;
  const latestDate = allStories.find(story => story.date)?.date || "Not available";

  return (
    <section className="global-intel-workspace">
      <div className="global-intel-header">
        <div>
          <div className="workspace-eyebrow">
            <Radio size={14} />
            Live political intelligence
          </div>
          <h1>Top-to-Bottom Political Feed</h1>
          <p>
            Every scraped political story is searchable here, including general state coverage,
            politician-specific reports, social chatter, investigations, election news, and policy items.
          </p>
        </div>
        <div className="auto-sync-status">
          <div>
            <strong>Auto-watch enabled</strong>
            <small>{lastIntelSync ? `Last reload ${new Date(lastIntelSync).toLocaleTimeString()}` : "Waiting for first feed load"}</small>
          </div>
        </div>
      </div>

      <div className="intel-stats-row global-intel-stats">
        <div className="intel-stat-card">
          <Database size={22} className="stat-icon" />
          <div>
            <span className="stat-number">{formatNumber(allStories.length)}</span>
            <span className="stat-label">Total stories / 100k target</span>
          </div>
        </div>
        <div className="intel-stat-card">
          <Newspaper size={22} className="stat-icon" />
          <div>
            <span className="stat-number">{formatNumber(sourceCount)}</span>
            <span className="stat-label">Sources</span>
          </div>
        </div>
        <div className="intel-stat-card">
          <UserRoundSearch size={22} className="stat-icon" />
          <div>
            <span className="stat-number">{formatNumber(coveredPoliticians)}</span>
            <span className="stat-label">People covered</span>
          </div>
        </div>
        <div className="intel-stat-card danger-glow">
          <ShieldAlert size={22} className="stat-icon" />
          <div>
            <span className="stat-number">{formatNumber(directSocialCount || rumorCount)}</span>
            <span className="stat-label">Social/Rumor items</span>
          </div>
        </div>
      </div>

      <div className="global-feed-shell">
        <div className="intel-section-header global-feed-toolbar">
          <div>
            <h3>All Political News</h3>
            <span className="feed-submeta">
              Showing {formatNumber(visibleStories.length)} of {formatNumber(filteredStories.length)} matches.
              Latest indexed date: {latestDate}
            </span>
          </div>
          <span className="feed-count-badge">{formatNumber(allStories.length)} archived</span>
        </div>

        <div className="intel-search-filter-bar global-search-row">
          <div className="intel-search-box">
            <Search size={15} style={{ color: "var(--text-muted)" }} />
            <input
              className="intel-search-input"
              value={query}
              onChange={(event) => {
                setQuery(event.target.value);
                setVisibleLimit(INITIAL_LIMIT);
              }}
              placeholder="Search title, source, politician, topic..."
            />
          </div>
          <div className="filter-label">
            <Filter size={14} />
            Source view
          </div>
        </div>

        <div className="category-pills-row global-category-row">
          {Object.entries(CATEGORY_CONFIG).map(([key, config]) => (
            <button
              key={key}
              type="button"
              className={`category-pill ${activeCategory === key ? "active" : ""}`}
              onClick={() => {
                setActiveCategory(key);
                setVisibleLimit(INITIAL_LIMIT);
              }}
              style={activeCategory === key ? { borderColor: config.color, color: config.color } : undefined}
            >
              <span>{config.label}</span>
              <span className="pill-count">{formatNumber(categoryCounts[key] || 0)}</span>
            </button>
          ))}
        </div>

        <div className="intel-news-scroll-container global-news-list">
          {visibleStories.map(story => {
            const config = CATEGORY_CONFIG[story.category] || CATEGORY_CONFIG.news;
            const party = partyById.get(story.partyId);
            const socialPlatform = story.platform ? story.platform.toUpperCase() : null;
            const clusteredEvent = eventByEvidenceId.get(story.id);
            return (
              <article key={story.id} className={`news-feed-card global-news-card ${story.isRumor ? "rumor-card" : ""}`}>
                <div className="news-card-header">
                  <div className="news-card-meta-left">
                    <span
                      className="news-category-chip"
                      style={{ color: config.color, borderColor: `${config.color}55`, background: `${config.color}10` }}
                    >
                      {story.isRumor && <AlertTriangle size={11} />}
                      {config.label}
                    </span>
                    {socialPlatform && <span className="platform-chip">{socialPlatform}</span>}
                    <span className="news-source-tag">{story.source || "Unknown source"}</span>
                    <span className="news-date-tag">{story.date || "Undated"}</span>
                  </div>
                  <span className="verification-pill">
                    {story.verificationStatus === "unverified_chatter" ? "Unverified" : "Reported"}
                  </span>
                </div>

                <h2 className="news-card-title">{story.title || "Untitled story"}</h2>
                {story.snippet && story.snippet !== story.title && (
                  <p className="global-news-snippet">{story.snippet}</p>
                )}

                <div className="global-card-footer">
                  <div className="story-subject">
                    {party && <span className="party-badge-dot" style={{ backgroundColor: party.color }} />}
                    <span>{story.politicianName}</span>
                    {story.engagement && (
                      <span className="engagement-mini">
                        {story.platform === "bluesky"
                          ? `${formatNumber(story.engagement.likes)} likes | ${formatNumber(story.engagement.reposts)} reposts`
                          : `${formatNumber(story.engagement.score)} score | ${formatNumber(story.engagement.comments)} comments`}
                      </span>
                    )}
                  </div>
                  <div className="story-actions">
                    {clusteredEvent && (
                      <button type="button" onClick={() => onSelectEvent?.(clusteredEvent.id)}>
                        <GitBranch size={12} />
                        Open event
                      </button>
                    )}
                    {!story.isGeneral && politicianById.has(story.politicianId) && (
                      <button type="button" onClick={() => onSelectPolitician?.(story.politicianId)}>
                        Open dossier
                      </button>
                    )}
                    {story.url && (
                      <a href={story.url} target="_blank" rel="noreferrer">
                        Source <ArrowUpRight size={12} />
                      </a>
                    )}
                  </div>
                </div>
              </article>
            );
          })}

          {filteredStories.length === 0 && (
            <div className="no-news-fallback">
              <Newspaper size={28} />
              <p>No stories match this filter.</p>
            </div>
          )}

          {visibleLimit < filteredStories.length && (
            <button
              type="button"
              className="load-more-intel-btn"
              onClick={() => setVisibleLimit(limit => limit + LOAD_STEP)}
            >
              Load {formatNumber(Math.min(LOAD_STEP, filteredStories.length - visibleLimit))} more stories
            </button>
          )}
        </div>
      </div>
    </section>
  );
}
