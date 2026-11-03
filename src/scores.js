// Guest scores live in localStorage (same key/format as before accounts existed).
const STORAGE_KEY = "dva_paper_scores";
export const UNLOCK_THRESHOLD = Number(localStorage.getItem("UNLOCK_THRESHOLD")) || 80;
export const PASS_MARK = 72;

export function loadLocalScores() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? JSON.parse(atob(raw)) : {};
  } catch {
    return {};
  }
}

export function saveLocalScores(scores) {
  try { localStorage.setItem(STORAGE_KEY, btoa(JSON.stringify(scores))); } catch { /* storage unavailable */ }
}

export function computeUnlocked(scores, total) {
  const unlocked = { 1: true };
  for (let n = 2; n <= total; n++) unlocked[n] = (scores[n - 1] ?? 0) >= UNLOCK_THRESHOLD;
  return unlocked;
}
