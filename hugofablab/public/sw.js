/* HUGO FABLAB — application installable. Les données privées et les réservations ne sont jamais mises en cache. */
const VERSION = "hf-identity-v5";
const SHELL = ["/offline", "/icons/icon-192.png", "/icons/icon-512.png"];
self.addEventListener("install", (event) => { event.waitUntil(caches.open(VERSION).then((c) => c.addAll(SHELL)).then(() => self.skipWaiting())); });
self.addEventListener("activate", (event) => { event.waitUntil(caches.keys().then((keys) => Promise.all(keys.filter((k) => k.startsWith("hf-") && k !== VERSION).map((k) => caches.delete(k)))).then(() => self.clients.claim())); });
self.addEventListener("fetch", (event) => {
  const req = event.request;
  if (req.method !== "GET") return;
  const url = new URL(req.url);
  if (url.origin !== self.location.origin || url.pathname.startsWith("/api/")) return;
  if (url.pathname.startsWith("/_next/static/") || url.pathname.startsWith("/icons/") || url.pathname.startsWith("/images/")) {
    event.respondWith(caches.match(req).then((hit) => hit || fetch(req).then((res) => { if (res.ok) { const copy = res.clone(); caches.open(VERSION).then((c) => c.put(req, copy)); } return res; })));
    return;
  }
  if (req.mode === "navigate") event.respondWith(fetch(req).catch(async () => (await caches.match("/offline")) || new Response("Connexion indisponible. Réessayez quand le réseau revient.", { status: 503, headers: { "Content-Type": "text/plain; charset=utf-8" } })));
});
