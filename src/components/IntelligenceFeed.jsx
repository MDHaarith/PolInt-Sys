import { useMemo, useState, useRef } from "react";
import { textLanguage, shareEvidence } from "./dateLabels";
import Provenance from "./Provenance";
import {
  AlertTriangle,
  ArrowUpRight,
  Filter,
  GitBranch,
  Newspaper,
  Search,
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
  all: { label: "All" },
  news: { label: "News" },
  social_media: { label: "Social" },
  investigation: { label: "Probe" },
  election: { label: "Election" },
  policy: { label: "Policy" },
  rumor: { label: "Rumor Watch" },
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
  events = [],
  onSelectPolitician,
  onSelectEvent,
  loading = false,
  loadError = false,
  onRefresh,
  refreshing = false,
}) {
  const [shareStatus, setShareStatus] = useState("");
  const [query, setQuery] = useState("");
  const [activeCategory, setActiveCategory] = useState("all");
  const [visibleLimit, setVisibleLimit] = useState(INITIAL_LIMIT);
  const touchStart = useRef(null);

  const politicianById = useMemo(() => {
    const map = new Map();
    politicians.forEach(p => map.set(p.id, p));
    return map;
  }, [politicians]);

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

  const filteredStories = useMemo(() => {
    const needle = query.trim().toLowerCase();
    const matches = allStories.filter(story => {
      if (activeCategory !== "all" && story.category !== activeCategory) return false;
      if (!needle) return true;
      const searchable = `${story.title || ""} ${story.snippet || ""} ${story.source || ""} ${story.politicianName || ""}`.toLowerCase();
      return searchable.includes(needle);
    });
    // The first card is styled as the lead story; never lead with an unverified social post.
    const lead = matches.findIndex(story => !story.isRumor && !story.platform);
    return lead > 0 ? [matches[lead], ...matches.slice(0, lead), ...matches.slice(lead + 1)] : matches;
  }, [activeCategory, allStories, query]);

  const visibleStories = filteredStories.slice(0, visibleLimit);
  const sourceCount = useMemo(() => new Set(allStories.map(story => story.source).filter(Boolean)).size, [allStories]);

  return (
    <section className="global-intel-workspace"
      onTouchStart={event => {
        touchStart.current = event.currentTarget.closest(".workspace-content-pane").scrollTop <= 0 && event.touches.length === 1
          ? { x: event.touches[0].clientX, y: event.touches[0].clientY } : null;
      }}
      onTouchEnd={event => {
        const start = touchStart.current;
        const end = event.changedTouches[0];
        touchStart.current = null;
        if (start && end && !refreshing && event.currentTarget.closest(".workspace-content-pane").scrollTop <= 0
          && end.clientY - start.y > 90 && Math.abs(end.clientX - start.x) < 50) onRefresh?.();
      }}
    >
      <div className="global-intel-header">
        <div>
          <div className="workspace-eyebrow">The Tamil Nadu edition</div>
          <h1>The state of the story</h1>
          <p>
            Reporting, policy and public signals from Tamil Nadu.
          </p>
        </div>

      </div>

      {shareStatus && <p role="status" className="share-status">{shareStatus}</p>}
      <div className="global-feed-shell">
        <div className="intel-section-header global-feed-toolbar">
          <div>
            <h3>Latest coverage</h3>
            <span className="feed-submeta">
              {formatNumber(filteredStories.length)} stories{query || activeCategory !== "all" ? " match your filters" : " in the archive"}
               · {formatNumber(sourceCount)} sources
            </span>
          </div>
          
        </div>

        <div className="feed-controls">
        <div className="intel-search-filter-bar global-search-row">
          <div className="intel-search-box">
            <Search size={15} style={{ color: "var(--text-muted)" }} />
            <input
              className="intel-search-input"
              type="search"
              aria-label="Search intelligence stories"
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
              aria-pressed={activeCategory === key}
              onClick={() => {
                setActiveCategory(key);
                setVisibleLimit(INITIAL_LIMIT);
              }}
            >
              <span>{config.label}</span>

            </button>
          ))}
        </div>
        </div>

        <div className="intel-news-scroll-container global-news-list" aria-busy={loading}>
          {loading && allStories.length === 0 && (
            <div className="feed-loading-state" role="status">
              <span>Loading intelligence…</span>
              {[0, 1, 2].map(item => <div className="story-skeleton" key={item} aria-hidden="true"><i /><i /><i /></div>)}
            </div>
          )}
          {visibleStories.map(story => {
            const storyUrl = story.url || story.canonicalUrl;
            const config = CATEGORY_CONFIG[story.category] || CATEGORY_CONFIG.news;
            const socialPlatform = story.platform ? story.platform.charAt(0).toUpperCase() + story.platform.slice(1) : null;
            const clusteredEvent = eventByEvidenceId.get(story.id);
            return (
              <article key={story.id} className={`news-feed-card global-news-card ${story.isRumor ? "rumor-card" : ""}`}>
                <div className="news-card-header">
                  <span className="news-category-chip">{story.isRumor && <AlertTriangle size={13} />}{config.label}{socialPlatform ? ` · ${socialPlatform}` : ""}</span>
                  <Provenance item={story} date={story.timestamp ? new Date(story.timestamp).toISOString() : undefined} />
                </div>

                <h2 lang={textLanguage(story.title)} className="news-card-title">{storyUrl ? <a href={storyUrl} target="_blank" rel="noreferrer">{story.title || "Untitled story"}</a> : (story.title || "Untitled story")}</h2>
                {story.snippet && story.snippet !== story.title && (
                  <p lang={textLanguage(story.snippet)} className="global-news-snippet">{story.snippet}</p>
                )}

                <div className="global-card-footer">
                  <div className="story-subject">
                    <span lang={textLanguage(story.politicianName)}>{story.politicianName}</span>
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
                    {(story.url || story.canonicalUrl) && <button type="button" onClick={async () => setShareStatus(await shareEvidence(story))}>Share with source</button>}
                    {storyUrl && (
                      <a href={storyUrl} target="_blank" rel="noreferrer">
                        Source <ArrowUpRight size={12} />
                      </a>
                    )}
                  </div>
                </div>
              </article>
            );
          })}

          {!loading && filteredStories.length === 0 && (
            <div className="no-news-fallback">
              <Newspaper size={28} />
              <h3>{loadError ? "Feed unavailable" : allStories.length ? "No matching stories" : "Your intelligence feed is getting ready"}</h3>
              <p>{loadError ? "We couldn’t load the feed. Check your connection and try again." : allStories.length ? "Try another topic or clear your filters." : "Refresh to check for the latest coverage."}</p>
              {allStories.length ? <button type="button" className="load-more-intel-btn" onClick={() => { setQuery(""); setActiveCategory("all"); }}>Clear filters</button> : <button type="button" className="load-more-intel-btn" disabled={refreshing} onClick={onRefresh}>Try again</button>}
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
