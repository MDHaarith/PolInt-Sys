// Which small chat model should run on the phone? Each candidate answers the
// questions in tests/fixtures/chat_questions.json the way the app will: the
// question is embedded with EmbeddingGemma 2, the closest evidence passages
// are found (src/evidenceChat.js), and the model picks which of them answer it.
// A question whose evidence misses ANSWER_BAR never reaches the model.
//
//   node scripts/chat_model_bakeoff.mjs PACK.json [model ...]
//
// Scored per model, from what the app would show:
//   found        answerable questions where a chosen passage is from the right
//                hand-checked group
//   wrong_group  chosen passages from another hand-checked group (passages
//                outside every group are not counted either way)
//   declined     questions with no evidence where the model chose nothing
//   summaries    answers whose summary passed the app's checks
// Results go to data/chat-bakeoff/. CPU speed here is not phone speed.

import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { AutoProcessor, AutoTokenizer, pipeline } from "@huggingface/transformers";
import { embedTexts, PROMPTS, truncate } from "./embeddings/gemma.mjs";
import { chatMessages, decodeEvidencePack, evidenceFor, readReply } from "../src/evidenceChat.js";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const [packPath, ...requested] = process.argv.slice(2);
const MODELS = {
  "onnx-community/Qwen3.5-0.8B-Text-ONNX": "q4",
  "onnx-community/gemma-3-1b-it-ONNX": "q4",
  "onnx-community/Qwen3-1.7B-ONNX": "q4",
  "onnx-community/gemma-4-E2B-it-qat-mobile-ONNX": "q2f16",
};
const models = requested.length ? requested : Object.keys(MODELS);

const decoded = decodeEvidencePack(JSON.parse(fs.readFileSync(packPath, "utf8")));
const { questions } = JSON.parse(fs.readFileSync(path.join(root, "tests/fixtures/chat_questions.json"), "utf8"));
const { clusters } = JSON.parse(fs.readFileSync(path.join(root, "tests/fixtures/same_issue_clusters.json"), "utf8"));
const group = new Map(Object.entries(clusters).flatMap(([name, items]) => items.map((item) => [item.rawId, name])));

const vectors = await embedTexts(questions.map(({ question }) => PROMPTS.query(question)));
const evidence = vectors.map((vector) => evidenceFor(decoded, truncate(vector, decoded.dimensions)));
const retrieval = questions.filter(({ group: wanted }, i) => wanted && evidence[i].some((p) => group.get(p.storyId) === wanted)).length;
const passed = questions.filter((_, i) => evidence[i].length);
console.log(`retrieval: right group among the passages for ${retrieval}/${questions.filter((q) => q.group).length} answerable questions; ` +
  `${passed.filter((q) => !q.group).length}/${questions.filter((q) => !q.group).length} without evidence passed the bar`);

fs.mkdirSync(path.join(root, "data/chat-bakeoff"), { recursive: true });
const report = { pack: packPath, retrieval, models: {} };
for (const model of models) {
  const dtype = MODELS[model] || "q4";
  const started = Date.now();
  let generate;
  let tokenizer;
  try {
    generate = await pipeline("text-generation", model, { device: "cpu", dtype });
    tokenizer = await AutoTokenizer.from_pretrained(model);
    // Some exports keep the chat template in chat_template.jinja, which the processor reads.
    if (!tokenizer.chat_template) tokenizer.chat_template = (await AutoProcessor.from_pretrained(model)).chat_template;
  } catch (error) {
    report.models[model] = { dtype, error: String(error).slice(0, 300) };
    console.log(`\n${model}: could not load: ${report.models[model].error}`);
    continue;
  }
  const loadSeconds = (Date.now() - started) / 1000;
  const rows = [];
  let tokens = 0;
  let seconds = 0;
  for (const [i, { question, group: wanted }] of questions.entries()) {
    if (!evidence[i].length) {
      rows.push({ question, wanted, status: "no_evidence", raw: "", found: false, wrongGroup: 0, summary: null, summaryProblem: null, quotes: [] });
      continue;
    }
    const prompt = tokenizer.apply_chat_template(chatMessages(question, evidence[i]), {
      tokenize: false, add_generation_prompt: true, enable_thinking: false,
    });
    const begin = Date.now();
    const [{ generated_text: raw }] = await generate(prompt, { max_new_tokens: 160, do_sample: false, return_full_text: false });
    seconds += (Date.now() - begin) / 1000;
    tokens += tokenizer.encode(raw).length;
    const shown = readReply(raw, question, evidence[i]);
    const groups = shown.quotes.map((quote) => group.get(quote.storyId));
    rows.push({
      question, wanted, status: shown.status, raw,
      found: Boolean(wanted) && groups.includes(wanted),
      wrongGroup: groups.filter((name) => name && name !== wanted).length,
      summary: shown.summary, summaryProblem: shown.summaryProblem ?? null,
      quotes: shown.quotes.map((quote) => `${quote.source}: ${quote.text}`),
    });
    process.stdout.write(".");
  }
  const answerable = rows.filter((row) => row.wanted);
  const unanswerable = rows.filter((row) => !row.wanted);
  const answered = rows.filter((row) => row.status === "answered");
  report.models[model] = {
    dtype, loadSeconds: Math.round(loadSeconds),
    found: `${answerable.filter((row) => row.found).length}/${answerable.length}`,
    wrongGroup: rows.reduce((sum, row) => sum + row.wrongGroup, 0),
    declined: `${unanswerable.filter((row) => row.status === "no_evidence").length}/${unanswerable.length}`,
    unreadable: rows.filter((row) => row.status === "unreadable").length,
    summaries: `${answered.filter((row) => row.summary).length}/${answered.length}`,
    summaryProblems: answered.reduce((counts, row) => (row.summaryProblem ? { ...counts, [row.summaryProblem]: (counts[row.summaryProblem] || 0) + 1 } : counts), {}),
    cpuTokensPerSecond: Math.round((tokens / seconds) * 10) / 10,
  };
  console.log(`\n${model}: ${JSON.stringify(report.models[model])}`);
  fs.writeFileSync(path.join(root, `data/chat-bakeoff/${model.split("/").pop()}.json`), JSON.stringify(rows, null, 2));
  await generate.dispose();
  fs.writeFileSync(path.join(root, "data/chat-bakeoff/report.json"), JSON.stringify(report, null, 2));
}
