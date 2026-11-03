import { dbConfigured } from "./db.js";

export function send(res, status, body, cacheControl = "no-store") {
  res.statusCode = status;
  res.setHeader("Content-Type", "application/json; charset=utf-8");
  res.setHeader("Cache-Control", cacheControl);
  res.end(JSON.stringify(body));
}

/**
 * Wraps a handler: method allow-list, JSON-only writes (CSRF defence in depth
 * on top of SameSite=Lax cookies), DB-config check and uniform error output.
 */
export function route(methods, handler) {
  return async (req, res) => {
    try {
      if (!methods.includes(req.method)) {
        res.setHeader("Allow", methods.join(", "));
        return send(res, 405, { error: "Method not allowed" });
      }
      if (!dbConfigured) {
        return send(res, 503, { error: "Database is not configured" });
      }
      if (req.method !== "GET" && req.method !== "HEAD") {
        const ct = req.headers["content-type"] || "";
        if (!ct.includes("application/json")) {
          return send(res, 415, { error: "Content-Type must be application/json" });
        }
      }
      await handler(req, res);
    } catch (err) {
      console.error(err);
      if (!res.headersSent) send(res, 500, { error: "Internal server error" });
    }
  };
}
