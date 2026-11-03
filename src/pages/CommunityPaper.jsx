import { useEffect, useMemo, useRef, useState } from "react";
import { Link, useNavigate, useParams, useSearchParams } from "react-router-dom";
import { AlertTriangle, ArrowLeft, Clock, Lightbulb, ListChecks, Pencil, Send, Timer, Trash2, Undo2, UserRound } from "lucide-react";
import { api } from "../api.js";
import { useAuth } from "../components/AuthContext.jsx";
import Dialog from "../components/Dialog.jsx";
import Quiz from "../components/Quiz.jsx";
import RichText from "../components/RichText.jsx";
import { STATUS_LABEL, minutesFor, statusClass } from "./Papers.jsx";

const STATUS_HELP = {
  private: "Only you can see this paper. Submit it for approval to make it public.",
  pending: "Waiting for an admin to review it. You can withdraw it to make changes.",
  approved: "This paper is public — anyone can play it.",
  rejected: "An admin asked for changes. Edit the paper and submit it again.",
};

function useCommunityPaper(id) {
  const [state, setState] = useState({ status: "loading" });
  const reload = () => api.get(`/community/${id}`).then((d) => setState({ status: "ok", ...d })).catch((e) => setState({ status: "error", error: e }));
  useEffect(() => { setState({ status: "loading" }); reload(); /* eslint-disable-next-line */ }, [id]);
  return [state, reload];
}

export function CommunityPaperPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();
  const [state, reload] = useCommunityPaper(id);
  const [busy, setBusy] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [error, setError] = useState("");

  if (state.status === "loading") return <div className="loading-block"><span className="spinner" /></div>;
  if (state.status === "error")
    return (
      <div className="empty-state">
        <div className="empty-icon"><AlertTriangle size={40} /></div>
        <h1>Paper not found</h1><p>It may be private, or it was removed.</p>
        <Link className="btn btn-primary" to="/papers">Back to papers</Link>
      </div>
    );

  const { paper, questions } = state;
  const act = async (action) => {
    setBusy(true); setError("");
    try { await api.post(`/community/${id}`, { action }); if (action === "delete") navigate("/papers"); else await reload(); }
    catch (e) { setError(e.message); }
    setBusy(false);
  };

  return (
    <div>
      <Link to="/papers" className="back-link"><ArrowLeft size={16} /> All papers</Link>
      <header className="page-head">
        <div>
          <h1>{paper.title}</h1>
          <p className="muted"><UserRound size={14} /> {paper.author} · <ListChecks size={14} /> {paper.questionCount} questions · <Clock size={14} /> {minutesFor(paper.questionCount)} min</p>
        </div>
        {paper.isOwner && <span className={`pill ${statusClass(paper.status)}`}>{STATUS_LABEL[paper.status]}</span>}
      </header>

      {paper.description && <p className="lead">{paper.description}</p>}
      {paper.isOwner && (
        <div className="notice"><span>{STATUS_HELP[paper.status]}{paper.status === "rejected" && paper.reviewNote ? ` Reviewer's note: “${paper.reviewNote}”` : ""}</span></div>
      )}
      {error && <div className="auth-error">{error}</div>}

      <div className="row-gap start">
        {(paper.status === "approved" || paper.isOwner) && <>
          <Link className="btn btn-primary btn-lg" to={`/papers/${id}/play?mode=exam`}><Timer size={18} /> Take as exam</Link>
          <Link className="btn btn-lg" to={`/papers/${id}/play?mode=practice`}><Lightbulb size={18} /> Practice mode</Link>
        </>}
      </div>
      {!user && <p className="muted small">You can play without an account, but your result won't be saved.</p>}

      {paper.isOwner && (
        <section className="card owner-actions">
          <h2 className="section-title">Manage</h2>
          <div className="row-gap start">
            {["private", "rejected"].includes(paper.status) && <>
              <Link className="btn" to={`/papers/${id}/edit`}><Pencil size={16} /> Edit</Link>
              <button className="btn btn-primary" disabled={busy} onClick={() => act("submit")}><Send size={16} /> Submit for approval</button>
            </>}
            {["pending", "approved"].includes(paper.status) && (
              <button className="btn" disabled={busy} onClick={() => act("withdraw")}><Undo2 size={16} /> {paper.status === "approved" ? "Make private" : "Withdraw"}</button>
            )}
            <button className="btn btn-ghost" disabled={busy} onClick={() => setConfirmDelete(true)}><Trash2 size={16} /> Delete</button>
          </div>
        </section>
      )}

      {(paper.isOwner || paper.status === "approved") && (
        <section className="card">
          <h2 className="section-title">Questions</h2>
          <ol className="preview-list">
            {questions.map((q, i) => <li key={q._key}><span className="builder-n">{i + 1}</span><RichText text={q.text.length > 200 ? `${q.text.slice(0, 200)}…` : q.text} /></li>)}
          </ol>
        </section>
      )}

      <Dialog open={confirmDelete} onClose={() => setConfirmDelete(false)} title="Delete this paper?" icon={Trash2} tone="danger"
        actions={<><button className="btn btn-ghost" onClick={() => setConfirmDelete(false)}>Keep it</button>
          <button className="btn btn-primary" data-autofocus onClick={() => act("delete")}>Delete</button></>}>
        <p>This permanently removes “{paper.title}” and any questions you wrote for it. Past results stay in your history.</p>
      </Dialog>
    </div>
  );
}

export function CommunityPlay() {
  const { id } = useParams();
  const [params] = useSearchParams();
  const mode = params.get("mode") === "practice" ? "practice" : "exam";
  const navigate = useNavigate();
  const { user, ready } = useAuth();
  const [state] = useCommunityPaper(id);
  const startedAt = useRef(Date.now()).current;

  const onComplete = useMemo(() => async (_n, _pct, d) => {
    if (!user) return;
    try {
      if (mode === "exam") await api.post("/attempts", { kind: "community", paperId: Number(id), answers: d.answers, timeTaken: d.timeTaken, secs: d.secs });
      else await api.post("/attempts", { kind: "practice", keys: d.keys, answers: d.answers, timeTaken: d.timeTaken, secs: d.secs });
    } catch { /* result just isn't saved */ }
  }, [user, mode, id]);

  if (!ready || state.status === "loading") return <div className="loading-block"><span className="spinner" /></div>;
  if (state.status === "error") return <div className="empty-state"><p>Paper not found.</p><Link className="btn btn-primary" to="/papers">Back</Link></div>;
  const { paper, questions } = state;

  return (
    <Quiz
      questions={questions}
      paperNum={0}
      title={paper.title}
      mode={mode}
      startedAt={startedAt}
      deadlineAt={startedAt + minutesFor(questions.length) * 60_000}
      onBackToHome={() => navigate(`/papers/${id}`)}
      backLabel="Back to the paper"
      onPaperComplete={onComplete}
    />
  );
}
