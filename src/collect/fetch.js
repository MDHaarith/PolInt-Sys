// The server's collectors (scripts/scrape_political_intel.py), run on the phone:
// Google News searches, the trusted outlets' own feeds, Bluesky and Reddit.
// Records have the fields the server writes, so the feed treats them alike.
// In the app, requests go through Android's own HTTP stack (CapacitorHttp),
// which news sites accept and the WebView's cross-site rules do not block;
// elsewhere (tests, the web build) the standard fetch is used.

import { Capacitor, CapacitorHttp } from "@capacitor/core";
import { classifyCategory, collectConfig, isRelevant, isTamil, reportsHearsay, resolvePolitician } from "./rules.js";

const USER_AGENT = "Mozilla/5.0 (Linux; Android 14) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/130.0 Mobile Safari/537.36";
const native = () => Capacitor.isNativePlatform();
const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

export class HttpError extends Error {
  constructor(status, url) {
    super(`HTTP ${status}`);
    this.status = status;
    this.url = url;
  }
}

// How a request is made: Android's HTTP stack in the app, fetch elsewhere.
// Tests and tools can swap it (Node's fetch is refused by some news sites).
const defaultTransport = async (url, headers, timeout) => {
  if (native()) {
    const response = await CapacitorHttp.get({ url, headers, responseType: "text", connectTimeout: timeout, readTimeout: timeout });
    return { status: response.status, body: typeof response.data === "string" ? response.data : JSON.stringify(response.data) };
  }
  const response = await fetch(url, { headers, signal: AbortSignal.timeout(timeout) });
  return { status: response.status, body: await response.text() };
};
let transport = defaultTransport;
export const setTransport = (next) => { transport = next || defaultTransport; };

// Retries rate limits and server errors as http_get does; other failures are final.
export const httpGet = async (url, { json = false, timeout = 12000, attempts = 3 } = {}) => {
  const headers = { "User-Agent": USER_AGENT, Accept: json ? "application/json" : "application/rss+xml, application/xml, text/xml, */*" };
  for (let attempt = 0; attempt < attempts; attempt += 1) {
    let status;
    let body;
    try {
      ({ status, body } = await transport(url, headers, timeout));
    } catch (error) {
      if (attempt === attempts - 1) throw error;
      await sleep(2 ** attempt * 1000);
      continue;
    }
    if (status >= 200 && status < 300) return json ? JSON.parse(body) : body;
    if ((status !== 429 && status < 500) || attempt === attempts - 1) throw new HttpError(status, url);
    await sleep(2 ** attempt * 1000);
  }
  throw new Error("unreachable");
};

// ── text helpers (clean_html, summarize, rss_snippet) ────────────────
const ENTITIES = { amp: "&", lt: "<", gt: ">", quot: '"', apos: "'", nbsp: " ", rsquo: "’", lsquo: "‘", rdquo: "”", ldquo: "“", ndash: "–", mdash: "—", hellip: "…", rupee: "₹" };
export const unescapeHtml = (text) => text.replace(/&(#x[0-9a-f]+|#\d+|[a-z]+);/gi, (whole, code) => {
  if (code[0] === "#") {
    const value = code[1].toLowerCase() === "x" ? parseInt(code.slice(2), 16) : parseInt(code.slice(1), 10);
    return Number.isFinite(value) ? String.fromCodePoint(value) : whole;
  }
  return ENTITIES[code.toLowerCase()] ?? whole;
});

export const cleanHtml = (text) => (text ? unescapeHtml(text.replace(/<[\s\S]*?>/g, " ")).replace(/ /g, " ").replace(/\s+/g, " ").trim() : "");

export const summarize = (text, limit = 320) => {
  const cleaned = cleanHtml(text);
  if (cleaned.length <= limit) return cleaned;
  const cut = cleaned.slice(0, limit);
  const space = cut.lastIndexOf(" ");
  return `${(space > 0 ? cut.slice(0, space) : cut).replace(/[ ,;:]+$/, "")}…`;
};

const comparable = (text) => (text || "").toLowerCase().replace(/[^\p{L}\p{N}]+/gu, " ").trim();

// Real summary text, or "" when the feed only repeats the headline.
export const rssSnippet = (description, encoded, title, source) => {
  for (const candidate of [description, encoded]) {
    let text = cleanHtml(candidate);
    if (source && text.endsWith(source)) text = text.slice(0, -source.length).trim();
    if (text.length < 25) continue;
    const normalised = comparable(text);
    const headline = comparable(title);
    if (headline && (normalised === headline || (normalised.startsWith(headline) && normalised.length - headline.length < 25))) continue;
    return summarize(text);
  }
  return "";
};

// ── RSS ─────────────────────────────────────────────────────────────
// Element text as an XML parser returns it: CDATA as written, otherwise with
// XML entities decoded (Google News escapes the HTML of its descriptions).
const XML_ENTITIES = { lt: "<", gt: ">", amp: "&", quot: '"', apos: "'" };
const xmlText = (value) => {
  const cdata = (value || "").match(/^\s*<!\[CDATA\[([\s\S]*?)\]\]>\s*$/);
  if (cdata) return cdata[1];
  return (value || "").replace(/&(lt|gt|amp|quot|apos|#x[0-9a-f]+|#\d+);/gi, (whole, code) => {
    if (code[0] !== "#") return XML_ENTITIES[code.toLowerCase()];
    const point = code[1].toLowerCase() === "x" ? parseInt(code.slice(2), 16) : parseInt(code.slice(1), 10);
    return Number.isFinite(point) ? String.fromCodePoint(point) : whole;
  });
};
const element = (xml, tag) => {
  const match = xml.match(new RegExp(`<${tag}(?:\\s[^>]*)?>([\\s\\S]*?)</${tag}>`, "i"));
  return match ? xmlText(match[1]) : "";
};
const attributes = (xml, tag) => [...xml.matchAll(new RegExp(`<${tag}\\b([^>]*?)/?>`, "gi"))].map((match) =>
  Object.fromEntries([...match[1].matchAll(/([\w:-]+)\s*=\s*"([^"]*)"/g)].map(([, key, value]) => [key, unescapeHtml(value)])));

export const parseRssItems = (xml) => [...xml.matchAll(/<item\b[\s\S]*?<\/item>/gi)].slice(0, 100).map(([item]) => {
  const media = [...attributes(item, "media:thumbnail"), ...attributes(item, "media:content"), ...attributes(item, "enclosure")];
  const image = media.find((entry) => entry.url?.startsWith("https://") && (entry.medium || entry.type || "image").includes("image"));
  const audio = [...attributes(item, "enclosure"), ...attributes(item, "media:content")]
    .find((entry) => entry.url?.startsWith("https://") && (entry.type || entry.medium || "").startsWith("audio"));
  return {
    title: cleanHtml(element(item, "title")),
    link: element(item, "link").trim(),
    pubDate: element(item, "pubDate").trim(),
    description: element(item, "description"),
    encoded: element(item, "content:encoded"),
    source: cleanHtml(element(item, "source")),
    author: cleanHtml(element(item, "dc:creator")),
    imageUrl: image?.url,
    audioUrl: audio?.url,
  };
});

// A short stable id (FNV-1a), so the same link is the same story on every refresh.
export const stableId = (prefix, text) => {
  let hash = 0xcbf29ce484222325n;
  for (const byte of new TextEncoder().encode(text)) hash = BigInt.asUintN(64, (hash ^ BigInt(byte)) * 0x100000001b3n);
  return `${prefix}_${hash.toString(16).padStart(16, "0").slice(0, 12)}`;
};

const isoDate = (value) => {
  const time = Date.parse(value || "");
  return Number.isFinite(time) ? new Date(time).toISOString().replace(/\.\d{3}Z$/, "Z") : "";
};
const nowIso = () => new Date().toISOString().replace(/\.\d{3}Z$/, "Z");

export const googleNewsUrl = (query) => {
  const language = isTamil(query) ? "ta" : "en";
  const parameters = new URLSearchParams({ q: query, hl: language === "ta" ? "ta" : "en-IN", gl: "IN", ceid: `IN:${language}` });
  return `https://news.google.com/rss/search?${parameters}`;
};

// fetch_rss: a Google News search (feedUrl empty) or a publisher's own feed.
export const rssRecords = (xml, { query, politicianId = "general", feedUrl = null, sourceName = null }) => {
  const regional = new Set(collectConfig.jobs.regionalFeeds);
  const records = [];
  for (const item of parseRssItems(xml)) {
    if (!item.title || !/^https?:\/\//.test(item.link)) continue;
    const source = item.source || sourceName || "Google News";
    const parts = item.title.split(" - ");
    const title = !feedUrl && parts.length > 1 ? parts.slice(0, -1).join(" - ") : item.title;
    const snippet = rssSnippet(item.description, item.encoded, title, source);
    const storyText = `${title} ${snippet}`;
    if (feedUrl && !isRelevant(storyText, { requireTamilNadu: regional.has(feedUrl) })) continue;
    const hearsay = reportsHearsay(storyText);
    const record = {
      id: stableId("phone", item.link),
      politicianId: resolvePolitician(storyText, politicianId) || "general",
      title,
      source,
      publishedAt: isoDate(item.pubDate),
      snippet,
      url: item.link,
      category: classifyCategory(storyText),
      sourceType: feedUrl ? "publisher_rss" : "google_news_rss",
      query,
      retrievedAt: nowIso(),
      isRumor: hearsay,
      verificationStatus: hearsay ? "unverified_chatter" : "source_reported",
      language: isTamil(title) ? "ta" : "en",
    };
    if (item.imageUrl) record.imageUrl = item.imageUrl;
    if (item.audioUrl) record.audioUrl = item.audioUrl;
    if (item.author) record.author = { displayName: item.author };
    records.push(record);
  }
  return records;
};

export const fetchGoogleNews = async (query, politicianId) => rssRecords(await httpGet(googleNewsUrl(query)), { query, politicianId });
export const fetchDirectFeed = async (url, sourceName) => rssRecords(await httpGet(url), { query: sourceName, feedUrl: url, sourceName });

// ── Bluesky and Reddit (social: shown in the feed, never used as evidence) ──
const social = (text, record) => ({
  ...record,
  category: "social_media",
  retrievedAt: nowIso(),
  isRumor: true,
  verificationStatus: "unverified_chatter",
  language: isTamil(text) ? "ta" : "en",
});

export const blueskyRecords = (payload, query, politicianId) => (payload.posts || []).flatMap((post) => {
  const text = cleanHtml(post.record?.text || "");
  if (!text || !isRelevant(text)) return [];
  const author = post.author || {};
  const handle = author.handle || author.did || "unknown";
  const postId = (post.uri || "").includes("/app.bsky.feed.post/") ? post.uri.split("/").pop() : null;
  return [social(text, {
    id: stableId("bsky", post.uri || post.cid || text),
    politicianId: resolvePolitician(text, politicianId) || "general",
    title: text.length > 160 ? `${text.slice(0, 160)}...` : text,
    source: `Bluesky @${handle}`,
    publishedAt: isoDate(post.record?.createdAt || post.indexedAt),
    snippet: text,
    url: postId ? `https://bsky.app/profile/${handle}/post/${postId}` : `https://bsky.app/profile/${handle}`,
    sourceType: "bluesky_search",
    platform: "bluesky",
    author: { displayName: author.displayName || handle, handle, did: author.did },
    engagement: { likes: post.likeCount || 0, replies: post.replyCount || 0, reposts: post.repostCount || 0, quotes: post.quoteCount || 0 },
    query,
  })];
});

export const redditRecord = (data, query, politicianId) => {
  const title = cleanHtml(data.title || "");
  if (!title) return null;
  const selftext = cleanHtml(data.selftext || "");
  if (!isRelevant(`${title} ${selftext}`)) return null;
  const permalink = data.permalink || "";
  const created = data.created_utc || data.created;
  return social(title, {
    id: stableId("reddit", String(data.id || permalink || title)),
    politicianId: resolvePolitician(`${title} ${selftext}`, politicianId) || "general",
    title,
    source: `Reddit ${data.subreddit_name_prefixed || `r/${data.subreddit || "reddit"}`}`,
    publishedAt: created ? new Date(created * 1000).toISOString().replace(/\.\d{3}Z$/, "Z") : "",
    snippet: selftext ? summarize(selftext) : "",
    url: permalink.startsWith("/") ? `https://www.reddit.com${permalink}` : data.url || "",
    sourceType: "reddit_search",
    platform: "reddit",
    author: { displayName: data.author || "reddit user", handle: data.author },
    engagement: { score: data.score || 0, comments: data.num_comments || 0, upvoteRatio: data.upvote_ratio },
    query,
  });
};

export const fetchBluesky = async (query, politicianId, limit) => blueskyRecords(
  await httpGet(`https://api.bsky.app/xrpc/app.bsky.feed.searchPosts?q=${encodeURIComponent(query)}&sort=latest&limit=${limit}`, { json: true }),
  query, politicianId,
);

// PullPush first, Reddit's own search as the fallback (fetch_reddit).
export const fetchReddit = async (query, politicianId, limit) => {
  try {
    const payload = await httpGet(`https://api.pullpush.io/reddit/search/submission/?q=${encodeURIComponent(query)}&size=${limit}&sort=desc&sort_type=created_utc`, { json: true, timeout: 20000 });
    const records = (payload.data || []).map((item) => redditRecord(item, query, politicianId)).filter(Boolean)
      .map((record) => ({ ...record, sourceType: "pullpush_reddit_search" }));
    if (records.length) return records;
  } catch {
    // fall through to Reddit's own search
  }
  const payload = await httpGet(`https://www.reddit.com/search.json?q=${encodeURIComponent(query)}&sort=new&limit=${limit}&raw_json=1`, { json: true });
  return (payload.data?.children || []).map((child) => redditRecord(child.data || {}, query, politicianId)).filter(Boolean);
};
