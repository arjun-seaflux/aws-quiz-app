import { query } from "../_lib/db.js";
import { route, send } from "../_lib/http.js";
import { limit } from "../_lib/ratelimit.js";
import { appUrl, createToken, mailHtml, sendEmail } from "../_lib/email.js";

// Always answers 200 so the endpoint can't be used to discover which emails have accounts.
export default route(["POST"], async (req, res) => {
  if (!(await limit(req, res, "forgot", 5, 3600))) return;
  const email = String(req.body?.email ?? "").trim().toLowerCase();
  const { rows } = await query("SELECT id FROM users WHERE email = $1", [email]);
  if (rows[0]) {
    const token = await createToken(rows[0].id, "reset", 60);
    const url = `${appUrl(req)}/reset?token=${token}`;
    await sendEmail({ to: email, subject: "Reset your AWS Quiz password",
      html: mailHtml("Reset your password", "Use the button below within 60 minutes. If you didn't ask for this, ignore this email.", url, "Choose a new password"), text: url });
  }
  send(res, 200, { ok: true });
});
