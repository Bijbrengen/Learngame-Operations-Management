const CACHE_VERSION = "learngame-om-v247-material-cart";
const APP_SHELL = [
  "./",
  "./index.html",
  "./runtime-config.js",
  "./style.css",
  "./script.js",
  "./game-configuration-store.js",
  "./configuration-layout-preview.js",
  "./screen-interaction-manifest.js",
  "./runtime-role-contract.js",
  "./contracts/game-configuration-v1.schema.json",
  "./leerpret-auth.js",
  "./leerpret-theme.js",
  "./behavior-quality.js",
  "./character-creation.js",
  "./game-variant-history.js",
  "./game-sessions.js",
  "./data/agent-behavior/entrepreneurship-human-patterns.v1.js",
  "./logistics-game-engine.js",
  "./logistics-game-ui.js",
  "./multiplayer-runtime.js",
  "./chapter-9-insights.js",
  "./isometric-logistics-view.js",
  "./assets/brand/learn-games-logo.svg",
  "./manifest.webmanifest",
  "./icons/icon-192.png",
  "./icons/icon-512.png",
  "./icons/icon.svg"
];

self.addEventListener("install", event => {
  event.waitUntil(
    caches.open(CACHE_VERSION)
      .then(cache => cache.addAll(APP_SHELL))
      .then(() => self.skipWaiting())
  );
});

self.addEventListener("activate", event => {
  event.waitUntil(
    caches.keys()
      .then(keys => Promise.all(
        keys
          .filter(key => key !== CACHE_VERSION)
          .map(key => caches.delete(key))
      ))
      .then(() => self.clients.claim())
  );
});

self.addEventListener("fetch", event => {
  if (event.request.method !== "GET") return;

  const url = new URL(event.request.url);

  // Directly bypass service worker for API, authentication, and dynamic backend calls
  if (
    url.pathname.includes("/api") ||
    url.pathname.includes("/v1/") ||
    url.pathname.includes("/auth/")
  ) {
    return;
  }

  // Network-First strategy for HTML, JS, and CSS files to guarantee fresh scripts on load
  if (
    event.request.mode === "navigate" ||
    url.pathname.endsWith(".html") ||
    url.pathname.endsWith(".js") ||
    url.pathname.endsWith(".css") ||
    url.pathname === "/" ||
    url.pathname.endsWith("/")
  ) {
    event.respondWith(
      fetch(event.request)
        .then(response => {
          if (response.ok) {
            const copy = response.clone();
            caches.open(CACHE_VERSION).then(cache => cache.put(event.request, copy));
          }
          return response;
        })
        .catch(async () => {
          const cached = await caches.match(event.request, { ignoreSearch: true });
          if (cached) return cached;
          if (event.request.mode === "navigate") return caches.match("./index.html");
          return Response.error();
        })
    );
    return;
  }

  // Cache-First with background revalidation for static media/images/icons
  event.respondWith(
    caches.match(event.request, { ignoreSearch: true }).then(cached => {
      if (cached) {
        fetch(event.request).then(response => {
          if (response.ok) {
            caches.open(CACHE_VERSION).then(cache => cache.put(event.request, response));
          }
        }).catch(() => {});
        return cached;
      }
      return fetch(event.request).then(response => {
        if (response.ok) {
          const copy = response.clone();
          caches.open(CACHE_VERSION).then(cache => cache.put(event.request, copy));
        }
        return response;
      });
    })
  );
});

self.addEventListener("message", event => {
  if (event.data && event.data.type === "SKIP_WAITING") {
    self.skipWaiting();
  }
});
