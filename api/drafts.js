import { query } from "./_lib/db.js";
import { route, send } from "./_lib/http.js";
import { requireUser } from "./_lib/guard.js";

// Server-side autosave of an in-progress exam so it can be resumed anywhere.
export default route(["GET", "POST"], async (req, res) => {
  const s = await requireUser(req, res);
  if (!s) return;
  if (req.method === "GET") {
    const n = Number(req.query.paper);
    const { rows } = await query("SELECT state, updated_at FROM drafts WHERE user_id=$1 AND paper_num=$2", [s.id, n]);
    return send(res, 200, { draft: rows[0] ?? null });
  }
  const { paper, state, remove } = req.body ?? {};
  if (!Number.isInteger(paper)) return send(res, 400, { error: "paper is required." });
  if (remove) {
    await query("DELETE FROM drafts WHERE user_id=$1 AND paper_num=$2", [s.id, paper]);
    return send(res, 200, { ok: true });
  }
  if (!state || JSON.stringify(state).length > 200_000) return send(res, 400, { error: "Invalid state." });
  await query(
    `INSERT INTO drafts (user_id, paper_num, state) VALUES ($1,$2,$3)
     ON CONFLICT (user_id, paper_num) DO UPDATE SET state = $3, updated_at = now()`,
    [s.id, paper, JSON.stringify(state)]);
  send(res, 200, { ok: true });
});
