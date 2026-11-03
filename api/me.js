import { query } from "./_lib/db.js";
import { route, send } from "./_lib/http.js";
import { getSessionUser } from "./_lib/auth.js";
import { bestScores } from "./_lib/scoring.js";

export default route(["GET"], async (req, res) => {
  const session = await getSessionUser(req);
  if (!session) return send(res, 200, { user: null, scores: {} });
  const { rows } = await query("SELECT id, email, name FROM users WHERE id = $1", [session.id]);
  if (!rows[0]) return send(res, 200, { user: null, scores: {} });
  send(res, 200, { user: rows[0], scores: await bestScores(query, session.id) });
});
