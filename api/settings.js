import { query } from "./_lib/db.js";
import { route, send } from "./_lib/http.js";
import { requireUser } from "./_lib/guard.js";

export default route(["POST"], async (req, res) => {
  const s = await requireUser(req, res);
  if (!s) return;
  const { dailyGoal, leaderboardOptIn, name } = req.body ?? {};
  if (dailyGoal !== undefined && !(Number.isInteger(dailyGoal) && dailyGoal >= 1 && dailyGoal <= 200))
    return send(res, 400, { error: "Daily goal must be 1–200." });
  if (name !== undefined && !(typeof name === "string" && name.trim().length >= 1 && name.trim().length <= 60))
    return send(res, 400, { error: "Name must be 1–60 characters." });
  const { rows } = await query(
    `UPDATE users SET daily_goal = COALESCE($2, daily_goal),
                      leaderboard_optin = COALESCE($3, leaderboard_optin),
                      name = COALESCE($4, name)
      WHERE id = $1 RETURNING daily_goal AS "dailyGoal", leaderboard_optin AS "leaderboardOptIn", name`,
    [s.id, dailyGoal ?? null, typeof leaderboardOptIn === "boolean" ? leaderboardOptIn : null, name?.trim() ?? null]);
  send(res, 200, rows[0]);
});
