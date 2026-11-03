export function formatDuration(secs) {
  if (secs == null) return "—";
  const m = Math.floor(secs / 60), s = secs % 60;
  return m > 0 ? `${m}m ${String(s).padStart(2, "0")}s` : `${s}s`;
}

export function formatDate(iso) {
  return new Date(iso).toLocaleDateString(undefined, { day: "numeric", month: "short", year: "numeric" });
}

export const firstName = (name) => (name || "").trim().split(/\s+/)[0] || "there";
