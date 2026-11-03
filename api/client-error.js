import { query } from "./_lib/db.js";
import { route, send } from "./_lib/http.js";
import { getSessionUser } from "./_lib/auth.js";
import { limit } from "./_lib/ratelimit.js";

// Lightweight browser error reporting (rate-limited per IP). View with the SQL in README.
export default route(["POST"], async (req, res) => {
  if (!(await limit(req, res, "client-error", 20, 3600))) return;
  const b = req.body ?? {};
  const u = await getSessionUser(req);
  await query(
    "INSERT INTO client_errors (message, stack, url, user_agent, user_id) VALUES ($1,$2,$3,$4,$5)",
    [String(b.message ?? "").slice(0, 500), String(b.stack ?? "").slice(0, 4000), String(b.url ?? "").slice(0, 300),
     String(req.headers["user-agent"] ?? "").slice(0, 300), u?.id ?? null]);
  send(res, 202, { ok: true });
});
