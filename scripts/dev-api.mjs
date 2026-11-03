// Tiny local stand-in for Vercel's /api routing, so `npm run dev` + `npm run dev:api`
// work without the Vercel CLI. Vite proxies /api to this server (see vite.config.js).
import http from "node:http";
import { existsSync, readdirSync, statSync } from "node:fs";
import { pathToFileURL } from "node:url";
import path from "node:path";

const PORT = Number(process.env.API_PORT || 3001);
const API_DIR = path.resolve("api");

// Mirrors Vercel's file routing, including nested [param] folders/files.
function resolve(pathname) {
  const parts = pathname.replace(/^\/api\/?/, "").split("/").filter(Boolean);
  const walk = (dir, i, query) => {
    if (i === parts.length) {
      const idx = path.join(dir, "index.js");
      return existsSync(idx) ? { file: idx, query } : null;
    }
    const seg = parts[i];
    const last = i === parts.length - 1;
    if (last && existsSync(path.join(dir, seg + ".js"))) return { file: path.join(dir, seg + ".js"), query };
    if (existsSync(path.join(dir, seg)) && statSync(path.join(dir, seg)).isDirectory()) {
      const hit = walk(path.join(dir, seg), i + 1, query);
      if (hit) return hit;
    }
    for (const name of readdirSync(dir)) {
      const m = /^\[(\w+)\](\.js)?$/.exec(name);
      if (!m) continue;
      if (last && m[2]) return { file: path.join(dir, name), query: { ...query, [m[1]]: seg } };
      if (!m[2]) { const hit = walk(path.join(dir, name), i + 1, { ...query, [m[1]]: seg }); if (hit) return hit; }
    }
    return null;
  };
  return walk(API_DIR, 0, {});
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
