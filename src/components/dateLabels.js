import { shareText } from "../native";
const formatter = new Intl.RelativeTimeFormat("en-IN", { numeric: "auto" });

export const textLanguage = (text = "") => /[\u0B80-\u0BFF]/.test(text) ? "ta" : "en";
export const sourceLanguage = (item = {}) => item.language?.toLowerCase().startsWith("ta") || textLanguage(item.title || item.name || "") === "ta" ? "ta" : "EN";
export const indianNumber = (value) => new Intl.NumberFormat("en-IN", { maximumFractionDigits: 2 }).format(value);
export const formatMoneyText = (text = "") => text.replace(/₹([\d,.]+)/g, (_, amount) => `₹${indianNumber(Number(amount.replace(/,/g, "")))}`).replace(/\bCrores?\b/gi, "crore");
export const croreAmount = (value) => `₹${indianNumber(value)} crore`;

export const formatDate = (value) => {
  if (!value) return "Date unavailable";
  if (/^\d{4}$/.test(String(value))) return String(value);
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? String(value) : new Intl.DateTimeFormat("en-GB", {
    day: "2-digit", month: "short", year: "numeric", timeZone: "Asia/Kolkata",
  }).format(date);
};

export const formatDateTime = (value) => {
  const date = new Date(value);
  if (!value || Number.isNaN(date.getTime())) return "Date unavailable";
  return `${formatDate(value)} · ${new Intl.DateTimeFormat("en-GB", {
    hour: "2-digit", minute: "2-digit", hourCycle: "h23", timeZone: "Asia/Kolkata",
  }).format(date)} IST`;
};

export const verificationLabel = (status) => ({
  unverified_chatter: "Unverified claim", source_reported: "Source reported",
  official_eci: "Official ECI record", curated: "Curated · not independently verified",
}[status] || (status ? status.replace(/_/g, " ") : "Not independently verified"));

export const shareEvidence = async (story) => {
  const url = story.url || story.canonicalUrl;
  if (!url) return "Source link unavailable";
  const text = `${story.title}\n${story.source || "Source unavailable"} · ${formatDate(story.publishedAt || story.date)}\n${verificationLabel(story.verificationStatus)}\n${url}`;
  try {
    if (!(await shareText({ title: story.title, text }))) {
      await navigator.clipboard.writeText(text);
      return "Story and source copied";
    }
    return "Shared with source";
  } catch (error) {
    const cancelled = error?.name === "AbortError" || /cancel/i.test(error?.message || "");
    return cancelled ? "Share cancelled" : "Sharing unavailable on this device";
  }
};

export const relativeTime = (value, now) => {
  const timestamp = Date.parse(value);
  if (!Number.isFinite(timestamp)) return "date unavailable";
  const seconds = Math.round((timestamp - now) / 1000);
  if (Math.abs(seconds) < 60) return "just now";
  const unit = Math.abs(seconds) < 3600 ? "minute" : Math.abs(seconds) < 86400 ? "hour" : "day";
  const divisor = unit === "minute" ? 60 : unit === "hour" ? 3600 : 86400;
  return formatter.format(Math.round(seconds / divisor), unit);
};
