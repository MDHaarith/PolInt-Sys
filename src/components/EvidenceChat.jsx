import { useEffect, useRef, useState } from "react";
import { ExternalLink, Mic, Send, Square, Volume2 } from "lucide-react";
import { MODEL_DOWNLOAD_MB, VOICE_DOWNLOAD_MB, canEncodeQueries, loadQueryEncoder, loadVoiceEncoder } from "../semanticSearch";
import { VOICE_ANSWER_BAR, answerFor, decodeEvidencePack } from "../evidenceChat";
import { evidencePackFile, loadData } from "../dataSource";
import { SPEECH_LOCALE, strings } from "../i18n";
import { canRecord, canSpeak, speak, startRecording, stopSpeaking } from "../voice";
import { formatDateTime } from "./dateLabels";

const onnxProgress = (set) => (event) => {
  if (event.status === "progress" && event.file?.includes(".onnx")) set(Math.round(event.progress || 0));
};

// Ask a question, typed or spoken; EmbeddingGemma 2 finds the passages from
// trusted outlets that answer it, shown word for word with outlet, date and
// link, and read aloud on request. Nothing is generated. See src/evidenceChat.js.
export default function EvidenceChat({ language = "en" }) {
  const t = strings(language);
  const [pack, setPack] = useState({ status: "loading", decoded: null });
  const [gpuReady, setGpuReady] = useState(null);
  const [models, setModels] = useState({ status: "idle", progress: 0, message: "" });
  const [voice, setVoice] = useState({ status: "idle", progress: 0, message: "", offered: false });
  const [recording, setRecording] = useState(null);
  const [question, setQuestion] = useState("");
  const [turns, setTurns] = useState([]);
  const [busy, setBusy] = useState(false);
  const [speaking, setSpeaking] = useState(null);
  const encoderRef = useRef(null);
  const recorderRef = useRef(null);
  const turnsRef = useRef(turns);
  turnsRef.current = turns;

  useEffect(() => {
    loadData(evidencePackFile)
      .then((value) => setPack({ status: "ready", decoded: decodeEvidencePack(value), days: value.days, generatedAt: value.generatedAt }))
      .catch(() => setPack({ status: "missing", decoded: null }));
    canEncodeQueries().then(setGpuReady);
    return () => { void stopSpeaking(); };
  }, []);

  useEffect(() => {
    if (!recording) return undefined;
    const timer = setInterval(() => setRecording((current) => current && { ...current, seconds: current.seconds + 1 }), 1000);
    return () => clearInterval(timer);
  }, [recording]);

  const startModels = async () => {
    setModels({ status: "loading", progress: 0, message: "" });
    try {
      const encode = await loadQueryEncoder(onnxProgress((progress) => setModels({ status: "loading", progress, message: "" })));
      encoderRef.current ??= { text: encode };
      setModels({ status: "ready", progress: 100, message: "" });
    } catch (error) {
      setModels({ status: "error", progress: 0, message: String(error.message || error) });
    }
  };

  const startVoice = async () => {
    setVoice((current) => ({ ...current, status: "loading", progress: 0, message: "" }));
    try {
      encoderRef.current = await loadVoiceEncoder(onnxProgress((progress) => setVoice((current) => ({ ...current, progress }))));
      setVoice((current) => ({ ...current, status: "ready", progress: 100 }));
    } catch (error) {
      setVoice((current) => ({ ...current, status: "error", message: String(error.message || error) }));
    }
  };

  const readAloud = async (index, turn) => {
    if (speaking === index) {
      await stopSpeaking();
      setSpeaking(null);
      return;
    }
    await stopSpeaking();
    setSpeaking(index);
    const parts = turn.status === "answered"
      ? turn.quotes.flatMap((quote) => [
        { text: t.reports(quote.source), locale: SPEECH_LOCALE[language] },
        { text: quote.text, locale: SPEECH_LOCALE[quote.language] || SPEECH_LOCALE.en },
      ])
      : [{ text: t.askNoEvidence, locale: SPEECH_LOCALE[language] }];
    try {
      await speak(parts);
    } finally {
      setSpeaking((current) => (current === index ? null : current));
    }
  };

  const answer = async (shownQuestion, embed, { bar, spoken = false } = {}) => {
    setBusy(true);
    try {
      const vector = await embed(pack.decoded.dimensions);
      const quotes = answerFor(pack.decoded, vector, bar ? { bar } : undefined);
      const turn = { question: shownQuestion, spoken, status: quotes.length ? "answered" : "no_evidence", quotes };
      const index = turnsRef.current.length;
      setTurns((previous) => [...previous, turn]);
      // A spoken question gets a spoken answer.
      if (spoken && canSpeak()) void readAloud(index, turn);
    } catch (error) {
      setTurns((previous) => [...previous, { question: shownQuestion, spoken, status: "error", quotes: [], message: String(error.message || error) }]);
    } finally {
      setBusy(false);
    }
  };

  const ask = async (event) => {
    event.preventDefault();
    const text = question.trim();
    if (text.length < 3 || busy || !pack.decoded || models.status !== "ready") return;
    setQuestion("");
    await answer(text, (dimensions) => encoderRef.current.text(text, dimensions));
  };

  const toggleRecording = async () => {
    if (voice.status !== "ready") {
      setVoice((current) => ({ ...current, offered: true }));
      return;
    }
    if (recorderRef.current) {
      const recorder = recorderRef.current;
      recorderRef.current = null;
      setRecording(null);
      let recorded;
      try {
        recorded = await recorder.stop();
      } catch (error) {
        setTurns((previous) => [...previous, { question: t.voiceAsk, spoken: true, status: "error", quotes: [], message: String(error.message || error) }]);
        return;
      }
      const { samples, seconds } = recorded;
      if (seconds < 1) return;
      await answer(t.voiceQuestion(seconds), (dimensions) => encoderRef.current.audio(samples, dimensions), { bar: VOICE_ANSWER_BAR, spoken: true });
      return;
    }
    try {
      await stopSpeaking();
      recorderRef.current = await startRecording({ onAutoStop: () => toggleRecording() });
      setRecording({ seconds: 0 });
    } catch {
      setVoice((current) => ({ ...current, message: t.voiceNoMic }));
    }
  };

  const ready = models.status === "ready" && Boolean(pack.decoded);
  const kindLabel = { report: t.kindReport, claim: t.kindClaim };

  return (
    <section className="evidence-chat" aria-labelledby="evidence-chat-title" lang={language}>
      <header className="evidence-chat-header">
        <h1 id="evidence-chat-title">{t.askTitle}</h1>
        <p>{t.askIntro(pack.days)}</p>
      </header>

      {pack.status === "missing" && <div className="meaning-panel" role="status"><p>{t.askMissing}</p></div>}

      {pack.status === "ready" && models.status !== "ready" && (
        <div className="meaning-panel" role="status">
          {gpuReady === false ? (
            <p>{t.askNeedsGpu}</p>
          ) : models.status === "loading" ? (
            <>
              <p>{t.askDownloading(models.progress)}</p>
              <progress max="100" value={models.progress} />
            </>
          ) : (
            <>
              <p>{t.askDownloadIntro(MODEL_DOWNLOAD_MB)}</p>
              {models.status === "error" && <p className="meaning-error">{t.askDownloadFailed(models.message)}</p>}
              <button type="button" className="load-more-intel-btn" onClick={startModels} disabled={gpuReady === null}>
                {t.askTurnOn}
              </button>
            </>
          )}
        </div>
      )}

      {ready && voice.offered && voice.status !== "ready" && (
        <div className="meaning-panel" role="status">
          {voice.status === "loading" ? (
            <>
              <p>{t.voiceDownloading(voice.progress)}</p>
              <progress max="100" value={voice.progress} />
            </>
          ) : (
            <>
              <p>{t.voiceEnable(VOICE_DOWNLOAD_MB)}</p>
              {voice.status === "error" && <p className="meaning-error">{t.askDownloadFailed(voice.message)}</p>}
              <button type="button" className="load-more-intel-btn" onClick={startVoice}>{t.voiceTurnOn}</button>
            </>
          )}
        </div>
      )}

      <ol className="evidence-turns" aria-live="polite">
        {turns.map((turn, index) => (
          <li key={index} className="evidence-turn">
            <p className={`evidence-question ${turn.spoken ? "evidence-spoken" : ""}`}>
              {turn.spoken && <Mic size={14} aria-hidden="true" />} {turn.question}
            </p>
            {turn.status === "answered" ? (
              <ul className="evidence-quotes">
                {turn.quotes.map((quote) => (
                  <li key={quote.id} className={`evidence-quote evidence-${quote.kind}`}>
                    <blockquote lang={quote.language}>{quote.text}</blockquote>
                    <p className="evidence-proof">
                      <strong>{quote.source}</strong>
                      <span>{kindLabel[quote.kind] || quote.kind}</span>
                      <time dateTime={quote.publishedAt}>{formatDateTime(quote.publishedAt)}</time>
                      {quote.corroboratedBy?.length > 0 && (
                        <span title={quote.corroboratedBy.join(", ")}>{t.alsoReported(quote.corroboratedBy.length)}</span>
                      )}
                      <a href={quote.url} target="_blank" rel="noopener noreferrer">
                        {t.source} <ExternalLink size={12} aria-hidden="true" />
                      </a>
                    </p>
                  </li>
                ))}
              </ul>
            ) : (
              <p className="evidence-none">
                {turn.status === "error" ? t.askError(turn.message) : t.askNoEvidence}
                {turn.status === "no_evidence" && turn.spoken && <><br />{t.voiceTamilNote}</>}
              </p>
            )}
            {turn.status !== "error" && canSpeak() && (
              <button type="button" className="evidence-read" onClick={() => readAloud(index, turn)} aria-pressed={speaking === index}>
                {speaking === index ? <Square size={14} aria-hidden="true" /> : <Volume2 size={14} aria-hidden="true" />}
                {speaking === index ? t.stopReading : t.readAloud}
              </button>
            )}
          </li>
        ))}
        {busy && <li className="evidence-turn evidence-thinking" role="status">{t.askThinking}</li>}
      </ol>

      {recording && <p className="evidence-recording" role="status">{t.voiceRecording(recording.seconds)}</p>}
      {voice.message && voice.status === "ready" && <p className="meaning-error" role="alert">{voice.message}</p>}

      <form className="evidence-ask" onSubmit={ask}>
        <label htmlFor="evidence-question" className="visually-hidden">{t.askInputLabel}</label>
        <input
          id="evidence-question"
          type="text"
          value={question}
          onChange={(event) => setQuestion(event.target.value)}
          placeholder={t.askPlaceholder}
          disabled={!ready || Boolean(recording)}
        />
        {canRecord() && (
          <button
            type="button"
            className={`evidence-mic ${recording ? "is-recording" : ""}`}
            aria-label={recording ? t.voiceStop : t.voiceAsk}
            aria-pressed={Boolean(recording)}
            onClick={toggleRecording}
            disabled={!ready || busy || voice.status === "loading"}
          >
            {recording ? <Square size={16} aria-hidden="true" /> : <Mic size={16} aria-hidden="true" />}
          </button>
        )}
        <button type="submit" aria-label={t.askSend} disabled={!ready || busy || Boolean(recording) || question.trim().length < 3}>
          <Send size={16} aria-hidden="true" />
        </button>
      </form>
    </section>
  );
}
