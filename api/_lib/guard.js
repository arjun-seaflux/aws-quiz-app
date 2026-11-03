import { getSessionUser } from "./auth.js";
import { send } from "./http.js";

/** Returns the signed-in user, or sends 401 and returns null. */
export async function requireUser(req, res) {
  const s = await getSessionUser(req);
  if (!s) { send(res, 401, { error: "Please sign in." }); return null; }
  return s;
}

export const isAdminEmail = (email) =>
  (process.env.ADMIN_EMAILS || "").split(",").map((e) => e.trim().toLowerCase()).filter(Boolean)
    .includes(String(email || "").toLowerCase());

export async function requireAdmin(req, res) {
  const s = await requireUser(req, res);
  if (!s) return null;
  if (!isAdminEmail(s.email)) { send(res, 403, { error: "Admins only." }); return null; }
  return s;
}

/** A question key is "paper:position". */
export function parseKey(key) {
  const m = /^(\d{1,3}):(\d{1,3})$/.exec(String(key));
  return m ? { paper: Number(m[1]), pos: Number(m[2]) } : null;
}
