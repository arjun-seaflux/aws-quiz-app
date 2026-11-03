import { query } from "./_lib/db.js";
import { route, send } from "./_lib/http.js";

export default route(["GET"], async (req, res) => {
  const { rows } = await query("SELECT data FROM topics ORDER BY position");
  if (rows.length === 0) return send(res, 404, { error: "Notes not found." });
  send(res, 200, { topics: rows.map((r) => r.data) },
    "public, s-maxage=3600, stale-while-revalidate=86400");
});
