const CACHE_VERSION = "learngame-om-v164";
const APP_SHELL = [
  "./",
  "./index.html",
  "./runtime-config.js",
  "./style.css",
  "./script.js",
  "./game-configuration-store.js",
  "./configuration-layout-preview.js",
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
  "./chapter-9-insights.js",
  "./lego-tower-renderer.js",
  "./tower-editor.js",
  "./lego-builder.js",
  "./isometric-logistics-view.js",
  "./assets/brand/learn-games-logo.svg",
  "./source_docs/LE-boek%20Learngames/1-informatie-en-goederenstroom-lo-game-1.svg",
  "./source_docs/LE-boek%20Learngames/1-logistiek-schema-lo-game-1.svg",
  "./source_docs/LE-boek%20Learngames/1-orderbegeleidingsformulier-lo-game-1.csv",
  "./source_docs/LE-boek%20Learngames/1-productieproces-lo-game-1.svg",
  "./source_docs/LE-boek%20Learngames/1-rolindeling-deelnemers-lo-game-1.csv",
  "./source_docs/LE-boek%20Learngames/2-orderformulier-lo-game-2.csv",
  "./source_docs/LE-boek%20Learngames/2-rolindeling-deelnemers-lo-game-2.csv",
  "./source_docs/LE-boek%20Learngames/3-orderformulier-lo-game-3.csv",
  "./source_docs/LE-boek%20Learngames/3-productiegeorienteerde-organisatie-lo-game-3.svg",
  "./source_docs/LE-boek%20Learngames/3-rolindeling-deelnemers-lo-game-3.csv",
  "./source_docs/LE-boek%20Learngames/4-order-history-analysis-lo-game-4.csv",
  "./source_docs/LE-boek%20Learngames/4-productgestuurde-organisatie-lo-game-4.svg",
  "./source_docs/LE-boek%20Learngames/5-functionele-organisatie-lo-game-5.svg",
  "./source_docs/LE-boek%20Learngames/5-rolindeling-deelnemers-lo-game-5.csv",
  "./source_docs/LE-boek%20Learngames/6-customer-order-decoupling-points-lo-game-6.svg",
  "./source_docs/LE-boek%20Learngames/6-productieorganisatie-lo-game-6.svg",
  "./source_docs/LE-boek%20Learngames/7-productieorganisatie-lo-game-7.svg",
  "./source_docs/LE-boek%20Learngames/7-transport-intermediary-freight-forwarder-lo-game-7.svg",
  "./source_docs/LE-boek%20Learngames/8-freight-forwarder-lo-game-8.svg",
  "./source_docs/LE-boek%20Learngames/8-functionele-organisatie-lo-game-8.svg",
  "./source_docs/LE-boek%20Learngames/9-productieproces-organisatie-le-training.svg",
  "./source_docs/LE-boek%20Learngames/10-organisatiediagram-learngame-entrepreneurship.svg",
  "./source_docs/LE-boek%20Learngames/Chapter_9_AI_Optimized.md",
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
        .catch(() => caches.match(event.request).then(cached => cached || caches.match("./index.html")))
    );
    return;
  }

  // Cache-First with background revalidation for static media/images/icons
  event.respondWith(
    caches.match(event.request).then(cached => {
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
