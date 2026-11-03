import { buildAuthoredQuestion } from "./questionShape.js";
import { parseKey } from "./guard.js";

export const AUTHORED_BASE = 10000;   // authored questions of paper N live under paper_num = 10000 + N
export const MIN_Q = 20;
export const MAX_Q = 100;
export const authoredNum = (paperId) => AUTHORED_BASE + paperId;
export const isBankPaper = (n) => n < 1000;

/** Thrown for invalid input so the surrounding transaction rolls back (nothing half-saved). */
export class PaperError extends Error {
  constructor(message, status = 400) { super(message); this.status = status; }
}

/** Fetches a paper with its owner's name. */
export async function getPaper(q, id) {
  const { rows } = await q(
    `SELECT p.*, u.name AS author FROM user_papers p JOIN users u ON u.id = p.owner_id WHERE p.id = $1`, [id]);
  return rows[0] ?? null;
}

/** Can this viewer open the paper? Approved papers are public; owners and admins see everything. */
export const canView = (paper, userId, admin) =>
  paper.status === "approved" || (userId && paper.owner_id === userId) || admin;

/** The paper's questions in order, each tagged with its key. */
export async function paperQuestions(q, id) {
  const { rows } = await q(
    `SELECT i.src_paper, i.src_pos, qs.qid, qs.data FROM user_paper_items i
       JOIN questions qs ON qs.paper_num = i.src_paper AND qs.position = i.src_pos
      WHERE i.paper_id = $1 ORDER BY i.position`, [id]);
  return rows;
}

/**
 * Creates or updates a paper inside a transaction (client `c`).
 * items: [{ key: "paper:pos" } | { question: { text, answers, correct, … } }]
 * Returns { id }; throws PaperError for invalid input.
 */
export async function savePaper(c, { userId, id, title, description, items }) {
  const t = String(title ?? "").trim();
  const d = String(description ?? "").trim();
  if (t.length < 3 || t.length > 80) throw new PaperError("Title must be 3–80 characters.");
  if (d.length > 300) throw new PaperError("Description can be at most 300 characters.");
  if (!Array.isArray(items) || items.length < MIN_Q)
    throw new PaperError(`A paper needs at least ${MIN_Q} questions.`);
  if (items.length > MAX_Q) throw new PaperError(`A paper can have at most ${MAX_Q} questions.`);

  let paperId = id;
  if (!paperId) {
    const r = await c.query("INSERT INTO user_papers (owner_id, title, description) VALUES ($1,$2,$3) RETURNING id", [userId, t, d]);
    paperId = r.rows[0].id;
  }
  const base = authoredNum(paperId);
  await c.query("INSERT INTO papers (num, name) VALUES ($1, $2) ON CONFLICT (num) DO UPDATE SET name = $2", [base, t]);

  // 1) classify items: existing keys vs new authored questions
  const seen = new Set();
  const plan = [];                     // { key } | { authored: data }
  for (const it of items) {
    if (it && typeof it === "object" && it.question) {
      const built = buildAuthoredQuestion(it.question);
      if (built.error) throw new PaperError(built.error);
      plan.push({ authored: built.data });
    } else {
      const k = parseKey(it?.key);
      if (!k) throw new PaperError("Invalid question reference.");
      const key = `${k.paper}:${k.pos}`;
      if (seen.has(key)) throw new PaperError("A question was added twice.");
      seen.add(key);
      // Only the main bank or this paper's own authored questions may be referenced.
      if (!isBankPaper(k.paper) && k.paper !== base) throw new PaperError("Invalid question reference.");
      plan.push({ key, ...k });
    }
  }
  const refs = plan.filter((p) => p.key);
  if (refs.length) {
    const { rows } = await c.query(
      `SELECT 1 FROM unnest($1::int[], $2::int[]) AS t(p, s) JOIN questions q ON q.paper_num = t.p AND q.position = t.s`,
      [refs.map((r) => r.paper), refs.map((r) => r.pos)]);
    if (rows.length !== refs.length) throw new PaperError("Some questions no longer exist.");
  }

  // 2) insert new authored questions at the next free positions
  let next = (await c.query("SELECT COALESCE(MAX(position), -1) + 1 AS n FROM questions WHERE paper_num = $1", [base])).rows[0].n;
  const resolved = [];
  for (const p of plan) {
    if (p.authored) {
      const pos = next++;
      await c.query("INSERT INTO questions (paper_num, position, qid, data) VALUES ($1,$2,$3,$4)",
        [base, pos, `u${paperId}q${pos + 1}`, JSON.stringify(p.authored)]);
      resolved.push({ src_paper: base, src_pos: pos });
    } else resolved.push({ src_paper: p.paper, src_pos: p.pos });
  }

  // 3) replace the ordered item list and drop authored questions no longer used
  await c.query("DELETE FROM user_paper_items WHERE paper_id = $1", [paperId]);
  await c.query(
    `INSERT INTO user_paper_items (paper_id, position, src_paper, src_pos)
     SELECT $1, t.i, t.p, t.s FROM unnest($2::int[], $3::int[], $4::int[]) AS t(i, p, s)`,
    [paperId, resolved.map((_, i) => i), resolved.map((r) => r.src_paper), resolved.map((r) => r.src_pos)]);
  const keep = resolved.filter((r) => r.src_paper === base).map((r) => r.src_pos);
  await c.query("DELETE FROM questions WHERE paper_num = $1 AND NOT (position = ANY($2::int[]))", [base, keep]);

  await c.query(
    "UPDATE user_papers SET title=$2, description=$3, question_count=$4, updated_at=now() WHERE id=$1",
    [paperId, t, d, resolved.length]);
  return { id: paperId };
}

/** Removes a paper and the questions its author wrote. */
export async function deletePaper(c, id) {
  await c.query("DELETE FROM user_papers WHERE id = $1", [id]);
  await c.query("DELETE FROM papers WHERE num = $1", [authoredNum(id)]); // cascades authored questions
}
