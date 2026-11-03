// Mirrors isAnswerCorrect() in src/components/Summary.jsx so the server can
// recompute scores instead of trusting the client.
export function isAnswerCorrect(userAnswer, q) {
  if (q.isMultiSelect) {
    const correct = q.correctAnswerIndices.map((i) => q.answers[i]);
    if (!Array.isArray(userAnswer)) return false;
    if (userAnswer.length !== correct.length) return false;
    return correct.every((a) => userAnswer.includes(a));
  }
  return userAnswer === q.answers[q.correctAnswerIndex];
}

export async function bestScores(queryFn, userId) {
  const { rows } = await queryFn(
    `SELECT paper_num, MAX(score_pct)::int AS best
       FROM attempts WHERE user_id = $1 GROUP BY paper_num`,
    [userId],
  );
  return Object.fromEntries(rows.map((r) => [r.paper_num, r.best]));
}
