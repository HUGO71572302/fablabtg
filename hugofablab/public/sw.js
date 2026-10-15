/* HUGO FABLAB — seules les ressources statiques et la page de secours sont conservées. */
const VERSION = "hf-offline-v6";
const OFFLINE_PAGE = "/offline.html";
const SHELL = [OFFLINE_PAGE, "/icons/icon-192.png", "/icons/icon-512.png"];

self.addEventListener("install", (event) => {
  event.waitUntil(
    caches.open(VERSION)
      .then((cache) => cache.addAll(SHELL))
      .then(() => self.skipWaiting()),
  );
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches.keys()
      .then((keys) => Promise.all(
        keys.filter((key) => key.startsWith("hf-") && key !== VERSION).map((key) => caches.delete(key)),
      ))
      .then(() => self.clients.claim()),
  );
});

self.addEventListener("fetch", (event) => {
  const req = event.request;
  if (req.method !== "GET") return;
  const url = new URL(req.url);
  if (url.origin !== self.location.origin || url.pathname.startsWith("/api/")) return;

  if (url.pathname.startsWith("/_next/static/") || url.pathname.startsWith("/icons/") || url.pathname.startsWith("/images/")) {
    event.respondWith((async () => {
      const cached = await caches.match(req);
      if (cached) return cached;

      const response = await fetch(req);
      if (response.ok) {
        event.waitUntil(caches.open(VERSION).then((cache) => cache.put(req, response.clone())));
      }
      return response;
    })());
    return;
  }

  if (req.mode === "navigate") {
    event.respondWith((async () => {
      try {
        const response = await fetch(req);
        if (response.status < 500) return response;
      } catch {
        // Le document de secours ne contient aucune donnée de compte.
      }

      return (await caches.match(OFFLINE_PAGE)) || new Response(
        "Connexion indisponible. Réessayez quand le réseau revient.",
        { status: 503, headers: { "Content-Type": "text/plain; charset=utf-8" } },
      );
    })());
  }
});
