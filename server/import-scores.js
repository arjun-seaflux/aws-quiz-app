import { query, withTx } from "./_lib/db.js";
import { route, send } from "./_lib/http.js";
import { getSessionUser } from "./_lib/auth.js";
import { bestScores } from "./_lib/scoring.js";

// One-time import of scores a user earned as a guest (kept in localStorage).
export default route(["POST"], async (req, res) => {
  const session = await getSessionUser(req);
  if (!session) return send(res, 401, { error: "Please sign in." });

  const input = req.body?.scores;
  if (!input || typeof input !== "object") return send(res, 400, { error: "scores required." });

  const current = await bestScores(query, session.id);
  const { rows: papers } = await query(
    "SELECT paper_num, COUNT(*)::int AS total FROM questions GROUP BY paper_num",
  );
  const totals = Object.fromEntries(papers.map((p) => [p.paper_num, p.total]));

  await withTx(async (c) => {
    for (const [k, v] of Object.entries(input)) {
      const n = Number(k), pct = Math.round(Number(v));
      if (!totals[n] || !Number.isFinite(pct) || pct < 0 || pct > 100) continue;
      if ((current[n] ?? -1) >= pct) continue;
      const total = totals[n];
      const correct = Math.round((pct / 100) * total);
      await c.query(
        `INSERT INTO attempts (user_id, paper_num, score_pct, correct, wrong, skipped, total, source)
         VALUES ($1,$2,$3,$4,$5,0,$6,'import')`,
        [session.id, n, pct, correct, total - correct, total],
      );
    }
  });
  send(res, 200, { scores: await bestScores(query, session.id) });
});
