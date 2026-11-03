// Tiny local stand-in for Vercel's /api routing, so `npm run dev` + `npm run dev:api`
// work without the Vercel CLI. Vite proxies /api to this server (see vite.config.js).
import http from "node:http";
import { existsSync } from "node:fs";
import { pathToFileURL } from "node:url";
import path from "node:path";

const PORT = Number(process.env.API_PORT || 3001);
const API_DIR = path.resolve("api");

function resolve(pathname) {
  const parts = pathname.replace(/^\/api\/?/, "").split("/").filter(Boolean);
  const direct = path.join(API_DIR, ...parts) + ".js";
  if (parts.length && existsSync(direct)) return { file: direct, query: {} };
  if (parts.length > 1) {
    const dyn = path.join(API_DIR, ...parts.slice(0, -1), "[n].js");
    if (existsSync(dyn)) return { file: dyn, query: { n: parts.at(-1) } };
  }
  return null;
}

http.createServer(async (req, res) => {
  const url = new URL(req.url, "http://localhost");
  const hit = resolve(url.pathname);
  if (!hit) { res.statusCode = 404; return res.end('{"error":"Not found"}'); }
  let body = "";
  for await (const chunk of req) body += chunk;
  try { req.body = body ? JSON.parse(body) : undefined; } catch { req.body = undefined; }
  req.query = { ...Object.fromEntries(url.searchParams), ...hit.query };
  const mod = await import(pathToFileURL(hit.file).href);
  await mod.default(req, res);
}).listen(PORT, () => console.log(`dev api on http://localhost:${PORT}`));
