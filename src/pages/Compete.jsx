import { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { ArrowRight, Clock, Hash, ListChecks, Swords, Users } from "lucide-react";
import { api } from "../api.js";
import { useAuth } from "../components/AuthContext.jsx";
import { PAPER_NAMES, totalPaper } from "../papers.js";

const STATUS = { lobby: "Waiting", live: "Live", finished: "Finished" };

export default function Compete() {
  const { user, ready, setModal } = useAuth();
  const navigate = useNavigate();
  const [form, setForm] = useState({ paperNum: 1, count: 20, durationMin: 40, maxPlayers: 10 });
  const [auto, setAuto] = useState(true);
  const [joinCode, setJoinCode] = useState("");
  const [rooms, setRooms] = useState(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    if (user) api.get("/rooms").then((d) => setRooms(d.rooms)).catch(() => setRooms([]));
  }, [user]);

  const set = (k) => (e) => {
    const v = Number(e.target.value);
    setForm((f) => {
      const next = { ...f, [k]: v };
      if (k === "count" && auto) next.durationMin = Math.min(180, Math.max(3, v * 2));
      return next;
    });
    if (k === "durationMin") setAuto(false);
  };

  const create = async (e) => {
    e.preventDefault();
    if (!user) return setModal("login");
    setBusy(true); setError("");
    try { const { code } = await api.post("/rooms", form); navigate(`/compete/${code}`); }
    catch (err) { setError(err.message); setBusy(false); }
  };

  if (!ready) return <div className="loading-block"><span className="spinner" /></div>;

  return (
    <div>
      <header className="page-head">
        <div>
          <h1>Compete with friends</h1>
          <p className="muted">Everyone gets the same questions, starts at the same moment and has the same time limit. Live standings, one winner.</p>
        </div>
      </header>

      <div className="dash-grid">
        <form className="card" onSubmit={create}>
          <h2 className="section-title"><Swords size={18} /> Start a competition</h2>
          <div className="form-grid">
            <label className="field"><span>Paper</span>
              <select className="select" value={form.paperNum} onChange={set("paperNum")}>
                {totalPaper.map((n) => <option key={n} value={n}>{PAPER_NAMES[n]}</option>)}
              </select></label>
            <label className="field"><span>Questions</span>
              <select className="select" value={form.count} onChange={set("count")}>
                {[5, 10, 20, 30, 40, 65].map((n) => <option key={n} value={n}>{n}</option>)}
              </select></label>
            <label className="field"><span>Time limit (minutes)</span>
              <input type="number" min={3} max={180} value={form.durationMin} onChange={set("durationMin")} /></label>
            <label className="field"><span>Max players</span>
              <select className="select" value={form.maxPlayers} onChange={set("maxPlayers")}>
                {[2, 3, 5, 10, 20, 50].map((n) => <option key={n} value={n}>{n}</option>)}
              </select></label>
          </div>
          {error && <div className="auth-error">{error}</div>}
          <button className="btn btn-primary btn-lg" disabled={busy}>
            {user ? "Create room" : "Sign in to create a room"} <ArrowRight size={16} />
          </button>
          <p className="muted small">You'll get an invite link to share. Questions are hidden until the host starts a 10-second countdown.</p>
        </form>

        <div>
          <form className="card" onSubmit={(e) => { e.preventDefault(); if (joinCode.trim()) navigate(`/compete/${joinCode.trim().toUpperCase()}`); }}>
            <h2 className="section-title"><Hash size={18} /> Have a code?</h2>
            <label className="field"><span>Room code</span>
              <input value={joinCode} maxLength={6} placeholder="ABC123" autoCapitalize="characters"
                onChange={(e) => setJoinCode(e.target.value.toUpperCase())} className="code-input" /></label>
            <button className="btn btn-primary" disabled={joinCode.trim().length < 4}>Join <ArrowRight size={16} /></button>
          </form>

          <section className="card">
            <h2 className="section-title">Your recent rooms</h2>
            {!user ? <p className="muted">Sign in to see your rooms.</p>
              : !rooms ? <div className="spinner" />
              : rooms.length === 0 ? <p className="muted">No competitions yet — create the first one.</p> : (
                <ul className="room-list">
                  {rooms.map((r) => (
                    <li key={r.code}>
                      <Link to={`/compete/${r.code}`}>
                        <strong className="mono">{r.code}</strong>
                        <span className="muted small"><ListChecks size={12} /> {r.question_count} · <Clock size={12} /> {r.duration_min}m · <Users size={12} /> {r.players}</span>
                        <span className={`pill ${r.status === "finished" ? "pill--passed" : r.status === "live" ? "pill--retry" : ""}`}>
                          {r.status === "finished" && r.score_pct != null ? `${r.score_pct}%` : STATUS[r.status]}
                        </span>
                      </Link>
                    </li>
                  ))}
                </ul>
              )}
          </section>
        </div>
      </div>
    </div>
  );
}
