// Route table for the single /api function (Vercel's Hobby plan allows only 12 functions,
// so every handler is bundled behind one catch-all in api/[...path].js).
// ":name" segments become req.query.name.
import h0 from "./activity.js";
import h1 from "./admin/question.js";
import h2 from "./admin/reports.js";
import h3 from "./attempts.js";
import h4 from "./auth/forgot.js";
import h5 from "./auth/login.js";
import h6 from "./auth/logout.js";
import h7 from "./auth/register.js";
import h8 from "./auth/resend.js";
import h9 from "./auth/reset.js";
import h10 from "./auth/verify.js";
import h11 from "./bookmarks.js";
import h12 from "./cards.js";
import h13 from "./client-error.js";
import h14 from "./drafts.js";
import h15 from "./feedback.js";
import h16 from "./import-scores.js";
import h17 from "./leaderboard.js";
import h18 from "./me.js";
import h19 from "./mistakes.js";
import h20 from "./notes.js";
import h21 from "./practice.js";
import h22 from "./rooms/index.js";
import h23 from "./settings.js";
import h24 from "./stats.js";
import h25 from "./papers/[n].js";
import h26 from "./rooms/[code].js";

const ROUTES = [
  ["activity", h0],
  ["admin/question", h1],
  ["admin/reports", h2],
  ["attempts", h3],
  ["auth/forgot", h4],
  ["auth/login", h5],
  ["auth/logout", h6],
  ["auth/register", h7],
  ["auth/resend", h8],
  ["auth/reset", h9],
  ["auth/verify", h10],
  ["bookmarks", h11],
  ["cards", h12],
  ["client-error", h13],
  ["drafts", h14],
  ["feedback", h15],
  ["import-scores", h16],
  ["leaderboard", h17],
  ["me", h18],
  ["mistakes", h19],
  ["notes", h20],
  ["practice", h21],
  ["rooms", h22],
  ["settings", h23],
  ["stats", h24],
  ["papers/:n", h25],
  ["rooms/:code", h26],
].map(([pattern, handler]) => ({ segs: pattern.split("/"), handler }));

/** Finds the handler for "rooms/ABC123" → { handler, params: { code: "ABC123" } }. */
export function match(path) {
  const parts = path.split("/").filter(Boolean);
  for (const { segs, handler } of ROUTES) {
    if (segs.length !== parts.length) continue;
    const params = {};
    const ok = segs.every((s, i) => (s.startsWith(":") ? ((params[s.slice(1)] = decodeURIComponent(parts[i])), true) : s === parts[i]));
    if (ok) return { handler, params };
  }
  return null;
}
