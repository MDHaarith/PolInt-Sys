import { useEffect, useMemo, useRef, useState } from "react";
import { ExternalLink, Send } from "lucide-react";
import { MODEL_DOWNLOAD_MB, canEncodeQueries, loadQueryEncoder } from "../semanticSearch";
import { CHAT_MODEL, chatMessages, decodeEvidencePack, evidenceFor, loadChatModel, readReply } from "../evidenceChat";
import { evidencePackFile, loadData } from "../dataSource";
import { formatDateTime } from "./dateLabels";

const KIND_LABEL = { report: "Report", claim: "Party outlet's claim" };

// Ask a question; the answer is passages from trusted outlets, word for word,
// each with its outlet, date and link. See src/evidenceChat.js.
export default function EvidenceChat() {
  const [pack, setPack] = useState({ status: "loading", decoded: null });
  const [gpuReady, setGpuReady] = useState(null);
  const [models, setModels] = useState({ status: "idle", progress: 0, message: "" });
  const [question, setQuestion] = useState("");
  const [turns, setTurns] = useState([]);
  const [busy, setBusy] = useState(false);
  const encoderRef = useRef(null);
  const chatRef = useRef(null);

  useEffect(() => {
    loadData(evidencePackFile)
      .then((value) => setPack({ status: "ready", decoded: decodeEvidencePack(value), days: value.days, generatedAt: value.generatedAt }))
      .catch(() => setPack({ status: "missing", decoded: null }));
    canEncodeQueries().then(setGpuReady);
  }, []);

  const startModels = async () => {
    setModels({ status: "loading", progress: 0, message: "" });
    // Search model first, then the chat model; each counts for half the bar.
    const progress = (offset) => (event) => {
      if (event.status === "progress" && event.file?.includes(".onnx")) {
        setModels({ status: "loading", progress: Math.round(offset + (event.progress || 0) / 2), message: "" });
      }
    };
    try {
      encoderRef.current = await loadQueryEncoder(progress(0));
      chatRef.current = await loadChatModel(progress(50));
      setModels({ status: "ready", progress: 100, message: "" });
    } catch (error) {
      setModels({ status: "error", progress: 0, message: String(error.message || error) });
    }
  };

  const ask = async (event) => {
    event.preventDefault();
    const text = question.trim();
    if (text.length < 3 || busy || !pack.decoded || models.status !== "ready") return;
    setBusy(true);
    setQuestion("");
    try {
      const vector = await encoderRef.current(text, pack.decoded.dimensions);
      const passages = evidenceFor(pack.decoded, vector);
      const shown = passages.length
        ? readReply(await chatRef.current(chatMessages(text, passages)), text, passages)
        : { status: "no_evidence", quotes: [], summary: null };
      setTurns((previous) => [...previous, { question: text, ...shown }]);
    } catch (error) {
      setTurns((previous) => [...previous, { question: text, status: "error", quotes: [], message: String(error.message || error) }]);
    } finally {
      setBusy(false);
    }
  };

  const downloadMb = useMemo(() => MODEL_DOWNLOAD_MB + CHAT_MODEL.downloadMb, []);

  return (
    <section className="evidence-chat" aria-labelledby="evidence-chat-title">
      <header className="evidence-chat-header">
        <h1 id="evidence-chat-title">Ask</h1>
        <p>
          Answers come only from trusted outlets{pack.days ? ` in the last ${pack.days} days` : ""}, quoted word for word
          with their source. If nothing answers your question, it says so.
        </p>
      </header>

      {pack.status === "missing" && <div className="meaning-panel" role="status"><p>The evidence file is not available yet. It is published with the daily news update.</p></div>}

      {pack.status === "ready" && models.status !== "ready" && (
        <div className="meaning-panel" role="status">
          {gpuReady === false ? (
            <p>Asking questions needs WebGPU, which this device does not offer.</p>
          ) : models.status === "loading" ? (
            <>
              <p>Downloading the models… {models.progress}%</p>
              <progress max="100" value={models.progress} />
            </>
          ) : (
            <>
              <p>
                Ask runs on this phone. It downloads two models once (about {downloadMb} MB, best on Wi-Fi): one finds the
                evidence, the other picks the passages that answer you.
              </p>
              {models.status === "error" && <p className="meaning-error">Download failed: {models.message}</p>}
              <button type="button" className="load-more-intel-btn" onClick={startModels} disabled={gpuReady === null}>
                Download and turn on
              </button>
            </>
          )}
        </div>
      )}

      <ol className="evidence-turns" aria-live="polite">
        {turns.map((turn, index) => (
          <li key={index} className="evidence-turn">
            <p className="evidence-question">{turn.question}</p>
            {turn.status === "answered" ? (
              <div className="evidence-answer">
                {turn.summary && (
                  <p className="evidence-summary">
                    <span className="evidence-summary-label">Summary, checked against the quotes below</span>
                    {turn.summary}
                  </p>
                )}
                <ul className="evidence-quotes">
                  {turn.quotes.map((quote) => (
                    <li key={quote.id} className={`evidence-quote evidence-${quote.kind}`}>
                      <blockquote lang={quote.language}>{quote.text}</blockquote>
                      <p className="evidence-proof">
                        <strong>{quote.source}</strong>
                        <span>{KIND_LABEL[quote.kind] || quote.kind}</span>
                        <time dateTime={quote.publishedAt}>{formatDateTime(quote.publishedAt)}</time>
                        {quote.corroboratedBy?.length > 0 && (
                          <span title={quote.corroboratedBy.join(", ")}>
                            Also reported by {quote.corroboratedBy.length} {quote.corroboratedBy.length === 1 ? "outlet" : "outlets"}
                          </span>
                        )}
                        <a href={quote.url} target="_blank" rel="noopener noreferrer">
                          Source <ExternalLink size={12} aria-hidden="true" />
                        </a>
                      </p>
                    </li>
                  ))}
                </ul>
              </div>
            ) : (
              <p className="evidence-none">
                {turn.status === "error"
                  ? `Something went wrong: ${turn.message}`
                  : turn.status === "unreadable"
                    ? "The model's reply could not be read. Try asking again in other words."
                    : "No trusted source in the evidence answers this."}
              </p>
            )}
          </li>
        ))}
        {busy && <li className="evidence-turn evidence-thinking" role="status">Looking through the evidence…</li>}
      </ol>

      <form className="evidence-ask" onSubmit={ask}>
        <label htmlFor="evidence-question" className="visually-hidden">Your question, in Tamil or English</label>
        <input
          id="evidence-question"
          type="text"
          value={question}
          onChange={(event) => setQuestion(event.target.value)}
          placeholder="Ask in Tamil or English…"
          disabled={models.status !== "ready" || !pack.decoded}
          lang="ta"
        />
        <button type="submit" aria-label="Ask" disabled={models.status !== "ready" || busy || question.trim().length < 3}>
          <Send size={16} aria-hidden="true" />
        </button>
      </form>
    </section>
  );
}
