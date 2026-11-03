import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { api } from "../api.js";
import { useAuth } from "../components/AuthContext.jsx";
import { PAPER_NAMES, totalPaper } from "../papers.js";
import { PASS_MARK } from "../scores.js";
import { formatDate, formatDuration } from "../utils/format.js";

function Trend({ attempts }) {
  const pts = [...attempts].reverse().slice(-20); // oldest → newest
  if (pts.length < 2) return <p className="muted">Complete two or more exams to see your trend.</p>;
  const W = 640, H = 180, P = 24;
  const x = (i) => P + (i * (W - 2 * P)) / (pts.length - 1);
  const y = (v) => H - P - (v / 100) * (H - 2 * P);
  const line = pts.map((a, i) => `${i ? "L" : "M"}${x(i)},${y(a.score_pct)}`).join(" ");
  return (
    <svg viewBox={`0 0 ${W} ${H}`} className="trend" role="img" aria-label="Score trend">
      {[0, 50, 100].map((v) => (
        <g key={v}><line x1={P} x2={W - P} y1={y(v)} y2={y(v)} className="trend-grid" /><text x={4} y={y(v) + 4}>{v}</text></g>
      ))}
      <line x1={P} x2={W - P} y1={y(PASS_MARK)} y2={y(PASS_MARK)} className="trend-pass" />
      <text x={W - P} y={y(PASS_MARK) - 5} textAnchor="end" className="trend-pass-label">pass {PASS_MARK}%</text>
      <path d={`${line} L${x(pts.length - 1)},${y(0)} L${x(0)},${y(0)} Z`} className="trend-area" />
      <path d={line} className="trend-line" />
      {pts.map((a, i) => <circle key={a.id} cx={x(i)} cy={y(a.score_pct)} r="4" className={a.score_pct >= PASS_MARK ? "dot pass" : "dot fail"}><title>{`${PAPER_NAMES[a.paper_num] ?? "Paper " + a.paper_num}: ${a.score_pct}%`}</title></circle>)}
    </svg>
  );
}

function Tile({ value, label, tone }) {
  return <div className={`tile ${tone || ""}`}><strong>{value}</strong><span>{label}</span></div>;
}

export default function Dashboard() {
  const { user, ready, scores, setModal } = useAuth();
  const [data, setData] = useState(null);
  const [error, setError] = useState(false);

  useEffect(() => {
    if (!user) return;
    let live = true;
    Promise.all([api.get("/attempts"), api.get("/stats")])
      .then(([a, s]) => live && setData({ attempts: a.attempts, domains: s.domains }))
      .catch(() => live && setError(true));
    return () => { live = false; };
  }, [user]);

  if (!ready) return <div className="loading-block"><span className="spinner" /></div>;

  if (!user)
    return (
      <div className="empty-state">
        <div className="empty-emoji">📊</div>
        <h1>Your dashboard</h1>
        <p>Sign in to see score trends, attempt history and accuracy by exam domain.
          {Object.keys(scores).length > 0 && " Your existing guest scores will be imported automatically."}</p>
        <div className="row-gap">
          <button className="btn btn-primary" onClick={() => setModal("login")}>Sign in</button>
          <button className="btn btn-ghost" onClick={() => setModal("register")}>Create account</button>
        </div>
      </div>
    );

  if (error) return <div className="empty-state"><div className="empty-emoji">⚠️</div><p>Couldn't load your stats. Try again shortly.</p></div>;
  if (!data) return <div className="loading-block"><span className="spinner" /> Loading your stats…</div>;

  const quiz = data.attempts.filter((a) => a.source === "quiz");
  const avg = quiz.length ? Math.round(quiz.reduce((s, a) => s + a.score_pct, 0) / quiz.length) : null;
  const passRate = quiz.length ? Math.round((quiz.filter((a) => a.score_pct >= PASS_MARK).length / quiz.length) * 100) : null;
  const best = Object.values(scores).length ? Math.max(...Object.values(scores)) : null;
  const passed = totalPaper.filter((n) => (scores[n] ?? 0) >= PASS_MARK).length;
  const domains = data.domains
    .map((d) => ({ ...d, pct: Math.round((d.correct / d.answered) * 100) }))
    .sort((a, b) => a.pct - b.pct);

  return (
    <div>
      <header className="page-head">
        <div><h1>Dashboard</h1><p className="muted">{user.name} · {user.email}</p></div>
        <Link className="btn btn-primary" to="/practice">Take an exam</Link>
      </header>

      <div className="tiles">
        <Tile value={quiz.length} label="Exams taken" />
        <Tile value={avg == null ? "—" : `${avg}%`} label="Average score" />
        <Tile value={best == null ? "—" : `${best}%`} label="Best score" tone="good" />
        <Tile value={passRate == null ? "—" : `${passRate}%`} label="Pass rate" />
        <Tile value={`${passed}/${totalPaper.length}`} label="Papers passed" />
      </div>

      <div className="dash-grid">
        <section className="card">
          <h2 className="section-title">Score trend</h2>
          <Trend attempts={quiz} />
        </section>

        <section className="card">
          <h2 className="section-title">Accuracy by domain</h2>
          {domains.length === 0 ? <p className="muted">Finish an exam to see your strengths and weak spots.</p> : (
            <div className="domains">
              {domains.map((d) => (
                <div key={d.domain} className="domain-row">
                  <span className="domain-name">{d.domain}</span>
                  <div className="bar"><div className={`bar-fill ${d.pct >= PASS_MARK ? "good" : d.pct >= 50 ? "mid" : "bad"}`} style={{ width: `${d.pct}%` }} /></div>
                  <span className="domain-pct">{d.pct}%</span>
                </div>
              ))}
              <p className="muted small">Lowest first — start with the top one. <Link to="/notes">Open notes →</Link></p>
            </div>
          )}
        </section>
      </div>

      <section className="card">
        <h2 className="section-title">Best score per paper</h2>
        <div className="mini-grid">
          {totalPaper.map((n) => (
            <Link key={n} to={`/practice/${n}`} className={`mini ${scores[n] == null ? "" : scores[n] >= PASS_MARK ? "pass" : "fail"}`}>
              <span>{PAPER_NAMES[n]}</span><strong>{scores[n] == null ? "—" : `${scores[n]}%`}</strong>
            </Link>
          ))}
        </div>
      </section>

      <section className="card">
        <h2 className="section-title">Attempt history</h2>
        {data.attempts.length === 0 ? <p className="muted">No attempts yet.</p> : (
          <div className="tbl-scroll">
            <table className="tbl">
              <thead><tr><th>Paper</th><th>Date</th><th>Score</th><th>Correct / Wrong / Skipped</th><th>Time</th></tr></thead>
              <tbody>
                {data.attempts.slice(0, 50).map((a) => (
                  <tr key={a.id}>
                    <td>{PAPER_NAMES[a.paper_num] ?? `Paper ${a.paper_num}`}{a.source === "import" && <span className="tag">imported</span>}</td>
                    <td>{formatDate(a.created_at)}</td>
                    <td><span className={`pill ${a.score_pct >= PASS_MARK ? "pill--passed" : "pill--retry"}`}>{a.score_pct}%</span></td>
                    <td>{a.source === "import" ? "—" : `${a.correct} / ${a.wrong} / ${a.skipped}`}</td>
                    <td>{a.source === "import" ? "—" : formatDuration(a.time_taken)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </div>
  );
}
