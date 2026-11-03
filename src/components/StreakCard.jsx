import { useEffect, useState } from "react";
import { Flame, Target } from "lucide-react";
import { api } from "../api.js";

const tz = (() => { try { return Intl.DateTimeFormat().resolvedOptions().timeZone; } catch { return "UTC"; } })();
const level = (n) => (n === 0 ? 0 : n < 5 ? 1 : n < 15 ? 2 : n < 30 ? 3 : 4);

/** Streak, daily-goal progress and a 12-week activity heatmap. */
export default function StreakCard({ compact = false }) {
  const [d, setD] = useState(null);
  useEffect(() => { api.get(`/activity?tz=${encodeURIComponent(tz)}`).then(setD).catch(() => {}); }, []);
  if (!d) return null;

  const pct = Math.min(100, Math.round((d.todayCount / d.goal) * 100));
  const byDay = new Map(d.days.map((x) => [x.day, x.answered]));
  const cells = [];
  const end = new Date(`${d.today}T00:00:00Z`);
  end.setUTCDate(end.getUTCDate() + (6 - end.getUTCDay()));          // finish on Saturday
  for (let i = 12 * 7 - 1; i >= 0; i--) {
    const x = new Date(end); x.setUTCDate(end.getUTCDate() - i);
    const key = x.toISOString().slice(0, 10);
    cells.push({ key, n: byDay.get(key) ?? 0, future: key > d.today });
  }

  return (
    <section className="card streak">
      <div className="streak-top">
        <div className="streak-stat"><Flame size={26} className={d.streak ? "hot" : ""} />
          <div><strong>{d.streak}</strong><span>day streak</span></div></div>
        <div className="streak-goal">
          <div className="streak-goal-head"><Target size={16} /> Today: {d.todayCount}/{d.goal} questions</div>
          <div className="bar"><div className={`bar-fill ${pct >= 100 ? "good" : ""}`} style={{ width: `${pct}%` }} /></div>
          <span className="muted small">{pct >= 100 ? "Goal reached — nice work!" : `${d.goal - d.todayCount} to go`}</span>
        </div>
      </div>
      {!compact && (
        <>
          <div className="heat" role="img" aria-label="Questions answered per day over the last 12 weeks">
            {cells.map((c) => <span key={c.key} className={`heat-cell l${c.future ? "x" : level(c.n)}`} title={`${c.key}: ${c.n} answered`} />)}
          </div>
          <p className="muted small">Longest streak: {d.longest} day{d.longest === 1 ? "" : "s"} · last 12 weeks</p>
        </>
      )}
    </section>
  );
}
