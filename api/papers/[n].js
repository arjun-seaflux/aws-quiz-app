import { query } from "../_lib/db.js";
import { route, send } from "../_lib/http.js";

const CACHE = "public, s-maxage=3600, stale-while-revalidate=86400";

export default route(["GET"], async (req, res) => {
  const n = Number(req.query.n);
  if (!Number.isInteger(n)) return send(res, 400, { error: "Invalid paper." });
  const { rows } = await query(
    "SELECT data FROM questions WHERE paper_num = $1 ORDER BY position",
    [n],
  );
  if (rows.length === 0) return send(res, 404, { error: "Paper not found." });
  send(res, 200, { questions: rows.map((r) => r.data) }, CACHE);
});
