import { useState } from "react";
import { Plus, Trash2 } from "lucide-react";
import Dialog from "./Dialog.jsx";
import { PencilLine } from "lucide-react";

const DOMAINS = ["", "Development with AWS Services", "Security", "Deployment", "Troubleshooting and Optimization"];
const blank = () => ({ text: "", answers: ["", "", "", ""], correct: [], explanation: "", domain: "" });

/** Dialog for writing a brand-new multiple-choice question. Calls onAdd(question). */
export default function QuestionForm({ open, onClose, onAdd }) {
  const [q, setQ] = useState(blank);
  const [error, setError] = useState("");
  const set = (patch) => setQ((s) => ({ ...s, ...patch }));

  const setAnswer = (i, v) => set({ answers: q.answers.map((a, j) => (j === i ? v : a)) });
  const toggle = (i) => set({ correct: q.correct.includes(i) ? q.correct.filter((c) => c !== i) : q.correct.length < 2 ? [...q.correct, i] : q.correct });
  const remove = (i) => set({
    answers: q.answers.filter((_, j) => j !== i),
    correct: q.correct.filter((c) => c !== i).map((c) => (c > i ? c - 1 : c)),
  });

  const submit = () => {
    const answers = q.answers.map((a) => a.trim());
    if (q.text.trim().length < 10) return setError("Write the question (at least 10 characters).");
    if (answers.some((a) => !a)) return setError("Fill in every option, or remove the empty ones.");
    if (new Set(answers.map((a) => a.toLowerCase())).size !== answers.length) return setError("Options must be different from each other.");
    if (q.correct.length < 1) return setError("Tick the correct answer (tick two for a select-two question).");
    onAdd({ ...q, text: q.text.trim(), answers, explanation: q.explanation.trim() });
    setQ(blank()); setError(""); onClose();
  };

  return (
    <Dialog open={open} onClose={onClose} title="Write a question" icon={PencilLine} wide
      actions={<><button className="btn btn-ghost" onClick={onClose}>Cancel</button><button className="btn btn-primary" onClick={submit}>Add to paper</button></>}>
      <div className="qform">
        <label className="field"><span>Question</span>
          <textarea className="textarea" rows={3} maxLength={4000} value={q.text} onChange={(e) => set({ text: e.target.value })} placeholder="e.g. A developer needs to decouple two services. Which AWS service should they use?" autoFocus /></label>
        <fieldset className="qform-options">
          <legend>Options — tick the correct one{q.correct.length === 2 ? "s" : ""} <small className="muted">(tick two for "select two")</small></legend>
          {q.answers.map((a, i) => (
            <div className="qform-option" key={i}>
              <input type="checkbox" checked={q.correct.includes(i)} onChange={() => toggle(i)} aria-label={`Option ${i + 1} is correct`} />
              <input className="qform-input" value={a} maxLength={500} onChange={(e) => setAnswer(i, e.target.value)} placeholder={`Option ${i + 1}`} />
              {q.answers.length > 2 && <button type="button" className="icon-btn" onClick={() => remove(i)} aria-label="Remove option"><Trash2 size={15} /></button>}
            </div>
          ))}
          {q.answers.length < 5 && <button type="button" className="link-btn" onClick={() => set({ answers: [...q.answers, ""] })}><Plus size={14} /> Add option</button>}
        </fieldset>
        <label className="field"><span>Explanation <small>(optional, shown after answering)</small></span>
          <textarea className="textarea" rows={2} maxLength={2000} value={q.explanation} onChange={(e) => set({ explanation: e.target.value })} /></label>
        <label className="field"><span>Exam domain <small>(optional)</small></span>
          <select className="select" value={q.domain} onChange={(e) => set({ domain: e.target.value })}>
            {DOMAINS.map((d) => <option key={d} value={d}>{d || "—"}</option>)}
          </select></label>
        {error && <p className="auth-error">{error}</p>}
      </div>
    </Dialog>
  );
}
