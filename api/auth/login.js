import bcrypt from "bcryptjs";
import { query } from "../_lib/db.js";
import { route, send } from "../_lib/http.js";
import { createSession } from "../_lib/auth.js";

// Compared against when the email is unknown so timing doesn't reveal accounts.
const DUMMY_HASH = bcrypt.hashSync("not-a-real-password", 10);

export default route(["POST"], async (req, res) => {
  const { email, password } = req.body ?? {};
  const cleanEmail = String(email ?? "").trim().toLowerCase();
  const { rows } = await query(
    "SELECT id, email, name, password_hash FROM users WHERE email = $1",
    [cleanEmail],
  );
  const user = rows[0];
  const ok = await bcrypt.compare(
    typeof password === "string" ? password : "",
    user?.password_hash ?? DUMMY_HASH,
  );
  if (!user || !ok) return send(res, 401, { error: "Incorrect email or password." });

  await createSession(res, user);
  send(res, 200, { user: { id: user.id, email: user.email, name: user.name } });
});
