// Minimal error reporting: unhandled errors and promise rejections are POSTed to
// /api/client-error (stored in the client_errors table). Capped per page load.
let sent = 0;

function report(message, stack) {
  if (sent >= 5 || !message || /ResizeObserver loop/.test(message)) return;
  sent += 1;
  fetch("/api/client-error", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ message: String(message), stack: String(stack ?? ""), url: location.href }),
    keepalive: true,
  }).catch(() => {});
}

export function startMonitor() {
  if (!import.meta.env.PROD) return;
  window.addEventListener("error", (e) => report(e.message, e.error?.stack));
  window.addEventListener("unhandledrejection", (e) => report(e.reason?.message ?? e.reason, e.reason?.stack));
}
