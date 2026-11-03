import { useRef } from "react";
import { Check } from "lucide-react";

const LETTERS = ["A", "B", "C", "D", "E"];

export default function Answers({
  answers,
  selectedAnswer,
  isMultiSelect,
  onSelect,
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

  return (
    <ul id="answers">
      {shuffledAnswers.current.map(({ answer }, i) => {
        const isSelected = isMultiSelect
          ? Array.isArray(selectedAnswer) && selectedAnswer.includes(answer)
          : selectedAnswer === answer;

        return (
          <li key={answer} className="answer">
            <button
              onClick={() => onSelect(answer)}
              className={isSelected ? "selected" : ""}
            >
              <span className={`answer-letter${isMultiSelect ? " multi" : ""}`}>
                {isMultiSelect && isSelected ? <Check size={14} strokeWidth={3} /> : LETTERS[i]}
              </span>
              {answer}
            </button>
          </li>
        );
      })}
    </ul>
  );
}
