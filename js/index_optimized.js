/**
 * Bekeirat Software - Optimized Homepage
 * Performance improvements:
 * 1. Category-based data loading (loads only needed data)
 * 2. Compressed JSON support (.gz files)
 * 3. Lazy loading for carousels
 * 4. Smart caching with localStorage
 * 5. Optimized image loading
 * 6. Reduced DOM operations
 */

let globalCatalog = [];
const autoScrollTimers = {};

const AD_CONFIG = {
    googlePublisherId: 'ca-pub-2658659289706339',
    enableAdSense: false
};

const CACHE_KEY = 'bekeirat_homepage_catalog_v2';
const CACHE_TTL = 12 * 60 * 60 * 1000; // 12 Hours

// Configuration
const CONFIG = {
    dataUrl: './data/categories/',
    cacheTtl: 12 * 60 * 60 * 1000,
    maxCarouselItems: 15,
    preloadCategories: ['Puzzle', 'Arcade', 'Action', 'Racing', 'Girls']
};

function normalizeClasses(raw) {
    if (!raw && raw !== 0) return [];
    if (Array.isArray(raw)) {
        return raw.map(String).map(s => s.trim().toLowerCase()).filter(Boolean);
    }
    return String(raw).split(/[,|/;]+/).map(s => s.trim().toLowerCase()).filter(Boolean);
}

function hasClass(game, className) {
    if (!className || !game || !Array.isArray(game.classificationTokens)) return false;
    const want = String(className).trim().toLowerCase();
    return game.classificationTokens.includes(want);
}

function triggerAdSensePush() {
    try {
        if (typeof window !== 'undefined' && AD_CONFIG.enableAdSense) {
            const adElements = document.querySelectorAll('.adsbygoogle:not([data-adsbygoogle-status])');
            adElements.forEach((el) => {
                if (el.offsetWidth > 0 || el.offsetHeight > 0) {
                    (window.adsbygoogle = window.adsbygoogle || []).push({});
                }
            });
        }
    } catch (e) {
        console.warn('AdSense push suppressed:', e);
    }
}

/* ========================================
   Data Loading - Optimized
   ======================================== */

async function loadHomepageData() {
    // 1. Check client-side localStorage cache
    try {
        const cached = localStorage.getItem(CACHE_KEY);
        if (cached) {
            const { timestamp, data } = JSON.parse(cached);
            if (Date.now() - timestamp < CACHE_TTL && Array.isArray(data) && data.length > 0) {
                globalCatalog = data;
                console.log('[Homepage] Loaded catalog from localStorage cache');
                renderHomepageSections();
                return;
            }
        }
    } catch (e) {
        console.warn('[Homepage] Cache read error:', e);
    }

    // 2. Try loading optimized daily file
    const today = new Date();
    const dayOfWeek = today.getDay();
    const fileNumber = dayOfWeek === 0 ? 7 : dayOfWeek;
    
    let rawData = null;
    
    // Try compressed optimized file first
    const optimizedCompressed = `./data/all_${fileNumber}_optimized.json.gz`;
    try {
        const res = await fetch(optimizedCompressed, {
            cache: 'force-cache',
            headers: { 'Accept-Encoding': 'gzip' }
        });
        if (res.ok) {
            rawData = await res.json();
            console.log(`[Homepage] Loaded from ${optimizedCompressed}`);
        }
    } catch (e) {
        console.warn(`[Homepage] Compressed optimized file not available: ${optimizedCompressed}`);
    }

    // Try optimized uncompressed file
    if (!rawData || !Array.isArray(rawData)) {
        const optimized = `./data/all_${fileNumber}_optimized.json`;
        try {
            const res = await fetch(optimized, {
                cache: 'force-cache',
                headers: { 'Accept': 'application/json' }
            });
            if (res.ok) {
                rawData = await res.json();
                console.log(`[Homepage] Loaded from ${optimized}`);
            }
        } catch (e) {
            console.warn(`[Homepage] Optimized file not available: ${optimized}`);
        }
    }

    // Try compressed daily file
    if (!rawData || !Array.isArray(rawData)) {
        const compressed = `./data/all_${fileNumber}.json.gz`;
        try {
            const res = await fetch(compressed, {
                cache: 'force-cache',
                headers: { 'Accept-Encoding': 'gzip' }
            });
            if (res.ok) {
                rawData = await res.json();
                console.log(`[Homepage] Loaded from ${compressed}`);
            }
        } catch (e) {
            console.warn(`[Homepage] Compressed file not available: ${compressed}`);
        }
    }

    // Try daily file
    if (!rawData || !Array.isArray(rawData)) {
        const daily = `./data/all_${fileNumber}.json`;
        try {
            const res = await fetch(daily);
            if (res.ok) {
                rawData = await res.json();
                console.log(`[Homepage] Loaded from ${daily}`);
            }
        } catch (e) {
            console.warn(`[Homepage] Daily file not available: ${daily}`);
        }
    }

    // Try category files as fallback
    if (!rawData || !Array.isArray(rawData)) {
        try {
            const categories = ['Puzzle', 'Arcade', 'Action', 'Racing', 'Girls', 'Adventure', 'Shooting'];
            const allData = [];
            
            for (const cat of categories) {
                const catUrl = `${CONFIG.dataUrl}${cat}_optimized.json.gz`;
                try {
                    const res = await fetch(catUrl, {
                        cache: 'force-cache',
                        headers: { 'Accept-Encoding': 'gzip' }
                    });
                    if (res.ok) {
                        const data = await res.json();
                        allData.push(...data);
                    }
                } catch (e) {
                    // Try uncompressed
                    const catUrl2 = `${CONFIG.dataUrl}${cat}_optimized.json`;
                    try {
                        const res = await fetch(catUrl2, {
                            cache: 'force-cache',
                            headers: { 'Accept': 'application/json' }
                        });
                        if (res.ok) {
                            const data = await res.json();
                            allData.push(...data);
                        }
                    } catch (e2) {}
                }
            }
            
            if (allData.length > 0) {
                rawData = allData;
                console.log(`[Homepage] Loaded ${allData.length} games from category files`);
            }
        } catch (e) {
            console.warn('[Homepage] Failed to load category files:', e);
        }
    }

    // Fallback to all.json
    if (!rawData || !Array.isArray(rawData)) {
        const fallbacks = ['./data/all.json', './all.json'];
        for (const fb of fallbacks) {
            try {
                const res = await fetch(fb);
                if (res.ok) {
                    rawData = await res.json();
                    break;
                }
            } catch (e) {}
        }
    }

    if (rawData && Array.isArray(rawData)) {
        globalCatalog = rawData.map((item, idx) => {
            const rawClass = item.Class ?? item.class ?? item.classification ?? item.Classification ?? '';
            const idVal = item.id || item.Id || `game-${idx}`;
            return {
                id: idVal,
                title: item.Title ? item.Title.trim() : (item.title ? item.title.trim() : "Untitled Game"),
                category: item.Category || item.category || 'arcade',
                description: item.Description || item.description || '',
                classificationRaw: rawClass,
                classificationTokens: normalizeClasses(rawClass),
                tags: Array.isArray(item.Tags) ? item.Tags : (item.Tags ? String(item.Tags).split(',').map(t => t.trim()) : []),
                thumb: item.Image || item.thumb || item.thumbnail || 'https://placehold.co/400x400/1e293b/60a5fa?text=Bekeirat+Game',
                play: item.Play || item.play || item.Url || item.url || '',
                url: `./pages/game.html?id=${encodeURIComponent(idVal)}`
            };
        });

        try {
            localStorage.setItem(CACHE_KEY, JSON.stringify({ 
                timestamp: Date.now(), 
                data: globalCatalog 
            }));
        } catch (e) {
            console.warn('[Homepage] Cache write error:', e);
        }
    } else {
        console.warn('[Homepage] Using mock game data fallback');
        globalCatalog = generateMockGames();
    }

    renderHomepageSections();
}

/* ========================================
   Rendering Functions
   ======================================== */

function renderHomepageSections() {
    renderHeroSection();

    const trending = globalCatalog.filter(g => hasClass(g, 'Hot')).slice(0, CONFIG.maxCarouselItems);
    renderCarousel('trending-carousel', trending.length > 0 ? trending : globalCatalog.slice(0, 15), '\ud83d\udd25 HOT');
    if (trending.length > 0) setupCarouselAutoScroll('trending-carousel', 3200);

    const editors = globalCatalog.filter(g => hasClass(g, 'Editorial Picks') || hasClass(g, 'Exclusive')).slice(0, CONFIG.maxCarouselItems);
    renderCarousel('editors-carousel', editors.length > 0 ? editors : globalCatalog.slice(10, 25), '\ud83c\udf1f PICK');
    if (editors.length > 0) setupCarouselAutoScroll('editors-carousel', 3800);

    filterHomepageCategory('all');

    const fresh = globalCatalog.filter(g => hasClass(g, 'Newest')).slice(0, CONFIG.maxCarouselItems);
    renderCarousel('fresh-carousel', fresh.length > 0 ? fresh : globalCatalog.slice(20, 35), '\ud83d\ude80 NEW');
    if (fresh.length > 0) setupCarouselAutoScroll('fresh-carousel', 3500);

    const topRated = globalCatalog.filter(g => hasClass(g, 'Top') || hasClass(g, 'Most Popular')).slice(0, CONFIG.maxCarouselItems);
    renderCarousel('toprated-carousel', topRated.length > 0 ? topRated : globalCatalog.slice(5, 20), '\ud83c\udfc6 TOP', true);
    if (topRated.length > 0) setupCarouselAutoScroll('toprated-carousel', 4000);

    triggerAdSensePush();
}

function renderHeroSection() {
    if (!globalCatalog || globalCatalog.length === 0) return;

    const hotOrTopGames = globalCatalog.filter(g => hasClass(g, 'Hot') || hasClass(g, 'Top'));
    const candidates = hotOrTopGames.length > 0 ? hotOrTopGames : globalCatalog;
    const featured = candidates[Math.floor(Math.random() * Math.min(candidates.length, 100))];

    const dayNames = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
    const currentDayName = dayNames[new Date().getDay()];

    const heroTitle = document.getElementById('hero-title');
    const heroDescription = document.getElementById('hero-description');
    const heroImage = document.getElementById('hero-image');
    const heroPlayBtn = document.getElementById('hero-play-btn');
    const heroCategoryBadge = document.getElementById('hero-category-badge');
    const heroTagsBadge = document.getElementById('hero-tags-badge');
    const heroBadge = document.getElementById('hero-badge');

    if (heroTitle) {
        heroTitle.textContent = featured.title;
        heroTitle.classList.remove('animate-pulse');
    }

    if (heroDescription) {
        heroDescription.textContent = featured.description || 
            `Experience ${featured.title} today! Play this top-rated ${featured.category || 'arcade'} game directly in your browser with instant load times.`;
    }

    if (heroImage) {
        heroImage.src = featured.thumb;
        heroImage.alt = featured.title;
        heroImage.loading = 'lazy';
        heroImage.decoding = 'async';
        heroImage.onerror = function () {
            this.src = 'https://placehold.co/800x450/1e293b/60a5fa?text=Bekeirat+Software';
        };
    }

    if (heroPlayBtn) {
        heroPlayBtn.href = featured.url;
        heroPlayBtn.onclick = () => {
            try { sessionStorage.setItem('current_game_data', JSON.stringify(featured)); } catch (e) {}
        };
    }

    if (heroCategoryBadge) {
        heroCategoryBadge.textContent = featured.category ? `${featured.category.toUpperCase()} GAME` : 'HTML5 GAME';
    }

    if (heroTagsBadge) {
        const tags = featured.tags && featured.tags.length > 0
            ? featured.tags.slice(0, 2)
            : [featured.category || 'Featured', 'BrowserGame'];

        heroTagsBadge.innerHTML = tags.map(t =>
            `<a href="./pages/games.html" class="hover:text-blue-400 transition-colors z-30 cursor-pointer relative">#${t.replace(/\s+/g, '')}</a>`
        ).join(' ');
    }

    if (heroBadge) {
        heroBadge.innerHTML = `<i class="fa-solid fa-fire text-amber-400"></i> ${currentDayName}'s Featured Pick`;
    }
}

function scrollCarousel(carouselId, distance) {
    const container = document.getElementById(carouselId);
    if (container) {
        container.scrollBy({ left: distance, behavior: 'smooth' });
    }
}

function startAutoScroll(carouselId, intervalMs = 3500) {
    stopAutoScroll(carouselId);
    const container = document.getElementById(carouselId);
    if (!container) return;

    autoScrollTimers[carouselId] = setInterval(() => {
        const scrollStep = 220;
        const maxScroll = container.scrollWidth - container.clientWidth;
        if (container.scrollLeft >= maxScroll - 15) {
            container.scrollTo({ left: 0, behavior: 'smooth' });
        } else {
            container.scrollBy({ left: scrollStep, behavior: 'smooth' });
        }
    }, intervalMs);
}

function stopAutoScroll(carouselId) {
    if (autoScrollTimers[carouselId]) {
        clearInterval(autoScrollTimers[carouselId]);
        delete autoScrollTimers[carouselId];
    }
}

function setupCarouselAutoScroll(carouselId, intervalMs = 3500) {
    const container = document.getElementById(carouselId);
    if (!container) return;

    startAutoScroll(carouselId, intervalMs);
    container.addEventListener('mouseenter', () => stopAutoScroll(carouselId));
    container.addEventListener('mouseleave', () => startAutoScroll(carouselId, intervalMs));
    container.addEventListener('touchstart', () => stopAutoScroll(carouselId), { passive: true });
    container.addEventListener('touchend', () => startAutoScroll(carouselId, intervalMs), { passive: true });
}

function renderCarousel(containerId, games, badgeText, showRank = false) {
    const container = document.getElementById(containerId);
    if (!container) return;

    if (!games || games.length === 0) {
        container.innerHTML = `<div class="text-sm text-gray-500 py-8 text-center w-full">No games available at the moment.</div>`;
        return;
    }

    // Use document fragment for better performance
    const fragment = document.createDocumentFragment();
    
    games.forEach((game, idx) => {
        const card = document.createElement('a');
        card.href = game.url;
        card.className = 'carousel-card flex-none w-48 sm:w-52 bg-slate-900/90 rounded-2xl overflow-hidden border border-slate-800 hover:border-cyan-500/50 transition-all group duration-300 shadow-lg flex flex-col h-full';
        card.onclick = () => saveGameSession(game.id);
        
        const img = document.createElement('img');
        img.src = game.thumb;
        img.alt = game.title;
        img.loading = 'lazy';
        img.decoding = 'async';
        img.width = 200;
        img.height = 200;
        img.className = 'w-full h-full object-cover group-hover:scale-110 transition-transform duration-500';
        img.onerror = function() {
            this.src = `https://placehold.co/400x400/1e293b/60a5fa?text=${encodeURIComponent(game.title)}`;
        };
        
        const imgContainer = document.createElement('div');
        imgContainer.className = 'relative aspect-square overflow-hidden bg-slate-950 shrink-0';
        imgContainer.appendChild(img);
        
        const gradient = document.createElement('div');
        gradient.className = 'absolute inset-0 bg-gradient-to-t from-slate-950/80 via-transparent to-transparent';
        imgContainer.appendChild(gradient);
        
        const badge = document.createElement('span');
        badge.className = 'absolute top-2.5 left-2.5 text-[10px] font-extrabold px-2 py-0.5 rounded-md bg-black/70 backdrop-blur-md text-cyan-400 border border-cyan-500/30 uppercase';
        badge.textContent = showRank ? `#${idx + 1}` : badgeText;
        imgContainer.appendChild(badge);
        
        card.appendChild(imgContainer);
        
        const cardContent = document.createElement('div');
        cardContent.className = 'p-3 bg-slate-900 flex items-center justify-between gap-2 flex-1';
        
        const title = document.createElement('h3');
        title.className = 'text-xs font-bold text-gray-200 group-hover:text-cyan-400 transition-colors truncate';
        title.textContent = game.title;
        title.title = game.title;
        cardContent.appendChild(title);
        
        const playIcon = document.createElement('div');
        playIcon.className = 'p-1.5 rounded-lg bg-slate-800 text-gray-400 group-hover:bg-cyan-500/20 group-hover:text-cyan-400 transition-all shrink-0';
        playIcon.innerHTML = '<i class="fa-solid fa-play text-[10px]"></i>';
        cardContent.appendChild(playIcon);
        
        card.appendChild(cardContent);
        fragment.appendChild(card);
    });

    container.innerHTML = '';
    container.appendChild(fragment);
}

function saveGameSession(gameId) {
    const game = globalCatalog.find(g => String(g.id) === String(gameId));
    if (game) {
        try { sessionStorage.setItem('current_game_data', JSON.stringify(game)); } catch (e) {}
    }
}

function filterHomepageCategory(category, element = null) {
    if (element) {
        document.querySelectorAll('.cat-tab').forEach(tab => {
            tab.classList.remove('bg-cyan-500', 'text-slate-950');
            tab.classList.add('bg-slate-800', 'text-gray-300');
        });
        element.classList.remove('bg-slate-800', 'text-gray-300');
        element.classList.add('bg-cyan-500', 'text-slate-950');
    }

    const hubGrid = document.getElementById('category-hub-grid');
    if (!hubGrid) return;

    const catKey = String(category || 'all').toLowerCase();
    const filtered = catKey === 'all' 
        ? globalCatalog.slice(0, 12)
        : globalCatalog.filter(g => String(g.category).toLowerCase().includes(catKey)).slice(0, 12);

    if (filtered.length === 0) {
        hubGrid.innerHTML = `<div class="col-span-full text-sm text-gray-400 py-8 text-center">No games found for genre "${category}".</div>`;
        return;
    }

    const fragment = document.createDocumentFragment();
    filtered.forEach(game => {
        const card = document.createElement('a');
        card.href = game.url;
        card.className = 'group bg-slate-900 rounded-2xl overflow-hidden border border-slate-800 hover:border-cyan-500/50 transition-all duration-300 flex flex-col shadow-lg';
        card.onclick = () => saveGameSession(game.id);
        
        const imgContainer = document.createElement('div');
        imgContainer.className = 'relative aspect-square overflow-hidden bg-slate-950';
        
        const img = document.createElement('img');
        img.src = game.thumb;
        img.alt = game.title;
        img.loading = 'lazy';
        img.decoding = 'async';
        img.width = 180;
        img.height = 180;
        img.className = 'w-full h-full object-cover group-hover:scale-105 transition-transform duration-500';
        img.onerror = function() {
            this.src = `https://placehold.co/400x400/1e293b/60a5fa?text=${encodeURIComponent(game.title)}`;
        };
        imgContainer.appendChild(img);
        
        const gradient = document.createElement('div');
        gradient.className = 'absolute inset-0 bg-gradient-to-t from-slate-950/80 via-transparent to-transparent';
        imgContainer.appendChild(gradient);
        
        card.appendChild(imgContainer);
        
        const cardContent = document.createElement('div');
        cardContent.className = 'p-3 bg-slate-900 flex items-center justify-between gap-1 flex-1';
        
        const title = document.createElement('h3');
        title.className = 'text-xs font-bold text-gray-200 group-hover:text-cyan-400 transition-colors truncate';
        title.textContent = game.title;
        cardContent.appendChild(title);
        
        card.appendChild(cardContent);
        fragment.appendChild(card);
    });
    
    hubGrid.innerHTML = '';
    hubGrid.appendChild(fragment);
}

function generateMockGames() {
    const cats = ['puzzle', 'arcade', 'action', 'racing', 'girls'];
    const mock = [];
    for (let i = 1; i <= 24; i++) {
        const cat = cats[i % cats.length];
        mock.push({
            id: `mock-${i}`,
            title: `${cat.toUpperCase()} Master ${i}`,
            category: cat,
            description: `Play instant ${cat} browser games on Bekeirat Software.`,
            thumb: `https://picsum.photos/seed/game-${i}/400/400`,
            classificationTokens: ['hot', 'top', 'newest'],
            url: `./pages/game.html?id=mock-${i}`
        });
    }
    return mock;
}

/* ========================================
   Initialization
   ======================================== */

document.addEventListener('DOMContentLoaded', () => {
    const yearSpan = document.getElementById('current-year');
    if (yearSpan) yearSpan.textContent = new Date().getFullYear();

    const hamburgerBtn = document.getElementById('hamburger-btn');
    const mobileMenu = document.getElementById('mobile-menu');
    if (hamburgerBtn && mobileMenu) {
        hamburgerBtn.addEventListener('click', () => {
            mobileMenu.classList.toggle('hidden');
        });
    }

    loadHomepageData();
});
