import { formatDate, sourceLanguage, verificationLabel } from "./dateLabels";

export default function Provenance({ item = {}, sources = [], status, date, linked = true }) {
  const source = sources[0];
  const name = item.source || source?.label || source?.source || "Curated reference";
  const url = item.url || item.canonicalUrl || source?.url;
  return (
    <span className="provenance">
      <span className="source-language" aria-label={`Source language: ${sourceLanguage(item) === "ta" ? "Tamil" : "English"}`}>{sourceLanguage(item)}</span>
      {url && linked ? <a href={url} target="_blank" rel="noreferrer">{name}</a> : <span>{name}</span>}
      <span>{date || item.publishedAt || item.date ? formatDate(date || item.publishedAt || item.date) : source?.retrievedAt ? `Retrieved ${formatDate(source.retrievedAt)}` : "Date unavailable"}</span>
      <span>{verificationLabel(status || item.verificationStatus)}</span>
    </span>
  );
}
