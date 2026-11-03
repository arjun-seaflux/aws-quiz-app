import { useCallback, useEffect, useRef, useState } from "react";
import { Navigate, useNavigate, useParams, useSearchParams } from "react-router-dom";
import { AlertTriangle, History, RotateCcw } from "lucide-react";
import Quiz from "../components/Quiz.jsx";
import Dialog from "../components/Dialog.jsx";
import { api } from "../api.js";
import { useAuth } from "../components/AuthContext.jsx";
import { loadPaper, totalPaper } from "../papers.js";
import { computeUnlocked } from "../scores.js";

const EXAM_MS = 130 * 60 * 1000;
const localKey = (n) => `exam_draft_${n}`;

async function readDraft(user, n) {
  try {
    if (user) return (await api.get(`/drafts?paper=${n}`)).draft?.state ?? null;
    return JSON.parse(localStorage.getItem(localKey(n)) || "null");
  } catch { return null; }
}
async function writeDraft(user, n, state) {
  try {
    if (user) await api.post("/drafts", { paper: n, state });
    else localStorage.setItem(localKey(n), JSON.stringify(state));
  } catch { /* autosave is best-effort */ }
}
async function clearDraft(user, n) {
  try {
    if (user) await api.post("/drafts", { paper: n, remove: true });
    else localStorage.removeItem(localKey(n));
  } catch { /* ignore */ }
}

export default function Exam() {
  const { paperNum } = useParams();
  const [params] = useSearchParams();
  const n = Number(paperNum);
  const mode = params.get("mode") === "practice" ? "practice" : "exam";
  const navigate = useNavigate();
  const { ready, user, scores, recordAttempt } = useAuth();
  const [questions, setQuestions] = useState(null);
  const [error, setError] = useState(false);
  const [attempt, setAttempt] = useState(0);
  const [draft, setDraft] = useState(undefined);   // undefined = checking, null = none
  const [choice, setChoice] = useState(null);       // "resume" | "fresh"
  const loaded = useRef(false);

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

  // Look for an unfinished attempt (exam mode only).
  useEffect(() => {
    if (!valid || !ready || mode !== "exam" || loaded.current) return;
    loaded.current = true;
    readDraft(user, n).then((d) => {
      const fresh = d && Date.now() - d.startedAt < EXAM_MS && Array.isArray(d.answers) && d.answers.some((a) => a !== null);
      if (d && !fresh) clearDraft(user, n);
      setDraft(fresh ? d : null);
      if (!fresh) setChoice("fresh");
    });
  }, [valid, ready, mode, user, n]);

  const back = useCallback(() => navigate("/practice"), [navigate]);
  const onProgress = useCallback((state) => writeDraft(user, n, state), [user, n]);
  const onComplete = useCallback((num, pct, d) => { clearDraft(user, n); return recordAttempt(num, pct, d); }, [recordAttempt, user, n]);

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

  const waiting = !questions || (mode === "exam" && choice === null);
  if (waiting)
    return (
      <>
        <div className="loading-block"><span className="spinner" /> Loading paper {n}…</div>
        <Dialog
          open={!!questions && !!draft && choice === null}
          onClose={() => {}}
          title="Resume your attempt?"
          icon={History}
          actions={
            <>
              <button className="btn btn-ghost" onClick={() => { clearDraft(user, n); setDraft(null); setChoice("fresh"); }}>
                <RotateCcw size={16} /> Start over
              </button>
              <button className="btn btn-primary" data-autofocus onClick={() => setChoice("resume")}>Resume</button>
            </>
          }
        >
          {draft && (
            <p>
              You have an unfinished attempt on this paper: {draft.answers.filter((a) => a !== null).length} answered,
              about {Math.max(0, Math.round((EXAM_MS - (Date.now() - draft.startedAt)) / 60000))} minutes left on the clock.
            </p>
          )}
        </Dialog>
      </>
    );

  const resume = mode === "exam" && choice === "resume" && draft;
  return (
    <Quiz
      key={`${n}-${attempt}-${choice}-${mode}`}
      questions={questions}
      paperNum={n}
      mode={mode}
      startedAt={resume ? draft.startedAt : undefined}
      initial={resume ? draft : undefined}
      onProgress={mode === "exam" ? onProgress : undefined}
      onBackToHome={back}
      onPaperComplete={onComplete}
    />
  );
}
