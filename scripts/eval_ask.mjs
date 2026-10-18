// How well does Ask answer? Ask uses EmbeddingGemma 2 alone: the question is
// embedded, and the passages that clear ANSWER_BAR and sit within ANSWER_MARGIN
// of the best one are shown word for word (src/evidenceChat.js). This scores
// that on tests/fixtures/chat_questions.json against the hand-checked groups.
//
//   node scripts/eval_ask.mjs PACK.json
//
//   answered     answerable questions with at least one passage shown
//   right_first  answerable questions whose first passage is from the right group
//   wrong_shown  passages shown from another hand-checked group (passages in
//                no group are not counted either way)
//   declined     questions without evidence that showed nothing
// Each margin is tried so the default can be set from the numbers.

import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { embedTexts, PROMPTS, truncate } from "./embeddings/gemma.mjs";
import { ANSWER_MARGIN, answerFor, decodeEvidencePack } from "../src/evidenceChat.js";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const decoded = decodeEvidencePack(JSON.parse(fs.readFileSync(process.argv[2], "utf8")));
const { questions } = JSON.parse(fs.readFileSync(path.join(root, "tests/fixtures/chat_questions.json"), "utf8"));
const { clusters } = JSON.parse(fs.readFileSync(path.join(root, "tests/fixtures/same_issue_clusters.json"), "utf8"));
const group = new Map(Object.entries(clusters).flatMap(([name, items]) => items.map((item) => [item.rawId, name])));

const vectors = (await embedTexts(questions.map(({ question }) => PROMPTS.query(question))))
  .map((vector) => truncate(vector, decoded.dimensions));
const answerable = questions.filter((q) => q.group).length;
for (const margin of [0.05, 0.1, ANSWER_MARGIN, 0.2, 0.3].filter((m, i, all) => all.indexOf(m) === i).sort()) {
  let answered = 0, rightFirst = 0, wrongShown = 0, shown = 0, declined = 0;
  questions.forEach(({ group: wanted }, i) => {
    const passages = answerFor(decoded, vectors[i], { margin });
    shown += passages.length;
    if (!wanted) { declined += passages.length === 0; return; }
    answered += passages.length > 0;
    rightFirst += passages.length > 0 && group.get(passages[0].storyId) === wanted;
    wrongShown += passages.filter((p) => group.has(p.storyId) && group.get(p.storyId) !== wanted).length;
  });
  console.log(JSON.stringify({ margin, answered: `${answered}/${answerable}`, rightFirst: `${rightFirst}/${answerable}`,
    wrongShown, passagesShown: shown, declined: `${declined}/${questions.length - answerable}` }));
}
