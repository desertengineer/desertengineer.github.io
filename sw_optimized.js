/**
 * Bekeirat Software - Optimized Service Worker
 * Caching strategy for static assets and JSON data
 * Features:
 * - Precaching of critical assets
 * - Runtime caching with stale-while-revalidate
 * - Gzip compression support
 * - Cache cleanup
 */

const CACHE_NAME = 'bekeirat-v3';
const DATA_CACHE_NAME = 'bekeirat-data-v3';
const IMAGE_CACHE_NAME = 'bekeirat-images-v3';

// Critical assets to precache
const PRECACHE_ASSETS = [
    '/',
    '/index.html',
    '/pages/games.html',
    '/pages/about.html',
    '/pages/contact us.html',
    '/css/index.css',
    '/css/all.min.css',
    '/css/fontawesome.css',
    '/css/google-fonts.css',
    '/js/index_optimized.js',
    '/js/games_optimized.js',
    '/assets/favicon.png',
    '/assets/Bekeirat-Software-120x120.png',
    '/assets/og-banner-1200x630.png'
];

// Critical data files to precache
const PRECACHE_DATA = [
    '/data/categories/index.json',
    '/data/categories/Puzzle_optimized.json',
    '/data/categories/Arcade_optimized.json',
    '/data/categories/Action_optimized.json',
    '/data/categories/Racing_optimized.json',
    '/data/categories/Girls_optimized.json'
];

// Cache configuration
const CACHE_CONFIG = {
    maxEntries: 100, // Max number of entries in data cache
    maxAge: 24 * 60 * 60, // 24 hours in seconds
    imageMaxAge: 7 * 24 * 60 * 60, // 7 days for images
    staleWhileRevalidateAge: 12 * 60 * 60 // 12 hours
};

/* ========================================
   Cache Helper Functions
   ======================================== */

function isGzipResponse(response) {
    const contentEncoding = response.headers.get('content-encoding');
    return contentEncoding && contentEncoding.includes('gzip');
}

function isJsonResponse(response) {
    const contentType = response.headers.get('content-type');
    return contentType && contentType.includes('application/json');
}

function isImageResponse(response) {
    const contentType = response.headers.get('content-type');
    return contentType && (contentType.includes('image/') || contentType.includes('font/'));
}

function getCacheKey(request) {
    // Normalize URL for caching
    const url = new URL(request.url);
    // Remove query parameters for cache key
    return url.pathname + (url.search ? url.search : '');
}

async function cleanupOldCaches() {
    const cacheNames = await caches.keys();
    const currentCaches = [CACHE_NAME, DATA_CACHE_NAME, IMAGE_CACHE_NAME];
    
    for (const cacheName of cacheNames) {
        if (!currentCaches.includes(cacheName)) {
            await caches.delete(cacheName);
            console.log(`[SW] Deleted old cache: ${cacheName}`);
        }
    }
}

async function cleanupCache(cacheName, maxEntries, maxAge) {
    const cache = await caches.open(cacheName);
    const keys = await cache.keys();
    
    if (keys.length > maxEntries) {
        // Delete oldest entries
        const sortedKeys = keys.sort((a, b) => a.url.localeCompare(b.url));
        const keysToDelete = sortedKeys.slice(0, keys.length - maxEntries);
        
        for (const key of keysToDelete) {
            await cache.delete(key);
        }
        
        console.log(`[SW] Cleaned up ${keysToDelete.length} entries from ${cacheName}`);
    }
    
    // Check for expired entries
    const now = Date.now();
    for (const key of keys) {
        const response = await cache.match(key);
        if (response) {
            const responseTime = new Date(response.headers.get('date')).getTime();
            if (now - responseTime > maxAge * 1000) {
                await cache.delete(key);
                console.log(`[SW] Removed expired entry: ${key.url}`);
            }
        }
    }
}

/* ========================================
   Precache Installation
   ======================================== */

async function precacheAssets() {
    const cache = await caches.open(CACHE_NAME);
    
    // Precache critical assets
    for (const asset of PRECACHE_ASSETS) {
        try {
            const response = await fetch(asset, { cache: 'no-cache' });
            if (response.ok) {
                await cache.put(asset, response);
                console.log(`[SW] Precached: ${asset}`);
            }
        } catch (e) {
            console.warn(`[SW] Failed to precache ${asset}:`, e);
        }
    }
    
    // Precache critical data files
    const dataCache = await caches.open(DATA_CACHE_NAME);
    for (const dataUrl of PRECACHE_DATA) {
        try {
            const response = await fetch(dataUrl, { cache: 'no-cache' });
            if (response.ok) {
                await dataCache.put(dataUrl, response);
                console.log(`[SW] Precached data: ${dataUrl}`);
            }
        } catch (e) {
            console.warn(`[SW] Failed to precache data ${dataUrl}:`, e);
        }
    }
}

/* ========================================
   Fetch Strategies
   ======================================== */

async function networkFirstWithCache(request, cacheName, maxAge) {
    // Try network first
    try {
        const response = await fetch(request, { cache: 'no-cache' });
        
        if (response.ok) {
            // Clone and cache the response
            const responseClone = response.clone();
            const cache = await caches.open(cacheName);
            await cache.put(getCacheKey(request), responseClone);
            return response;
        }
    } catch (e) {
        console.warn(`[SW] Network failed for ${request.url}:`, e);
    }
    
    // Fallback to cache
    const cache = await caches.open(cacheName);
    const cachedResponse = await cache.match(getCacheKey(request));
    
    if (cachedResponse) {
        // Check if cached response is still valid
        const responseTime = new Date(cachedResponse.headers.get('date')).getTime();
        const now = Date.now();
        
        if (now - responseTime < maxAge * 1000) {
            console.log(`[SW] Serving from cache: ${request.url}`);
            return cachedResponse;
        }
    }
    
    return null;
}

async function staleWhileRevalidate(request, cacheName, maxAge) {
    const cache = await caches.open(cacheName);
    const cachedResponse = await cache.match(getCacheKey(request));
    
    // Return cached response immediately if available
    if (cachedResponse) {
        // Start background update
        fetch(request, { cache: 'no-cache' }).then(async (response) => {
            if (response.ok) {
                await cache.put(getCacheKey(request), response);
                console.log(`[SW] Updated cache for ${request.url}`);
            }
        }).catch(e => {
            console.warn(`[SW] Background update failed for ${request.url}:`, e);
        });
        
        return cachedResponse;
    }
    
    // No cache, fetch from network
    const response = await fetch(request, { cache: 'no-cache' });
    
    if (response.ok) {
        const responseClone = response.clone();
        await cache.put(getCacheKey(request), responseClone);
    }
    
    return response;
}

async function cacheFirstWithNetworkFallback(request, cacheName, maxAge) {
    const cache = await caches.open(cacheName);
    const cachedResponse = await cache.match(getCacheKey(request));
    
    if (cachedResponse) {
        // Check if cached response is still valid
        const responseTime = new Date(cachedResponse.headers.get('date')).getTime();
        const now = Date.now();
        
        if (now - responseTime < maxAge * 1000) {
            // Start background update if stale
            if (now - responseTime > CACHE_CONFIG.staleWhileRevalidateAge * 1000) {
                fetch(request, { cache: 'no-cache' }).then(async (response) => {
                    if (response.ok) {
                        await cache.put(getCacheKey(request), response);
                    }
                }).catch(e => {});
            }
            
            return cachedResponse;
        }
    }
    
    // Fetch from network
    try {
        const response = await fetch(request, { cache: 'no-cache' });
        
        if (response.ok) {
            const responseClone = response.clone();
            await cache.put(getCacheKey(request), responseClone);
        }
        
        return response;
    } catch (e) {
        // Return stale cache if available
        if (cachedResponse) {
            return cachedResponse;
        }
        throw e;
    }
}

/* ========================================
   Event Listeners
   ======================================== */

self.addEventListener('install', (event) => {
    console.log('[SW] Installing...');
    
    event.waitUntil(
        Promise.all([
            cleanupOldCaches(),
            precacheAssets()
        ]).then(() => {
            console.log('[SW] Installation complete');
            return self.skipWaiting();
        })
    );
});

self.addEventListener('activate', (event) => {
    console.log('[SW] Activating...');
    
    event.waitUntil(
        cleanupOldCaches().then(() => {
            console.log('[SW] Activation complete');
            return self.clients.claim();
        })
    );
});

self.addEventListener('fetch', (event) => {
    const request = event.request;
    const url = new URL(request.url);
    
    // Skip non-GET requests
    if (request.method !== 'GET') {
        return;
    }
    
    // Skip requests to other origins
    if (url.origin !== self.location.origin) {
        // But cache external resources that we use
        if (url.hostname.includes('cdnjs.cloudflare.com') ||
            url.hostname.includes('fonts.googleapis.com') ||
            url.hostname.includes('fonts.gstatic.com') ||
            url.hostname.includes('pagead2.googlesyndication.com') ||
            url.hostname.includes('www.googletagmanager.com') ||
            url.hostname.includes('s.skimresources.com')) {
            
            event.respondWith(
                cacheFirstWithNetworkFallback(request, CACHE_NAME, CACHE_CONFIG.maxAge)
            );
            return;
        }
        return;
    }
    
    // Handle different types of requests
    const path = url.pathname;
    
    // Precached assets
    if (PRECACHE_ASSETS.some(asset => path === asset || path === new URL(asset, self.location.origin).pathname)) {
        event.respondWith(
            caches.match(request).then((response) => {
                return response || fetch(request);
            })
        );
        return;
    }
    
    // Data files (JSON)
    if (path.includes('/data/') && (path.endsWith('.json') || path.endsWith('.json.gz'))) {
        event.respondWith(
            staleWhileRevalidate(request, DATA_CACHE_NAME, CACHE_CONFIG.maxAge)
        );
        return;
    }
    
    // Images
    if (path.includes('/assets/') || path.includes('.jpg') || path.includes('.jpeg') || 
        path.includes('.png') || path.includes('.webp') || path.includes('.gif') ||
        path.includes('.svg')) {
        event.respondWith(
            cacheFirstWithNetworkFallback(request, IMAGE_CACHE_NAME, CACHE_CONFIG.imageMaxAge)
        );
        return;
    }
    
    // CSS files
    if (path.endsWith('.css')) {
        event.respondWith(
            staleWhileRevalidate(request, CACHE_NAME, CACHE_CONFIG.maxAge)
        );
        return;
    }
    
    // JS files
    if (path.endsWith('.js')) {
        event.respondWith(
            staleWhileRevalidate(request, CACHE_NAME, CACHE_CONFIG.maxAge)
        );
        return;
    }
    
    // HTML pages
    if (path.endsWith('.html') || path === '/') {
        event.respondWith(
            networkFirstWithCache(request, CACHE_NAME, CACHE_CONFIG.maxAge)
        );
        return;
    }
    
    // Default: try cache then network
    event.respondWith(
        caches.match(request).then((response) => {
            return response || fetch(request);
        })
    );
});

/* ========================================
   Message Events
   ======================================== */

self.addEventListener('message', (event) => {
    if (event.data && event.data.type === 'SKIP_WAITING') {
        self.skipWaiting();
    }
    
    if (event.data && event.data.type === 'CLEANUP_CACHE') {
        cleanupOldCaches();
    }
    
    if (event.data && event.data.type === 'PRECACHE_DATA') {
        const dataUrl = event.data.url;
        if (dataUrl) {
            fetch(dataUrl, { cache: 'no-cache' }).then(async (response) => {
                if (response.ok) {
                    const dataCache = await caches.open(DATA_CACHE_NAME);
                    await dataCache.put(dataUrl, response);
                }
            });
        }
    }
});

/* ========================================
   Periodic Cache Cleanup
   ======================================== */

// Cleanup cache every hour
setInterval(() => {
    cleanupCache(DATA_CACHE_NAME, CACHE_CONFIG.maxEntries, CACHE_CONFIG.maxAge);
    cleanupCache(IMAGE_CACHE_NAME, CACHE_CONFIG.maxEntries * 2, CACHE_CONFIG.imageMaxAge);
}, 60 * 60 * 1000);

console.log('[SW] Bekeirat Software Service Worker loaded');
