const CACHE_NAME = "magic-block-blitz-2026-v1";

const ASSETS = [
  "./",
  "./index.html", 
  "./manifest.json",
  "../../css/google-fonts.css",
  "../../css/all-min.css",

  "./assets/apple-icon-180.png",
  "./assets/manifest-icon-192.any.png",
  "./assets/manifest-icon-192.maskable.png",
  "./assets/manifest-icon-512.any.png",
  "./assets/manifest-icon-512.maskable.png",

  "./assets/Screenshot-1.png",
  "./assets/Screenshot-2.png",
  "./assets/Screenshot-3.png",
  "./assets/Screenshot-4.png",
  "./assets/Screenshot-5.png",
  "./assets/Screenshot-6.png",
  "./assets/Screenshot-7.png",
  "./assets/Screenshot-8.png",
  "./assets/Screenshot-9.png"
];

self.addEventListener("install", event => {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then(cache => cache.addAll(ASSETS))
  );
  self.skipWaiting();
});

self.addEventListener("activate", event => {
  event.waitUntil(
    caches.keys().then(keys =>
      Promise.all(
        keys
          .filter(key => key !== CACHE_NAME)
          .map(key => caches.delete(key))
      )
    )
  );
  self.clients.claim();
});

self.addEventListener("fetch", event => {
  event.respondWith(
    caches.match(event.request)
      .then(response => response || fetch(event.request))
  );
});