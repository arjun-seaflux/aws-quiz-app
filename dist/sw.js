/* Service worker: installable app + offline notes.
   - Hashed build assets: cache-first (they never change).
   - Notes & papers API (public data): stale-while-revalidate, so they work offline.
   - Everything else under /api (accounts, scores, rooms): never cached.
   - Page navigations: network-first, falling back to the cached app shell. */
const VERSION = "v2";
const SHELL = `shell-${VERSION}`;
const DATA = `data-${VERSION}`;

self.addEventListener("install", (e) => {
  e.waitUntil(caches.open(SHELL).then((c) => c.addAll(["/", "/manifest.webmanifest"])).then(() => self.skipWaiting()));
});

self.addEventListener("activate", (e) => {
  e.waitUntil(
    caches.keys()
      .then((keys) => Promise.all(keys.filter((k) => ![SHELL, DATA].includes(k)).map((k) => caches.delete(k))))
      .then(() => self.clients.claim()),
  );
});

const staleWhileRevalidate = async (req, cacheName) => {
  const cache = await caches.open(cacheName);
  const cached = await cache.match(req);
  const fresh = fetch(req).then((res) => { if (res.ok) cache.put(req, res.clone()); return res; }).catch(() => cached);
  return cached || fresh;
};

self.addEventListener("fetch", (e) => {
  const req = e.request;
  const url = new URL(req.url);
  if (req.method !== "GET" || url.origin !== self.location.origin) return;

  if (url.pathname.startsWith("/api/")) {
    if (url.pathname === "/api/notes" || url.pathname.startsWith("/api/papers/")) {
      e.respondWith(staleWhileRevalidate(req, DATA));
    }
    return; // private data goes straight to the network
  }

  if (req.mode === "navigate") {
    e.respondWith(
      fetch(req).then((res) => { caches.open(SHELL).then((c) => c.put("/", res.clone())); return res; })
        .catch(() => caches.match("/")),
    );
    return;
  }

  if (url.pathname.startsWith("/assets/")) {
    e.respondWith(caches.match(req).then((hit) => hit || fetch(req).then((res) => {
      if (res.ok) caches.open(SHELL).then((c) => c.put(req, res.clone()));
      return res;
    })));
    return;
  }
  e.respondWith(staleWhileRevalidate(req, SHELL));
});
