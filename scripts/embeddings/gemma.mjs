// EmbeddingGemma 2: one 768-dimensional space for text, images and audio.
//
// Google's open multimodal embedding model (Apache 2.0). The text model is
// 270M parameters; the vision (170M) and audio (300M) encoders load only when
// a job needs them. Runs the 4-bit ONNX export on CPU through Transformers.js.
// Downloads: text 174 MB, vision 109 MB, audio 189 MB, cached in data/models/.
import { execFile } from "node:child_process";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { promisify } from "node:util";
import { AutoConfig, AutoModel, AutoProcessor, AutoTokenizer, RawImage, env } from "@huggingface/transformers";

const run = promisify(execFile);
const projectRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../..");

export const MODEL_ID = "onnx-community/embeddinggemma-2-ONNX";
export const MODEL_REVISION = "daa72c51243991dfcaf9f9137d2c573d8f7790c0";
export const DIMENSIONS = 768;
export const DTYPE = process.env.EMBEDDING_DTYPE || "q4";

env.cacheDir = process.env.EMBEDDING_CACHE_DIR || path.join(projectRoot, "data/models/hf");
env.allowLocalModels = false;

// Prefixes the model was trained with; images and audio take none.
export const PROMPTS = {
  query: (text) => `task: search result | query: ${text}`,
  document: (text, title = "none") => `title: ${title || "none"} | text: ${text}`,
  similarity: (text) => `task: sentence similarity | query: ${text}`,
  clustering: (text) => `task: clustering | query: ${text}`,
  classification: (text) => `task: classification | query: ${text}`,
  // Already formatted by the caller (scripts/embedding_experiments.py).
  raw: (text) => text,
};

const loaded = new Map();

// Each modality gets its own model instance so text-only runs never download
// the vision or audio encoders.
async function load(modality) {
  if (loaded.has(modality)) return loaded.get(modality);
  const promise = (async () => {
    const options = { revision: MODEL_REVISION };
    const config = await AutoConfig.from_pretrained(MODEL_ID, options);
    if (modality !== "image") config.vision_config = null;
    if (modality !== "audio") config.audio_config = null;
    const model = await AutoModel.from_pretrained(MODEL_ID, { ...options, config, device: "cpu", dtype: DTYPE });
    const processor = modality === "text"
      ? await AutoTokenizer.from_pretrained(MODEL_ID, options)
      : await AutoProcessor.from_pretrained(MODEL_ID, options);
    return { model, processor };
  })();
  loaded.set(modality, promise);
  return promise;
}

// Matryoshka training keeps the leading dimensions meaningful on their own.
export function truncate(vector, dimensions = DIMENSIONS) {
  const head = vector.slice(0, dimensions);
  let norm = 0;
  for (const value of head) norm += value * value;
  norm = Math.sqrt(norm) || 1;
  return Float32Array.from(head, (value) => value / norm);
}

const rows = (tensor) => {
  const [count, width] = tensor.dims;
  const data = tensor.data;
  return Array.from({ length: count }, (_, row) => Float32Array.from(data.subarray(row * width, (row + 1) * width)));
};

export async function embedTexts(texts, { batchSize = 16 } = {}) {
  const { model, processor } = await load("text");
  const vectors = [];
  for (let start = 0; start < texts.length; start += batchSize) {
    const inputs = await processor(texts.slice(start, start + batchSize), { padding: true, truncation: true, max_length: 256 });
    vectors.push(...rows((await model(inputs)).sentence_embedding));
  }
  return vectors;
}

// News sites refuse image requests that do not look like a browser's.
const BROWSER_HEADERS = {
  "User-Agent": "Mozilla/5.0 (Linux; Android 14) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/130.0 Mobile Safari/537.36",
  Accept: "image/avif,image/webp,image/apng,image/*,*/*;q=0.8",
};

async function readImage(source) {
  if (!/^https?:/.test(source)) return RawImage.read(source);
  const response = await fetch(source, {
    headers: { ...BROWSER_HEADERS, Referer: `${new URL(source).origin}/` },
    signal: AbortSignal.timeout(20000),
  });
  if (!response.ok) throw new Error(`image request failed: HTTP ${response.status}`);
  return RawImage.fromBlob(await response.blob());
}

export async function embedImage(source) {
  const { model, processor } = await load("image");
  const image = await readImage(source);
  return rows((await model(await processor(null, image))).sentence_embedding)[0];
}

// Mono 16 kHz samples, decoded by ffmpeg from any format it reads.
export async function decodeAudio(source, { seconds = 30, offset = 0 } = {}) {
  const { stdout } = await run("ffmpeg", [
    "-v", "error", "-ss", String(offset), "-t", String(seconds), "-i", source,
    "-ac", "1", "-ar", "16000", "-f", "f32le", "pipe:1",
  ], { encoding: "buffer", maxBuffer: 64 * 1024 * 1024 });
  return new Float32Array(stdout.buffer, stdout.byteOffset, stdout.byteLength / 4);
}

export async function embedAudio(source, options) {
  const { model, processor } = await load("audio");
  const audio = await decodeAudio(source, options);
  if (audio.length < 1600) throw new Error("audio shorter than 0.1 s");
  return rows((await model(await processor(null, null, audio))).sentence_embedding)[0];
}

export const cosine = (left, right) => {
  let total = 0;
  for (let index = 0; index < left.length; index += 1) total += left[index] * right[index];
  return total;
};
