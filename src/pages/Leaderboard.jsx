import { useCallback, useEffect, useState } from "react";
import { Crown, Medal, Trophy } from "lucide-react";
import { api } from "../api.js";
import { useAuth } from "../components/AuthContext.jsx";

export default function Leaderboard() {
  const { user, refresh, setModal } = useAuth();
  const [data, setData] = useState(null);
  const load = useCallback(() => api.get("/leaderboard").then(setData).catch(() => setData({ board: [], me: null })), []);
  useEffect(() => { load(); }, [load]);

  const toggle = async () => {
    await api.post("/settings", { leaderboardOptIn: !user.leaderboardOptIn });
    await refresh(); await load();
  };
  const icon = (r) => (r === 1 ? <Crown size={18} /> : r <= 3 ? <Medal size={18} /> : null);

  return (
    <div>
      <header className="page-head">
        <div>
          <h1>Leaderboard</h1>
          <p className="muted">Ranked by the sum of each person's best score on every paper (max {12 * 100}). Only people who opt in appear.</p>
        </div>
        {user
          ? <button className={`btn ${user.leaderboardOptIn ? "btn-ok" : "btn-primary"}`} onClick={toggle}>
              <Trophy size={16} /> {user.leaderboardOptIn ? "You're on the board — leave" : "Join the leaderboard"}
            </button>
          : <button className="btn btn-primary" onClick={() => setModal("login")}>Sign in to join</button>}
      </header>

      {!data ? <div className="loading-block"><span className="spinner" /></div> : data.board.length === 0 ? (
        <div className="empty-state card"><div className="empty-icon"><Trophy size={40} /></div><p>No one has joined yet — be the first.</p></div>
      ) : (
        <div className="card">
          <div className="tbl-scroll">
            <table className="tbl">
              <thead><tr><th>#</th><th>Name</th><th>Points</th><th>Papers</th><th>Average</th></tr></thead>
              <tbody>
                {data.board.map((r) => (
                  <tr key={r.rank} className={r.me ? "row-me" : ""}>
                    <td className="rank">{icon(r.rank) ?? r.rank}</td>
                    <td>{r.name}{r.me && <span className="tag">you</span>}</td>
                    <td><strong>{r.points}</strong></td><td>{r.papers}/12</td><td>{r.avg}%</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          {data.me && data.me.rank > 25 && <p className="muted small">Your rank: #{data.me.rank} · {data.me.points} points</p>}
        </div>
      )}
    </div>
  );
}
