import { query } from "../_lib/db.js";
import { route, send } from "../_lib/http.js";
import { consumeToken } from "../_lib/email.js";

export default route(["POST"], async (req, res) => {
  const userId = await consumeToken(req.body?.token, "verify");
  if (!userId) return send(res, 400, { error: "This verification link is invalid or has expired." });
  await query("UPDATE users SET email_verified_at = COALESCE(email_verified_at, now()) WHERE id = $1", [userId]);
  send(res, 200, { ok: true });
});
