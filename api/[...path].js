// The only serverless function. Dispatches /api/* to the handlers in server/.
import { match } from "../server/routes.js";

export default async function handler(req, res) {
  const pathname = new URL(req.url, "http://localhost").pathname.replace(/^\/api\/?/, "");
  const hit = match(pathname);
  if (!hit) {
    res.statusCode = 404;
    res.setHeader("Content-Type", "application/json; charset=utf-8");
    return res.end(JSON.stringify({ error: "Not found" }));
  }
  const { path: _ignored, ...query } = req.query ?? {};
  req.query = { ...query, ...hit.params };
  return hit.handler(req, res);
}
