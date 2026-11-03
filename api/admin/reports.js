import { query } from "../_lib/db.js";
import { route, send } from "../_lib/http.js";
import { requireAdmin } from "../_lib/guard.js";

export default route(["GET", "POST"], async (req, res) => {
  if (!(await requireAdmin(req, res))) return;
  if (req.method === "POST") {
    const { id, status } = req.body ?? {};
    if (!Number.isInteger(id) || !["open", "resolved", "dismissed"].includes(status))
      return send(res, 400, { error: "Invalid request." });
    await query("UPDATE question_reports SET status = $2 WHERE id = $1", [id, status]);
    return send(res, 200, { ok: true });
  }
  const status = req.query.status === "all" ? null : "open";
  const { rows } = await query(
    `SELECT r.id, r.src_paper, r.src_pos, r.message, r.status, r.created_at, u.email, q.data->>'text' AS text
       FROM question_reports r LEFT JOIN users u ON u.id = r.user_id
       LEFT JOIN questions q ON q.paper_num = r.src_paper AND q.position = r.src_pos
      WHERE ($1::text IS NULL OR r.status = $1) ORDER BY r.created_at DESC LIMIT 200`, [status]);
  send(res, 200, { reports: rows });
});
