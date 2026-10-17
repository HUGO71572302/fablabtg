/* HUGO FABLAB — ressources statiques, pages récentes et écran de secours. */
const VERSION = "hf-offline-v11";
const OFFLINE_PAGE = "/offline.html";
const PRIVATE_PAGES = "hf-private-pages-v1";
const SHELL = [OFFLINE_PAGE, "/icons/icon-192.png", "/icons/icon-512.png"];
const OFFLINE_ROUTES = new Set([
  "/app",
  "/app/calendrier",
  "/app/reserver",
  "/app/reservations",
  "/app/projets",
  "/app/stock",
  "/app/profil",
  "/admin",
  "/admin/reservations",
  "/admin/ressources",
  "/admin/stock/journal",
  "/admin/stock",
  "/admin/projets",
  "/admin/utilisateurs",
  "/admin/suivi",
  "/admin/statistiques",
  "/admin/identite",
  "/admin/disponibilites",
  "/print/stock/journal",
]);
const PRINT_ROUTE_PATTERNS = [
  /^\/print\/stock\/recu\/\d+$/,
  /^\/print\/stock\/fiche\/\d+$/,
  /^\/print\/apprenant\/\d+$/,
];

function isOfflineRoute(pathname) {
  return OFFLINE_ROUTES.has(pathname) || PRINT_ROUTE_PATTERNS.some((pattern) => pattern.test(pathname));
}

function pageCacheKey(url) {
  // Conserve les filtres du journal imprimable, mais évite les variantes inutiles des écrans du lab.
  const search = url.pathname === "/print/stock/journal" ? url.search : "";
  return new Request(new URL(`${url.pathname}${search}`, url.origin).toString());
}

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
        keys.filter((key) => key.startsWith("hf-") && key !== VERSION && key !== PRIVATE_PAGES).map((key) => caches.delete(key)),
      ))
      .then(() => self.clients.claim()),
  );
});

self.addEventListener("message", (event) => {
  if (event.data?.type === "CLEAR_PRIVATE_OFFLINE_PAGES") {
    event.waitUntil(caches.delete(PRIVATE_PAGES));
  }
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
        await caches.open(VERSION).then((cache) => cache.put(req, response.clone()));
      }
      return response;
    })());
    return;
  }

  // Next.js navigue souvent sans recharger le document. L'application lance une requête
  // HTML dédiée à chaque écran visité pour que celui-ci puisse être rouvert hors ligne.
  if (req.headers.get("x-hf-offline-prefetch") === "1" && isOfflineRoute(url.pathname)) {
    event.respondWith((async () => {
      const response = await fetch(req);
      if (response.ok && !response.redirected && new URL(response.url).pathname === url.pathname && response.headers.get("content-type")?.includes("text/html")) {
        const pageKey = pageCacheKey(url);
        try {
          await caches.open(PRIVATE_PAGES).then((cache) => cache.put(pageKey, response.clone()));
        } catch (error) {
          console.error("Impossible d’enregistrer cette page pour le mode hors ligne.", error);
        }
      }
      return response;
    })());
    return;
  }

  if (req.mode === "navigate") {
    event.respondWith((async () => {
      const canCachePage = isOfflineRoute(url.pathname);
      const pageKey = pageCacheKey(url);
      try {
        const response = await fetch(req);
        if (canCachePage && response.ok && !response.redirected && new URL(response.url).pathname === url.pathname && response.headers.get("content-type")?.includes("text/html")) {
          try {
            await caches.open(PRIVATE_PAGES).then((cache) => cache.put(pageKey, response.clone()));
          } catch (error) {
            console.error("Impossible d’enregistrer cette page pour le mode hors ligne.", error);
          }
        }
        if (response.status < 500) return response;
      } catch {
        // Le serveur est inaccessible : tenter la dernière version explicitement autorisée.
      }

      if (canCachePage) {
        const cachedPage = await caches.open(PRIVATE_PAGES).then((cache) => cache.match(pageKey, { ignoreVary: true }));
        if (cachedPage) return cachedPage;
      }
      return (await caches.match(OFFLINE_PAGE)) || new Response(
        "Connexion indisponible. Réessayez quand le réseau revient.",
        { status: 503, headers: { "Content-Type": "text/plain; charset=utf-8" } },
      );
    })());
  }
});
