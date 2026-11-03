import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { ArrowRight, BookOpen, Dices, Layers3, Lock, NotebookPen, Radar, Target, Timer, Lightbulb } from "lucide-react";
import { useAuth } from "../components/AuthContext.jsx";
import { useNotes } from "../hooks/useNotes.js";
import { PAPER_NAMES, paperSize, totalPaper } from "../papers.js";
import { PASS_MARK, UNLOCK_THRESHOLD, computeUnlocked } from "../scores.js";

const GROUPS = [
  { title: "Practice Papers", papers: totalPaper.filter((n) => n <= 6) },
  { title: "SM Papers", papers: totalPaper.filter((n) => n > 6) },
];
const DOMAINS = ["Development with AWS Services", "Security", "Deployment", "Troubleshooting and Optimization"];

function Ring({ value }) {
  const r = 22, c = 2 * Math.PI * r;
  const pass = value >= PASS_MARK;
  return (
    <svg className="ring" viewBox="0 0 56 56" aria-label={`Best score ${value}%`}>
      <circle cx="28" cy="28" r={r} className="ring-bg" />
      <circle cx="28" cy="28" r={r} className={`ring-fg ${pass ? "pass" : "fail"}`}
        strokeDasharray={c} strokeDashoffset={c * (1 - value / 100)} transform="rotate(-90 28 28)" />
      <text x="28" y="32" textAnchor="middle">{value}%</text>
    </svg>
  );
}

function PaperCard({ num, score, locked, mode }) {
  const navigate = useNavigate();
  const status = locked ? "locked" : score == null ? "new" : score >= PASS_MARK ? "passed" : "retry";
  const label = { locked: "Locked", new: "Not started", passed: "Passed", retry: "Keep going" }[status];
  return (
    <button
      className={`paper-card paper-card--${status}`}
      disabled={locked}
      onClick={() => navigate(`/practice/${num}${mode === "practice" ? "?mode=practice" : ""}`)}
    >
      <div className="paper-card-top">
        <span className="paper-num">{locked ? <Lock size={20} /> : num}</span>
        {score != null && !locked ? <Ring value={score} /> : null}
      </div>
      <h3>{PAPER_NAMES[num]}</h3>
      <p className="muted">{paperSize(num)} questions · {mode === "practice" ? "untimed" : "130 min"}</p>
      <div className="paper-card-foot">
        <span className={`pill pill--${status}`}>{label}</span>
        <span className="paper-go">
          {locked ? `Score ${UNLOCK_THRESHOLD}% on paper ${num - 1}` : <>{score == null ? "Start" : "Retake"} <ArrowRight size={14} /></>}
        </span>
      </div>
    </button>
  );
}

function CustomPractice({ user, setModal }) {
  const navigate = useNavigate();
  const topics = useNotes();
  const [count, setCount] = useState(20);
  const [domain, setDomain] = useState(DOMAINS[0]);
  const [topic, setTopic] = useState("lambda");
  const go = (q) => (user ? navigate(`/practice/custom?${q}&count=${count}`) : setModal("login"));

  const tiles = [
    { icon: Radar, title: "Weak areas", text: "Your lowest-accuracy domain, favouring questions you haven't nailed yet.", q: "mode=weak" },
    { icon: NotebookPen, title: "My mistakes", text: "Retry questions you got wrong or skipped. Get them right to clear them.", q: "mode=mistakes" },
    { icon: Dices, title: "Random mix", text: "A shuffled set from every paper.", q: "mode=random" },
  ];
  return (
    <section className="paper-group">
      <h2 className="section-title">Custom practice</h2>
      <p className="muted">Untimed, with instant feedback after every question.</p>
      <div className="paper-grid">
        {tiles.map(({ icon: Icon, title, text, q }) => (
          <button key={title} className="paper-card" onClick={() => go(q)}>
            <span className="paper-num"><Icon size={22} /></span>
            <h3>{title}</h3><p className="muted">{text}</p>
            <span className="paper-go">Start <ArrowRight size={14} /></span>
          </button>
        ))}
        <div className="paper-card paper-card--static">
          <span className="paper-num"><Target size={22} /></span>
          <h3>By domain</h3>
          <select className="select" value={domain} onChange={(e) => setDomain(e.target.value)} aria-label="Domain">
            {DOMAINS.map((d) => <option key={d}>{d}</option>)}
          </select>
          <button className="btn btn-primary btn-sm" onClick={() => go(`mode=domain&domain=${encodeURIComponent(domain)}`)}>Practice</button>
        </div>
        <div className="paper-card paper-card--static">
          <span className="paper-num"><BookOpen size={22} /></span>
          <h3>By topic</h3>
          <select className="select" value={topic} onChange={(e) => setTopic(e.target.value)} aria-label="Topic">
            {(topics ?? []).map((t) => <option key={t.id} value={t.id}>{t.title}</option>)}
          </select>
          <button className="btn btn-primary btn-sm" onClick={() => go(`mode=topic&topic=${topic}`)}>Practice</button>
        </div>
        <div className="paper-card paper-card--static">
          <span className="paper-num"><Layers3 size={22} /></span>
          <h3>Set size</h3>
          <select className="select" value={count} onChange={(e) => setCount(Number(e.target.value))} aria-label="Number of questions">
            {[10, 20, 30, 50].map((n) => <option key={n} value={n}>{n} questions</option>)}
          </select>
        </div>
      </div>
    </section>
  );
}

export default function Practice() {
  const { scores, user, setModal } = useAuth();
  const [mode, setMode] = useState(() => {
    try { return localStorage.getItem("practice_mode") === "practice" ? "practice" : "exam"; } catch { return "exam"; }
  });
  const pick = (m) => { setMode(m); try { localStorage.setItem("practice_mode", m); } catch { /* ignore */ } };
  const unlocked = computeUnlocked(scores, totalPaper.length);
  const passed = totalPaper.filter((n) => (scores[n] ?? 0) >= PASS_MARK).length;

  return (
    <div>
      <header className="page-head">
        <div>
          <h1>Practice</h1>
          <p className="muted">
            65 questions per paper · {PASS_MARK}% to pass · score {UNLOCK_THRESHOLD}% to unlock the next paper.
          </p>
        </div>
        <div className="page-head-side">
          <strong>{passed}/{totalPaper.length}</strong>
          <span>papers passed</span>
        </div>
      </header>

      {!user && (
        <div className="notice">
          <span>Scores are saved in this browser only.</span>
          <button className="link-btn" onClick={() => setModal("register")}>Create an account to keep them <ArrowRight size={14} /></button>
        </div>
      )}

      <CustomPractice user={user} setModal={setModal} />

      <div className="mode-switch" role="group" aria-label="Paper mode">
        <button className={mode === "exam" ? "on" : ""} onClick={() => pick("exam")} aria-pressed={mode === "exam"}>
          <Timer size={16} /> Exam mode <small>timed · scored · unlocks papers</small>
        </button>
        <button className={mode === "practice" ? "on" : ""} onClick={() => pick("practice")} aria-pressed={mode === "practice"}>
          <Lightbulb size={16} /> Practice mode <small>untimed · instant answers</small>
        </button>
      </div>

      {GROUPS.map((g) => (
        <section key={g.title} className="paper-group">
          <h2 className="section-title">{g.title}</h2>
          <div className="paper-grid">
            {g.papers.map((n) => (
              <PaperCard key={n} num={n} score={scores[n]} locked={!unlocked[n]} mode={mode} />
            ))}
          </div>
        </section>
      ))}

      <p className="muted center">
        Exam mode warns when you switch tabs; the fourth switch abandons the attempt. Keyboard: A–E or 1–5 to answer, ← → to move, F to flag.{" "}
        <Link to="/notes">Review the notes first <ArrowRight size={14} /></Link>
      </p>
    </div>
  );
}
