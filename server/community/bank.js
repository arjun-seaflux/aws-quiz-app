import { query } from "../_lib/db.js";
import { route, send } from "../_lib/http.js";
import { requireUser } from "../_lib/guard.js";
import { TOPIC_KEYWORDS, pgPattern } from "../../shared/topicKeywords.js";

const DOMAIN = "regexp_replace(q.data->>'domain', '^Domain - ', '')";

/** Search the question bank when building a paper. */
export default route(["GET"], async (req, res) => {
  const s = await requireUser(req, res);
  if (!s) return;
  const limit = Math.max(1, Math.min(60, parseInt(req.query.limit, 10) || 30));
  const offset = Math.max(0, parseInt(req.query.offset, 10) || 0);
  const search = String(req.query.q || "").trim().slice(0, 80);
  const domain = String(req.query.domain || "");
  const topic = String(req.query.topic || "");
  const random = req.query.random ? Math.min(60, parseInt(req.query.random, 10) || 10) : 0;
  if (topic && !TOPIC_KEYWORDS[topic]) return send(res, 400, { error: "Unknown topic." });

  const where = ["q.paper_num < 1000"], params = [];
  if (search) { params.push(`%${search.replace(/[%_\\]/g, "\\$&")}%`); where.push(`q.data->>'text' ILIKE $${params.length}`); }
  if (domain) { params.push(domain); where.push(`${DOMAIN} = $${params.length}`); }
  if (topic) { params.push(pgPattern(topic)); where.push(`q.data->>'text' ~* $${params.length}`); }
  params.push(random || limit); const lim = params.length;
  params.push(random ? 0 : offset); const off = params.length;
  const { rows } = await query(
    `SELECT q.paper_num, q.position, q.data FROM questions q WHERE ${where.join(" AND ")}
      ORDER BY ${random ? "random()" : "q.paper_num, q.position"} LIMIT $${lim} OFFSET $${off}`, params);
  send(res, 200, { questions: rows.map((r) => ({ ...r.data, _key: `${r.paper_num}:${r.position}` })) });
});
