// The server pipeline's reading rules, applied on the phone to what it collects:
// is a story political, is it about Tamil Nadu, which politician leads it,
// what kind of story it is, does it report hearsay, and how trustworthy is its
// outlet. The keyword lists, names and outlet tiers come from the Python
// modules that own them (scripts/build_collect_config.py), and
// tests/collect_parity.test.mjs checks both sides agree on real headlines.

import config from "../data/collectConfig.json" with { type: "json" };

// Python's \w covers letters and digits of every script; JavaScript's only ASCII.
const WORD = "\\p{L}\\p{N}_";
const fromPython = (source, flags = "") => {
  let out = "";
  let inClass = false;
  for (let index = 0; index < source.length; index += 1) {
    const char = source[index];
    if (char === "\\") {
      const next = source[index + 1];
      out += next === "w" ? (inClass ? WORD : `[${WORD}]`) : char + next;
      index += 1;
    } else {
      if (char === "[") inClass = true;
      else if (char === "]") inClass = false;
      out += char;
    }
  }
  return new RegExp(out, `${flags}u`);
};
const escape = (text) => text.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
const alternation = (words) => words.map(escape).join("|");
const bounded = (words, flags = "i") => fromPython(`(?<![\\w.])(?:${alternation(words)})(?!\\w)`, flags);

const TAMIL = /\p{Script=Tamil}/u;
export const isTamil = (text) => TAMIL.test(text || "");

// ── classify.py ──────────────────────────────────────────────────────
const { classify, people, quality } = config;
const CATEGORY_PATTERNS = classify.categories.map(([category, words]) => [category, fromPython(`(?<!\\w)(?:${alternation(words)})(?!\\w)`, "i")]);
const HEARSAY = fromPython(classify.hearsay, "i");
const POLITICAL = new RegExp(bounded(classify.political).source, "giu");
const POLITICAL_CASE_SENSITIVE = fromPython(classify.politicalCaseSensitive);
const AMBIGUOUS = new Set(classify.ambiguousLowercase);
const TAMIL_NADU = bounded(classify.tamilNadu);

export const classifyCategory = (text) => CATEGORY_PATTERNS.find(([, pattern]) => pattern.test(text || ""))?.[0] || "news";
export const reportsHearsay = (text) => HEARSAY.test(text || "");

export const isPolitical = (text = "") => {
  if (classify.politicalTamil.some((word) => text.includes(word))) return true;
  if (POLITICAL_CASE_SENSITIVE.test(text)) return true;
  return [...text.matchAll(POLITICAL)].some((match) => !AMBIGUOUS.has(match[0].toLowerCase()));
};

export const mentionsTamilNadu = (text = "") =>
  classify.tamilNaduTamil.some((marker) => text.includes(marker)) || TAMIL_NADU.test(text);

// ── people.py ────────────────────────────────────────────────────────
const VIRAMA = String.fromCharCode(0x0bcd);
const aliasPattern = (alias) => {
  if (isTamil(alias)) {
    // Tamil names take case endings, so the stem is matched without its final virama.
    const stem = alias.endsWith(VIRAMA) ? alias.slice(0, -1) : alias;
    const exclusion = people.exclusions[stem];
    return fromPython(escape(stem) + (exclusion ? `(?!${VIRAMA}?\\s*${exclusion})` : ""), "g");
  }
  const exclusion = people.exclusions[alias.toLowerCase()];
  // Upper-case acronyms (EPS, OPS) only count when written as acronyms.
  const acronym = alias === alias.toUpperCase() && alias !== alias.toLowerCase();
  return fromPython(`(?<![\\w.])${escape(alias)}(?!\\w)${exclusion ? `(?!${exclusion})` : ""}`, acronym ? "g" : "gi");
};
const ALIAS_PATTERNS = Object.entries(people.aliases).flatMap(([id, aliases]) => aliases.map((alias) => [id, aliasPattern(alias)]));

export const canonicalPoliticianId = (id) => people.legacyIds[id] || id;

// Tracked politicians in the order the text first names them; a shorter alias
// inside a longer one ("Stalin" in "Udhayanidhi Stalin") is not a mention.
export const mentionedPoliticians = (text = "") => {
  const spans = [];
  for (const [id, pattern] of ALIAS_PATTERNS) {
    for (const match of text.matchAll(pattern)) spans.push([match.index, match.index + match[0].length, id]);
  }
  spans.sort((a, b) => a[0] - b[0] || (b[1] - b[0]) - (a[1] - a[0]) || a[1] - b[1] || (a[2] < b[2] ? -1 : a[2] > b[2] ? 1 : 0));
  const ordered = [];
  let coveredUntil = -1;
  for (const [start, end, id] of spans) {
    if (start < coveredUntil) continue;
    coveredUntil = end;
    if (!ordered.includes(id)) ordered.push(id);
  }
  return ordered;
};

export const resolvePolitician = (text, explicitId = null) => {
  if (explicitId && explicitId !== "general") return canonicalPoliticianId(explicitId);
  return mentionedPoliticians(text)[0] || null;
};

// scrape_political_intel.is_relevant: politics, or a tracked politician.
export const isRelevant = (text, { requireTamilNadu = false } = {}) =>
  resolvePolitician(text) !== null || (isPolitical(text) && (!requireTamilNadu || mentionsTamilNadu(text)));

// ── quality.py ───────────────────────────────────────────────────────
const normalisedName = (name) => (name || "").toLowerCase().replace(fromPython("[^\\w\\s.]", "g"), " ").replace(/\s+/gu, " ").trim();
const RECORD = new Set(quality.record.map(normalisedName));
const ESTABLISHED = new Set(quality.established.map(normalisedName));
const SOCIAL = fromPython(quality.social, "i");

export const sourceTier = (source, { isSocial = false } = {}) => {
  const name = normalisedName(source);
  if (isSocial || SOCIAL.test(name)) return "social";
  if (name in quality.partisan) return "partisan";
  if (RECORD.has(name)) return "record";
  if (ESTABLISHED.has(name)) return "established";
  return "aggregator";
};

// 0-100 from source quality, corroboration, substance and subject (story_importance).
export const storyImportance = (record) => {
  const weights = quality.tierWeight;
  const tier = record.sourceTier || sourceTier(record.source);
  const others = record.alsoReportedBy || [];
  const outlets = record.outletCount || 1 + others.length;
  const best = Math.max(weights[tier], ...others.map((other) => weights[sourceTier(other.source)]));
  let score = 0.65 * weights[tier] + 0.35 * best;
  score *= 1 + 0.45 * Math.log(outlets);
  score *= quality.categoryWeight[record.category] ?? 1;
  if (record.politicianId && record.politicianId !== "general") score *= 1.15;
  if ((record.snippet || "").length >= 80) score *= 1.08;
  if (record.isRumor) score *= 0.6;
  const reach = Object.values(record.engagement || {}).reduce((sum, value) => sum + (typeof value === "number" ? value : 0), 0);
  if (reach) score *= 1 + Math.min(0.3, Math.log10(1 + reach) / 15);
  return Math.round(Math.min(100, (score / 2.6) * 100) * 10) / 10;
};

export const collectConfig = config;
