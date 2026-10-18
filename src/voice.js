// Voice for Ask: record a spoken question, and read answers aloud.
//
// A recording is turned into 16 kHz mono samples, the input EmbeddingGemma 2's
// audio encoder takes; the question is never transcribed by another model.
// Reading aloud uses the phone's own text-to-speech voice (Android's engine in
// the app, the browser's on the web) and speaks only the outlets' words.

import { TextToSpeech } from "@capacitor-community/text-to-speech";
import { isNativeApp } from "./native";

export const SAMPLE_RATE = 16000;
// The audio encoder reads about 5.5 minutes at most; a question needs far less.
export const MAX_SECONDS = 30;

export const canRecord = () => Boolean(globalThis.navigator?.mediaDevices?.getUserMedia && globalThis.MediaRecorder);

// Mono, 16 kHz, from any recording the browser can decode.
export const toModelSamples = async (blob) => {
  const bytes = await blob.arrayBuffer();
  const context = new AudioContext();
  try {
    const decoded = await context.decodeAudioData(bytes);
    const length = Math.ceil(decoded.duration * SAMPLE_RATE);
    const offline = new OfflineAudioContext(1, length, SAMPLE_RATE);
    const source = offline.createBufferSource();
    source.buffer = decoded;
    source.connect(offline.destination);
    source.start();
    return (await offline.startRendering()).getChannelData(0);
  } finally {
    void context.close();
  }
};

// Starts recording; the returned stop() resolves with the samples and their length in seconds.
export const startRecording = async ({ onAutoStop } = {}) => {
  const stream = await navigator.mediaDevices.getUserMedia({ audio: { channelCount: 1, echoCancellation: true, noiseSuppression: true } });
  const recorder = new MediaRecorder(stream);
  const chunks = [];
  recorder.addEventListener("dataavailable", (event) => event.data.size && chunks.push(event.data));
  const stopped = new Promise((resolve) => recorder.addEventListener("stop", resolve, { once: true }));
  recorder.start();
  const timer = setTimeout(() => onAutoStop?.(), MAX_SECONDS * 1000);
  const stop = async () => {
    clearTimeout(timer);
    if (recorder.state !== "inactive") recorder.stop();
    await stopped;
    stream.getTracks().forEach((track) => track.stop());
    const samples = await toModelSamples(new Blob(chunks, { type: recorder.mimeType }));
    return { samples, seconds: Math.round(samples.length / SAMPLE_RATE) };
  };
  return { stop };
};

// Read texts aloud one after another, each in its own language.
let reading = 0;

export const speak = async (parts) => {
  const run = ++reading;
  for (const { text, locale } of parts) {
    if (run !== reading) return;
    if (isNativeApp) {
      await TextToSpeech.speak({ text, lang: locale, rate: 0.95, category: "playback" });
    } else if (globalThis.speechSynthesis) {
      await new Promise((resolve) => {
        const utterance = new SpeechSynthesisUtterance(text);
        utterance.lang = locale;
        utterance.rate = 0.95;
        utterance.onend = resolve;
        utterance.onerror = resolve;
        speechSynthesis.speak(utterance);
      });
    }
  }
};

export const stopSpeaking = async () => {
  reading += 1;
  if (isNativeApp) await TextToSpeech.stop().catch(() => {});
  else globalThis.speechSynthesis?.cancel();
};

export const canSpeak = () => isNativeApp || Boolean(globalThis.speechSynthesis);
