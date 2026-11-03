import { Link } from "react-router-dom";
import { useAuth } from "../components/AuthContext.jsx";
import { PAPER_NAMES, TOTAL_QUESTIONS, totalPaper } from "../papers.js";
import { PASS_MARK, UNLOCK_THRESHOLD, computeUnlocked } from "../scores.js";
import { firstName } from "../utils/format.js";

const DOMAINS = [
  { name: "Development with AWS Services", pct: 32, color: "var(--c-compute)" },
  { name: "Security", pct: 26, color: "var(--c-sec)" },
  { name: "Deployment", pct: 24, color: "var(--c-net)" },
  { name: "Troubleshooting & Optimization", pct: 18, color: "var(--c-storage)" },
];

function ProgressCard() {
  const { user, scores, setModal } = useAuth();
  const done = totalPaper.filter((n) => (scores[n] ?? 0) >= PASS_MARK).length;
  const unlocked = computeUnlocked(scores, totalPaper.length);
  const next = totalPaper.find((n) => unlocked[n] && (scores[n] ?? 0) < UNLOCK_THRESHOLD);
  const pct = Math.round((done / totalPaper.length) * 100);

  return (
    <section className="card progress-card">
      <div className="progress-head">
        <div>
          <h2>{user ? `Welcome back, ${firstName(user.name)} 👋` : "Track your progress"}</h2>
          <p>
            {user
              ? `${done} of ${totalPaper.length} papers passed at ${PASS_MARK}%+`
              : "Sign in to save scores across devices and see your history and weak areas."}
          </p>
        </div>
        {user ? (
          next ? (
            <Link className="btn btn-primary" to={`/practice/${next}`}>Continue: {PAPER_NAMES[next]} →</Link>
          ) : (
            <Link className="btn btn-primary" to="/dashboard">View dashboard →</Link>
          )
        ) : (
          <button className="btn btn-primary" onClick={() => setModal("register")}>Create free account</button>
        )}
      </div>
      <div className="bar" role="progressbar" aria-valuenow={pct} aria-valuemin={0} aria-valuemax={100}>
        <div className="bar-fill" style={{ width: `${pct}%` }} />
      </div>
    </section>
  );
}

export default function Home() {
  return (
    <div className="home">
      <section className="hero">
        <span className="badge">DVA-C02 · AWS Certified Developer – Associate</span>
        <h1>Pass the AWS Developer exam <em>with confidence.</em></h1>
        <p>
          Visual study notes, {TOTAL_QUESTIONS} realistic practice questions across {totalPaper.length} timed
          papers, and a dashboard that shows exactly where to focus next.
        </p>
        <div className="hero-cta">
          <Link className="btn btn-primary btn-lg" to="/practice">Start practising</Link>
          <Link className="btn btn-ghost btn-lg" to="/notes">Browse notes</Link>
        </div>
        <dl className="stats">
          <div><dt>{totalPaper.length}</dt><dd>Practice papers</dd></div>
          <div><dt>{TOTAL_QUESTIONS}</dt><dd>Questions</dd></div>
          <div><dt>130</dt><dd>Minutes per paper</dd></div>
          <div><dt>{PASS_MARK}%</dt><dd>Pass mark</dd></div>
        </dl>
      </section>

      <ProgressCard />

      <section className="grid-3">
        <Link to="/notes" className="card feature">
          <span className="feature-icon">📚</span>
          <h3>Visual study notes</h3>
          <p>Every exam topic with architecture diagrams, cheat-sheet tables and exam tips — searchable, with read-tracking.</p>
          <span className="feature-cta">Open notes →</span>
        </Link>
        <Link to="/practice" className="card feature">
          <span className="feature-icon">📝</span>
          <h3>Timed practice exams</h3>
          <p>65 questions, 130 minutes, flag-and-review, and detailed explanations for every answer choice.</p>
          <span className="feature-cta">Choose a paper →</span>
        </Link>
        <Link to="/dashboard" className="card feature">
          <span className="feature-icon">📊</span>
          <h3>Progress dashboard</h3>
          <p>Score trends, attempt history and accuracy by exam domain so you can fix weak spots first.</p>
          <span className="feature-cta">See my stats →</span>
        </Link>
      </section>

      <section className="card">
        <h2 className="section-title">What the exam covers</h2>
        <p className="muted">Domain weighting for DVA-C02.</p>
        <div className="domains">
          {DOMAINS.map((d) => (
            <div key={d.name} className="domain-row">
              <span className="domain-name">{d.name}</span>
              <div className="bar"><div className="bar-fill" style={{ width: `${d.pct * 3}%`, background: d.color }} /></div>
              <span className="domain-pct">{d.pct}%</span>
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}
