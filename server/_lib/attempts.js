import { isAnswerCorrect } from "./scoring.js";

/**
 * Grades and stores one attempt (paper exam, custom practice or room round).
 * `items`: [{ srcPaper, srcPos, qid, data, answer, secs }]  (answer: null | string | string[])
 * Wrong answers also become flashcards. Must run inside a transaction client.
 */
export async function saveAttempt(c, { userId, paperNum, kind, source = "quiz", items, timeTaken }) {
  let correct = 0, skipped = 0;
  const graded = items.map((it) => {
    const a = it.answer ?? null;
    const valid = a === null || typeof a === "string" || (Array.isArray(a) && a.every((x) => typeof x === "string"));
    const sel = valid ? a : null;
    if (sel === null) { skipped++; return { ...it, sel, ok: false }; }
    const ok = isAnswerCorrect(sel, it.data);
    if (ok) correct++;
    return { ...it, sel, ok };
  });
  const total = items.length;
  const wrong = total - correct - skipped;
  const scorePct = total ? Math.round((correct / total) * 100) : 0;
  const secs = Number.isFinite(timeTaken) ? Math.max(0, Math.round(timeTaken)) : null;

  const { rows } = await c.query(
    `INSERT INTO attempts (user_id, paper_num, kind, source, score_pct, correct, wrong, skipped, total, time_taken)
     VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10)
     RETURNING id, paper_num, kind, score_pct, correct, wrong, skipped, total, time_taken, source, created_at`,
    [userId, paperNum, kind, source, scorePct, correct, wrong, skipped, total, secs],
  );
  const attempt = rows[0];

  await c.query(
    `INSERT INTO attempt_answers (attempt_id, position, qid, selected, is_correct, src_paper, src_pos, secs)
     SELECT $1, t.pos, t.qid, t.sel, t.ok, t.sp, t.sq, t.secs
       FROM unnest($2::int[], $3::text[], $4::jsonb[], $5::bool[], $6::int[], $7::int[], $8::int[])
            AS t(pos, qid, sel, ok, sp, sq, secs)`,
    [
      attempt.id,
      graded.map((_, i) => i),
      graded.map((g) => g.qid ?? ""),
      graded.map((g) => (g.sel === null ? null : JSON.stringify(g.sel))),
      graded.map((g) => g.ok),
      graded.map((g) => g.srcPaper),
      graded.map((g) => g.srcPos),
      graded.map((g) => (Number.isFinite(g.secs) ? Math.max(0, Math.min(3600, Math.round(g.secs))) : null)),
    ],
  );

  const missed = graded.filter((g) => g.sel !== null && !g.ok);
  if (missed.length) {
    await c.query(
      `INSERT INTO cards (user_id, src_paper, src_pos)
       SELECT $1, t.sp, t.sq FROM unnest($2::int[], $3::int[]) AS t(sp, sq)
       ON CONFLICT (user_id, src_paper, src_pos)
       DO UPDATE SET box = 0, due_at = now(), lapses = cards.lapses + 1`,
      [userId, missed.map((g) => g.srcPaper), missed.map((g) => g.srcPos)],
    );
  }
  return attempt;
}
