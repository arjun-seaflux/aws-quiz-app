import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { AlertTriangle, ArrowRight, Check, Clock, Copy, Crown, ListChecks, LogOut, Play, Share2, Swords, Trophy, Users } from "lucide-react";
import Quiz from "../components/Quiz.jsx";
import { api } from "../api.js";
import { useAuth } from "../components/AuthContext.jsx";
import { PAPER_NAMES } from "../papers.js";
import { formatDuration } from "../utils/format.js";

const initial = (n) => (n || "?").trim()[0]?.toUpperCase();

function Standings({ players, total, compact }) {
  return (
    <ol className={`standings ${compact ? "standings--compact" : ""}`}>
      {players.map((p) => (
        <li key={p.userId} className={p.isMe ? "me" : ""}>
          <span className="st-rank">{p.rank ?? "–"}</span>
          <span className="um-avatar">{initial(p.name)}</span>
          <span className="st-name">{p.name}{p.isHost && <Crown size={13} aria-label="host" />}</span>
          <span className="st-bar"><span style={{ width: `${Math.round(((p.finished ? total : p.answered) / total) * 100)}%` }} /></span>
          <span className="st-score">{p.finished ? `${p.scorePct}%` : `${p.answered}/${total}`}</span>
        </li>
      ))}
    </ol>
  );
}

function Podium({ players }) {
  const top = players.filter((p) => p.finished).slice(0, 3);
  const order = [top[1], top[0], top[2]]; // 2nd, 1st, 3rd
  return (
    <div className="podium">
      {order.map((p, i) => p && (
        <div key={p.userId} className={`podium-col podium-${[2, 1, 3][i]}`}>
          <span className="um-avatar">{initial(p.name)}</span>
          <strong>{p.name}</strong>
          <span className="muted">{p.scorePct}% · {formatDuration(p.timeTaken)}</span>
          <div className="podium-step">{[2, 1, 3][i]}</div>
        </div>
      ))}
    </div>
  );
}

export default function Room() {
  const { code: rawCode } = useParams();
  const code = rawCode.toUpperCase();
  const navigate = useNavigate();
  const { user, ready, setModal } = useAuth();
  const [snap, setSnap] = useState(null);
  const [error, setError] = useState(null);
  const [qs, setQs] = useState(null);
  const [view, setView] = useState("play");
  const [copied, setCopied] = useState(false);
  const [busy, setBusy] = useState(false);
  const [, setTick] = useState(0);
  const offset = useRef(0); // serverNow − localNow, refreshed on every poll
  const finishing = useRef(false);

  const refresh = useCallback(async () => {
    const t0 = Date.now();
    try {
      const d = await api.get(`/rooms/${code}`);
      offset.current = d.serverNow - (t0 + Date.now()) / 2;
      setSnap(d); setError(null); return d;
    } catch (e) { setError(e); return null; }
  }, [code]);

  // Poll: fast in the lobby, steady while live, stop when the room is over.
  useEffect(() => {
    if (!user) return;
    let stop = false, timer;
    const loop = async () => {
      const d = await refresh();
      if (stop || d?.room.status === "finished") return;
      timer = setTimeout(loop, d?.room.status === "lobby" ? 2000 : 3000);
    };
    loop();
    return () => { stop = true; clearTimeout(timer); };
  }, [user, refresh]);

  // Auto-join an open lobby (this is what an invite link does).
  useEffect(() => {
    if (snap && !snap.joined && snap.room.status === "lobby" && !busy) {
      setBusy(true);
      api.post(`/rooms/${code}`, { action: "join" }).then(setSnap).catch((e) => setError(e)).finally(() => setBusy(false));
    }
  }, [snap, code, busy]);

  const now = () => Date.now() + offset.current;
  const room = snap?.room;
  const startsIn = room?.startsAt ? Math.ceil((room.startsAt - now()) / 1000) : null;
  const me = snap?.players.find((p) => p.isMe);
  const isHost = room && user && room.hostId === user.id;

  // 4×/second render only while a countdown is on screen.
  useEffect(() => {
    if (room?.status !== "live" || startsIn === null || startsIn <= 0) return;
    const id = setInterval(() => setTick((t) => t + 1), 250);
    return () => clearInterval(id);
  }, [room?.status, startsIn]);

  const playing = room?.status === "live" && snap?.joined && startsIn !== null && startsIn <= 0 && !me?.finished;

  // Once the round begins, fetch the shared question set (retry briefly if the clock is early).
  useEffect(() => {
    if (!playing || qs) return;
    let live = true, timer;
    const go = async () => {
      try { const d = await api.get(`/rooms/${code}?questions=1`); if (live) setQs(d); }
      catch (e) { if (live && e.status === 425) timer = setTimeout(go, 400); else if (live) setError(e); }
    };
    go();
    return () => { live = false; clearTimeout(timer); };
  }, [playing, qs, code]);

  const save = useMemo(() => {
    let last = 0;
    return ({ answers }) => {
      const t = Date.now();
      if (t - last < 1500) return;
      last = t;
      api.post(`/rooms/${code}`, { action: "progress", answers }).catch(() => {});
    };
  }, [code]);

  const finish = useCallback(async (_n, _pct, { answers }) => {
    if (finishing.current) return;
    finishing.current = true;
    try { setSnap(await api.post(`/rooms/${code}`, { action: "finish", answers })); } catch { /* settle() will auto-submit */ }
  }, [code]);

  const link = `${window.location.origin}/compete/${code}`;
  const copy = async () => { try { await navigator.clipboard.writeText(link); setCopied(true); setTimeout(() => setCopied(false), 1800); } catch { /* ignore */ } };
  const share = () => (navigator.share
    ? navigator.share({ title: "Join my AWS Quiz competition", text: `Race me on ${PAPER_NAMES[room.paperNum]}!`, url: link }).catch(() => {})
    : copy());
  const act = async (action) => { setBusy(true); try { setSnap(await api.post(`/rooms/${code}`, { action })); } catch (e) { setError(e); } setBusy(false); };
  const leave = async () => { await api.post(`/rooms/${code}`, { action: "leave" }).catch(() => {}); navigate("/compete"); };
  const rematch = async () => {
    setBusy(true);
    try { const { code: c } = await api.post("/rooms", { paperNum: room.paperNum, count: room.questionCount, durationMin: room.durationMin, maxPlayers: room.maxPlayers }); navigate(`/compete/${c}`); }
    catch (e) { setError(e); setBusy(false); }
  };

  if (!ready) return <div className="loading-block"><span className="spinner" /></div>;

  if (!user)
    return (
      <div className="empty-state">
        <div className="empty-icon"><Swords size={40} /></div>
        <h1>You're invited to compete</h1>
        <p>Room <strong className="mono">{code}</strong> is waiting. Sign in or create a free account to join your friends.</p>
        <div className="row-gap">
          <button className="btn btn-primary" onClick={() => setModal("register")}>Create account</button>
          <button className="btn btn-ghost" onClick={() => setModal("login")}>Sign in</button>
        </div>
      </div>
    );

  if (error && !snap)
    return (
      <div className="empty-state">
        <div className="empty-icon"><AlertTriangle size={40} /></div>
        <h1>{error.status === 404 ? "Room not found" : "Couldn't open this room"}</h1>
        <p>{error.status === 404 ? "Check the code, or ask your friend for a fresh invite link." : error.message}</p>
        <Link className="btn btn-primary" to="/compete">Back to Compete</Link>
      </div>
    );
  if (!snap) return <div className="loading-block"><span className="spinner" /> Opening room…</div>;

  const header = (
    <header className="page-head">
      <div>
        <h1><span className="mono">{code}</span></h1>
        <p className="muted">
          {PAPER_NAMES[room.paperNum]} · <ListChecks size={14} /> {room.questionCount} questions · <Clock size={14} /> {room.durationMin} min · <Users size={14} /> up to {room.maxPlayers}
        </p>
      </div>
      <span className={`pill ${room.status === "live" ? "pill--retry" : room.status === "finished" ? "pill--passed" : ""}`}>
        {{ lobby: "Waiting for players", live: "Live", finished: "Finished" }[room.status]}
      </span>
    </header>
  );

  // Not in the room and it's no longer joinable
  if (!snap.joined && room.status !== "lobby")
    return (
      <div className="empty-state">
        <div className="empty-icon"><Swords size={40} /></div>
        <h1>This round has already started</h1>
        <p>Ask the host to create a new room, or start your own.</p>
        <Link className="btn btn-primary" to="/compete">Back to Compete</Link>
      </div>
    );
  if (!snap.joined) return <div className="loading-block"><span className="spinner" /> Joining…</div>;

  // ── Lobby
  if (room.status === "lobby")
    return (
      <div>
        {header}
        <div className="dash-grid">
          <section className="card">
            <h2 className="section-title">Invite friends</h2>
            <p className="muted">Share this link — anyone who opens it joins the room.</p>
            <div className="invite">
              <input readOnly value={link} onFocus={(e) => e.target.select()} aria-label="Invite link" />
              <button className="btn btn-primary btn-sm" onClick={copy}>{copied ? <Check size={16} /> : <Copy size={16} />} {copied ? "Copied" : "Copy"}</button>
              <button className="btn btn-sm" onClick={share}><Share2 size={16} /> Share</button>
            </div>
            <p className="muted small">Or tell them the code <strong className="mono">{code}</strong> on the Compete page.</p>
            <div className="row-gap start">
              {isHost ? (
                <button className="btn btn-primary btn-lg" disabled={busy} onClick={() => act("start")}>
                  <Play size={18} /> Start round
                </button>
              ) : <p className="muted"><span className="spinner" /> Waiting for the host to start…</p>}
              <button className="btn btn-ghost" onClick={leave}><LogOut size={16} /> Leave</button>
            </div>
            {isHost && <p className="muted small">Everyone starts together after a 10-second countdown and gets exactly {room.durationMin} minutes.</p>}
          </section>
          <section className="card">
            <h2 className="section-title"><Users size={18} /> Players ({snap.players.length}/{room.maxPlayers})</h2>
            <ul className="lobby-players">
              {snap.players.map((p) => (
                <li key={p.userId} className={p.isMe ? "me" : ""}>
                  <span className="um-avatar">{initial(p.name)}</span>
                  <span>{p.name}{p.isMe && <span className="tag">you</span>}</span>
                  {p.isHost && <span className="tag"><Crown size={12} /> host</span>}
                </li>
              ))}
            </ul>
          </section>
        </div>
      </div>
    );

  // ── Countdown
  if (room.status === "live" && startsIn !== null && startsIn > 0)
    return (
      <div className="countdown" role="status" aria-live="assertive">
        <p className="muted">Get ready — {PAPER_NAMES[room.paperNum]}</p>
        <div className="count-num" key={startsIn}>{startsIn}</div>
        <p className="muted">{snap.players.length} player{snap.players.length > 1 ? "s" : ""} · {room.questionCount} questions · {room.durationMin} minutes</p>
      </div>
    );

  // ── Playing / reviewing / results
  // The Quiz stays mounted once the round has begun (hidden while you look at the
  // leaderboard) so your answers and review screen aren't lost.
  if (playing && !qs) return <div className="loading-block"><span className="spinner" /> Loading questions…</div>;
  const quizMounted = !!qs && startsIn !== null && startsIn <= 0;
  const showResults = !quizMounted || view === "results";
  const finished = room.status === "finished";
  const waiting = snap.players.filter((p) => !p.finished).length;
  const saved = qs && Array.isArray(qs.myAnswers) && qs.myAnswers.length === qs.questions.length ? qs.myAnswers : null;

  return (
    <div>
      {quizMounted && (
        <div hidden={showResults}>
          <div className="live-bar card">
            <div className="live-bar-head"><strong className="mono">{code}</strong><span className="muted small">Live standings</span></div>
            <Standings players={snap.players} total={room.questionCount} compact />
          </div>
          <Quiz
            questions={qs.questions}
            paperNum={room.paperNum}
            mode="room"
            startedAt={room.startsAt - offset.current}
            deadlineAt={room.deadline - offset.current}
            initial={saved ? { answers: saved, flagged: new Array(saved.length).fill(false), currentQ: 0 } : undefined}
            onProgress={save}
            onPaperComplete={finish}
            onBackToHome={() => setView("results")}
            backLabel="See leaderboard"
            submitTitle="Submit your round?"
            submitLabel="Submit"
          />
        </div>
      )}

      {showResults && (
        <>
          {header}
          {finished && snap.players.some((p) => p.finished) && <Podium players={snap.players} />}
          <section className="card">
            <h2 className="section-title"><Trophy size={18} /> {finished ? "Final standings" : "Standings"}</h2>
            {!finished && <p className="muted"><span className="spinner" /> Waiting for {waiting} player{waiting === 1 ? "" : "s"} to finish… this updates automatically.</p>}
            <Standings players={snap.players} total={room.questionCount} />
            {me?.finished && <p className="muted small">You scored {me.scorePct}% ({me.correct}/{room.questionCount}) in {formatDuration(me.timeTaken)}.</p>}
          </section>
          <div className="row-gap">
            {finished && isHost && <button className="btn btn-primary" onClick={rematch} disabled={busy}>Rematch <ArrowRight size={16} /></button>}
            {quizMounted && me?.finished && <button className="btn btn-ghost" onClick={() => setView("play")}>Review my answers</button>}
            <Link className="btn btn-ghost" to="/compete">Back to Compete</Link>
          </div>
        </>
      )}
    </div>
  );
}
