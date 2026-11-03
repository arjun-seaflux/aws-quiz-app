import { query, withTx } from "../_lib/db.js";
import { route, send } from "../_lib/http.js";
import { requireUser } from "../_lib/guard.js";
import { saveAttempt } from "../_lib/attempts.js";

const COUNTDOWN_SEC = 10;   // lobby → live: everyone starts at the same server timestamp
const GRACE_MS = 8000;      // late submissions are still accepted briefly after the deadline

const deadlineMs = (room) => new Date(room.starts_at).getTime() + room.duration_min * 60_000;

async function loadRoom(code) {
  const { rows } = await query("SELECT * FROM rooms WHERE code = $1", [String(code).toUpperCase()]);
  return rows[0] ?? null;
}

// A room's question set: "paper:pos" keys (mixed bank). Rooms created before that
// stored a single paper + positions, which is still supported.
const roomKeys = (room) => room.keys ?? room.positions.map((p) => `${room.paper_num}:${p}`);
const roomSize = (room) => roomKeys(room).length;

async function roomQuestions(room) {
  const keys = roomKeys(room).map((k) => k.split(":").map(Number));
  const { rows } = await query(
    `SELECT q.paper_num, q.position, q.qid, q.data FROM unnest($1::int[], $2::int[]) AS t(p, s)
       JOIN questions q ON q.paper_num = t.p AND q.position = t.s`,
    [keys.map((k) => k[0]), keys.map((k) => k[1])]);
  const byKey = new Map(rows.map((r) => [`${r.paper_num}:${r.position}`, r]));
  return roomKeys(room).map((k) => byKey.get(k)).filter(Boolean);
}

/** Grades + records one player's round exactly once (claimed via finished_at). */
async function finalizePlayer(room, userId, answers, timeTaken) {
  const qs = await roomQuestions(room);
  return withTx(async (c) => {
    const claim = await c.query(
      `UPDATE room_players SET finished_at = now()
        WHERE room_id = $1 AND user_id = $2 AND finished_at IS NULL RETURNING answers`,
      [room.id, userId]);
    if (!claim.rows[0]) return null; // already finished by another request
    const given = Array.isArray(answers) ? answers : (claim.rows[0].answers ?? []);
    const items = qs.map((q, i) => ({
      srcPaper: q.paper_num, srcPos: q.position, qid: q.qid, data: q.data, answer: given[i] ?? null,
    }));
    const attempt = await saveAttempt(c, { userId, paperNum: room.paper_num, kind: "room", items, timeTaken });
    await c.query(
      `UPDATE room_players SET answers = $3, answered = $4, score_pct = $5, correct = $6, time_taken = $7
        WHERE room_id = $1 AND user_id = $2`,
      [room.id, userId, JSON.stringify(given), given.filter((a) => a != null).length,
       attempt.score_pct, attempt.correct, attempt.time_taken]);
    return attempt;
  });
}

/** Lazily closes a room: auto-submits stragglers after the deadline, marks it finished. */
async function settle(room) {
  if (room.status !== "live") return room;
  const now = Date.now();
  if (now > deadlineMs(room) + GRACE_MS) {
    const { rows } = await query("SELECT user_id FROM room_players WHERE room_id = $1 AND finished_at IS NULL", [room.id]);
    for (const p of rows) await finalizePlayer(room, p.user_id, null, room.duration_min * 60);
  }
  const { rows } = await query("SELECT COUNT(*) FILTER (WHERE finished_at IS NULL)::int AS open FROM room_players WHERE room_id = $1", [room.id]);
  if (rows[0].open === 0 && now >= new Date(room.starts_at).getTime()) {
    await query("UPDATE rooms SET status = 'finished' WHERE id = $1 AND status = 'live'", [room.id]);
    room.status = "finished";
  }
  return room;
}

async function state(room, userId) {
  const { rows } = await query(
    `SELECT p.user_id, u.name, p.answered, p.finished_at, p.score_pct, p.correct, p.time_taken, p.joined_at
       FROM room_players p JOIN users u ON u.id = p.user_id WHERE p.room_id = $1`, [room.id]);
  const done = (p) => p.finished_at !== null;
  const players = rows
    .sort((a, b) =>
      (done(b) - done(a)) || ((b.score_pct ?? 0) - (a.score_pct ?? 0)) || ((a.time_taken ?? 1e9) - (b.time_taken ?? 1e9)) ||
      (b.answered - a.answered) || (new Date(a.joined_at) - new Date(b.joined_at)))
    .map((p, i) => ({
      userId: p.user_id, name: p.name, isHost: p.user_id === room.host_id, isMe: p.user_id === userId,
      answered: p.answered, finished: done(p),
      // Scores stay hidden until a player has finished.
      scorePct: done(p) ? p.score_pct : null, correct: done(p) ? p.correct : null, timeTaken: done(p) ? p.time_taken : null,
      rank: done(p) ? i + 1 : null,
    }));
  return {
    room: {
      code: room.code, status: room.status, paperNum: room.paper_num, durationMin: room.duration_min,
      questionCount: roomSize(room), maxPlayers: room.max_players,
      startsAt: room.starts_at ? new Date(room.starts_at).getTime() : null,
      deadline: room.starts_at ? deadlineMs(room) : null, hostId: room.host_id,
    },
    players, joined: players.some((p) => p.isMe), serverNow: Date.now(),
  };
}

const cleanAnswers = (a, n) =>
  Array.isArray(a) && a.length === n
    ? a.map((x) => (typeof x === "string" ? x.slice(0, 1000)
        : Array.isArray(x) && x.every((y) => typeof y === "string") ? x.slice(0, 6).map((y) => y.slice(0, 1000)) : null))
    : null;

export default route(["GET", "POST"], async (req, res) => {
  const s = await requireUser(req, res);
  if (!s) return;
  let room = await loadRoom(req.query.code);
  if (!room) return send(res, 404, { error: "Room not found." });
  room = await settle(room);

  if (req.method === "GET") {
    if (req.query.questions) {
      const me = await query("SELECT answers FROM room_players WHERE room_id=$1 AND user_id=$2", [room.id, s.id]);
      if (!me.rows[0]) return send(res, 403, { error: "Join the room first." });
      if (!room.starts_at || Date.now() < new Date(room.starts_at).getTime())
        return send(res, 425, { error: "The round has not started yet." });
      const qs = await roomQuestions(room);
      return send(res, 200, {
        questions: qs.map((q) => ({ ...q.data, _key: `${q.paper_num}:${q.position}` })),
        myAnswers: me.rows[0].answers ?? null, serverNow: Date.now(),
      });
    }
    return send(res, 200, await state(room, s.id));
  }

  const { action } = req.body ?? {};
  const joined = (await query("SELECT finished_at FROM room_players WHERE room_id=$1 AND user_id=$2", [room.id, s.id])).rows[0];

  if (action === "join") {
    if (joined) return send(res, 200, await state(room, s.id));
    if (room.status !== "lobby") return send(res, 409, { error: "This round has already started." });
    const n = (await query("SELECT COUNT(*)::int AS n FROM room_players WHERE room_id=$1", [room.id])).rows[0].n;
    if (n >= room.max_players) return send(res, 409, { error: "This room is full." });
    await query("INSERT INTO room_players (room_id, user_id) VALUES ($1,$2) ON CONFLICT DO NOTHING", [room.id, s.id]);
    return send(res, 200, await state(room, s.id));
  }

  if (!joined) return send(res, 403, { error: "Join the room first." });

  if (action === "leave") {
    if (room.status !== "lobby") return send(res, 409, { error: "You can't leave once the round has started." });
    await query("DELETE FROM room_players WHERE room_id=$1 AND user_id=$2", [room.id, s.id]);
    const left = await query("SELECT user_id FROM room_players WHERE room_id=$1 ORDER BY joined_at LIMIT 1", [room.id]);
    if (!left.rows[0]) await query("DELETE FROM rooms WHERE id=$1", [room.id]);
    else if (room.host_id === s.id) await query("UPDATE rooms SET host_id=$2 WHERE id=$1", [room.id, left.rows[0].user_id]);
    return send(res, 200, { ok: true });
  }

  if (action === "start") {
    if (room.host_id !== s.id) return send(res, 403, { error: "Only the host can start the round." });
    if (room.status !== "lobby") return send(res, 409, { error: "Already started." });
    await query(
      "UPDATE rooms SET status='live', starts_at = now() + make_interval(secs => $2) WHERE id=$1 AND status='lobby'",
      [room.id, COUNTDOWN_SEC]);
    return send(res, 200, await state(await loadRoom(room.code), s.id));
  }

  if (room.status !== "live") return send(res, 409, { error: "The round is not live." });
  if (joined.finished_at) return send(res, 409, { error: "You've already finished." });
  const startMs = new Date(room.starts_at).getTime();

  if (action === "progress") {
    if (Date.now() < startMs - 1000 || Date.now() > deadlineMs(room) + GRACE_MS)
      return send(res, 409, { error: "Outside the round window." });
    const answers = cleanAnswers(req.body.answers, roomSize(room));
    if (!answers) return send(res, 400, { error: "Invalid answers." });
    await query("UPDATE room_players SET answers=$3, answered=$4 WHERE room_id=$1 AND user_id=$2 AND finished_at IS NULL",
      [room.id, s.id, JSON.stringify(answers), answers.filter((a) => a != null).length]);
    return send(res, 200, { ok: true, serverNow: Date.now() });
  }

  if (action === "finish") {
    if (Date.now() < startMs) return send(res, 409, { error: "The round has not started." });
    const answers = cleanAnswers(req.body.answers, roomSize(room));
    if (!answers) return send(res, 400, { error: "Invalid answers." });
    const taken = Math.min(room.duration_min * 60, Math.max(0, Math.round((Date.now() - startMs) / 1000)));
    await finalizePlayer(room, s.id, answers, taken);
    room = await settle(await loadRoom(room.code));
    return send(res, 200, await state(room, s.id));
  }

  send(res, 400, { error: "Unknown action." });
});
