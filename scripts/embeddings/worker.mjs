#!/usr/bin/env node
// Batch embedding worker for the Python pipeline.
//
//   node scripts/embeddings/worker.mjs jobs.jsonl results.jsonl [--deadline SECONDS]
//
// Each job line: {"id", "modality": "text"|"image"|"audio", "input", "prompt"?, "title"?}
//   text:  input is the text; prompt is one of PROMPTS (document by default; raw
//          sends the input as it is)
//   image: input is a URL or file path
//   audio: input is a URL or file path; any format ffmpeg reads
// Each result line: {"id", "vector": base64 float32} or {"id", "error"}.
// Results are written as they finish, so a deadline or crash keeps finished work.
import fs from "node:fs";
import readline from "node:readline";
import { DIMENSIONS, PROMPTS, embedAudio, embedImage, embedTexts } from "./gemma.mjs";

const [jobsPath, resultsPath, ...flags] = process.argv.slice(2);
if (!jobsPath || !resultsPath) {
  console.error("usage: worker.mjs jobs.jsonl results.jsonl [--deadline SECONDS]");
  process.exit(2);
}
const deadlineIndex = flags.indexOf("--deadline");
const deadline = deadlineIndex >= 0 ? Date.now() + Number(flags[deadlineIndex + 1]) * 1000 : Infinity;

const jobs = [];
for await (const line of readline.createInterface({ input: fs.createReadStream(jobsPath) })) {
  if (line.trim()) jobs.push(JSON.parse(line));
}
const out = fs.createWriteStream(resultsPath);
const write = (record) => out.write(`${JSON.stringify(record)}\n`);
const encode = (vector) => Buffer.from(Float32Array.from(vector).buffer).toString("base64");
const counts = { embedded: 0, failed: 0, skipped: 0 };

const texts = jobs.filter((job) => job.modality === "text");
for (let start = 0; start < texts.length; start += 32) {
  if (Date.now() > deadline) break;
  const batch = texts.slice(start, start + 32);
  try {
    const vectors = await embedTexts(batch.map((job) => (PROMPTS[job.prompt || "document"])(job.input, job.title)), { batchSize: 8 });
    batch.forEach((job, index) => write({ id: job.id, vector: encode(vectors[index]) }));
    counts.embedded += batch.length;
  } catch (error) {
    batch.forEach((job) => write({ id: job.id, error: String(error.message || error) }));
    counts.failed += batch.length;
  }
}

for (const job of jobs.filter((item) => item.modality !== "text")) {
  if (Date.now() > deadline) break;
  try {
    const vector = job.modality === "image" ? await embedImage(job.input) : await embedAudio(job.input, job.options);
    write({ id: job.id, vector: encode(vector) });
    counts.embedded += 1;
  } catch (error) {
    write({ id: job.id, error: String(error.message || error).slice(0, 300) });
    counts.failed += 1;
  }
}

counts.skipped = jobs.length - counts.embedded - counts.failed;
await new Promise((resolve) => out.end(resolve));
console.log(JSON.stringify({ ...counts, dimensions: DIMENSIONS }));
