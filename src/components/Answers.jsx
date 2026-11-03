import { useEffect, useRef } from "react";
import { Check, X } from "lucide-react";

const LETTERS = ["A", "B", "C", "D", "E"];

export default function Answers({
  answers,
  selectedAnswer,
  isMultiSelect,
  onSelect,
  reveal = false,
  correctAnswers = [],
  reasons,
  allAnswers = answers,
}) {
  const shuffledAnswers = useRef();

  if (!shuffledAnswers.current) {
    const arr = answers.map((answer) => ({ answer }));
    // Fisher-Yates shuffle — unbiased, unlike sort(() => Math.random() - 0.5)
    for (let i = arr.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [arr[i], arr[j]] = [arr[j], arr[i]];
    }
    shuffledAnswers.current = arr;
  }
  const list = shuffledAnswers.current;

  // Keyboard: A–E or 1–5 choose the matching option.
  const onSelectRef = useRef(onSelect);
  useEffect(() => { onSelectRef.current = onSelect; }, [onSelect]);
  useEffect(() => {
    if (reveal) return;
    const onKey = (e) => {
      if (e.metaKey || e.ctrlKey || e.altKey) return;
      if (/input|textarea|select/i.test(e.target.tagName) || e.target.isContentEditable) return;
      if (document.querySelector(".dlg-backdrop")) return;
      const i = /^[1-5]$/.test(e.key) ? Number(e.key) - 1 : "abcde".indexOf(e.key.toLowerCase());
      if (i >= 0 && i < list.length) { e.preventDefault(); onSelectRef.current(list[i].answer); }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [list, reveal]);

  return (
    <ul id="answers">
      {list.map(({ answer }, i) => {
        const isSelected = isMultiSelect
          ? Array.isArray(selectedAnswer) && selectedAnswer.includes(answer)
          : selectedAnswer === answer;
        const isRight = correctAnswers.includes(answer);
        const state = reveal ? (isRight ? "correct" : isSelected ? "wrong" : "") : isSelected ? "selected" : "";
        const reason = reveal && reasons && (isRight || isSelected) ? reasons[allAnswers.indexOf(answer)] : null;

        return (
          <li key={answer} className="answer">
            <button onClick={() => onSelect(answer)} className={state} aria-pressed={isSelected} disabled={reveal}>
              <span className={`answer-letter${isMultiSelect ? " multi" : ""}`}>
                {reveal && isRight ? <Check size={14} strokeWidth={3} />
                  : reveal && isSelected ? <X size={14} strokeWidth={3} />
                  : isMultiSelect && isSelected ? <Check size={14} strokeWidth={3} /> : LETTERS[i]}
              </span>
              <span className="answer-body">
                {answer}
                {reason && <small className="answer-reason">{reason}</small>}
              </span>
            </button>
          </li>
        );
      })}
    </ul>
  );
}
