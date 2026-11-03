import { query } from "./_lib/db.js";
import { route, send } from "./_lib/http.js";
import { getSessionUser } from "./_lib/auth.js";

// Accuracy per exam domain across all of a user's quiz attempts.
export default route(["GET"], async (req, res) => {
  const session = await getSessionUser(req);
  if (!session) return send(res, 401, { error: "Please sign in." });
  const { rows } = await query(
    `SELECT regexp_replace(q.data->>'domain', '^Domain - ', '') AS domain,
            COUNT(*)::int AS answered,
            COUNT(*) FILTER (WHERE aa.is_correct)::int AS correct
       FROM attempt_answers aa
       JOIN attempts a  ON a.id = aa.attempt_id
       JOIN questions q ON q.paper_num = a.paper_num AND q.position = aa.position
      WHERE a.user_id = $1 AND aa.selected IS NOT NULL
        AND COALESCE(q.data->>'domain', '') <> ''
      GROUP BY 1 ORDER BY 1`,
    [session.id],
  );
  send(res, 200, { domains: rows });
});
