import bcrypt from "bcryptjs";
import { query } from "../_lib/db.js";
import { route, send } from "../_lib/http.js";
import { createSession } from "../_lib/auth.js";
import { limit } from "../_lib/ratelimit.js";
import { appUrl, createToken, mailHtml, sendEmail } from "../_lib/email.js";

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export default route(["POST"], async (req, res) => {
  if (!(await limit(req, res, "register", 10, 3600))) return;
  const { name, email, password } = req.body ?? {};
  const cleanName = String(name ?? "").trim();
  const cleanEmail = String(email ?? "").trim().toLowerCase();

  if (cleanName.length < 1 || cleanName.length > 60)
    return send(res, 400, { error: "Please enter your name (max 60 characters)." });
  if (!EMAIL_RE.test(cleanEmail) || cleanEmail.length > 254)
    return send(res, 400, { error: "Please enter a valid email address." });
  if (typeof password !== "string" || password.length < 8 || password.length > 72)
    return send(res, 400, { error: "Password must be 8–72 characters." });

  const hash = await bcrypt.hash(password, 10);
  try {
    const { rows } = await query(
      `INSERT INTO users (email, name, password_hash) VALUES ($1, $2, $3)
       RETURNING id, email, name`,
      [cleanEmail, cleanName, hash],
    );
    // Verification mail is best-effort — never block sign-up on it.
    try {
      const token = await createToken(rows[0].id, "verify", 60 * 24);
      const url = `${appUrl(req)}/verify?token=${token}`;
      await sendEmail({ to: cleanEmail, subject: "Verify your AWS Quiz email",
        html: mailHtml("Confirm your email", "Welcome! Please confirm your email address.", url, "Verify email"), text: url });
    } catch (e) { console.error("verify mail failed", e); }
    await createSession(res, rows[0]);
    send(res, 201, { user: rows[0] });
  } catch (err) {
    if (err.code === "23505")
      return send(res, 409, { error: "An account with this email already exists." });
    throw err;
  }
});
