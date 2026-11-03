import { query, withTx } from "./_lib/db.js";
import { route, send } from "./_lib/http.js";
import { getSessionUser } from "./_lib/auth.js";
import { isAnswerCorrect, bestScores } from "./_lib/scoring.js";

export default route(["GET", "POST"], async (req, res) => {
  const session = await getSessionUser(req);
  if (!session) return send(res, 401, { error: "Please sign in." });

  if (req.method === "GET") {
    const { rows } = await query(
      `SELECT id, paper_num, score_pct, correct, wrong, skipped, total,
              time_taken, source, created_at
         FROM attempts WHERE user_id = $1
        ORDER BY created_at DESC LIMIT 200`,
      [session.id],
    );
    return send(res, 200, {
      attempts: rows,
      scores: await bestScores(query, session.id),
    });
  }

  // POST — record a finished attempt; the score is recomputed server-side.
  const { paperNum, answers, timeTaken } = req.body ?? {};
  const n = Number(paperNum);
  if (!Number.isInteger(n) || !Array.isArray(answers))
    return send(res, 400, { error: "paperNum and answers are required." });

  const { rows: qrows } = await query(
    "SELECT qid, data FROM questions WHERE paper_num = $1 ORDER BY position",
    [n],
  );
  if (qrows.length === 0) return send(res, 404, { error: "Paper not found." });
  if (answers.length !== qrows.length)
    return send(res, 400, { error: "Answer count does not match the paper." });

  let correct = 0, skipped = 0;
  const graded = qrows.map((row, i) => {
    const a = answers[i] ?? null;
    const valid = a === null || typeof a === "string" ||
      (Array.isArray(a) && a.every((x) => typeof x === "string"));
    const sel = valid ? a : null;
    if (sel === null) { skipped++; return { sel, ok: false }; }
    const ok = isAnswerCorrect(sel, row.data);
    if (ok) correct++;
    return { sel, ok };
  });
  const total = qrows.length;
  const wrong = total - correct - skipped;
  const scorePct = Math.round((correct / total) * 100);
  const secs = Number.isFinite(timeTaken) ? Math.max(0, Math.round(timeTaken)) : null;

  const attempt = await withTx(async (c) => {
    const { rows } = await c.query(
      `INSERT INTO attempts (user_id, paper_num, score_pct, correct, wrong, skipped, total, time_taken)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8)
       RETURNING id, paper_num, score_pct, correct, wrong, skipped, total, time_taken, source, created_at`,
      [session.id, n, scorePct, correct, wrong, skipped, total, secs],
    );
    const id = rows[0].id;
    await c.query(
      `INSERT INTO attempt_answers (attempt_id, position, qid, selected, is_correct)
       SELECT $1, t.pos, t.qid, t.sel, t.ok
         FROM unnest($2::int[], $3::text[], $4::jsonb[], $5::bool[]) AS t(pos, qid, sel, ok)`,
      [
        id,
        graded.map((_, i) => i),
        qrows.map((r) => r.qid),
        graded.map((g) => (g.sel === null ? null : JSON.stringify(g.sel))),
        graded.map((g) => g.ok),
      ],
    );
    return rows[0];
  });

  send(res, 201, { attempt, scores: await bestScores(query, session.id) });
});
