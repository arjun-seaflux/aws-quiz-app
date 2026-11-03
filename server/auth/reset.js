import bcrypt from "bcryptjs";
import { query } from "../_lib/db.js";
import { route, send } from "../_lib/http.js";
import { limit } from "../_lib/ratelimit.js";
import { consumeToken } from "../_lib/email.js";

export default route(["POST"], async (req, res) => {
  if (!(await limit(req, res, "reset", 10, 3600))) return;
  const { token, password } = req.body ?? {};
  if (typeof password !== "string" || password.length < 8 || password.length > 72)
    return send(res, 400, { error: "Password must be 8–72 characters." });
  const userId = await consumeToken(token, "reset");
  if (!userId) return send(res, 400, { error: "This reset link is invalid or has expired." });
  const hash = await bcrypt.hash(password, 10);
  // Having received the email proves ownership, so mark it verified too.
  await query(
    "UPDATE users SET password_hash = $2, email_verified_at = COALESCE(email_verified_at, now()) WHERE id = $1",
    [userId, hash]);
  send(res, 200, { ok: true });
});
