import { query } from "./_lib/db.js";
import { route, send } from "./_lib/http.js";
import { requireUser } from "./_lib/guard.js";
import { TOPIC_KEYWORDS, pgPattern } from "../shared/topicKeywords.js";

const DOMAIN = "regexp_replace(q.data->>'domain', '^Domain - ', '')";
// Latest result per question for this user ($1).
const LAST = `last AS (
  SELECT DISTINCT ON (aa.src_paper, aa.src_pos) aa.src_paper, aa.src_pos, aa.is_correct, a.created_at
    FROM attempt_answers aa JOIN attempts a ON a.id = aa.attempt_id
   WHERE a.user_id = $1 AND aa.src_paper IS NOT NULL
   ORDER BY aa.src_paper, aa.src_pos, a.created_at DESC)`;

/** Builds a custom question set: modes weak | mistakes | domain | topic | random. */
export default route(["GET"], async (req, res) => {
  const s = await requireUser(req, res);
  if (!s) return;
  const mode = String(req.query.mode || "random");
  const n = Math.max(5, Math.min(50, parseInt(req.query.count, 10) || 20));
  let rows, meta = { mode };

  if (mode === "mistakes") {
    ({ rows } = await query(
      `WITH ${LAST}
       SELECT q.paper_num, q.position, q.data FROM last l
         JOIN questions q ON q.paper_num = l.src_paper AND q.position = l.src_pos
        WHERE NOT l.is_correct ORDER BY random() LIMIT $2`, [s.id, n]));
  } else if (mode === "domain" || mode === "weak") {
    let domain = String(req.query.domain || "");
    if (mode === "weak") {
      // Lowest-accuracy domain with a meaningful sample; otherwise a random one.
      const w = await query(
        `SELECT ${DOMAIN} AS domain, COUNT(*) FILTER (WHERE aa.is_correct)::float / COUNT(*) AS acc
           FROM attempt_answers aa JOIN attempts a ON a.id = aa.attempt_id
           JOIN questions q ON q.paper_num = aa.src_paper AND q.position = aa.src_pos
          WHERE a.user_id = $1 AND aa.selected IS NOT NULL AND COALESCE(q.data->>'domain','') <> ''
          GROUP BY 1 HAVING COUNT(*) >= 5 ORDER BY acc ASC LIMIT 1`, [s.id]);
      domain = w.rows[0]?.domain || "";
      meta.domain = domain;
    }
    if (mode === "domain" && !domain) return send(res, 400, { error: "domain is required." });
    meta.domain = domain || undefined;
    // Prefer questions not yet answered correctly, then fill with the rest.
    ({ rows } = await query(
      `WITH ${LAST}
       SELECT q.paper_num, q.position, q.data FROM questions q
         LEFT JOIN last l ON l.src_paper = q.paper_num AND l.src_pos = q.position
        WHERE COALESCE(q.data->>'domain','') <> '' AND ($3 = '' OR ${DOMAIN} = $3)
        ORDER BY (l.is_correct IS TRUE), random() LIMIT $2`, [s.id, n, domain]));
  } else if (mode === "topic") {
    const topic = String(req.query.topic || "");
    if (!TOPIC_KEYWORDS[topic]) return send(res, 400, { error: "Unknown topic." });
    meta.topic = topic;
    ({ rows } = await query(
      `WITH ${LAST}
       SELECT q.paper_num, q.position, q.data FROM questions q
         LEFT JOIN last l ON l.src_paper = q.paper_num AND l.src_pos = q.position
        WHERE q.data->>'text' ~* $3
        ORDER BY (l.is_correct IS TRUE), random() LIMIT $2`, [s.id, n, pgPattern(topic)]));
  } else {
    ({ rows } = await query(
      "SELECT q.paper_num, q.position, q.data FROM questions q ORDER BY random() LIMIT $1", [n]));
  }

  send(res, 200, {
    meta,
    questions: rows.map((r) => ({ ...r.data, _key: `${r.paper_num}:${r.position}` })),
  });
});
