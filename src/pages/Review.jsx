import { useCallback, useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { ArrowRight, BookOpen, Brain, CheckCircle2, Eye, Layers, NotebookPen, PartyPopper, Plus, Repeat } from "lucide-react";
import { api } from "../api.js";
import { useAuth } from "../components/AuthContext.jsx";
import RichText from "../components/RichText.jsx";
import { useNotes } from "../hooks/useNotes.js";
import { matchTopics } from "../../shared/topicKeywords.js";

const correctOf = (q) => q.correctAnswerIndices.map((i) => q.answers[i]);

function Flashcards() {
  const [data, setData] = useState(null);
  const [i, setI] = useState(0);
  const [shown, setShown] = useState(false);
  const [busy, setBusy] = useState(false);

  const load = useCallback(() => api.get("/cards").then((d) => { setData(d); setI(0); setShown(false); }).catch(() => setData({ cards: [], counts: { due: 0, total: 0, learned: 0 } })), []);
  useEffect(() => { load(); }, [load]);

  if (!data) return <div className="loading-block"><span className="spinner" /></div>;
  const { counts, cards } = data;
  const card = cards[i];

  const grade = async (g) => {
    setBusy(true);
    await api.post("/cards", { action: "review", key: card.key, grade: g }).catch(() => {});
    setBusy(false); setShown(false);
    if (i + 1 < cards.length) setI(i + 1); else load();
  };

  return (
    <>
      <div className="tiles">
        <div className="tile"><strong>{counts.due}</strong><span>Due now</span></div>
        <div className="tile"><strong>{counts.total}</strong><span>In your deck</span></div>
        <div className="tile good"><strong>{counts.learned}</strong><span>Well learned</span></div>
      </div>
      {!card ? (
        <div className="empty-state card">
          <div className="empty-icon"><PartyPopper size={40} /></div>
          <h2>{counts.total ? "All caught up" : "Your deck is empty"}</h2>
          <p>{counts.total
            ? "Nothing is due right now. Come back later — the app schedules each card for the best moment."
            : "Cards are created automatically when you answer a question wrong, or from “Flashcard” under any reviewed question."}</p>
          <Link className="btn btn-primary" to="/practice">Take a practice round</Link>
        </div>
      ) : (
        <div className="flash card">
          <div className="flash-meta"><span>Card {i + 1} of {cards.length}</span><span>Box {card.box + 1} / 7</span></div>
          <RichText text={card.question.text} className="flash-q" />
          {shown ? (
            <div className="flash-a">
              <h4>Answer</h4>
              <ul>{correctOf(card.question).map((a) => <li key={a}>{a}</li>)}</ul>
              {card.question.explanation && <RichText text={card.question.explanation} className="muted" />}
              <div className="flash-grade">
                <button className="btn" disabled={busy} onClick={() => grade("again")}><Repeat size={16} /> Again <small>10 min</small></button>
                <button className="btn btn-primary" disabled={busy} onClick={() => grade("good")}><CheckCircle2 size={16} /> Good</button>
                <button className="btn" disabled={busy} onClick={() => grade("easy")}><Brain size={16} /> Easy</button>
              </div>
            </div>
          ) : (
            <button className="btn btn-primary" onClick={() => setShown(true)}><Eye size={16} /> Show answer</button>
          )}
        </div>
      )}
    </>
  );
}

function Mistakes() {
  const navigate = useNavigate();
  const topics = useNotes();
  const [data, setData] = useState(null);
  const [open, setOpen] = useState(null);
  const [added, setAdded] = useState({});
  useEffect(() => { api.get("/mistakes").then(setData).catch(() => setData({ mistakes: [], mastered: 0 })); }, []);
  if (!data) return <div className="loading-block"><span className="spinner" /></div>;
  const title = (id) => topics?.find((t) => t.id === id)?.title ?? id;

  return (
    <>
      <div className="tiles">
        <div className="tile"><strong>{data.mistakes.length}</strong><span>To review</span></div>
        <div className="tile good"><strong>{data.mastered}</strong><span>Mastered</span></div>
        <button className="tile tile-action" disabled={!data.mistakes.length} onClick={() => navigate("/practice/custom?mode=mistakes&count=20")}>
          <strong><NotebookPen size={22} /></strong><span>Practice these</span>
        </button>
      </div>
      {data.mistakes.length === 0 ? (
        <div className="empty-state card">
          <div className="empty-icon"><PartyPopper size={40} /></div>
          <h2>No open mistakes</h2>
          <p>Questions you answer wrong or skip appear here until you get them right.</p>
          <Link className="btn btn-primary" to="/practice">Start practising</Link>
        </div>
      ) : (
        <ul className="mistake-list">
          {data.mistakes.map((m) => {
            const q = m.question;
            const links = matchTopics(`${q.text} ${q.answers.join(" ")}`);
            return (
              <li key={m.key} className="card mistake">
                <button className="mistake-head" onClick={() => setOpen(open === m.key ? null : m.key)} aria-expanded={open === m.key}>
                  <RichText text={q.text.length > 220 ? `${q.text.slice(0, 220)}…` : q.text} />
                  <span className="pill">Missed ×{m.times}</span>
                </button>
                {open === m.key && (
                  <div className="mistake-body">
                    <h4>Correct answer</h4>
                    <ul>{correctOf(q).map((a) => <li key={a}>{a}</li>)}</ul>
                    {q.explanation && <RichText text={q.explanation} className="muted" />}
                    <div className="ra">
                      {links.map((id) => <Link key={id} to={`/notes/${id}`} className="ra-chip"><BookOpen size={14} /> Study: {title(id)}</Link>)}
                      <button className="ra-btn" disabled={added[m.key]} onClick={async () => { await api.post("/cards", { action: "add", key: m.key }); setAdded((a) => ({ ...a, [m.key]: true })); }}>
                        {added[m.key] ? <CheckCircle2 size={14} /> : <Plus size={14} />} {added[m.key] ? "In flashcards" : "Add flashcard"}
                      </button>
                    </div>
                  </div>
                )}
              </li>
            );
          })}
        </ul>
      )}
    </>
  );
}

export default function Review() {
  const { user, ready, setModal } = useAuth();
  const [tab, setTab] = useState("cards");
  if (!ready) return <div className="loading-block"><span className="spinner" /></div>;
  if (!user)
    return (
      <div className="empty-state">
        <div className="empty-icon"><Layers size={40} /></div>
        <h1>Review &amp; flashcards</h1>
        <p>Sign in to get a mistake notebook and spaced-repetition flashcards built from your own answers.</p>
        <button className="btn btn-primary" onClick={() => setModal("login")}>Sign in <ArrowRight size={16} /></button>
      </div>
    );
  return (
    <div>
      <header className="page-head">
        <div><h1>Review</h1><p className="muted">Fix what you got wrong — flashcards bring each question back right before you'd forget it.</p></div>
      </header>
      <div className="mode-switch" role="tablist">
        <button role="tab" aria-selected={tab === "cards"} className={tab === "cards" ? "on" : ""} onClick={() => setTab("cards")}><Layers size={16} /> Flashcards</button>
        <button role="tab" aria-selected={tab === "mistakes"} className={tab === "mistakes" ? "on" : ""} onClick={() => setTab("mistakes")}><NotebookPen size={16} /> Mistake notebook</button>
      </div>
      {tab === "cards" ? <Flashcards /> : <Mistakes />}
    </div>
  );
}
