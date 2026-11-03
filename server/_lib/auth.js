import { SignJWT, jwtVerify } from "jose";

const COOKIE = "quiz_session";
const MAX_AGE = 60 * 60 * 24 * 30; // 30 days

function secret() {
  const s = process.env.JWT_SECRET;
  if (!s || s.length < 16) throw new Error("JWT_SECRET missing or too short");
  return new TextEncoder().encode(s);
}

export async function createSession(res, user) {
  const token = await new SignJWT({ email: user.email, name: user.name })
    .setProtectedHeader({ alg: "HS256" })
    .setSubject(user.id)
    .setIssuedAt()
    .setExpirationTime(`${MAX_AGE}s`)
    .sign(secret());
  const secure = process.env.NODE_ENV === "production" ? "; Secure" : "";
  res.setHeader(
    "Set-Cookie",
    `${COOKIE}=${token}; HttpOnly; Path=/; SameSite=Lax; Max-Age=${MAX_AGE}${secure}`,
  );
}

export function clearSession(res) {
  res.setHeader(
    "Set-Cookie",
    `${COOKIE}=; HttpOnly; Path=/; SameSite=Lax; Max-Age=0`,
  );
}

/** Returns { id, email, name } or null. */
export async function getSessionUser(req) {
  const raw = req.headers.cookie || "";
  const match = raw.split(";").map((c) => c.trim()).find((c) => c.startsWith(`${COOKIE}=`));
  if (!match) return null;
  try {
    const { payload } = await jwtVerify(match.slice(COOKIE.length + 1), secret());
    return { id: payload.sub, email: payload.email, name: payload.name };
  } catch {
    return null;
  }
}
