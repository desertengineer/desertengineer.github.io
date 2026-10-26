const APP_VERSION = '2026-10-26-1';
const CACHE_NAME = 'bekeirat-shell-' + APP_VERSION;

self.addEventListener('install', (event) => {
    event.waitUntil(
        caches.open(CACHE_NAME).then((cache) => {
            return cache.addAll([
                '/',
                '/index.html',
                '/pages/games.html',
                '/css/index.css',
                '/css/games.css',
                '/js/index.js',
                '/js/games.js',
                '/assets/Bekeirat-Software-120x120.png'
            ]);
        })
    );
    self.skipWaiting();
});

self.addEventListener('activate', (event) => {
    event.waitUntil(
        caches.keys().then((keys) => {
            return Promise.all(
                keys
                    .filter((key) => key.startsWith('bekeirat-shell-') && key !== CACHE_NAME)
                    .map((key) => caches.delete(key))
            );
        })
    );
    self.clients.claim();
});

self.addEventListener('fetch', (event) => {
    const request = event.request;
    if (request.method !== 'GET') return;

    const url = new URL(request.url);

    if (url.origin !== location.origin) {
        return;
    }

    // Always bypass versioned assets so browser sees latest code immediately
    if (url.searchParams.has('v')) {
        event.respondWith(fetch(request));
        return;
    }

    // Navigation should be network-first
    if (request.mode === 'navigate') {
        event.respondWith(
            fetch(request)
                .then((response) => {
                    const copy = response.clone();
                    caches.open(CACHE_NAME).then((cache) => cache.put(request, copy));
                    return response;
                })
                .catch(() => caches.match(request).then((cached) => cached || Response.redirect('/index.html')))
        );
        return;
    }

    // JSON should not be cached aggressively
    if (url.pathname.endsWith('.json')) {
        event.respondWith(
            fetch(request)
                .then((response) => {
                    const copy = response.clone();
                    caches.open(CACHE_NAME).then((cache) => cache.put(request, copy));
                    return response;
                })
                .catch(() => caches.match(request).then((cached) => cached || Response.error()))
        );
        return;
    }

    // JS/CSS/images: use cache first but refresh in background
    if (/\.(js|css|png|jpg|jpeg|gif|webp|svg)$/.test(url.pathname)) {
        event.respondWith(
            caches.match(request).then((cached) => {
                const networkFetch = fetch(request)
                    .then((response) => {
                        const copy = response.clone();
                        caches.open(CACHE_NAME).then((cache) => cache.put(request, copy));
                        return response;
                    })
                    .catch(() => cached);

                return cached || networkFetch;
            })
        );
        return;
    }

    event.respondWith(
        fetch(request)
            .then((response) => {
                const copy = response.clone();
                caches.open(CACHE_NAME).then((cache) => cache.put(request, copy));
                return response;
            })
            .catch(() => caches.match(request).then((cached) => cached || Response.error()))
    );
});