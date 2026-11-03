import { query } from "./_lib/db.js";
import { route, send } from "./_lib/http.js";
import { requireUser, parseKey } from "./_lib/guard.js";

// Leitner boxes: days until the next review after landing in each box.
const DAYS = [0, 1, 3, 7, 14, 30, 60];

export default route(["GET", "POST"], async (req, res) => {
  const s = await requireUser(req, res);
  if (!s) return;

  if (req.method === "GET") {
    const due = await query(
      `SELECT c.src_paper, c.src_pos, c.box, c.reps, q.data
         FROM cards c JOIN questions q ON q.paper_num = c.src_paper AND q.position = c.src_pos
        WHERE c.user_id = $1 AND c.due_at <= now() ORDER BY c.due_at LIMIT 30`, [s.id]);
    const counts = await query(
      `SELECT COUNT(*)::int AS total, COUNT(*) FILTER (WHERE due_at <= now())::int AS due,
              COUNT(*) FILTER (WHERE box >= 4)::int AS learned FROM cards WHERE user_id = $1`, [s.id]);
    return send(res, 200, {
      counts: counts.rows[0],
      cards: due.rows.map((r) => ({ key: `${r.src_paper}:${r.src_pos}`, box: r.box, reps: r.reps, question: r.data })),
    });
  }

  const { action, key, grade } = req.body ?? {};
  const k = parseKey(key);
  if (!k) return send(res, 400, { error: "Invalid question key." });
  const q = await query("SELECT 1 FROM questions WHERE paper_num = $1 AND position = $2", [k.paper, k.pos]);
  if (!q.rows[0]) return send(res, 404, { error: "Unknown question." });

  if (action === "add") {
    await query(
      `INSERT INTO cards (user_id, src_paper, src_pos) VALUES ($1,$2,$3) ON CONFLICT DO NOTHING`,
      [s.id, k.paper, k.pos]);
    return send(res, 200, { ok: true });
  }
  if (action === "review" && ["again", "good", "easy"].includes(grade)) {
    const cur = await query("SELECT box FROM cards WHERE user_id=$1 AND src_paper=$2 AND src_pos=$3", [s.id, k.paper, k.pos]);
    if (!cur.rows[0]) return send(res, 404, { error: "Card not found." });
    const box = grade === "again" ? 0 : Math.min(6, cur.rows[0].box + (grade === "easy" ? 2 : 1));
    const mins = grade === "again" ? 10 : DAYS[box] * 1440;
    await query(
      `UPDATE cards SET box = $4, reps = reps + 1, lapses = lapses + $5, due_at = now() + make_interval(mins => $6)
        WHERE user_id = $1 AND src_paper = $2 AND src_pos = $3`,
      [s.id, k.paper, k.pos, box, grade === "again" ? 1 : 0, mins]);
    return send(res, 200, { ok: true, box });
  }
  send(res, 400, { error: "Unknown action." });
});
