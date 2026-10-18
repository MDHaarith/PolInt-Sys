// One refresh on the phone: every collector job the server runs, a few at a
// time, read into stories with the server's fields, plus each source's health.

import { fetchBluesky, fetchDirectFeed, fetchGoogleNews, fetchReddit } from "./fetch.js";
import { collectConfig, sourceTier, storyImportance } from "./rules.js";

export const collectorJobs = ({ jobs } = collectConfig) => [
  ...jobs.googleNews.map(([query, politicianId]) => ({ collector: "rss", label: query, run: () => fetchGoogleNews(query, politicianId) })),
  ...jobs.directFeeds.map(([url, name]) => ({ collector: "rss_direct", label: name, run: () => fetchDirectFeed(url, name) })),
  ...jobs.social.map(([query, politicianId]) => ({ collector: "bluesky", label: query, run: () => fetchBluesky(query, politicianId, jobs.socialLimit) })),
  ...jobs.social.map(([query, politicianId]) => ({ collector: "reddit", label: query, run: () => fetchReddit(query, politicianId, jobs.socialLimit) })),
];

// The fields the published feed carries, so the app treats both alike.
export const toStory = (record) => {
  const story = {
    ...record,
    rawId: record.id,
    sourceTier: sourceTier(record.source, { isSocial: Boolean(record.platform) }),
    outletCount: 1,
    collectedOn: "phone",
  };
  return { ...story, importance: storyImportance(story) };
};

// Runs every job; a failing source is recorded and skipped, never fatal.
export const collect = async ({ jobs = collectorJobs(), concurrency = 6, onProgress } = {}) => {
  const startedAt = new Date().toISOString();
  const health = {};
  const byUrl = new Map();
  let done = 0;
  const queue = [...jobs];
  const worker = async () => {
    while (queue.length) {
      const job = queue.shift();
      const entry = (health[job.collector] ??= { total: 0, failed: 0, empty: 0, items: 0, failures: [] });
      entry.total += 1;
      try {
        const records = await job.run();
        if (!records.length) entry.empty += 1;
        entry.items += records.length;
        for (const record of records) if (!byUrl.has(record.url)) byUrl.set(record.url, toStory(record));
      } catch (error) {
        entry.failed += 1;
        entry.failures.push(`${job.label}: ${error.message || error}`);
      }
      done += 1;
      onProgress?.({ done, total: jobs.length });
    }
  };
  await Promise.all(Array.from({ length: Math.min(concurrency, jobs.length) }, worker));
  for (const entry of Object.values(health)) {
    entry.status = entry.failed === entry.total ? "unavailable" : entry.failed ? "degraded" : "ready";
  }
  return { stories: [...byUrl.values()], health, startedAt, finishedAt: new Date().toISOString() };
};

const headlineKey = (story) => `${(story.title || "").toLowerCase().replace(/[^\p{L}\p{N}]+/gu, " ").trim()}|${(story.source || "").toLowerCase()}`;

// The phone's stories that the published feed does not already have (same link,
// or same headline from the same outlet), newest first.
export const newStories = (published, collected) => {
  const urls = new Set(published.map((story) => story.url || story.canonicalUrl).filter(Boolean));
  const headlines = new Set(published.map(headlineKey));
  return collected
    .filter((story) => !urls.has(story.url) && !headlines.has(headlineKey(story)))
    .sort((a, b) => (b.publishedAt || "").localeCompare(a.publishedAt || ""));
};
