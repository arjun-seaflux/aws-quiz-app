import { query } from "./_lib/db.js";
import { route, send } from "./_lib/http.js";
import { requireUser, parseKey } from "./_lib/guard.js";

export default route(["GET", "POST"], async (req, res) => {
  const s = await requireUser(req, res);
  if (!s) return;

  if (req.method === "GET") {
    const { rows } = await query(
      "SELECT kind, ref, comment, created_at FROM bookmarks WHERE user_id = $1 ORDER BY created_at DESC LIMIT 500", [s.id]);
    const qs = rows.filter((r) => r.kind === "question").map((r) => parseKey(r.ref)).filter(Boolean);
    const data = qs.length
      ? (await query(
          `SELECT q.paper_num, q.position, q.data FROM unnest($1::int[], $2::int[]) AS t(p, s)
             JOIN questions q ON q.paper_num = t.p AND q.position = t.s`,
          [qs.map((k) => k.paper), qs.map((k) => k.pos)])).rows
      : [];
    const byKey = new Map(data.map((d) => [`${d.paper_num}:${d.position}`, d.data]));
    return send(res, 200, {
      bookmarks: rows.map((r) => ({ ...r, question: r.kind === "question" ? byKey.get(r.ref) ?? null : undefined })),
    });
  }

  const { kind, ref, comment, remove } = req.body ?? {};
  if (!["question", "note"].includes(kind) || typeof ref !== "string" || ref.length > 80)
    return send(res, 400, { error: "Invalid bookmark." });
  if (kind === "question" && !parseKey(ref)) return send(res, 400, { error: "Invalid question key." });
  if (remove) {
    await query("DELETE FROM bookmarks WHERE user_id=$1 AND kind=$2 AND ref=$3", [s.id, kind, ref]);
    return send(res, 200, { ok: true });
  }
  const c = typeof comment === "string" ? comment.slice(0, 500) : null;
  await query(
    `INSERT INTO bookmarks (user_id, kind, ref, comment) VALUES ($1,$2,$3,COALESCE($4,''))
     ON CONFLICT (user_id, kind, ref) DO UPDATE SET comment = COALESCE($4, bookmarks.comment)`,
    [s.id, kind, ref, c]);
  send(res, 200, { ok: true });
});
