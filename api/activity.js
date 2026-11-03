import { query } from "./_lib/db.js";
import { route, send } from "./_lib/http.js";
import { requireUser } from "./_lib/guard.js";

const dayStr = (d) => d.toISOString().slice(0, 10);

// Questions answered per day (last 120 days), current/longest streak and today's goal progress.
export default route(["GET"], async (req, res) => {
  const s = await requireUser(req, res);
  if (!s) return;
  let tz = "UTC";
  if (req.query.tz) {
    const ok = await query("SELECT 1 FROM pg_timezone_names WHERE name = $1", [String(req.query.tz)]);
    if (ok.rows[0]) tz = String(req.query.tz);
  }
  const { rows } = await query(
    `SELECT to_char((a.created_at AT TIME ZONE $2)::date, 'YYYY-MM-DD') AS day,
            COUNT(*)::int AS answered, COUNT(*) FILTER (WHERE aa.is_correct)::int AS correct
       FROM attempt_answers aa JOIN attempts a ON a.id = aa.attempt_id
      WHERE a.user_id = $1 AND aa.selected IS NOT NULL AND a.created_at > now() - interval '125 days'
      GROUP BY 1 ORDER BY 1`, [s.id, tz]);
  const goal = (await query("SELECT daily_goal FROM users WHERE id = $1", [s.id])).rows[0]?.daily_goal ?? 10;
  const today = (await query("SELECT to_char((now() AT TIME ZONE $1)::date, 'YYYY-MM-DD') AS d", [tz])).rows[0].d;

  const active = new Set(rows.map((r) => r.day));
  const step = (str, delta) => { const d = new Date(`${str}T00:00:00Z`); d.setUTCDate(d.getUTCDate() + delta); return dayStr(d); };
  let streak = 0, cursor = active.has(today) ? today : step(today, -1);
  while (active.has(cursor)) { streak++; cursor = step(cursor, -1); }
  let longest = 0, run = 0, prev = null;
  for (const r of rows) {
    run = prev && step(prev, 1) === r.day ? run + 1 : 1;
    longest = Math.max(longest, run); prev = r.day;
  }
  send(res, 200, { days: rows, streak, longest, goal, today, todayCount: rows.find((r) => r.day === today)?.answered ?? 0 });
});
