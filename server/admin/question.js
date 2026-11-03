import { query } from "../_lib/db.js";
import { route, send } from "../_lib/http.js";
import { requireAdmin, parseKey } from "../_lib/guard.js";

function validate(d) {
  if (!d || typeof d !== "object") return "Question must be an object.";
  if (typeof d.text !== "string" || !d.text.trim()) return "text is required.";
  if (!Array.isArray(d.answers) || d.answers.length < 2 || d.answers.some((a) => typeof a !== "string"))
    return "answers must be an array of at least two strings.";
  const idx = Array.isArray(d.correctAnswerIndices) ? d.correctAnswerIndices : [d.correctAnswerIndex];
  if (!idx.length || idx.some((i) => !Number.isInteger(i) || i < 0 || i >= d.answers.length))
    return "correct answer index is out of range.";
  if (d.isMultiSelect && !Array.isArray(d.correctAnswerIndices)) return "multi-select needs correctAnswerIndices.";
  return null;
}

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
