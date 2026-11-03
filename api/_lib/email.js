import crypto from "node:crypto";
import { query } from "./db.js";

export const appUrl = (req) =>
  process.env.APP_URL || (req.headers.origin ?? `https://${req.headers.host}`);

export const sha256 = (s) => crypto.createHash("sha256").update(s).digest("hex");

/** Creates a single-use token; returns the raw value (only its hash is stored). */
export async function createToken(userId, kind, ttlMinutes) {
  const raw = crypto.randomBytes(32).toString("base64url");
  await query(
    `INSERT INTO auth_tokens (token_hash, user_id, kind, expires_at)
     VALUES ($1, $2, $3, now() + make_interval(mins => $4))`,
    [sha256(raw), userId, kind, ttlMinutes],
  );
  return raw;
}

/** Atomically consumes a token; returns the user id or null. */
export async function consumeToken(raw, kind) {
  const { rows } = await query(
    `UPDATE auth_tokens SET used_at = now()
      WHERE token_hash = $1 AND kind = $2 AND used_at IS NULL AND expires_at > now()
      RETURNING user_id`,
    [sha256(String(raw)), kind],
  );
  return rows[0]?.user_id ?? null;
}

/**
 * Sends mail through Resend when RESEND_API_KEY + EMAIL_FROM are set.
 * Otherwise the message is logged (visible in Vercel logs) so flows can be tested.
 */
export async function sendEmail({ to, subject, html, text }) {
  const key = process.env.RESEND_API_KEY, from = process.env.EMAIL_FROM;
  if (!key || !from) {
    console.log(`[email not configured] to=${to} subject="${subject}"\n${text ?? html}`);
    return false;
  }
  const r = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: { Authorization: `Bearer ${key}`, "Content-Type": "application/json" },
    body: JSON.stringify({ from, to, subject, html }),
  });
  if (!r.ok) console.error("email send failed", r.status, await r.text().catch(() => ""));
  return r.ok;
}

export const mailHtml = (title, body, url, cta) =>
  `<div style="font-family:system-ui,sans-serif;max-width:480px;margin:auto;padding:24px">
     <h2>${title}</h2><p>${body}</p>
     <p><a href="${url}" style="background:#4a67ee;color:#fff;padding:12px 20px;border-radius:10px;text-decoration:none;display:inline-block">${cta}</a></p>
     <p style="color:#777;font-size:12px">If the button doesn't work, paste this link: ${url}</p></div>`;
