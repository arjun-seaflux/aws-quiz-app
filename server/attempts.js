import { query, withTx } from "./_lib/db.js";
import { route, send } from "./_lib/http.js";
import { requireUser, parseKey } from "./_lib/guard.js";
import { bestScores } from "./_lib/scoring.js";
import { saveAttempt } from "./_lib/attempts.js";

export default route(["GET", "POST"], async (req, res) => {
  const session = await requireUser(req, res);
  if (!session) return;

  if (req.method === "GET") {
    const { rows } = await query(
      `SELECT id, paper_num, kind, score_pct, correct, wrong, skipped, total, time_taken, source, created_at
         FROM attempts WHERE user_id = $1 ORDER BY created_at DESC LIMIT 200`,
      [session.id],
    );
    return send(res, 200, { attempts: rows, scores: await bestScores(query, session.id) });
  }

  // POST — record a finished attempt; scores are recomputed server-side.
  const { kind = "paper", paperNum, answers, keys, secs, timeTaken } = req.body ?? {};
  if (!Array.isArray(answers)) return send(res, 400, { error: "answers are required." });
  const secsAt = (i) => (Array.isArray(secs) ? Number(secs[i]) : NaN);

  let items, attemptPaper;
  if (kind === "practice") {
    if (!Array.isArray(keys) || keys.length === 0 || keys.length > 100 || keys.length !== answers.length)
      return send(res, 400, { error: "keys and answers must match (max 100)." });
    const parsed = keys.map(parseKey);
    if (parsed.some((k) => !k)) return send(res, 400, { error: "Invalid question key." });
    const { rows } = await query(
      `SELECT q.paper_num, q.position, q.qid, q.data
         FROM unnest($1::int[], $2::int[]) AS t(p, s)
         JOIN questions q ON q.paper_num = t.p AND q.position = t.s`,
      [parsed.map((k) => k.paper), parsed.map((k) => k.pos)],
    );
    const byKey = new Map(rows.map((r) => [`${r.paper_num}:${r.position}`, r]));
    if (parsed.some((k) => !byKey.has(`${k.paper}:${k.pos}`)))
      return send(res, 404, { error: "Unknown question." });
    items = parsed.map((k, i) => {
      const r = byKey.get(`${k.paper}:${k.pos}`);
      return { srcPaper: k.paper, srcPos: k.pos, qid: r.qid, data: r.data, answer: answers[i], secs: secsAt(i) };
    });
    attemptPaper = 0;
  } else if (kind === "paper") {
    const n = Number(paperNum);
    if (!Number.isInteger(n)) return send(res, 400, { error: "paperNum is required." });
    const { rows } = await query(
      "SELECT position, qid, data FROM questions WHERE paper_num = $1 ORDER BY position", [n]);
    if (rows.length === 0) return send(res, 404, { error: "Paper not found." });
    if (answers.length !== rows.length) return send(res, 400, { error: "Answer count does not match the paper." });
    items = rows.map((r, i) => ({ srcPaper: n, srcPos: r.position, qid: r.qid, data: r.data, answer: answers[i], secs: secsAt(i) }));
    attemptPaper = n;
  } else {
    return send(res, 400, { error: "Unknown kind." });
  }

  const attempt = await withTx((c) =>
    saveAttempt(c, { userId: session.id, paperNum: attemptPaper, kind, items, timeTaken }));
  send(res, 201, { attempt, scores: await bestScores(query, session.id) });
});
