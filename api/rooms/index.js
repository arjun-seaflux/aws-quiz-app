import { query, withTx } from "../_lib/db.js";
import { route, send } from "../_lib/http.js";
import { requireUser } from "../_lib/guard.js";
import { hit } from "../_lib/ratelimit.js";
import crypto from "node:crypto";

const ALPHABET = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789"; // no 0/O/1/I
const makeCode = () => Array.from(crypto.randomBytes(6), (b) => ALPHABET[b % ALPHABET.length]).join("");

export default route(["GET", "POST"], async (req, res) => {
  const s = await requireUser(req, res);
  if (!s) return;

  if (req.method === "GET") {
    const { rows } = await query(
      `SELECT r.code, r.status, r.paper_num, r.duration_min, r.created_at, r.host_id = $1 AS is_host,
              array_length(r.positions, 1) AS question_count,
              (SELECT COUNT(*)::int FROM room_players p WHERE p.room_id = r.id) AS players,
              me.score_pct
         FROM room_players me JOIN rooms r ON r.id = me.room_id
        WHERE me.user_id = $1 ORDER BY r.created_at DESC LIMIT 20`, [s.id]);
    return send(res, 200, { rooms: rows });
  }

  if (!(await hit(`room-create:${s.id}`, 20, 3600))) return send(res, 429, { error: "Too many rooms created — try later." });
  const paperNum = Number(req.body?.paperNum);
  const count = Number(req.body?.count);
  const durationMin = Number(req.body?.durationMin);
  const maxPlayers = Number(req.body?.maxPlayers ?? 20);
  if (![paperNum, count, durationMin, maxPlayers].every(Number.isInteger))
    return send(res, 400, { error: "paperNum, count, durationMin and maxPlayers must be whole numbers." });
  if (count < 5 || count > 65) return send(res, 400, { error: "Choose 5–65 questions." });
  if (durationMin < 3 || durationMin > 180) return send(res, 400, { error: "Choose 3–180 minutes." });
  if (maxPlayers < 2 || maxPlayers > 50) return send(res, 400, { error: "Choose 2–50 players." });

  const { rows: pos } = await query(
    "SELECT position FROM questions WHERE paper_num = $1 ORDER BY random() LIMIT $2", [paperNum, count]);
  if (pos.length < 5) return send(res, 404, { error: "Paper not found." });

  for (let attempt = 0; attempt < 5; attempt++) {
    const code = makeCode();
    try {
      const room = await withTx(async (c) => {
        const r = await c.query(
          `INSERT INTO rooms (code, host_id, paper_num, positions, duration_min, max_players)
           VALUES ($1,$2,$3,$4,$5,$6) RETURNING id, code`,
          [code, s.id, paperNum, pos.map((p) => p.position), durationMin, maxPlayers]);
        await c.query("INSERT INTO room_players (room_id, user_id) VALUES ($1,$2)", [r.rows[0].id, s.id]);
        return r.rows[0];
      });
      return send(res, 201, { code: room.code });
    } catch (e) {
      if (e.code !== "23505") throw e; // code collision → retry
    }
  }
  send(res, 500, { error: "Could not create a room. Please try again." });
});
