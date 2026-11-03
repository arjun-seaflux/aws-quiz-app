export const DOMAINS = ["Development with AWS Services", "Security", "Deployment", "Troubleshooting and Optimization"];

/** Validates a stored question object (used by the admin editor). Returns an error string or null. */
export function validateQuestion(d) {
  if (!d || typeof d !== "object") return "Question must be an object.";
  if (typeof d.text !== "string" || !d.text.trim()) return "text is required.";
  if (!Array.isArray(d.answers) || d.answers.length < 2 || d.answers.some((a) => typeof a !== "string"))
    return "answers must be an array of at least two strings.";
  const idx = Array.isArray(d.correctAnswerIndices) ? d.correctAnswerIndices : [d.correctAnswerIndex];
  if (!idx.length || idx.some((i) => !Number.isInteger(i) || i < 0 || i >= d.answers.length))
    return "correct answer index is out of range.";
  if (d.isMultiSelect && !Array.isArray(d.correctAnswerIndices)) return "multi-select needs correctAnswerIndices.";
  return null;
}

/**
 * Turns what a learner typed into the canonical stored shape.
 * input: { text, answers: string[], correct: number[], explanation?, domain? }
 * Returns { data } or { error }.
 */
export function buildAuthoredQuestion(input) {
  const text = String(input?.text ?? "").trim();
  if (text.length < 10 || text.length > 4000) return { error: "Question text must be 10–4000 characters." };
  const answers = Array.isArray(input?.answers) ? input.answers.map((a) => String(a ?? "").trim()) : [];
  if (answers.length < 2 || answers.length > 5) return { error: "Provide 2–5 answer options." };
  if (answers.some((a) => !a || a.length > 500)) return { error: "Every option needs 1–500 characters." };
  if (new Set(answers.map((a) => a.toLowerCase())).size !== answers.length) return { error: "Options must be different from each other." };
  const correct = [...new Set(Array.isArray(input?.correct) ? input.correct : [])];
  if (!correct.every((i) => Number.isInteger(i) && i >= 0 && i < answers.length)) return { error: "Invalid correct answer." };
  if (correct.length < 1 || correct.length > 2) return { error: "Mark one correct answer (or two for a select-two question)." };
  const explanation = String(input?.explanation ?? "").trim().slice(0, 2000);
  const domain = DOMAINS.includes(input?.domain) ? input.domain : "";
  const sorted = [...correct].sort((a, b) => a - b);
  return {
    data: {
      text, answers, domain, explanation,
      correctAnswerIndex: sorted[0], correctAnswerIndices: sorted, isMultiSelect: sorted.length === 2,
      answerExplanations: answers.map(() => ""),
    },
  };
}
