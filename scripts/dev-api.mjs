// Local stand-in for Vercel: parses JSON bodies and calls the same catch-all function
// that production uses (api/index.js). Vite proxies /api here (see vite.config.js).
import http from "node:http";
import handler from "../api/index.js";

const PORT = Number(process.env.API_PORT || 3001);

http.createServer(async (req, res) => {
  let body = "";
  for await (const chunk of req) body += chunk;
  try { req.body = body ? JSON.parse(body) : undefined; } catch { req.body = undefined; }
  req.query = Object.fromEntries(new URL(req.url, "http://localhost").searchParams);
  try { await handler(req, res); }
  catch (err) { console.error(err); if (!res.headersSent) { res.statusCode = 500; res.end('{"error":"Internal server error"}'); } }
}).listen(PORT, () => console.log(`dev api on http://localhost:${PORT}`));
