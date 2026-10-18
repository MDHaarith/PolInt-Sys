// Search by meaning, on the device.
//
// The pipeline publishes vectorIndex.json: EmbeddingGemma 2 vectors for the
// recent stories, cut to 256 dimensions and stored as int8. The app embeds the
// reader's query with the same model's text encoder (4-bit, ~174 MB), which is
// downloaded once and kept in the browser cache, then ranks stories by cosine
// similarity. Nothing leaves the phone after the one-time download.

const MODEL_ID = "onnx-community/embeddinggemma-2-ONNX";
const MODEL_REVISION = "daa72c51243991dfcaf9f9137d2c573d8f7790c0";
export const MODEL_DOWNLOAD_MB = 174;

// Every quantised build of this model stores its token table with a 4-bit
// operator (GatherBlockQuantized) that only WebGPU and native runtimes
// implement; on WebAssembly only the 542 MB fp16 build would load, which is
// too heavy for a phone. Typed queries therefore need WebGPU; "similar
// stories" needs no model at all and works everywhere.
const gpuAdapter = async () => globalThis.navigator?.gpu?.requestAdapter().catch(() => null) ?? null;

export const canEncodeQueries = async () => Boolean(await gpuAdapter());

// Rank the index against one of its own stories: no model needed.
export const storyVector = (decoded, id) => {
  const row = decoded.rows.get(id);
  if (row === undefined) return null;
  const { dimensions, vectors, scales } = decoded;
  return Float32Array.from(vectors.subarray(row * dimensions, (row + 1) * dimensions), (value) => value / scales[row]);
};

export const decodeVectorIndex = (index) => {
  if (!index?.ids?.length || !index.vectors) return null;
  const bytes = Uint8Array.from(atob(index.vectors), (char) => char.charCodeAt(0));
  return {
    ids: index.ids,
    rows: new Map(index.ids.map((id, row) => [id, row])),
    dimensions: index.dimensions,
    vectors: new Int8Array(bytes.buffer),
    scales: Float32Array.from(index.scales),
  };
};

// Matryoshka: the leading dimensions, renormalised, are a valid smaller vector.
export const truncate = (vector, dimensions) => {
  const head = Float32Array.from(vector.slice(0, dimensions));
  const norm = Math.hypot(...head) || 1;
  return head.map((value) => value / norm);
};

export const searchVectorIndex = (decoded, query, { limit = 60, minScore = 0 } = {}) => {
  const { ids, dimensions, vectors, scales } = decoded;
  const results = [];
  for (let row = 0; row < ids.length; row += 1) {
    let total = 0;
    const offset = row * dimensions;
    for (let column = 0; column < dimensions; column += 1) total += vectors[offset + column] * query[column];
    const score = total / scales[row];
    if (score >= minScore) results.push({ id: ids[row], score });
  }
  return results.sort((a, b) => b.score - a.score).slice(0, limit);
};

let loading = null;

export const loadQueryEncoder = (onProgress) => {
  loading ??= (async () => {
    const { AutoConfig, AutoModel, AutoTokenizer, env } = await import("@huggingface/transformers");
    env.allowLocalModels = false;
    env.useBrowserCache = true;
    const options = { revision: MODEL_REVISION, progress_callback: onProgress };
    const config = await AutoConfig.from_pretrained(MODEL_ID, options);
    // Text only: the vision and audio encoders are never downloaded.
    config.vision_config = null;
    config.audio_config = null;
    // Some browsers and Android WebViews advertise WebGPU without a usable
    // adapter, and a failed WebGPU start leaves the runtime unusable, so check first.
    if (!(await gpuAdapter())) throw new Error("This device has no WebGPU support");
    const model = await AutoModel.from_pretrained(MODEL_ID, { ...options, config, device: "webgpu", dtype: "q4" });
    const tokenizer = await AutoTokenizer.from_pretrained(MODEL_ID, options);
    return async (text, dimensions) => {
      const inputs = await tokenizer([`task: search result | query: ${text}`], { padding: true, truncation: true });
      const { sentence_embedding: embedding } = await model(inputs);
      return truncate(embedding.data, dimensions);
    };
  })().catch((error) => {
    loading = null;
    throw error;
  });
  return loading;
};
