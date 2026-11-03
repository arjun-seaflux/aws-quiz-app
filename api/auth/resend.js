import { query } from "../_lib/db.js";
import { route, send } from "../_lib/http.js";
import { requireUser } from "../_lib/guard.js";
import { limit } from "../_lib/ratelimit.js";
import { appUrl, createToken, mailHtml, sendEmail } from "../_lib/email.js";

export default route(["POST"], async (req, res) => {
  const s = await requireUser(req, res);
  if (!s) return;
  if (!(await limit(req, res, "resend", 3, 3600, s.id))) return;
  const { rows } = await query("SELECT email, email_verified_at FROM users WHERE id = $1", [s.id]);
  if (!rows[0] || rows[0].email_verified_at) return send(res, 200, { ok: true });
  const token = await createToken(s.id, "verify", 60 * 24);
  const url = `${appUrl(req)}/verify?token=${token}`;
  await sendEmail({ to: rows[0].email, subject: "Verify your AWS Quiz email",
    html: mailHtml("Confirm your email", "Please confirm your email address.", url, "Verify email"), text: url });
  send(res, 200, { ok: true });
});
