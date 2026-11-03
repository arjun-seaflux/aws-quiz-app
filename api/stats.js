import { query } from "./_lib/db.js";
import { route, send } from "./_lib/http.js";
import { requireUser } from "./_lib/guard.js";

// Accuracy per exam domain across everything the user has answered.
export default route(["GET"], async (req, res) => {
  const session = await requireUser(req, res);
  if (!session) return;
  const { rows } = await query(
    `SELECT regexp_replace(q.data->>'domain', '^Domain - ', '') AS domain,
            COUNT(*)::int AS answered,
            COUNT(*) FILTER (WHERE aa.is_correct)::int AS correct
       FROM attempt_answers aa
       JOIN attempts a  ON a.id = aa.attempt_id
       JOIN questions q ON q.paper_num = aa.src_paper AND q.position = aa.src_pos
      WHERE a.user_id = $1 AND aa.selected IS NOT NULL
        AND COALESCE(q.data->>'domain', '') <> ''
      GROUP BY 1 ORDER BY 1`,
    [session.id],
  );
  send(res, 200, { domains: rows });
});
