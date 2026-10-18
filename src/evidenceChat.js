// Chat that answers only from evidence.
//
// The pipeline publishes evidencePack.json (scripts/intelligence/evidence.py):
// passages from trusted outlets, word for word, each with its outlet, tier,
// link and date, plus EmbeddingGemma 2 vectors laid out like vectorIndex.json.
// A question is embedded on the phone, the closest passages are found, and the
// chat model only picks which of them answer it, by number. What the reader
// sees as the answer is those passages as the outlets wrote them, with their
// proof. The model may add a one-line summary; it is shown only when it is in
// the question's language, in clean script, and every number in it appears in
// the chosen passages. Nothing the model writes is ever shown as a quote.
//
// Before any model runs, the closest passage must reach ANSWER_BAR, or the
// answer is "no evidence". On 26 test questions (tests/fixtures/chat_questions.json)
// every question without evidence scored 0.42 or less and 19 of 20 answerable
// ones 0.57 or more; a small model given weak passages picks them anyway.

import { decodeVectorIndex, searchVectorIndex } from "./semanticSearch.js";

const TAMIL = /[\u0B80-\u0BFF]/g;
const LATIN = /[A-Za-z]/g;
// Scripts that have no place in a Tamil or English answer: Devanagari, Telugu,
// Kannada, Malayalam, Thai, Cyrillic, Arabic, Hangul, kana and CJK.
const FOREIGN = /[\p{Script=Devanagari}\p{Script=Telugu}\p{Script=Kannada}\p{Script=Malayalam}\p{Script=Thai}\p{Script=Cyrillic}\p{Script=Arabic}\p{Script=Hangul}\p{Script=Hiragana}\p{Script=Katakana}\p{Script=Han}]/u;

export const ANSWER_BAR = 0.5;

export const decodeEvidencePack = (pack) => {
  const decoded = decodeVectorIndex(pack);
  if (!decoded || pack.kind !== "evidence" || pack.passages?.length !== pack.ids.length) return null;
  return { ...decoded, passages: pack.passages.map((passage, row) => ({ id: pack.ids[row], ...passage })) };
};

const sameText = (text) => text.toLowerCase().replace(/[^\p{L}\p{M}\p{N}]+/gu, " ").trim();

// The closest passages to the question, one per text (syndicated copies collapse).
export const findEvidence = (decoded, queryVector, { limit = 6, minScore = 0.15 } = {}) => {
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

// The passages to put to the model, or none when nothing is close enough to answer.
export const evidenceFor = (decoded, queryVector, options) => {
  const found = findEvidence(decoded, queryVector, options);
  return found.length && found[0].score >= ANSWER_BAR ? found : [];
};

export const questionLanguage = (question) =>
  (question.match(TAMIL) || []).length >= (question.match(LATIN) || []).length ? "ta" : "en";

export const chatMessages = (question, passages) => {
  const language = questionLanguage(question) === "ta" ? "Tamil" : "English";
  const listed = passages
    .map((passage, index) => `[${index + 1}] ${passage.source}, ${passage.publishedAt.slice(0, 10)}: ${passage.text}`)
    .join("\n");
  return [
    {
      role: "system",
      content:
        "You answer questions about Tamil Nadu politics using only the numbered news passages given. " +
        "Pick the passages that directly answer the question. If none of them answers it, pick none. " +
        `Reply with JSON only: {"sources": [passage numbers], "summary": "one short sentence in ${language}, ` +
        'using only facts stated in the passages you picked, or empty if you picked none"}.',
    },
    { role: "user", content: `Passages:\n${listed}\n\nQuestion: ${question}` },
  ];
};

const lastJson = (text) => {
  const cleaned = text.replace(/<think>[\s\S]*?<\/think>/g, "");
  for (let end = cleaned.lastIndexOf("}"); end >= 0; end = cleaned.lastIndexOf("}", end - 1)) {
    for (let start = cleaned.lastIndexOf("{", end); start >= 0; start = cleaned.lastIndexOf("{", start - 1)) {
      try {
        return JSON.parse(cleaned.slice(start, end + 1));
      } catch {
        // keep looking for a parsable object
      }
    }
  }
  return null;
};

const SUPPORTED_SHARE = 0.7;
const STOPWORDS = new Set(["that", "this", "with", "from", "have", "were", "will", "about", "said", "says", "their", "they",
  "them", "which", "when", "what", "after", "over", "into", "also", "been", "than", "there", "these", "those", "would"]);
const TAMIL_LETTER = /[\u0B85-\u0BB9][\u0BBE-\u0BCD\u0BD7]*/g;

export const contentWords = (text) =>
  text.toLowerCase().split(/[^\p{L}\p{M}\p{N}]+/u).flatMap((word) => {
    if (/[\u0B80-\u0BFF]/.test(word)) {
      const letters = word.match(TAMIL_LETTER) || [];
      return letters.length >= 2 ? [letters.slice(0, 3).join("")] : [];
    }
    return word.length >= 4 && !STOPWORDS.has(word) ? [word.replace(/(?:'s|s)$/, "")] : [];
  });

// Why a summary cannot be shown, or null when it can.
export const summaryProblem = (summary, question, quotes) => {
  if (!summary) return "empty";
  if (FOREIGN.test(summary)) return "foreign script";
  const tamil = (summary.match(TAMIL) || []).length;
  const latin = (summary.match(LATIN) || []).length;
  if (questionLanguage(question) === "ta" ? tamil < 2 * latin : tamil > 0) return "wrong language";
  const quoted = quotes.map((quote) => quote.text).join(" ");
  const digits = (text) => text.match(/\d+(?:[.,]\d+)?/g) || [];
  const quotedNumbers = new Set(digits(quoted).map((number) => number.replace(",", "")));
  if (digits(summary).some((number) => !quotedNumbers.has(number.replace(",", "")))) return "number not in sources";
  // Most of the summary's words must come from the quotes; a name or claim the
  // model made up does not. Tamil words are matched on their stem (first three
  // letters with their signs) since endings change with case. A summary in a
  // language none of the quotes is in cannot be checked this way, so it is not shown.
  const summaryLanguage = tamil > 0 ? "ta" : "en";
  if (!quotes.some((quote) => quote.language === summaryLanguage)) return "cannot check across languages";
  const words = contentWords(summary);
  const known = new Set(contentWords(quoted));
  if (words.length && words.filter((word) => known.has(word)).length / words.length < SUPPORTED_SHARE) return "words not in sources";
  return null;
};

// The model's reply turned into what the reader sees.
export const readReply = (raw, question, passages) => {
  const reply = lastJson(raw);
  if (!reply || !Array.isArray(reply.sources)) return { status: "unreadable", quotes: [], summary: null };
  const numbers = [...new Set(reply.sources.map(Number))].filter((n) => Number.isInteger(n) && n >= 1 && n <= passages.length);
  const quotes = numbers.map((n) => passages[n - 1]);
  if (!quotes.length) return { status: "no_evidence", quotes: [], summary: null };
  const summary = typeof reply.summary === "string" ? reply.summary.trim() : "";
  const problem = summaryProblem(summary, question, quotes);
  return { status: "answered", quotes, summary: problem ? null : summary, summaryProblem: problem };
};

// The chat model, chosen by scripts/chat_model_bakeoff.mjs. It runs on the
// device through WebGPU like the search model, downloads once and is cached.
export const CHAT_MODEL = { id: "onnx-community/Qwen3.5-0.8B-Text-ONNX", dtype: "q4f16", downloadMb: 470 };

let chatLoading = null;

export const loadChatModel = (onProgress) => {
  chatLoading ??= (async () => {
    const { pipeline, env } = await import("@huggingface/transformers");
    env.allowLocalModels = false;
    env.useBrowserCache = true;
    const generate = await pipeline("text-generation", CHAT_MODEL.id, {
      device: "webgpu", dtype: CHAT_MODEL.dtype, progress_callback: onProgress,
    });
    return async (messages) => {
      const prompt = generate.tokenizer.apply_chat_template(messages, {
        tokenize: false, add_generation_prompt: true, enable_thinking: false,
      });
      const [{ generated_text: raw }] = await generate(prompt, { max_new_tokens: 160, do_sample: false, return_full_text: false });
      return raw;
    };
  })().catch((error) => {
    chatLoading = null;
    throw error;
  });
  return chatLoading;
};
