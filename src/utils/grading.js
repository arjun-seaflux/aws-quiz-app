// Client-side mirror of api/_lib/scoring.js isAnswerCorrect().
export function isCorrect(userAnswer, q) {
  if (userAnswer == null) return false;
  if (q.isMultiSelect) {
    const correct = q.correctAnswerIndices.map((i) => q.answers[i]);
    return Array.isArray(userAnswer) && userAnswer.length === correct.length && correct.every((a) => userAnswer.includes(a));
  }
  return userAnswer === q.answers[q.correctAnswerIndex];
}
