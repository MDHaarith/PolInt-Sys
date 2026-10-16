// Mobile builds bundle a trimmed snapshot and refresh from the public data branch.
export const isMobileBuild = import.meta.env.MODE === "mobile";
const remoteBase = (import.meta.env.VITE_DATA_BASE_URL ||
  "https://raw.githubusercontent.com/MDHaarith/PolInt-Sys/live-data").replace(/\/+$/, "");

export const intelFile = isMobileBuild ? "/scrapedIntel.mobile.json" : "/scrapedIntel.json";

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
