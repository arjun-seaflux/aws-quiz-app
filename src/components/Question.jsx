import Answers from "./Answers.jsx";
import { useTheme } from "./ThemeContext.jsx";
import DOMPurify from "dompurify";
import { Flag } from "lucide-react";

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

export default function Question({
  index,
  total,
  question,
  selectedAnswer,
  isFlagged,
  onSelectAnswer,
  onFlag,
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
      />
    </div>
  );
}
