// Ask: answers that are evidence, found by EmbeddingGemma 2 alone.
//
// The pipeline publishes evidencePack.json (scripts/intelligence/evidence.py):
// passages from trusted outlets, word for word, each with its outlet, tier,
// link and date, plus EmbeddingGemma 2 vectors laid out like vectorIndex.json.
// The question is embedded on the phone with the same model and the closest
// passages are shown as the outlets wrote them, with their proof. No other
// model is involved and nothing is generated, so every word shown has a source.
//
// A passage is shown when it reaches ANSWER_BAR and sits within ANSWER_MARGIN
// of the best match; when nothing reaches the bar the answer is "no trusted
// source". On 26 test questions (tests/fixtures/chat_questions.json, checked
// with scripts/eval_ask.mjs) every question without evidence scored 0.42 or
// less and showed nothing; 19 of 20 answerable ones scored 0.57 or more and
// showed a relevant passage first. At a margin of 0.1 no passage from another
// hand-checked issue was shown; at 0.15, one was.

import { decodeVectorIndex, searchVectorIndex } from "./semanticSearch.js";

export const ANSWER_BAR = 0.5;
export const ANSWER_MARGIN = 0.1;
export const MAX_SHOWN = 5;

export const decodeEvidencePack = (pack) => {
  const decoded = decodeVectorIndex(pack);
  if (!decoded || pack.kind !== "evidence" || pack.passages?.length !== pack.ids.length) return null;
  return { ...decoded, passages: pack.passages.map((passage, row) => ({ id: pack.ids[row], ...passage })) };
};

const sameText = (text) => text.toLowerCase().replace(/[^\p{L}\p{M}\p{N}]+/gu, " ").trim();

// The closest passages to the question, one per text (syndicated copies collapse).
export const findEvidence = (decoded, queryVector, { limit = MAX_SHOWN, minScore = 0.15 } = {}) => {
  const seen = new Set();
  const found = [];
  for (const { id, score } of searchVectorIndex(decoded, queryVector, { limit: limit * 4, minScore })) {
    const passage = decoded.passages[decoded.rows.get(id)];
    const key = sameText(passage.text);
    if (seen.has(key)) continue;
    seen.add(key);
    found.push({ ...passage, score });
    if (found.length === limit) break;
  }
  return found;
};

// What Ask shows: the passages close enough to answer, or none.
export const answerFor = (decoded, queryVector, { margin = ANSWER_MARGIN, limit = MAX_SHOWN } = {}) => {
  const found = findEvidence(decoded, queryVector, { limit, minScore: ANSWER_BAR });
  return found.length ? found.filter((passage) => passage.score >= found[0].score - margin) : [];
};
