import { query } from "./db.js";
import { send } from "./http.js";

export const clientIp = (req) =>
  String(req.headers["x-forwarded-for"] || req.socket?.remoteAddress || "unknown").split(",")[0].trim();

/** Fixed-window counter in Postgres. Returns true while under the limit. */
export async function hit(key, max, windowSec) {
  const { rows } = await query(
    `INSERT INTO rate_limits (key, window_start, count) VALUES ($1, now(), 1)
     ON CONFLICT (key) DO UPDATE SET
       count = CASE WHEN rate_limits.window_start < now() - make_interval(secs => $2) THEN 1 ELSE rate_limits.count + 1 END,
       window_start = CASE WHEN rate_limits.window_start < now() - make_interval(secs => $2) THEN now() ELSE rate_limits.window_start END
     RETURNING count`,
    [key, windowSec],
  );
  return rows[0].count <= max;
}

/** Sends 429 and returns false when the limit is exceeded. */
export async function limit(req, res, name, max, windowSec, extra = "") {
  const ok = await hit(`${name}:${clientIp(req)}${extra ? ":" + extra : ""}`, max, windowSec);
  if (!ok) send(res, 429, { error: "Too many attempts. Please wait a few minutes and try again." });
  return ok;
}
