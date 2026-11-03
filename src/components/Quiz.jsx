import { useState, useCallback, useEffect, useRef } from "react";
import Question from "./Question.jsx";
import Summary from "./Summary.jsx";
import { AlertTriangle, ArrowLeft, Ban, ChevronLeft, ChevronRight, OctagonX, Send, Siren, Timer } from "lucide-react";
import Dialog from "./Dialog.jsx";

const EXAM_DURATION = 130 * 60; // 130 minutes in seconds
const MAX_WARNINGS = 3;         // 3 warnings shown, 4th switch = abandon

function formatTime(seconds) {
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  return `${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`;
}

// ── Warning modal ──────────────────────────────────────────────────────────
function TabWarningModal({ warningNumber, onDismiss }) {
  const remaining = MAX_WARNINGS - warningNumber;

  const ordinal = warningNumber === 1 ? "1st" : warningNumber === 2 ? "2nd" : "3rd";
  const bgColor = warningNumber === 1 ? "#fffbeb" : warningNumber === 2 ? "#fff7ed" : "#fef2f2";
  const borderColor = warningNumber === 1 ? "#f59e0b" : warningNumber === 2 ? "#f97316" : "#ef4444";
  const titleColor = warningNumber === 1 ? "#92400e" : warningNumber === 2 ? "#7c2d12" : "#991b1b";
  const btnColor = warningNumber === 1 ? "#f59e0b" : warningNumber === 2 ? "#f97316" : "#ef4444";
  const Icon = warningNumber === 1 ? AlertTriangle : warningNumber === 2 ? Siren : OctagonX;

  return (
    <div
      style={{
        position: "fixed",
        inset: 0,
        zIndex: 9999,
        background: "rgba(0,0,0,0.6)",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        padding: "1rem",
      }}
    >
      <div
        style={{
          background: bgColor,
          border: `2px solid ${borderColor}`,
          borderRadius: "14px",
          padding: "2rem 2rem 1.75rem",
          maxWidth: "460px",
          width: "100%",
          boxShadow: "0 12px 40px rgba(0,0,0,0.2)",
          textAlign: "center",
        }}
      >
        {/* Icon */}
        <div style={{ display: "flex", justifyContent: "center", marginBottom: "0.75rem" }}><Icon size={44} strokeWidth={1.8} color={borderColor} /></div>

        {/* Badge */}
        <div
          style={{
            display: "inline-block",
            background: btnColor,
            color: "#fff",
            borderRadius: "99px",
            padding: "3px 14px",
            fontSize: "0.78rem",
            fontWeight: 700,
            letterSpacing: "0.05em",
            marginBottom: "0.85rem",
            textTransform: "uppercase",
          }}
        >
          {ordinal} Warning · {warningNumber} / {MAX_WARNINGS}
        </div>

        {/* Title */}
        <h2
          style={{
            margin: "0 0 0.6rem",
            fontSize: "1.15rem",
            fontWeight: 700,
            color: titleColor,
          }}
        >
          Tab switching is not allowed
        </h2>

        {/* Body */}
        <p
          style={{
            margin: "0 0 0.5rem",
            fontSize: "0.93rem",
            color: titleColor,
            lineHeight: 1.65,
          }}
        >
          This behaviour is <strong>strictly prohibited</strong> in the real AWS
          Certification Exam. Please stay on this tab for the duration of your
          test.
        </p>

        {remaining > 0 ? (
          <p
            style={{
              margin: "0 0 1.5rem",
              fontSize: "0.88rem",
              color: titleColor,
              opacity: 0.85,
            }}
          >
            You have <strong>{remaining} warning{remaining > 1 ? "s" : ""}</strong> remaining.
            Your exam will be <strong>automatically abandoned</strong> on your{" "}
            {remaining === 2 ? "3rd" : "next"} tab switch.
          </p>
        ) : (
          <p
            style={{
              margin: "0 0 1.5rem",
              fontSize: "0.88rem",
              color: titleColor,
              opacity: 0.85,
            }}
          >
            <strong>This is your final warning.</strong> The next tab switch will
            immediately and permanently abandon your exam with no further
            confirmation.
          </p>
        )}

        {/* Dismiss */}
        <button
          onClick={onDismiss}
          style={{
            background: btnColor,
            color: "#fff",
            border: "none",
            borderRadius: "8px",
            padding: "0.7rem 2rem",
            fontSize: "0.95rem",
            fontWeight: 600,
            cursor: "pointer",
            width: "100%",
          }}
        >
          I understand — Resume Exam
        </button>
      </div>
    </div>
  );
}

// ── Abandoned screen ───────────────────────────────────────────────────────
function AbandonedScreen({ onBackToHome }) {
  return (
    <div
      style={{
        minHeight: "60vh",
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        padding: "2rem",
        textAlign: "center",
      }}
    >
      <div style={{ display: "flex", justifyContent: "center", marginBottom: "1rem", color: "#991b1b" }}><Ban size={56} strokeWidth={1.6} /></div>
      <h2
        style={{
          fontSize: "1.4rem",
          fontWeight: 700,
          color: "#991b1b",
          margin: "0 0 0.5rem",
        }}
      >
        Exam Abandoned
      </h2>
      <p
        style={{
          fontSize: "0.95rem",
          color: "#6b7280",
          maxWidth: "400px",
          lineHeight: 1.7,
          margin: "0 0 1.75rem",
        }}
      >
        You switched tabs <strong>4 times</strong> after receiving 3 warnings.
        In the real AWS Certification Exam, this would result in immediate
        disqualification. Please retake the paper to receive a score.
      </p>
      <button
        onClick={onBackToHome}
        style={{
          background: "#ef4444",
          color: "#fff",
          border: "none",
          borderRadius: "8px",
          padding: "0.7rem 2rem",
          fontSize: "0.95rem",
          fontWeight: 600,
          cursor: "pointer",
        }}
      >
        <ArrowLeft size={16} style={{ verticalAlign: "-3px" }} /> Back to All Papers
      </button>
    </div>
  );
}

/**
 * The exam engine, used for timed exams, untimed practice and live competitions.
 *  mode        "exam" | "practice" (instant feedback, no timer) | "room" (shared deadline)
 *  startedAt   epoch ms the clock started (pass a saved value to resume)
 *  deadlineAt  epoch ms the exam ends (room mode); defaults to startedAt + 130 min
 *  initial     { answers, flagged, currentQ } to resume from
 *  onProgress  called (debounced) with the current state, for autosave
 *  proctor     tab-switch warnings / abandonment (exam only by default)
 */
export default function Quiz({
  questions,
  paperNum,
  onBackToHome,
  onPaperComplete,
  mode = "exam",
  startedAt: startedAtProp,
  deadlineAt,
  initial,
  onProgress,
  proctor = mode === "exam",
  backLabel = "Back to All Papers",
  submitTitle = mode === "practice" ? "Finish practice?" : "Submit your exam?",
  submitLabel = mode === "practice" ? "Finish practice" : "Submit exam",
}) {
  const n = questions.length;
  const fits = (a) => Array.isArray(a) && a.length === n;
  const [userAnswers, setUserAnswers] = useState(
    () => (fits(initial?.answers) ? initial.answers : new Array(n).fill(null)),
  );
  const [currentQ, setCurrentQ] = useState(() => Math.min(initial?.currentQ ?? 0, n - 1));
  const [flagged, setFlagged] = useState(
    () => (fits(initial?.flagged) ? initial.flagged : new Array(n).fill(false)),
  );
  const [revealed, setRevealed] = useState(() => new Array(n).fill(false));
  const [secs, setSecs] = useState(null);
  const [submitted, setSubmitted] = useState(false);
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [abandoned, setAbandoned] = useState(false);

  // ── Tab-switch state ───────────────────────────────────────────────────
  const [switchCount, setSwitchCount] = useState(0);
  const [warningShown, setWarningShown] = useState(null); // 1 | 2 | 3 | null

  // Refs so the single registered visibilitychange handler always reads
  // the latest values without needing to be torn down and re-registered.
  const switchCountRef = useRef(0);
  const submittedRef = useRef(false);
  const abandonedRef = useRef(false);

  useEffect(() => { submittedRef.current = submitted; }, [submitted]);
  useEffect(() => { abandonedRef.current = abandoned; }, [abandoned]);

  // ── Timer ──────────────────────────────────────────────────────────────
  // Driven by absolute timestamps so a resumed or shared-deadline exam stays accurate.
  const timed = mode !== "practice";
  const startedAt = useRef(startedAtProp ?? Date.now()).current;
  const deadline = deadlineAt ?? startedAt + EXAM_DURATION * 1000;
  const [timeLeft, setTimeLeft] = useState(() => Math.max(0, Math.ceil((deadline - Date.now()) / 1000)));
  const [timeTaken, setTimeTaken] = useState(0);

  // Per-question time: add the elapsed slice to whichever question is on screen.
  const secsRef = useRef(new Array(n).fill(0));
  const curRef = useRef({ q: currentQ, t0: Date.now() });
  const flushTime = useCallback(() => {
    const now = Date.now();
    secsRef.current[curRef.current.q] += (now - curRef.current.t0) / 1000;
    curRef.current.t0 = now;
  }, []);
  useEffect(() => { flushTime(); curRef.current.q = currentQ; }, [currentQ, flushTime]);

  const finish = useCallback((elapsedSecs) => {
    flushTime();
    setSecs(secsRef.current.map((x) => Math.round(x)));
    setTimeTaken(elapsedSecs);
    setSubmitted(true);
  }, [flushTime]);

  useEffect(() => {
    if (!timed || submitted || abandoned) return;
    const id = setInterval(() => {
      const left = Math.ceil((deadline - Date.now()) / 1000);
      if (left <= 0) {
        clearInterval(id);
        setTimeLeft(0);
        finish(Math.round((deadline - startedAt) / 1000));
      } else setTimeLeft(left);
    }, 500);
    return () => clearInterval(id);
  }, [timed, submitted, abandoned, deadline, startedAt, finish]);

  // ── Tab-switch detector — registered ONCE on mount ─────────────────────
  // Fires when user LEAVES the tab (visibilityState === "hidden").
  // The modal appears when they RETURN (tab is visible again) because
  // React state updates from the hidden event flush on re-focus.
  useEffect(() => {
    const handleVisibilityChange = () => {
      if (!proctor) return;
      if (document.visibilityState !== "hidden") return;
      if (submittedRef.current || abandonedRef.current) return;

      switchCountRef.current += 1;
      const count = switchCountRef.current;
      setSwitchCount(count);

      if (count <= MAX_WARNINGS) {
        // Switches 1, 2, 3 → show the matching numbered warning
        setWarningShown(count);
      } else {
        // Switch 4 → abandon
        abandonedRef.current = true;
        setAbandoned(true);
        setWarningShown(null);
      }
    };

    document.addEventListener("visibilitychange", handleVisibilityChange);
    return () =>
      document.removeEventListener("visibilitychange", handleVisibilityChange);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []); // empty deps — refs keep values fresh

  // ── Urgency colour ─────────────────────────────────────────────────────
  const totalSecs = Math.round((deadline - startedAt) / 1000);
  const timerUrgent = timeLeft <= Math.min(10 * 60, totalSecs * 0.1);
  const timerWarning = timeLeft <= Math.min(30 * 60, totalSecs * 0.25);

  // ── Answer / flag handlers ─────────────────────────────────────────────
  const handleSelectAnswer = useCallback(
    (selectedAnswer) => {
      const q = questions[currentQ];
      if (mode === "practice" && revealed[currentQ]) return; // locked once checked
      if (q.isMultiSelect) {
        setUserAnswers((prev) => {
          const updated = [...prev];
          const current = Array.isArray(updated[currentQ])
            ? [...updated[currentQ]]
            : [];
          const idx = current.indexOf(selectedAnswer);
          if (idx === -1) current.push(selectedAnswer);
          else current.splice(idx, 1);
          updated[currentQ] = current.length > 0 ? current : null;
          return updated;
        });
      } else {
        setUserAnswers((prev) => {
          const updated = [...prev];
          updated[currentQ] = selectedAnswer;
          return updated;
        });
        if (mode === "practice") setRevealed((r) => r.map((v, i) => (i === currentQ ? true : v)));
      }
    },
    [currentQ, questions, mode, revealed],
  );

  const handleCheck = useCallback(() => {
    setRevealed((r) => r.map((v, i) => (i === currentQ ? true : v)));
  }, [currentQ]);

  const handleFlag = useCallback(() => {
    setFlagged((prev) => {
      const updated = [...prev];
      updated[currentQ] = !updated[currentQ];
      return updated;
    });
  }, [currentQ]);

  // "Submit Exam" opens a confirmation dialog; confirming performs the submit.
  const handleSubmit = useCallback(() => setConfirmOpen(true), []);

  const confirmSubmit = useCallback(() => {
    setConfirmOpen(false);
    finish(Math.min(Math.floor((Date.now() - startedAt) / 1000), Math.round((deadline - startedAt) / 1000)));
  }, [finish, startedAt, deadline]);

  const answeredCount = userAnswers.filter((a) => a !== null).length;

  // Debounced autosave so an unfinished attempt can be resumed (or tracked live in a room).
  const progressRef = useRef(onProgress);
  useEffect(() => { progressRef.current = onProgress; }, [onProgress]);
  useEffect(() => {
    if (!progressRef.current || submitted || abandoned) return;
    const t = setTimeout(
      () => progressRef.current?.({ answers: userAnswers, flagged, currentQ, startedAt }), 1200);
    return () => clearTimeout(t);
  }, [userAnswers, flagged, currentQ, submitted, abandoned, startedAt]);

  // Keyboard: ← / → move between questions, F flags. (A–E / 1–5 pick answers; see Answers.)
  useEffect(() => {
    if (submitted || abandoned) return;
    const onKey = (e) => {
      if (e.metaKey || e.ctrlKey || e.altKey || confirmOpen) return;
      if (/input|textarea|select/i.test(e.target.tagName) || e.target.isContentEditable) return;
      if (document.querySelector(".dlg-backdrop")) return;
      if (e.key === "ArrowRight") setCurrentQ((q) => Math.min(q + 1, n - 1));
      else if (e.key === "ArrowLeft") setCurrentQ((q) => Math.max(q - 1, 0));
      else if (e.key.toLowerCase() === "f") handleFlag();
      else return;
      e.preventDefault();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [submitted, abandoned, confirmOpen, n, handleFlag]);

  // ── Render guards ──────────────────────────────────────────────────────

  if (abandoned) {
    return <AbandonedScreen onBackToHome={onBackToHome} />;
  }

  // Summary — the listener above exits early when submittedRef is true,
  // so no tab-switch monitoring happens during review.
  if (submitted) {
    return (
      <Summary
        userAnswers={userAnswers}
        questions={questions}
        paperNum={paperNum}
        onBackToHome={onBackToHome}
        onPaperComplete={onPaperComplete}
        timeTaken={timeTaken}
        secs={secs}
        mode={mode}
        backLabel={backLabel}
      />
    );
  }

  return (
    <div id="quiz">
      <Dialog
        open={confirmOpen}
        onClose={() => setConfirmOpen(false)}
        title={submitTitle}
        icon={Send}
        tone={userAnswers.some((a) => a === null) ? "warn" : "primary"}
        actions={
          <>
            <button className="btn btn-ghost" onClick={() => setConfirmOpen(false)}>Keep reviewing</button>
            <button className="btn btn-primary" data-autofocus onClick={confirmSubmit}>{submitLabel}</button>
          </>
        }
      >
        <p>
          {userAnswers.some((a) => a === null)
            ? "You still have unanswered questions. They will be marked as skipped."
            : "You've answered every question. Once submitted you can't change your answers."}
        </p>
        <dl className="dlg-stats">
          <div><dt>{userAnswers.filter((a) => a !== null).length}/{questions.length}</dt><dd>Answered</dd></div>
          <div className={userAnswers.some((a) => a === null) ? "is-warn" : ""}><dt>{userAnswers.filter((a) => a === null).length}</dt><dd>Unanswered</dd></div>
          <div><dt>{flagged.filter(Boolean).length}</dt><dd>Flagged</dd></div>
          <div><dt>{timed ? formatTime(timeLeft) : "—"}</dt><dd>Time left</dd></div>
        </dl>
      </Dialog>
      {/* Warning modal — sits above all quiz content */}
      {warningShown !== null && (
        <TabWarningModal
          warningNumber={warningShown}
          onDismiss={() => setWarningShown(null)}
        />
      )}

      <div id="quiz-header">
        <span id="quiz-title">DVA-C02 · {paperNum > 0 ? `Paper ${paperNum}` : "Custom practice"}</span>
        <div id="quiz-meta">
          <span>
            {answeredCount} / {questions.length} answered
          </span>
          <span>{flagged.filter(Boolean).length} flagged</span>

          {/* Warning counter badge — hidden until first switch */}
          {switchCount > 0 && (
            <span
              style={{
                fontWeight: 600,
                fontSize: "0.85rem",
                color:
                  switchCount >= 3
                    ? "#dc2626"
                    : switchCount === 2
                    ? "#ea580c"
                    : "#d97706",
              }}
            >
              <AlertTriangle size={14} style={{ verticalAlign: "-3px" }} /> {switchCount}/{MAX_WARNINGS} warnings
            </span>
          )}

          {timed ? (
            <span
              id="quiz-timer"
              className={timerUrgent ? "timer-urgent" : timerWarning ? "timer-warning" : ""}
            >
              <Timer size={15} style={{ verticalAlign: "-3px" }} /> {formatTime(timeLeft)}
            </span>
          ) : (
            <span id="quiz-timer"><Timer size={15} style={{ verticalAlign: "-3px" }} /> Practice mode</span>
          )}
        </div>
      </div>

      <div id="progress-bar">
        <div
          id="progress-fill"
          style={{
            width: `${Math.round((answeredCount / questions.length) * 100)}%`,
          }}
        />
      </div>

      <div id="quiz-body">
        <Question
          key={currentQ}
          index={currentQ}
          total={questions.length}
          question={questions[currentQ]}
          selectedAnswer={userAnswers[currentQ]}
          isFlagged={flagged[currentQ]}
          onSelectAnswer={handleSelectAnswer}
          onFlag={handleFlag}
          reveal={mode === "practice" && revealed[currentQ]}
          onCheck={mode === "practice" ? handleCheck : null}
        />

        <div id="q-sidebar">
          <span className="sidebar-label">Navigator</span>
          <div id="q-grid">
            {questions.map((_, i) => {
              let cls = "q-dot";
              if (i === currentQ) cls += " active";
              else if (flagged[i]) cls += " flagged-dot";
              else if (userAnswers[i] !== null) cls += " answered";
              return (
                <button key={i} className={cls} onClick={() => setCurrentQ(i)}>
                  {i + 1}
                </button>
              );
            })}
          </div>
          <div className="legend">
            <div className="legend-item">
              <span className="legend-dot answered-dot" />
              Answered
            </div>
            <div className="legend-item">
              <span className="legend-dot active-dot" />
              Current
            </div>
            <div className="legend-item">
              <span className="legend-dot flagged-legend-dot" />
              Flagged
            </div>
            <div className="legend-item">
              <span className="legend-dot unanswered-dot" />
              Unanswered
            </div>
          </div>
        </div>
      </div>

      <div id="nav-footer">
        <button
          className="btn-nav"
          onClick={() => setCurrentQ((q) => q - 1)}
          disabled={currentQ === 0}
        >
          <ChevronLeft size={18} /> Previous
        </button>
        <button className="btn-submit" onClick={handleSubmit}>
          {mode === "practice" ? "Finish" : "Submit Exam"}
        </button>
        <button
          className="btn-nav"
          onClick={() => setCurrentQ((q) => q + 1)}
          disabled={currentQ === questions.length - 1}
        >
          Next <ChevronRight size={18} />
        </button>
      </div>
    </div>
  );
}