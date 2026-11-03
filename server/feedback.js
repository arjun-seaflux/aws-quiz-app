import { query } from "./_lib/db.js";
import { route, send } from "./_lib/http.js";
import { requireUser, parseKey } from "./_lib/guard.js";
import { hit } from "./_lib/ratelimit.js";

export default route(["POST"], async (req, res) => {
  const s = await requireUser(req, res);
  if (!s) return;
  const k = parseKey(req.body?.key);
  const message = String(req.body?.message ?? "").trim();
  if (!k) return send(res, 400, { error: "Invalid question key." });
  if (message.length < 5 || message.length > 500) return send(res, 400, { error: "Please write 5–500 characters." });
  if (!(await hit(`report:${s.id}`, 10, 3600))) return send(res, 429, { error: "Too many reports — try again later." });
  await query("INSERT INTO question_reports (user_id, src_paper, src_pos, message) VALUES ($1,$2,$3,$4)",
    [s.id, k.paper, k.pos, message]);
  send(res, 201, { ok: true });
});
