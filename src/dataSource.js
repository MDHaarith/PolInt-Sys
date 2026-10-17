// Mobile builds bundle a trimmed snapshot and refresh from the public data branch.
export const isMobileBuild = import.meta.env.MODE === "mobile";
const remoteBase = (import.meta.env.VITE_DATA_BASE_URL ||
  "https://raw.githubusercontent.com/MDHaarith/PolInt-Sys/live-data").replace(/\/+$/, "");

// The recent snapshot paints quickly; the web build then swaps in the full archive.
export const recentIntelFile = "/scrapedIntel.mobile.json";
export const fullIntelFile = isMobileBuild ? null : "/scrapedIntel.json";
export const statusFile = "/intelStatus.json";
export const storylinesFile = "/storylines.json";

const fetchJson = async (url, options) => {
  const response = await fetch(`${url}?t=${Date.now()}`, options);
  if (!response.ok) throw new Error(`HTTP ${response.status} for ${url}`);
  return response.json();
};

// The last download is kept on the phone, so a restart without signal shows
// it rather than the older copy bundled into the APK.
const CACHE_NAME = "polint-data-v1";
const snapshotTime = (value) =>
  Date.parse(value?.generatedAt || value?.coverageMeta?.lastSnapshotAt || "") || 0;

const saveCopy = async (path, value) => {
  try {
    const cache = await globalThis.caches?.open(CACHE_NAME);
    await cache?.put(path, new Response(JSON.stringify(value), { headers: { "Content-Type": "application/json" } }));
  } catch { /* Storage may be full or unavailable; the bundled copy still works. */ }
};

const savedCopy = async (path) => {
  try {
    const response = await globalThis.caches?.match(path, { cacheName: CACHE_NAME });
    return response ? await response.json() : null;
  } catch {
    return null;
  }
};

export const loadData = async (path) => {
  if (isMobileBuild && remoteBase) {
    try {
      const value = await fetchJson(`${remoteBase}${path}`, { signal: AbortSignal.timeout(20000) });
      void saveCopy(path, value);
      return value;
    } catch (error) {
      console.warn(`Remote ${path} unavailable, using the saved or bundled copy:`, error);
    }
    const [saved, bundled] = await Promise.all([savedCopy(path), fetchJson(path).catch(() => null)]);
    // After an app update the bundled copy can be newer than the saved download.
    const best = saved && (!bundled || snapshotTime(saved) >= snapshotTime(bundled)) ? saved : bundled;
    if (best) return best;
    throw new Error(`No copy of ${path} is available`);
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
