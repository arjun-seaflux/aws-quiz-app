import { useCallback, useEffect, useState } from "react";
import { Navigate, useNavigate, useParams } from "react-router-dom";
import Quiz from "../components/Quiz.jsx";
import { useAuth } from "../components/AuthContext.jsx";
import { loadPaper, totalPaper } from "../papers.js";
import { computeUnlocked } from "../scores.js";
import { AlertTriangle } from "lucide-react";

export default function Exam() {
  const { paperNum } = useParams();
  const n = Number(paperNum);
  const navigate = useNavigate();
  const { ready, scores, recordAttempt } = useAuth();
  const [questions, setQuestions] = useState(null);
  const [error, setError] = useState(false);
  const [attempt, setAttempt] = useState(0);

  const valid = totalPaper.includes(n);
  const locked = ready && valid && !computeUnlocked(scores, totalPaper.length)[n];

  useEffect(() => {
    if (!valid || !ready || locked) return;
    let live = true;
    setQuestions(null); setError(false);
    loadPaper(n).then((q) => live && setQuestions(q)).catch(() => live && setError(true));
    return () => { live = false; };
    // `locked` is intentionally omitted: scores updating after submit must not reload the paper.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [n, ready, valid, attempt]);

  const back = useCallback(() => navigate("/practice"), [navigate]);

  if (!valid) return <Navigate to="/practice" replace />;
  if (locked && !questions) return <Navigate to="/practice" replace />;

  if (error)
    return (
      <div className="empty-state">
        <div className="empty-icon"><AlertTriangle size={40} /></div>
        <h1>Couldn't load this paper</h1>
        <p>Check your connection and try again.</p>
        <button className="btn btn-primary" onClick={() => setAttempt((a) => a + 1)}>Retry</button>
      </div>
    );

  if (!questions)
    return <div className="loading-block"><span className="spinner" /> Loading paper {n}…</div>;

  return (
    <Quiz
      key={`${n}-${attempt}`}
      questions={questions}
      paperNum={n}
      onBackToHome={back}
      onPaperComplete={recordAttempt}
    />
  );
}
