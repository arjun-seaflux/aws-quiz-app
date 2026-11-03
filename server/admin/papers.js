import { query } from "../_lib/db.js";
import { route, send } from "../_lib/http.js";
import { requireAdmin } from "../_lib/guard.js";

export default route(["GET", "POST"], async (req, res) => {
  const admin = await requireAdmin(req, res);
  if (!admin) return;

  if (req.method === "GET") {
    const status = ["pending", "approved", "rejected", "private"].includes(req.query.status) ? req.query.status : null;
    const { rows } = await query(
      `SELECT p.id, p.title, p.description, p.status, p.question_count AS "questionCount", p.review_note AS "reviewNote",
              p.updated_at AS "updatedAt", u.name AS author, u.email
         FROM user_papers p JOIN users u ON u.id = p.owner_id
        WHERE ($1::text IS NULL OR p.status = $1) AND p.status <> 'private'
        ORDER BY (p.status = 'pending') DESC, p.updated_at DESC LIMIT 200`, [status]);
    return send(res, 200, { papers: rows });
  }

  const { id, action } = req.body ?? {};
  const note = String(req.body?.note ?? "").trim().slice(0, 300);
  if (!Number.isInteger(id) || !["approve", "reject"].includes(action)) return send(res, 400, { error: "Invalid request." });
  if (action === "reject" && note.length < 3) return send(res, 400, { error: "Tell the author why (a short note)." });
  const r = action === "approve"
    ? await query(
        `UPDATE user_papers SET status='approved', review_note=NULL, approved_at=now(), approved_by=$2, updated_at=now()
          WHERE id=$1 AND status IN ('pending','rejected') RETURNING id`, [id, admin.id])
    : await query(
        `UPDATE user_papers SET status='rejected', review_note=$2, approved_at=NULL, approved_by=NULL, updated_at=now()
          WHERE id=$1 AND status IN ('pending','approved') RETURNING id`, [id, note]);
  r.rowCount ? send(res, 200, { ok: true }) : send(res, 409, { error: "That paper isn't in a state that allows this." });
});
