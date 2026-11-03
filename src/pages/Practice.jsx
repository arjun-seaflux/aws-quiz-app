import { Link, useNavigate } from "react-router-dom";
import { useAuth } from "../components/AuthContext.jsx";
import { PAPER_NAMES, paperSize, totalPaper } from "../papers.js";
import { PASS_MARK, UNLOCK_THRESHOLD, computeUnlocked } from "../scores.js";

const GROUPS = [
  { title: "Practice Papers", papers: totalPaper.filter((n) => n <= 6) },
  { title: "SM Papers", papers: totalPaper.filter((n) => n > 6) },
];

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

function PaperCard({ num, score, locked }) {
  const navigate = useNavigate();
  const status = locked ? "locked" : score == null ? "new" : score >= PASS_MARK ? "passed" : "retry";
  const label = { locked: "Locked", new: "Not started", passed: "Passed", retry: "Keep going" }[status];
  return (
    <button
      className={`paper-card paper-card--${status}`}
      disabled={locked}
      onClick={() => navigate(`/practice/${num}`)}
    >
      <div className="paper-card-top">
        <span className="paper-num">{locked ? "🔒" : num}</span>
        {score != null && !locked ? <Ring value={score} /> : null}
      </div>
      <h3>{PAPER_NAMES[num]}</h3>
      <p className="muted">{paperSize(num)} questions · 130 min</p>
      <div className="paper-card-foot">
        <span className={`pill pill--${status}`}>{label}</span>
        <span className="paper-go">{locked ? `Score ${UNLOCK_THRESHOLD}% on paper ${num - 1}` : score == null ? "Start →" : "Retake →"}</span>
      </div>
    </button>
  );
}

export default function Practice() {
  const { scores, user, setModal } = useAuth();
  const unlocked = computeUnlocked(scores, totalPaper.length);
  const passed = totalPaper.filter((n) => (scores[n] ?? 0) >= PASS_MARK).length;

  return (
    <div>
      <header className="page-head">
        <div>
          <h1>Practice exams</h1>
          <p className="muted">
            65 questions · 130 minutes · {PASS_MARK}% to pass. Score {UNLOCK_THRESHOLD}% to unlock the next paper.
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
          <button className="link-btn" onClick={() => setModal("register")}>Create an account to keep them →</button>
        </div>
      )}

      {GROUPS.map((g) => (
        <section key={g.title} className="paper-group">
          <h2 className="section-title">{g.title}</h2>
          <div className="paper-grid">
            {g.papers.map((n) => (
              <PaperCard key={n} num={n} score={scores[n]} locked={!unlocked[n]} />
            ))}
          </div>
        </section>
      ))}

      <p className="muted center">
        Rules: tab-switching during an exam triggers warnings, and the fourth switch abandons the attempt.{" "}
        <Link to="/notes">Review the notes first →</Link>
      </p>
    </div>
  );
}
