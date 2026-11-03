import { query } from "../_lib/db.js";
import { route, send } from "../_lib/http.js";
import { requireAdmin, parseKey } from "../_lib/guard.js";
import { validateQuestion as validate } from "../_lib/questionShape.js";

export default route(["GET", "POST"], async (req, res) => {
  if (!(await requireAdmin(req, res))) return;
  const k = parseKey(req.method === "GET" ? req.query.key : req.body?.key);
  if (!k) return send(res, 400, { error: "Invalid question key." });
  if (req.method === "GET") {
    const { rows } = await query("SELECT data FROM questions WHERE paper_num=$1 AND position=$2", [k.paper, k.pos]);
    return rows[0] ? send(res, 200, { question: rows[0].data }) : send(res, 404, { error: "Not found." });
  }
  const err = validate(req.body?.data);
  if (err) return send(res, 400, { error: err });
  const r = await query("UPDATE questions SET data = $3 WHERE paper_num=$1 AND position=$2",
    [k.paper, k.pos, JSON.stringify(req.body.data)]);
  r.rowCount ? send(res, 200, { ok: true }) : send(res, 404, { error: "Not found." });
});
