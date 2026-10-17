import { useMemo, useState, useRef } from "react";
import { textLanguage, shareEvidence, relativeTime, formatDateTime, verificationLabel } from "./dateLabels";
import { IntentTag, RivalryList, StorylineCard } from "./Storylines";
import {
  AlertTriangle,
  ArrowUpRight,
  GitBranch,
  Newspaper,
  Search,
  Share2,
  X,
} from "lucide-react";

const INITIAL_LIMIT = 120;
const LOAD_STEP = 120;
const DAY = 24 * 60 * 60 * 1000;

const RUMOR_PATTERN = /\b(?:rumou?rs?|speculation|buzz|unverified|leak(?:s|ed)?|viral|hashtags?)\b/i;

const CATEGORY_CONFIG = {
  all: { label: "All" },
  news: { label: "News" },
  election: { label: "Election" },
  investigation: { label: "Probe" },
  policy: { label: "Policy" },
  social_media: { label: "Social" },
  rumor: { label: "Unverified" },
};

const RANGE_CONFIG = {
  day: { label: "24 hours", span: DAY },
  week: { label: "7 days", span: 7 * DAY },
  all: { label: "All", span: Infinity },
};

const SORT_CONFIG = {
  top: { label: "Top" },
  latest: { label: "Latest" },
};

// Mirrors scripts/intelligence/quality.py.
const TIER_LABELS = {
  record: "Newspaper of record",
  established: "Established outlet",
  partisan: "Party-affiliated outlet",
  aggregator: "Aggregator or small site",
  social: "Social post",
};

// Importance (0-100, from source quality and corroboration) loses half its weight every 18 hours.
const HALF_LIFE_HOURS = 18;
const rankScore = (story, now) => {
  const ageHours = story.timestamp ? Math.max(0, (now - story.timestamp) / 3600000) : 24 * 30;
  return (story.importance || 15) * Math.pow(0.5, ageHours / HALF_LIFE_HOURS);
};

const EVENT_TYPE_LABELS = {
  fir: "FIR", court_hearing: "Court hearing", hospitalization: "Hospitalised",
};

const formatNumber = (value) => Number(value || 0).toLocaleString("en-IN");

const parseStoryDate = (value) => {
  if (!value) return 0;
  const parsed = Date.parse(value);
  return Number.isNaN(parsed) ? 0 : parsed;
};

const detectRumor = (story) =>
  Boolean(story.isRumor) || story.verificationStatus === "unverified_chatter"
  || (!story.platform && RUMOR_PATTERN.test(story.title || ""));

const getStoryKey = (story) => story.url || story.id || `${story.politicianId || "general"}-${story.title}`;

const dayLabel = (timestamp, now) => {
  if (!timestamp) return "Undated";
  const fmt = (value) => new Intl.DateTimeFormat("en-GB", { timeZone: "Asia/Kolkata", year: "numeric", month: "2-digit", day: "2-digit" }).format(value);
  const day = fmt(timestamp);
  if (day === fmt(now)) return "Today";
  if (day === fmt(now - DAY)) return "Yesterday";
  return new Intl.DateTimeFormat("en-GB", { timeZone: "Asia/Kolkata", weekday: "long", day: "numeric", month: "long" }).format(timestamp);
};

const eventTypeLabel = (type = "") =>
  EVENT_TYPE_LABELS[type] || type.replace(/_/g, " ").replace(/^./, letter => letter.toUpperCase());

const stripYearPrefix = (title = "") => title.replace(/^\d{4}:\s*/, "");

const HEALTH_LABELS = {
  ready: "Healthy", completed: "Healthy", degraded: "Partial", no_results: "No results",
  unavailable: "Offline", failed: "Failed",
};

export default function IntelligenceFeed({
  news = [],
  politicians = [],
  parties = [],
  events = [],
  storylines = null,
  onSelectPolitician,
  onSelectEvent,
  loading = false,
  loadError = false,
  onRefresh,
  refreshing = false,
  status = null,
  now,
}) {
  const [shareStatus, setShareStatus] = useState("");
  const [query, setQuery] = useState("");
  const [activeCategory, setActiveCategory] = useState("all");
  const [range, setRange] = useState("all");
  const [sort, setSort] = useState("top");
  const [personFilter, setPersonFilter] = useState(null);
  const [visibleLimit, setVisibleLimit] = useState(INITIAL_LIMIT);
  const touchStart = useRef(null);

  const politicianById = useMemo(() => new Map(politicians.map(p => [p.id, p])), [politicians]);
  const partyColor = useMemo(() => new Map(parties.map(party => [party.id, party.color])), [parties]);

  const eventByEvidenceId = useMemo(() => {
    const map = new Map();
    events.forEach(event => {
      (event.evidence || []).forEach(item => {
        if (item.id) map.set(item.id, event);
      });
    });
    return map;
  }, [events]);

  const storyMoves = storylines?.storyMoves;

  const allStories = useMemo(() => {
    const seen = new Set();
    return news
      .filter(story => {
        const key = getStoryKey(story);
        if (!key || seen.has(key)) return false;
        seen.add(key);
        return true;
      })
      .map(story => {
        const politician = politicianById.get(story.politicianId);
        const isGeneral = !story.politicianId || story.politicianId === "general" || !politician;
        const isRumor = detectRumor(story);
        return {
          ...story,
          id: story.id || getStoryKey(story),
          url: story.url || story.canonicalUrl,
          snippet: (story.snippet || "").replace(/\s+/g, " ").trim(),
          politician: isGeneral ? null : politician,
          category: isRumor && !story.platform ? "rumor" : (story.category || "news"),
          isRumor,
          timestamp: parseStoryDate(story.publishedAt || story.publishedAtRaw || story.date),
          event: eventByEvidenceId.get(story.rawId) || eventByEvidenceId.get(story.id),
          move: storyMoves?.[story.rawId] || storyMoves?.[story.id],
        };
      })
      .sort((a, b) => b.timestamp - a.timestamp);
  }, [news, politicianById, eventByEvidenceId, storyMoves]);

  const inRange = useMemo(() => {
    const span = RANGE_CONFIG[range].span;
    return span === Infinity ? allStories : allStories.filter(story => story.timestamp && now - story.timestamp <= span);
  }, [allStories, range, now]);

  const categoryCounts = useMemo(() => {
    const counts = { all: 0 };
    inRange.forEach(story => {
      if (personFilter && story.politician?.id !== personFilter) return;
      counts.all += 1;
      counts[story.category] = (counts[story.category] || 0) + 1;
    });
    return counts;
  }, [inRange, personFilter]);

  const filteredStories = useMemo(() => {
    const needle = query.trim().toLowerCase();
    return inRange.filter(story => {
      if (activeCategory !== "all" && story.category !== activeCategory) return false;
      if (personFilter && story.politician?.id !== personFilter) return false;
      if (!needle) return true;
      return `${story.title} ${story.snippet} ${story.source || ""} ${story.politician?.name || ""}`
        .toLowerCase().includes(needle);
    });
  }, [activeCategory, inRange, personFilter, query]);

  const orderedStories = useMemo(() => {
    if (sort !== "top") return filteredStories;
    const ranked = filteredStories.map(story => ({ story, score: rankScore(story, now) }))
      .sort((a, b) => b.score - a.score);
    // Each further story from the same storyline counts for less, so one row
    // does not fill the top of the feed.
    const seen = new Map();
    ranked.forEach(item => {
      const thread = item.story.move?.threadId;
      if (!thread) return;
      const count = seen.get(thread) || 0;
      item.score *= Math.pow(0.5, count);
      seen.set(thread, count + 1);
    });
    return ranked.sort((a, b) => b.score - a.score).map(item => item.story);
  }, [filteredStories, sort, now]);

  const groupedStories = useMemo(() => {
    if (sort === "top") return [{ label: "Ranked by importance", stories: orderedStories.slice(0, visibleLimit) }];
    const groups = [];
    orderedStories.slice(0, visibleLimit).forEach(story => {
      const label = dayLabel(story.timestamp, now);
      const group = groups[groups.length - 1];
      if (group?.label === label) group.stories.push(story);
      else groups.push({ label, stories: [story] });
    });
    return groups;
  }, [orderedStories, sort, visibleLimit, now]);

  // Rail: who and which outlets dominate the past week.
  const { topPeople, topSources, weekCount, dayCount } = useMemo(() => {
    const people = new Map();
    const sources = new Map();
    let week = 0;
    let day = 0;
    allStories.forEach(story => {
      if (!story.timestamp || now - story.timestamp > 7 * DAY) return;
      week += 1;
      if (now - story.timestamp <= DAY) day += 1;
      if (story.politician) people.set(story.politician.id, (people.get(story.politician.id) || 0) + 1);
      if (story.source && !story.platform) sources.set(story.source, (sources.get(story.source) || 0) + 1);
    });
    const rank = map => [...map.entries()].sort((a, b) => b[1] - a[1]).slice(0, 8);
    return { topPeople: rank(people), topSources: rank(sources), weekCount: week, dayCount: day };
  }, [allStories, now]);

  const developing = useMemo(() => events
    .filter(event => !event.isCurated && (event.independentSourceCount || 0) >= 2 && event.occurredAt
      && now - Date.parse(event.occurredAt) <= 4 * DAY)
    .sort((a, b) => (b.occurredAt || "").localeCompare(a.occurredAt || "")
      || (b.independentSourceCount || 0) - (a.independentSourceCount || 0))
    .slice(0, 4), [events, now]);

  const threads = useMemo(() => (storylines?.threads || [])
    .filter(thread => !personFilter || thread.participants.some(person => person.id === personFilter))
    .slice(0, 3), [storylines, personFilter]);
  const isKnown = (id) => politicianById.has(id);

  const resetLimit = () => setVisibleLimit(INITIAL_LIMIT);
  const filtersActive = query || activeCategory !== "all" || personFilter || range !== "all";
  const personName = personFilter ? politicianById.get(personFilter)?.name : null;
  const health = (status?.collectorHealth || []).filter(item => item.items_seen > 0 || item.health?.status !== "unavailable");

  return (
    <section className="briefing"
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
      <header className="briefing-head">
        <div>
          <p className="workspace-eyebrow">Tamil Nadu political desk</p>
          <h1>Daily briefing</h1>
        </div>
        <dl className="briefing-stats">
          <div><dt>Last 24 hours</dt><dd>{formatNumber(dayCount)}</dd></div>
          <div><dt>This week</dt><dd>{formatNumber(weekCount)}</dd></div>
          <div><dt>Archive</dt><dd>{formatNumber(status?.rawItemCount || allStories.length)}</dd></div>
        </dl>
      </header>

      {shareStatus && <p role="status" className="share-status">{shareStatus}</p>}

      {threads.length > 0 && (
        <section className="storylines" aria-labelledby="storylines-heading">
          <div className="section-head">
            <h2 id="storylines-heading">Connected storylines</h2>
            <p>Related moves chained across days and people, with the likely intent behind each. Intent is inferred, not reported.</p>
          </div>
          <div className="storyline-grid">
            {threads.map(thread => (
              <StorylineCard key={thread.id} thread={thread} now={now} isKnown={isKnown} preview={2}
                onPerson={(id) => { if (isKnown(id)) { setPersonFilter(id); resetLimit(); } }} />
            ))}
          </div>
        </section>
      )}

      {threads.length === 0 && developing.length > 0 && (
        <section className="developing" aria-labelledby="developing-heading">
          <h2 id="developing-heading">Developing stories</h2>
          <ol className="developing-grid">
            {developing.map(event => {
              const person = politicianById.get(event.politicianId);
              return (
                <li key={event.id}>
                  <button type="button" className="developing-card" onClick={() => onSelectEvent?.(event.id)}>
                    <span className="developing-kicker">
                      {eventTypeLabel(event.eventType)} · {formatNumber(event.independentSourceCount)} outlets
                    </span>
                    <span lang={textLanguage(event.title)} className="developing-title">{stripYearPrefix(event.title)}</span>
                    <span className="developing-meta">
                      {person && <><i className="party-dot" style={{ background: partyColor.get(person.party) }} />{person.name} · </>}
                      {event.occurredAt.length > 10 ? relativeTime(event.occurredAt, now) : dayLabel(Date.parse(event.occurredAt), now)}
                    </span>
                  </button>
                </li>
              );
            })}
          </ol>
        </section>
      )}

      <div className="briefing-layout">
        <div className="briefing-main">
          <div className="feed-toolbar">
            <label className="feed-search">
              <Search size={16} aria-hidden="true" />
              <input
                type="search"
                aria-label="Search stories"
                value={query}
                onChange={(event) => { setQuery(event.target.value); resetLimit(); }}
                placeholder="Search headlines, outlets, people…"
              />
            </label>
            <div className="segmented" role="group" aria-label="Order">
              {Object.entries(SORT_CONFIG).map(([key, config]) => (
                <button key={key} type="button" aria-pressed={sort === key} onClick={() => { setSort(key); resetLimit(); }}>
                  {config.label}
                </button>
              ))}
            </div>
            <div className="segmented" role="group" aria-label="Time range">
              {Object.entries(RANGE_CONFIG).map(([key, config]) => (
                <button key={key} type="button" aria-pressed={range === key} onClick={() => { setRange(key); resetLimit(); }}>
                  {config.label}
                </button>
              ))}
            </div>
          </div>
          <div className="feed-chips" role="group" aria-label="Story type">
            {Object.entries(CATEGORY_CONFIG).map(([key, config]) => (
              <button
                key={key}
                type="button"
                className="chip"
                aria-pressed={activeCategory === key}
                onClick={() => { setActiveCategory(key); resetLimit(); }}
              >
                {config.label}<span className="chip-count">{formatNumber(categoryCounts[key] || 0)}</span>
              </button>
            ))}
            {personName && (
              <button type="button" className="chip chip-person" aria-pressed="true" onClick={() => setPersonFilter(null)} aria-label={`Remove filter: ${personName}`}>
                {personName}<X size={14} aria-hidden="true" />
              </button>
            )}
          </div>

          <p className="feed-count" aria-live="polite">
            {formatNumber(filteredStories.length)} {filteredStories.length === 1 ? "story" : "stories"}
            {filtersActive ? " match" : ""}
            {filtersActive && (
              <button type="button" className="link-button" onClick={() => { setQuery(""); setActiveCategory("all"); setPersonFilter(null); setRange("all"); resetLimit(); }}>
                Clear filters
              </button>
            )}
          </p>

          <div className="story-list" aria-busy={loading}>
            {loading && allStories.length === 0 && (
              <div className="feed-loading-state" role="status">
                <span>Loading the briefing…</span>
                {[0, 1, 2].map(item => <div className="story-skeleton" key={item} aria-hidden="true"><i /><i /><i /></div>)}
              </div>
            )}

            {groupedStories.map(group => (
              <section key={group.label} className="day-group" aria-label={group.label}>
                <h3 className={`day-heading ${sort === "top" ? "visually-hidden" : ""}`}>{group.label}</h3>
                {group.stories.map(story => (
                  <StoryRow
                    key={story.id}
                    story={story}
                    now={now}
                    partyColor={partyColor}
                    onPerson={(id) => { setPersonFilter(id); resetLimit(); }}
                    onSelectEvent={onSelectEvent}
                    onShare={async () => setShareStatus(await shareEvidence(story))}
                  />
                ))}
              </section>
            ))}

            {!loading && filteredStories.length === 0 && (
              <div className="no-news-fallback">
                <Newspaper size={28} />
                <h3>{loadError ? "Feed unavailable" : allStories.length ? "No matching stories" : "Your briefing is getting ready"}</h3>
                <p>{loadError ? "We couldn’t load the feed. Check your connection and try again." : allStories.length ? "Try a wider time range or clear your filters." : "Refresh to check for the latest coverage."}</p>
                {allStories.length
                  ? <button type="button" className="load-more-intel-btn" onClick={() => { setQuery(""); setActiveCategory("all"); setPersonFilter(null); setRange("all"); }}>Clear filters</button>
                  : <button type="button" className="load-more-intel-btn" disabled={refreshing} onClick={onRefresh}>Try again</button>}
              </div>
            )}

            {visibleLimit < filteredStories.length && (
              <button type="button" className="load-more-intel-btn" onClick={() => setVisibleLimit(limit => limit + LOAD_STEP)}>
                Show {formatNumber(Math.min(LOAD_STEP, filteredStories.length - visibleLimit))} more
              </button>
            )}
          </div>
        </div>

        <aside className="briefing-rail" aria-label="Coverage summary">
          {topPeople.length > 0 && (
            <section className="rail-card">
              <h2>In the news this week</h2>
              <ol className="rank-list">
                {topPeople.map(([id, count]) => {
                  const person = politicianById.get(id);
                  return (
                    <li key={id}>
                      <button type="button" aria-pressed={personFilter === id} onClick={() => { setPersonFilter(personFilter === id ? null : id); resetLimit(); }}>
                        <i className="party-dot" style={{ background: partyColor.get(person?.party) }} />
                        <span lang={textLanguage(person?.name)} className="rank-name">{person?.name || id}</span>
                        <span className="rank-count">{formatNumber(count)}</span>
                        <span className="rank-bar" style={{ "--share": count / topPeople[0][1] }} aria-hidden="true" />
                      </button>
                      <button type="button" className="rank-link" onClick={() => onSelectPolitician?.(id)} aria-label={`Open ${person?.name || id} dossier`}>
                        <ArrowUpRight size={14} aria-hidden="true" />
                      </button>
                    </li>
                  );
                })}
              </ol>
            </section>
          )}
          <RivalryList relations={storylines?.relations} isKnown={isKnown}
            onPerson={(id) => { setPersonFilter(id); resetLimit(); }} />
          {topSources.length > 0 && (
            <section className="rail-card">
              <h2>Most active outlets</h2>
              <ol className="rank-list rank-list-plain">
                {topSources.map(([source, count]) => (
                  <li key={source}>
                    <button type="button" onClick={() => { setQuery(source); resetLimit(); }}>
                      <span className="rank-name">{source}</span>
                      <span className="rank-count">{formatNumber(count)}</span>
                    </button>
                  </li>
                ))}
              </ol>
            </section>
          )}
          {health.length > 0 && (
            <section className="rail-card">
              <h2>Collection health</h2>
              <ul className="health-list">
                {health.map(item => {
                  const state = item.health?.status || item.status;
                  return (
                    <li key={item.collector} data-state={state}>
                      <i aria-hidden="true" />
                      <span>{item.collector.replace(/_/g, " ")}</span>
                      <span className="health-detail">{HEALTH_LABELS[state] || state} · {formatNumber(item.items_seen)} seen</span>
                    </li>
                  );
                })}
              </ul>
              {status?.lastRunAt && <p className="rail-note">Last collected {relativeTime(status.lastRunAt, now)}</p>}
            </section>
          )}
        </aside>
      </div>
    </section>
  );
}

function StoryRow({ story, now, partyColor, onPerson, onSelectEvent, onShare }) {
  const outlets = story.alsoReportedBy || [];
  const platform = story.platform ? story.platform.charAt(0).toUpperCase() + story.platform.slice(1) : null;
  const label = CATEGORY_CONFIG[story.category]?.label || "News";
  return (
    <article className={`story-row ${story.isRumor ? "is-unverified" : ""}`}>
      <div className="story-body">
        <p className="story-kicker">
          <span className={`story-tag tag-${story.category}`}>{platform || label}</span>
          <span className="story-source" data-tier={story.sourceTier} title={TIER_LABELS[story.sourceTier]}>
            {story.source || "Unknown source"}
          </span>
          {story.sourceAffiliation && (
            <span className="story-flag" title="This outlet is owned by or speaks for a party">
              {story.sourceAffiliation.toUpperCase()}-affiliated
            </span>
          )}
          {story.timestamp > 0 && (
            <time dateTime={new Date(story.timestamp).toISOString()} title={formatDateTime(story.timestamp)}>
              {relativeTime(new Date(story.timestamp).toISOString(), now)}
            </time>
          )}
          {story.isRumor && (
            <span className="story-flag" title={verificationLabel(story.verificationStatus)}>
              <AlertTriangle size={12} aria-hidden="true" />Unverified
            </span>
          )}
        </p>
        <h4 lang={textLanguage(story.title)} className="story-title">
          {story.url ? <a href={story.url} target="_blank" rel="noreferrer">{story.title || "Untitled story"}</a> : (story.title || "Untitled story")}
        </h4>
        {story.snippet && <p lang={textLanguage(story.snippet)} className="story-snippet">{story.snippet}</p>}
        {story.move && story.move.confidence !== "low" && (
          <p className="story-move">
            {story.move.actor !== story.politician?.id && <span className="story-move-actor">{story.move.actorName}</span>}
            <IntentTag move={story.move} />
          </p>
        )}
        <div className="story-meta">
          {story.politician && (
            <button type="button" className="person-chip" onClick={() => onPerson(story.politician.id)}>
              <i className="party-dot" style={{ background: partyColor.get(story.politician.party) }} />
              <span lang={textLanguage(story.politician.name)}>{story.politician.name}</span>
            </button>
          )}
          {(story.outletCount || 1) > 1 && (
            <span className="story-outlets" title={outlets.map(item => item.source).join(", ")}>
              +{story.outletCount - 1} {story.outletCount === 2 ? "outlet" : "outlets"}
            </span>
          )}
          {!story.outletCount && outlets.length > 0 && (
            <span className="story-outlets" title={outlets.map(item => item.source).join(", ")}>
              +{outlets.length} {outlets.length === 1 ? "outlet" : "outlets"}
            </span>
          )}
          {story.event && (
            <button type="button" className="meta-button" onClick={() => onSelectEvent?.(story.event.id)}>
              <GitBranch size={13} aria-hidden="true" />Timeline
            </button>
          )}
          {story.engagement && (
            <span className="story-engagement">
              {story.platform === "bluesky"
                ? `${formatNumber(story.engagement.likes)} likes · ${formatNumber(story.engagement.reposts)} reposts`
                : `${formatNumber(story.engagement.score)} points · ${formatNumber(story.engagement.comments)} comments`}
            </span>
          )}
          {story.url && (
            <button type="button" className="meta-button meta-icon" onClick={onShare} aria-label="Share with source">
              <Share2 size={14} aria-hidden="true" />
            </button>
          )}
        </div>
      </div>
      {story.imageUrl && (
        <img className="story-thumb" src={story.imageUrl} alt="" loading="lazy" decoding="async" referrerPolicy="no-referrer"
          onError={event => { event.currentTarget.hidden = true; }} />
      )}
    </article>
  );
}
