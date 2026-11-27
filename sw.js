/**
 * Bekeirat Software - Service Worker (v3)
 *
 * Goals
 *  1. Fast repeat visits.
 *  2. The essential site (home, games hub, game player shell, about, contact,
 *     catalog data) still renders when the visitor is offline OR the host /
 *     backend is failing (5xx, timeouts).
 *  3. Never interfere with ads, analytics or consent traffic.
 *
 * Deploy checklist: bump VERSION on every release, serve this file as /sw.js
 * with "Cache-Control: no-cache", and register it with updateViaCache:'none'.
 */

const VERSION = 'v3-20261127a';
const STATIC_CACHE = `bk-static-${VERSION}`;
const PAGES_CACHE = `bk-pages-${VERSION}`;
const DATA_CACHE = `bk-data-${VERSION}`;
const CURRENT_CACHES = [STATIC_CACHE, PAGES_CACHE, DATA_CACHE];

const OFFLINE_URL = '/offline.html';
const NAV_TIMEOUT_MS = 4000;
const DATA_TIMEOUT_MS = 5000;
const MAX_STATIC_ENTRIES = 200;

// Pages: best-effort precache (one missing file must not break install).
const PRECACHE_PAGES = [
    '/',
    '/index.html',
    '/pages/games.html',
    '/pages/game.html',
    '/pages/about.html',
    '/pages/contact us.html'
];

// Same-origin static files your pages actually load.
const PRECACHE_STATIC = [
    '/css/index.css',
    '/css/games.css',
    '/js/index.js',
    '/js/games.js',
    '/assets/favicon.png',
    '/assets/Bekeirat-Software-120x120.png',
    '/assets/hero_emblem-1250x320.png'
];

// Catalog data. Swap for a slim file (e.g. top 40 games) if all.json is large.
const PRECACHE_DATA = ['/data/all.json'];

// Third-party files the page needs in order to LOOK right. Tailwind's CDN
// script generates your CSS at runtime, so without it the offline page is
// unstyled. (Compile Tailwind locally and you can drop this entry.)
const PRECACHE_THIRD_PARTY = [
    'https://cdn.tailwindcss.com',
    'https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.4.0/css/all.min.css',
    'https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700;800&family=Poppins:wght@400;600;700;800&display=swap'
];

// Only these third-party hosts are ever cached. Ad, analytics and consent
// hosts are deliberately absent, so they always go straight to the network.
const THIRD_PARTY_HOSTS = new Set([
    'cdn.tailwindcss.com',
    'cdnjs.cloudflare.com',
    'fonts.googleapis.com',
    'fonts.gstatic.com'
]);

const PLACEHOLDER_SVG =
    '<svg xmlns="http://www.w3.org/2000/svg" width="320" height="180" viewBox="0 0 320 180">' +
    '<rect width="320" height="180" fill="#12141f"/>' +
    '<text x="160" y="95" fill="#64748b" font-family="sans-serif" font-size="14" text-anchor="middle">' +
    'Image unavailable</text></svg>';

/* ------------------------------ helpers ------------------------------ */

const delay = (ms) => new Promise((resolve) => setTimeout(() => resolve(null), ms));

// A response that followed a redirect (e.g. Cloudflare Pages /games.html ->
// /games) cannot be served to a navigation. Rebuild it as a clean response.
async function cleanResponse(res) {
    if (!res.redirected) return res;
    const body = await res.blob();
    return new Response(body, {
        status: res.status,
        statusText: res.statusText,
        headers: res.headers
    });
}

async function putClean(cache, key, res) {
    await cache.put(key, await cleanResponse(res));
}

async function fetchAndPut(cacheName, url, crossOrigin = false) {
    const req = new Request(url, crossOrigin ? { mode: 'no-cors' } : { cache: 'reload' });
    const res = await fetch(req);
    const ok = res.status === 200 || (crossOrigin && res.type === 'opaque');
    if (!ok) throw new Error(`${url} -> ${res.status}`);
    const cache = await caches.open(cacheName);
    await putClean(cache, url, res);
}

async function trimCache(name, max) {
    const cache = await caches.open(name);
    const keys = await cache.keys();
    for (let i = 0; i < keys.length - max; i++) {
        await cache.delete(keys[i]);
    }
}

function pageKey(url) {
    // Ignore query strings (utm, fbclid, ?id=) so the cache stays bounded and
    // game.html?id=123 falls back to the cached game.html shell.
    return new Request(url.origin + url.pathname);
}

function pageCandidates(url) {
    const p = url.pathname;
    const list = [p];
    if (p.endsWith('/')) list.push(p + 'index.html');
    else if (p.endsWith('.html')) list.push(p.slice(0, -5));
    else list.push(p + '.html');
    return list.map((x) => url.origin + x);
}

async function matchPage(cache, url) {
    for (const candidate of pageCandidates(url)) {
        const hit = await cache.match(candidate);
        if (hit) return hit;
    }
    return null;
}

function offlineResponse() {
    return new Response(
        '<!doctype html><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">' +
        '<title>Offline | Bekeirat Software</title>' +
        '<body style="font-family:sans-serif;background:#0b0f19;color:#f3f4f6;text-align:center;padding:4rem 1rem">' +
        '<h1>You are offline</h1><p>Please check your connection and try again.</p>',
        { status: 503, headers: { 'Content-Type': 'text/html; charset=utf-8' } }
    );
}

function placeholderImage() {
    return new Response(PLACEHOLDER_SVG, {
        status: 200,
        headers: { 'Content-Type': 'image/svg+xml', 'Cache-Control': 'no-store' }
    });
}

/* ------------------------------ install ------------------------------ */

self.addEventListener('install', (event) => {
    event.waitUntil((async () => {
        // The offline page is the only REQUIRED precache entry. If it fails,
        // install fails and the browser retries on the next visit.
        const pages = await caches.open(PAGES_CACHE);
        await pages.add(new Request(OFFLINE_URL, { cache: 'reload' }));

        // Everything else is best-effort.
        await Promise.allSettled([
            ...PRECACHE_PAGES.map((u) => fetchAndPut(PAGES_CACHE, u)),
            ...PRECACHE_STATIC.map((u) => fetchAndPut(STATIC_CACHE, u)),
            ...PRECACHE_DATA.map((u) => fetchAndPut(DATA_CACHE, u)),
            ...PRECACHE_THIRD_PARTY.map((u) => fetchAndPut(STATIC_CACHE, u, true))
        ]);

        await self.skipWaiting();
    })());
});

/* ------------------------------ activate ----------------------------- */

self.addEventListener('activate', (event) => {
    event.waitUntil((async () => {
        const names = await caches.keys();
        await Promise.all(
            names
                .filter((n) => (n.startsWith('bk-') && !CURRENT_CACHES.includes(n)) || n.startsWith('bekeirat'))
                .map((n) => caches.delete(n))
        );
        await trimCache(STATIC_CACHE, MAX_STATIC_ENTRIES);
        await self.clients.claim();
    })());
});

/* ------------------------------- fetch ------------------------------- */

self.addEventListener('fetch', (event) => {
    const req = event.request;

    // Let the browser handle anything we should not touch (POST, video Range
    // requests, etc.).
    if (req.method !== 'GET' || req.headers.has('range')) return;

    const url = new URL(req.url);
    const sameOrigin = url.origin === self.location.origin;

    // 1) Page navigations: network-first with timeout, then cache, then offline page.
    if (req.mode === 'navigate') {
        if (sameOrigin) event.respondWith(handleNavigation(event));
        return;
    }

    // 2) Catalog data: network-first (always revalidated), cache fallback.
    if (sameOrigin && url.pathname.startsWith('/data/') && url.pathname.endsWith('.json')) {
        event.respondWith(handleData(event));
        return;
    }

    // 3) Same-origin static files: stale-while-revalidate.
    if (sameOrigin) {
        if (['style', 'script', 'image', 'font', 'manifest'].includes(req.destination)) {
            event.respondWith(handleStatic(event, false));
        }
        return;
    }

    // 4) Allowlisted third-party assets (Tailwind, Font Awesome, fonts).
    if (THIRD_PARTY_HOSTS.has(url.hostname)) {
        event.respondWith(handleStatic(event, true));
        return;
    }

    // 5) Remote images (game thumbnails): network only, placeholder on failure.
    //    Not cached: opaque responses are padded to ~7 MB each in quota.
    if (req.destination === 'image') {
        event.respondWith(fetch(req).catch(() => placeholderImage()));
        return;
    }

    // 6) Everything else (ads, analytics, consent, game frames): untouched.
});

async function handleNavigation(event) {
    const req = event.request;
    const url = new URL(req.url);
    const cache = await caches.open(PAGES_CACHE);

    const net = fetch(req);
    net.catch(() => { /* handled below; avoids an unhandled rejection */ });

    try {
        const res = await Promise.race([net, delay(NAV_TIMEOUT_MS)]);
        if (res) {
            if (res.ok) event.waitUntil(putClean(cache, pageKey(url), res.clone()));
            // Redirects (opaqueredirect) and 4xx pass through; 5xx falls back to cache.
            if (res.status < 500) return res;
        } else {
            // Slow network: prefer a cached copy; if none, keep waiting.
            const cached = await matchPage(cache, url);
            if (cached) return cached;
            return await net;
        }
    } catch (_) {
        // Offline or network error: fall through to the cache.
    }

    return (await matchPage(cache, url)) ||
           (await cache.match(OFFLINE_URL)) ||
           offlineResponse();
}

async function handleData(event) {
    const req = event.request;
    const url = new URL(req.url);
    const key = new Request(url.origin + url.pathname);
    const cache = await caches.open(DATA_CACHE);

    try {
        // 'no-cache' = always revalidate with the server (cheap with ETag),
        // overriding the page code's cache:'force-cache'.
        const net = fetch(req, { cache: 'no-cache' });
        net.catch(() => {});
        const res = await Promise.race([net, delay(DATA_TIMEOUT_MS)]);
        if (res) {
            if (res.ok) {
                event.waitUntil(cache.put(key, res.clone()));
                return res;
            }
        } else {
            const cached = await cache.match(key);
            if (cached) return cached;
            const late = await net;
            if (late.ok) {
                event.waitUntil(cache.put(key, late.clone()));
                return late;
            }
        }
    } catch (_) {
        // Offline or server error: fall through.
    }

    // Exact file from cache, otherwise ANY cached catalog file so the hub
    // still shows games (e.g. Tuesday's file is missing but Monday's exists).
    const exact = await cache.match(key);
    if (exact) return exact;
    const keys = await cache.keys();
    if (keys.length) {
        const any = await cache.match(keys[0]);
        if (any) return any;
    }

    return new Response('[]', {
        status: 503,
        headers: { 'Content-Type': 'application/json' }
    });
}

async function handleStatic(event, allowOpaque) {
    const req = event.request;
    const cache = await caches.open(STATIC_CACHE);
    const cached = await cache.match(req);

    const refresh = fetch(req, allowOpaque ? undefined : { cache: 'no-cache' })
        .then((res) => {
            const cacheable = res.status === 200 || (allowOpaque && res.type === 'opaque');
            if (cacheable) {
                event.waitUntil(
                    cache.put(req, res.clone()).then(() => trimCache(STATIC_CACHE, MAX_STATIC_ENTRIES))
                );
            }
            return res;
        })
        .catch(() => null);

    if (cached) {
        event.waitUntil(refresh); // update in the background
        return cached;
    }

    const res = await refresh;
    if (res) return res;
    if (req.destination === 'image') return placeholderImage();
    return new Response('', { status: 504, statusText: 'Offline' });
}

/* ------------------------------ messages ----------------------------- */

self.addEventListener('message', (event) => {
    const action = event.data && event.data.action;
    if (action === 'skipWaiting') {
        self.skipWaiting();
    } else if (action === 'clearCache') {
        event.waitUntil(
            caches.keys().then((names) =>
                Promise.all(names.filter((n) => n.startsWith('bk-')).map((n) => caches.delete(n)))
            )
        );
    }
});

// Push notifications and background sync from the old file were removed:
// nothing on the site subscribes to them, and the old push handler threw on
// empty payloads. Re-add them only when a feature actually needs them.