// Evidence from what the phone collected, by the server's rules
// (scripts/intelligence/evidence.py): the same proof gate, the same quotable
// passages, embedded on the phone with EmbeddingGemma 2 and searched together
// with the published evidence pack.

import { isTamil, sourceTier } from "./rules.js";
import { getAll, putAll } from "./store.js";

const KIND_BY_TIER = { record: "report", established: "report", partisan: "claim" };
const MIN_PASSAGE = 25;
const MAX_PASSAGE = 400;
const SENTENCE_END = /(?<=[.!?\u0964])\s+/u;
const TRUNCATED = /(…|\.\.\.)\s*$/u;

// Letters and digits only, lower case: the same sentence from two outlets matches.
export const textKey = (text) => ((text || "").normalize("NFC").toLowerCase().match(/[\p{L}\p{N}_\u0B80-\u0BFF]+/gu) || []).join(" ");

// [tier, null] for a story the evidence keeps, or [null, why it is left out].
export const proofGate = (story) => {
  if (story.platform || story.sourceTier === "social") return [null, "social"];
  if (story.verificationStatus === "unverified_chatter") return [null, "unverified"];
  if (!(story.url || "").startsWith("https://")) return [null, "no_link"];
  if (!story.publishedAt) return [null, "no_date"];
  const tier = sourceTier(story.source);
  return tier in KIND_BY_TIER ? [tier, null] : [null, `tier_${tier}`];
};

// The headline, then each full sentence of the story's text, as the outlet wrote them.
export const passages = (story) => {
  const out = [(story.title || "").trim()];
  for (const part of (story.snippet || "").trim().split(SENTENCE_END)) {
    const sentence = part.trim();
    if (TRUNCATED.test(sentence) || sentence.length < MIN_PASSAGE || sentence.length > MAX_PASSAGE) continue;
    if (!out.some((text) => textKey(text) === textKey(sentence))) out.push(sentence);
  }
  return out.filter((text) => text.length >= 10);
};

export const passagesFor = (stories) => stories.flatMap((story) => {
  const [tier] = proofGate(story);
  if (!tier) return [];
  return passages(story).map((text, position) => ({
    id: `${story.id}:${position}`,
    storyId: story.id,
    text,
    language: isTamil(text) ? "ta" : "en",
    source: story.source,
    tier,
    kind: KIND_BY_TIER[tier],
    url: story.url,
    publishedAt: story.publishedAt,
    corroboratedBy: [],
  }));
});

// Adds new passages; ones already stored keep their vectors.
export const savePassages = async (stories) => {
  const known = new Set((await getAll("passages")).map((passage) => passage.id));
  const fresh = passagesFor(stories).filter((passage) => !known.has(passage.id));
  await putAll("passages", fresh);
  return fresh.length;
};

// Embeds stored passages that have no vector yet, newest first.
export const embedPending = async (embed, dimensions, { limit = 400, onProgress } = {}) => {
  const pending = (await getAll("passages")).filter((passage) => !passage.vector)
    .sort((a, b) => (b.publishedAt || "").localeCompare(a.publishedAt || "")).slice(0, limit);
  for (const [index, passage] of pending.entries()) {
    passage.vector = Array.from(await embed(passage.text, dimensions));
    if (index % 20 === 19 || index === pending.length - 1) {
      await putAll("passages", pending.slice(Math.floor(index / 20) * 20, index + 1));
      onProgress?.({ done: index + 1, total: pending.length });
    }
  }
  return pending.length;
};

// The published pack plus the phone's embedded passages, as one searchable index.
// Phone passages that repeat a published one are left out.
export const withLocalEvidence = (decoded, local, dimensions = 256) => {
  const base = decoded || { ids: [], rows: new Map(), passages: [], dimensions, prepare: (vector) => vector, prepared: new Float32Array(0) };
  const published = new Set(base.passages.map((passage) => textKey(passage.text)));
  const extra = local.filter((passage) => passage.vector?.length === base.dimensions && !published.has(textKey(passage.text)));
  if (!extra.length) return base;
  const prepared = new Float32Array((base.ids.length + extra.length) * base.dimensions);
  prepared.set(base.prepared);
  extra.forEach((passage, row) => prepared.set(base.prepare(Float32Array.from(passage.vector)), (base.ids.length + row) * base.dimensions));
  const ids = [...base.ids, ...extra.map((passage) => passage.id)];
  return {
    ...base,
    ids,
    rows: new Map(ids.map((id, row) => [id, row])),
    passages: [...base.passages, ...extra.map((passage) => Object.fromEntries(Object.entries(passage).filter(([key]) => key !== "vector")))],
    prepared,
  };
};
