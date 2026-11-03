import Answers from "./Answers.jsx";
import { useTheme } from "./ThemeContext.jsx";
import DOMPurify from "dompurify";
import { CheckCircle2, Flag, XCircle } from "lucide-react";
import { isCorrect } from "../utils/grading.js";

// Detect if a string contains HTML tags
function containsHTML(str) {
  return /<[a-z][\s\S]*>/i.test(str);
}

function QuestionText({ text, darkMode }) {
  if (containsHTML(text)) {
    const clean = DOMPurify.sanitize(text, {
      ALLOWED_TAGS: [
        "p","strong","em","b","i","ul","ol","li","code","pre",
        "table","thead","tbody","tr","th","td","img","a","br","span","h1","h2","h3","h4","div",
      ],
      ALLOWED_ATTR: ["href","src","alt","class","style","target","rel"],
    });
    return (
      <div
        className="question-html-content"
        style={darkMode ? { color: "white",whiteSpace:'pre-wrap' } : {whiteSpace:'pre-wrap'}}
        dangerouslySetInnerHTML={{ __html: clean }}
      />
    );
  }
  return (
    <h2 style={darkMode ? { color: "white" } : {}}>
      {text.split("\n").map((line, i) => (
        <p key={i} style={darkMode ? { color: "white" } : {}}>
          {line}
        </p>
      ))}
    </h2>
  );
}

function FeedbackText({ text }) {
  if (containsHTML(text)) {
    return (
      <div className="question-html-content"
        dangerouslySetInnerHTML={{ __html: DOMPurify.sanitize(text, { ALLOWED_TAGS: ["p","strong","em","b","i","ul","ol","li","code","pre","br","span","a"], ALLOWED_ATTR: ["href","target","rel"] }) }} />
    );
  }
  return <p>{text}</p>;
}

export default function Question({
  index,
  total,
  question,
  selectedAnswer,
  isFlagged,
  onSelectAnswer,
  onFlag,
  reveal = false,
  onCheck = null,
}) {
  const { theme } = useTheme();
  const darkMode = theme === "dark";
  return (
    <div id="question">
      <div className="question-nav-row">
        <span className="q-badge">
          Question {index + 1} of {total}
          {question.isMultiSelect && (
            <span className="multi-badge"> · Select TWO</span>
          )}
        </span>
        <button
          className={`flag-btn${isFlagged ? " flagged" : ""}`}
          onClick={onFlag}
        >
          <Flag size={14} fill={isFlagged ? "currentColor" : "none"} /> {isFlagged ? "Flagged" : "Flag"}
        </button>
      </div>

      <QuestionText text={question.text} darkMode={darkMode} />

      <Answers
        answers={question.answers}
        selectedAnswer={selectedAnswer}
        isMultiSelect={question.isMultiSelect}
        onSelect={onSelectAnswer}
        reveal={reveal}
        correctAnswers={question.correctAnswerIndices?.map((i) => question.answers[i]) ?? []}
        reasons={question.answerExplanations}
        allAnswers={question.answers}
      />

      {onCheck && !reveal && question.isMultiSelect && (
        <button className="btn btn-primary check-btn" onClick={onCheck} disabled={!selectedAnswer}>
          Check answer
        </button>
      )}

      {reveal && (
        <div className={`feedback ${isCorrect(selectedAnswer, question) ? "feedback--ok" : "feedback--bad"}`}>
          <strong>
            {isCorrect(selectedAnswer, question)
              ? <><CheckCircle2 size={18} /> Correct</>
              : <><XCircle size={18} /> Not quite — the right answer is highlighted</>}
          </strong>
          {question.explanation && <FeedbackText text={question.explanation} />}
        </div>
      )}
    </div>
  );
}
