// Mobile builds bundle a trimmed snapshot and refresh from the public data branch.
export const isMobileBuild = import.meta.env.MODE === "mobile";
const remoteBase = (import.meta.env.VITE_DATA_BASE_URL ||
  "https://raw.githubusercontent.com/MDHaarith/PolInt-Sys/live-data").replace(/\/+$/, "");

// The recent snapshot paints quickly; the web build then swaps in the full archive.
export const recentIntelFile = "/scrapedIntel.mobile.json";
export const fullIntelFile = isMobileBuild ? null : "/scrapedIntel.json";
export const statusFile = "/intelStatus.json";

const fetchJson = async (url, options) => {
  const response = await fetch(`${url}?t=${Date.now()}`, options);
  if (!response.ok) throw new Error(`HTTP ${response.status} for ${url}`);
  return response.json();
};

export const loadData = async (path) => {
  if (isMobileBuild && remoteBase) {
    try {
      return await fetchJson(`${remoteBase}${path}`, { signal: AbortSignal.timeout(20000) });
    } catch (error) {
      console.warn(`Remote ${path} unavailable, using bundled copy:`, error);
    }
  }
  return fetchJson(path);
};

// Snapshots written before the pipeline flattened its records nest the
// collector's fields under rawMetadata; lift them so every view reads one shape.
export const normalizeStory = (item) => {
  if (!item?.rawMetadata) return item;
  const { rawMetadata, ...stored } = item;
  return {
    ...stored,
    ...rawMetadata,
    url: rawMetadata.url || stored.canonicalUrl,
    publishedAt: rawMetadata.publishedAtRaw || stored.publishedAtRaw || rawMetadata.date,
    snippet: /^News coverage regarding /.test(rawMetadata.snippet || "") ? "" : rawMetadata.snippet,
  };
};
