import { query, withTx } from "../_lib/db.js";
import { route, send } from "../_lib/http.js";
import { getSessionUser } from "../_lib/auth.js";
import { hit } from "../_lib/ratelimit.js";
import { PaperError, savePaper } from "../_lib/community.js";

const COLS = `p.id, p.title, p.description, p.status, p.question_count AS "questionCount",
              p.created_at AS "createdAt", p.approved_at AS "approvedAt", p.review_note AS "reviewNote", u.name AS author`;

export default route(["GET", "POST"], async (req, res) => {
  const s = await getSessionUser(req);

  if (req.method === "GET") {
    if (req.query.mine) {
      if (!s) return send(res, 401, { error: "Please sign in." });
      const { rows } = await query(
        `SELECT ${COLS} FROM user_papers p JOIN users u ON u.id = p.owner_id
          WHERE p.owner_id = $1 ORDER BY p.updated_at DESC`, [s.id]);
      return send(res, 200, { papers: rows });
    }
    const { rows } = await query(
      `SELECT ${COLS} FROM user_papers p JOIN users u ON u.id = p.owner_id
        WHERE p.status = 'approved' ORDER BY p.approved_at DESC LIMIT 100`);
    return send(res, 200, { papers: rows });
  }

  if (!s) return send(res, 401, { error: "Please sign in." });
  if (!(await hit(`paper-create:${s.id}`, 10, 3600))) return send(res, 429, { error: "You're creating papers too quickly — try again later." });
  try {
    const out = await withTx((c) => savePaper(c, { userId: s.id, title: req.body?.title, description: req.body?.description, items: req.body?.items }));
    send(res, 201, { id: out.id });
  } catch (e) {
    if (e instanceof PaperError) return send(res, e.status, { error: e.message });
    throw e;
  }
});
