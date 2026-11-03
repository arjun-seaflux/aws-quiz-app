import { query } from "./_lib/db.js";
import { route, send } from "./_lib/http.js";
import { requireUser } from "./_lib/guard.js";

// The mistake notebook: questions whose most recent answer was wrong or skipped.
export default route(["GET"], async (req, res) => {
  const s = await requireUser(req, res);
  if (!s) return;
  const { rows } = await query(
    `WITH last AS (
       SELECT DISTINCT ON (aa.src_paper, aa.src_pos) aa.src_paper, aa.src_pos, aa.is_correct, a.created_at
         FROM attempt_answers aa JOIN attempts a ON a.id = aa.attempt_id
        WHERE a.user_id = $1 AND aa.src_paper IS NOT NULL
        ORDER BY aa.src_paper, aa.src_pos, a.created_at DESC),
     misses AS (
       SELECT aa.src_paper, aa.src_pos, COUNT(*)::int AS times
         FROM attempt_answers aa JOIN attempts a ON a.id = aa.attempt_id
        WHERE a.user_id = $1 AND NOT aa.is_correct AND aa.src_paper IS NOT NULL
        GROUP BY 1, 2)
     SELECT l.src_paper, l.src_pos, l.is_correct, l.created_at, m.times, q.data
       FROM last l JOIN misses m USING (src_paper, src_pos)
       JOIN questions q ON q.paper_num = l.src_paper AND q.position = l.src_pos
      ORDER BY l.is_correct, l.created_at DESC LIMIT 400`, [s.id]);
  const open = rows.filter((r) => !r.is_correct).map((r) => ({
    key: `${r.src_paper}:${r.src_pos}`, times: r.times, lastAt: r.created_at, question: { ...r.data, _key: `${r.src_paper}:${r.src_pos}` } }));
  send(res, 200, { mistakes: open, mastered: rows.length - open.length });
});
