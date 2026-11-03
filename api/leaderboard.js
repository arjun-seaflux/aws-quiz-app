import { query } from "./_lib/db.js";
import { route, send } from "./_lib/http.js";
import { getSessionUser } from "./_lib/auth.js";

// Opt-in ranking: sum of each user's best score per paper (max 100 per paper).
export default route(["GET"], async (req, res) => {
  const me = await getSessionUser(req);
  const { rows } = await query(
    `SELECT u.id, u.name, SUM(b.best)::int AS points, COUNT(*)::int AS papers, ROUND(AVG(b.best))::int AS avg
       FROM users u
       JOIN (SELECT user_id, paper_num, MAX(score_pct) AS best FROM attempts
              WHERE kind = 'paper' GROUP BY 1, 2) b ON b.user_id = u.id
      WHERE u.leaderboard_optin
      GROUP BY u.id ORDER BY points DESC, u.name LIMIT 100`);
  const board = rows.map((r, i) => ({ rank: i + 1, name: r.name, points: r.points, papers: r.papers, avg: r.avg, me: r.id === me?.id }));
  send(res, 200, { board: board.slice(0, 25), me: board.find((b) => b.me) ?? null });
});
