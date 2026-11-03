import { query, withTx } from "../_lib/db.js";
import { route, send } from "../_lib/http.js";
import { getSessionUser } from "../_lib/auth.js";
import { isAdminEmail } from "../_lib/guard.js";
import { PaperError, canView, deletePaper, getPaper, paperQuestions, savePaper } from "../_lib/community.js";

export default route(["GET", "POST"], async (req, res) => {
  const s = await getSessionUser(req);
  const admin = !!s && isAdminEmail(s.email);
  const id = Number(req.query.id);
  if (!Number.isInteger(id)) return send(res, 400, { error: "Invalid paper." });
  const paper = await getPaper(query, id);
  // Same answer whether it doesn't exist or isn't yours, so private papers aren't discoverable.
  if (!paper || !canView(paper, s?.id, admin)) return send(res, 404, { error: "Paper not found." });
  const isOwner = !!s && paper.owner_id === s.id;

  if (req.method === "GET") {
    const qs = await paperQuestions(query, id);
    return send(res, 200, {
      paper: {
        id: paper.id, title: paper.title, description: paper.description, status: paper.status,
        reviewNote: paper.review_note, questionCount: paper.question_count, author: paper.author,
        isOwner, createdAt: paper.created_at, approvedAt: paper.approved_at,
      },
      questions: qs.map((r) => ({ ...r.data, _key: `${r.src_paper}:${r.src_pos}` })),
    });
  }

  if (!isOwner) return send(res, 403, { error: "Only the author can change this paper." });
  const { action } = req.body ?? {};

  if (action === "update") {
    if (!["private", "rejected"].includes(paper.status))
      return send(res, 409, { error: "Withdraw the paper before editing it." });
    try {
      await withTx(async (c) => {
        await savePaper(c, { userId: s.id, id, title: req.body.title, description: req.body.description, items: req.body.items });
        if (paper.status === "rejected") await c.query("UPDATE user_papers SET status='private', review_note=NULL WHERE id=$1", [id]);
      });
      return send(res, 200, { id });
    } catch (e) {
      if (e instanceof PaperError) return send(res, e.status, { error: e.message });
      throw e;
    }
  }
  if (action === "submit") {
    if (!["private", "rejected"].includes(paper.status)) return send(res, 409, { error: "This paper can't be submitted right now." });
    await query("UPDATE user_papers SET status='pending', review_note=NULL, updated_at=now() WHERE id=$1", [id]);
    return send(res, 200, { status: "pending" });
  }
  if (action === "withdraw") {
    if (!["pending", "approved"].includes(paper.status)) return send(res, 409, { error: "Nothing to withdraw." });
    await query("UPDATE user_papers SET status='private', approved_at=NULL, approved_by=NULL, updated_at=now() WHERE id=$1", [id]);
    return send(res, 200, { status: "private" });
  }
  if (action === "delete") {
    await withTx((c) => deletePaper(c, id));
    return send(res, 200, { ok: true });
  }
  send(res, 400, { error: "Unknown action." });
});
