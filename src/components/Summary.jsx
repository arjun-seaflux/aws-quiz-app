import { useState, useEffect, useCallback, useRef } from "react";
import { useTheme } from "./ThemeContext.jsx";
import { exportQuizToPDF } from "../utils/pdfExport.js";
import DOMPurify from "dompurify";

const PASS_THRESHOLD = 72;

function isAnswerCorrect(userAnswer, question) {
  if (question.isMultiSelect) {
    const correctAnswers = question.correctAnswerIndices.map(
      (i) => question.answers[i]
    );
    if (!Array.isArray(userAnswer)) return false;
    if (userAnswer.length !== correctAnswers.length) return false;
    return correctAnswers.every((a) => userAnswer.includes(a));
  } else {
    return userAnswer === question.answers[question.correctAnswerIndex];
  }
}

function containsHTML(str) {
  return /<[a-z][\s\S]*>/i.test(str);
}

function SafeQuestionText({ text, darkMode }) {
  if (containsHTML(text)) {
    const clean = DOMPurify.sanitize(text, {
      ALLOWED_TAGS: ["p","strong","em","b","i","ul","ol","li","code","pre","table","thead","tbody","tr","th","td","br","span","a"],
      ALLOWED_ATTR: ["href","class","style","target"],
    });
    return (
      <div
        className="review-q-html"
        style={darkMode ? { color: "white" } : {}}
        dangerouslySetInnerHTML={{ __html: clean }}
      />
    );
  }
  return <p className="review-q-text" style={darkMode ? { color: "white" } : {}}>{text}</p>;
}

// ── Domain Performance Card ─────────────────────────────────────────────────
function DomainCard({ domain, stats, darkMode }) {
  const pct = stats.total > 0 ? Math.round((stats.correct / stats.total) * 100) : 0;
  const passing = pct >= PASS_THRESHOLD;
  return (
    <div className={`domain-card ${passing ? "domain-card--pass" : "domain-card--fail"}`}>
      <div className="domain-card-header">
        <span className="domain-card-name">{domain}</span>
        <span className={`domain-card-pct ${passing ? "pct-pass" : "pct-fail"}`}>{pct}%</span>
      </div>
      <div className="domain-progress-bar">
        <div
          className={`domain-progress-fill ${passing ? "fill-pass" : "fill-fail"}`}
          style={{ width: `${pct}%` }}
        />
      </div>
      <div className="domain-card-stats">
        <span className="domain-stat"><span className="ds-num ds-total">{stats.total}</span>Total</span>
        <span className="domain-stat"><span className="ds-num ds-correct">{stats.correct}</span>Correct</span>
        <span className="domain-stat"><span className="ds-num ds-wrong">{stats.wrong}</span>Wrong</span>
        <span className="domain-stat"><span className="ds-num ds-skipped">{stats.skipped}</span>Skipped</span>
      </div>
    </div>
  );
}

// ── Review Item ─────────────────────────────────────────────────────────────
function ReviewItem({ answer, question, index, darkMode }) {
  const [expanded, setExpanded] = useState(false);
  const isSkipped = answer === null;
  const isCorrect = !isSkipped && isAnswerCorrect(answer, question);
  const status = isSkipped ? "skipped" : isCorrect ? "correct" : "wrong";
  const correctAnswers = question.correctAnswerIndices.map((i) => question.answers[i]);
  const mainExplanation = question.explanation || "";
  const getAnswerReason = (choiceText) => {
    if (!question.answerExplanations) return null;
    const idx = question.answers.indexOf(choiceText);
    if (idx === -1) return null;
    return question.answerExplanations[idx] || null;
  };
  const userAnswerArr = Array.isArray(answer) ? answer : answer ? [answer] : [];

  return (
    <li className={`review-item review-item--${status}`} style={{ padding: "0px 24px" }}>
      <div className="review-item-header">
        <div className="review-item-meta">
          <span className="review-q-num">Q{index + 1}</span>
          {question.isMultiSelect && <span className="review-domain">Select TWO</span>}
          {question.domain && (
            <span className="review-domain review-domain--topic">{question.domain}</span>
          )}
        </div>
        <span className={`result-badge ${status}`}>
          {status.charAt(0).toUpperCase() + status.slice(1)}
        </span>
      </div>

      <SafeQuestionText text={question.text} darkMode={darkMode} />

      <div className="review-item-body">
        <div className="review-answer-row">
          <span className="review-answer-label">Your answer:</span>
          {isSkipped ? (
            <span className="review-answer-val skipped-val">Not answered</span>
          ) : (
            <span className={`review-answer-val ${isCorrect ? "your-correct" : "your-wrong"}`}>
              {userAnswerArr.join(" & ")}
            </span>
          )}
        </div>
        {!isCorrect && (
          <div className="review-answer-row">
            <span className="review-answer-label">Correct:</span>
            <span className="review-answer-val correct-ans">{correctAnswers.join(" & ")}</span>
          </div>
        )}
      </div>

      {mainExplanation && (
        <button
          className={`explain-toggle ${expanded ? "open" : ""}`}
          onClick={() => setExpanded((v) => !v)}
          aria-expanded={expanded}
        >
          {expanded ? "Hide explanation ▲" : "Why? ▼"}
        </button>
      )}

      {expanded && mainExplanation && (
        <div className="explanation-panel">
          <ul className="choice-breakdown">
            {question.answers.map((choice, idx) => {
              const isChoiceCorrect = question.correctAnswerIndices.includes(idx);
              const reason = getAnswerReason(choice);
              const wasChosen = userAnswerArr.includes(choice);
              return (
                <li
                  key={idx}
                  className={`choice-row ${isChoiceCorrect ? "choice-correct" : "choice-incorrect"} ${wasChosen ? "choice-chosen" : ""}`}
                >
                  <div className="choice-row-header">
                    <span className="choice-indicator">{isChoiceCorrect ? "✓" : "✗"}</span>
                    <span className="choice-text">{choice}</span>
                    {wasChosen && <span className="choice-yours-tag">Your pick</span>}
                  </div>
                </li>
              );
            })}
          </ul>
          <p className="explanation-main" dangerouslySetInnerHTML={{ __html: mainExplanation }} style={{ whiteSpace: "pre-wrap" }}></p>
        </div>
      )}
    </li>
  );
}

// ── Main Summary ─────────────────────────────────────────────────────────────
export default function Summary({
  userAnswers,
  questions,
  paperNum,
  onBackToHome,
  onPaperComplete,
  timeTaken,
}) {
  const [filter, setFilter] = useState("all");
  const [pdfLoading, setPdfLoading] = useState(false);
  const { theme } = useTheme();
  const darkMode = theme === "dark";

  const correct = userAnswers.filter(
    (answer, index) => answer !== null && isAnswerCorrect(answer, questions[index])
  ).length;
  const skipped = userAnswers.filter((a) => a === null).length;
  const wrong = userAnswers.length - correct - skipped;
  const scorePct = Math.round((correct / userAnswers.length) * 100);
  const passed = scorePct >= PASS_THRESHOLD;

  const timeMins = timeTaken != null ? Math.floor(timeTaken / 60) : null;
  const timeSecs = timeTaken != null ? timeTaken % 60 : null;
  const timeStr =
    timeMins != null
      ? timeMins > 0
        ? `${timeMins}m ${String(timeSecs).padStart(2, "0")}s`
        : `${timeSecs}s`
      : null;

  const completedRef = useRef(false);
  useEffect(() => {
    if (completedRef.current) return;
    completedRef.current = true;
    if (onPaperComplete) onPaperComplete(paperNum, scorePct, { answers: userAnswers, timeTaken });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // ── Domain stats ──
  const domainMap = {};
  questions.forEach((q, i) => {
    const domain = q.domain || null;
    if (!domain) return;
    if (!domainMap[domain]) domainMap[domain] = { total: 0, correct: 0, wrong: 0, skipped: 0 };
    domainMap[domain].total++;
    const ans = userAnswers[i];
    if (ans === null) domainMap[domain].skipped++;
    else if (isAnswerCorrect(ans, q)) domainMap[domain].correct++;
    else domainMap[domain].wrong++;
  });
  const domainKeys = Object.keys(domainMap);

  // Donut chart math
  const total = userAnswers.length;
  const circumference = 2 * Math.PI * 42;
  const correctArc = (correct / total) * circumference;
  const wrongArc = (wrong / total) * circumference;
  const correctOffset = 0;
  const wrongOffset = -correctArc;

  const filteredIndices = userAnswers
    .map((answer, index) => {
      const isSkipped = answer === null;
      const isCorrect = !isSkipped && isAnswerCorrect(answer, questions[index]);
      const status = isSkipped ? "skipped" : isCorrect ? "correct" : "wrong";
      return { index, status };
    })
    .filter(({ status }) => filter === "all" || status === filter);

  const handleExportPDF = useCallback(async () => {
    setPdfLoading(true);
    try {
      await exportQuizToPDF({ userAnswers, questions, paperNum, timeTaken });
    } catch (e) {
      console.error("PDF export failed", e);
      alert("PDF export failed. Please try again.");
    } finally {
      setPdfLoading(false);
    }
  }, [userAnswers, questions, paperNum, timeTaken]);

  return (
    <div id="summary">
      {/* ── Hero card ── */}
      <div id="summary-hero">
        <h2>Paper {paperNum} Complete</h2>
        <p id="summary-hero-sub">
          Score: {scorePct}% · Passing threshold: {PASS_THRESHOLD}%
        </p>
        {timeStr && (
          <p id="summary-time-taken">
            ⏱ Completed in <strong>{timeStr}</strong> out of 130 min
          </p>
        )}

        <div id="summary-donut-row">
          <div className="summary-donut-wrap">
            <svg width="108" height="108" viewBox="0 0 108 108">
              <circle cx="54" cy="54" r="42" fill="none" stroke="#e5e7eb" strokeWidth="11" />
              {correct > 0 && (
                <circle cx="54" cy="54" r="42" fill="none" stroke="#22c55e" strokeWidth="11"
                  strokeDasharray={`${correctArc} ${circumference}`}
                  strokeDashoffset={correctOffset} strokeLinecap="round"
                  style={{ transform: "rotate(-90deg)", transformOrigin: "54px 54px" }}
                />
              )}
              {wrong > 0 && (
                <circle cx="54" cy="54" r="42" fill="none" stroke="#ef4444" strokeWidth="11"
                  strokeDasharray={`${wrongArc} ${circumference}`}
                  strokeDashoffset={wrongOffset} strokeLinecap="round"
                  style={{ transform: "rotate(-90deg)", transformOrigin: "54px 54px" }}
                />
              )}
            </svg>
            <div className="summary-donut-center">
              <span className="summary-donut-pct" style={darkMode ? { color: "white" } : {}}>{scorePct}%</span>
              <span className="summary-donut-lbl">score</span>
            </div>
          </div>

          <div className="summary-legend">
            <div className="summary-legend-row">
              <div className="summary-legend-dot" style={{ background: "#22c55e" }} />
              Correct<span className="summary-legend-val">{correct}</span>
            </div>
            <div className="summary-legend-row">
              <div className="summary-legend-dot" style={{ background: "#ef4444" }} />
              Incorrect<span className="summary-legend-val">{wrong}</span>
            </div>
            <div className="summary-legend-row">
              <div className="summary-legend-dot" style={{ background: "#94a3b8" }} />
              Skipped<span className="summary-legend-val">{skipped}</span>
            </div>
          </div>
        </div>

        <div className={`pass-pill ${passed ? "pass" : "fail"}`}>
          {passed ? `✓ Passed — ${scorePct}%` : `✗ Failed — ${scorePct}%`}
        </div>
      </div>

      {/* ── Actions ── */}
      <div className="summary-actions" style={{gap:"10px"}}>
        <button className="btn-back-papers" onClick={onBackToHome}>
          ← Back to All Papers
        </button>
        <button
          className="btn-export-pdf"
          onClick={handleExportPDF}
          disabled={pdfLoading}
        >
          {pdfLoading ? (
            <span className="pdf-btn-inner">
              <span className="pdf-spinner" />
              Generating PDF…
            </span>
          ) : (
            <span className="pdf-btn-inner">
              📄 Download PDF Report
            </span>
          )}
        </button>
      </div>

      {/* ── Domain performance ── */}
      {domainKeys.length > 0 && (
        <div id="domain-summary">
          <h3 className="domain-summary-heading">Domain Performance</h3>
          <div className="domain-cards-grid">
            {domainKeys.map((domain) => (
              <DomainCard
                key={domain}
                domain={domain}
                stats={domainMap[domain]}
                darkMode={darkMode}
              />
            ))}
          </div>
        </div>
      )}

      {/* ── Filter bar ── */}
      <div className="review-filter-bar" style={{ padding: "14px 0px" }}>
        <h3 className="review-heading">Review</h3>
        <div className="filter-tabs">
          {["all", "correct", "wrong", "skipped"].map((f) => (
            <button
              key={f}
              className={`filter-tab ${filter === f ? "active" : ""} filter-tab--${f}`}
              onClick={() => setFilter(f)}
            >
              {f === "all"
                ? `All (${userAnswers.length})`
                : f === "correct"
                ? `Correct (${correct})`
                : f === "wrong"
                ? `Incorrect (${wrong})`
                : `Skipped (${skipped})`}
            </button>
          ))}
        </div>
      </div>

      {/* ── Review list ── */}
      <ol id="review-list">
        {filteredIndices.map(({ index }) => (
          <ReviewItem
            key={index}
            answer={userAnswers[index]}
            question={questions[index]}
            index={index}
            darkMode={darkMode}
          />
        ))}
      </ol>
    </div>
  );
}
