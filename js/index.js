let globalCatalog = [];
const autoScrollTimers = {};
const CACHE_KEY = 'bekeirat_homepage_catalog';
const CACHE_TTL = 12 * 60 * 60 * 1000;
const MAX_INITIAL_ITEMS = 80;

function normalizeClasses(raw) {
    if (!raw && raw !== 0) return [];
    if (Array.isArray(raw)) {
        return raw.map(String).map(s => s.trim().toLowerCase()).filter(Boolean);
    }
    return String(raw).split(/[,|/;]+/).map(s => s.trim().toLowerCase()).filter(Boolean);
}

function hasClass(game, className) {
    if (!className || !game || !game.classificationTokens) return false;
    const want = String(className).trim().toLowerCase();
    return Array.isArray(game.classificationTokens) && game.classificationTokens.includes(want);
}

function trimToArray(value) {
    if (!value) return [];
    if (Array.isArray(value)) return value;
    return String(value).split(/[,\|/;]/).map(v => v.trim()).filter(Boolean);
}

function safeSetItem(key, value) {
    try {
        sessionStorage.setItem(key, JSON.stringify(value));
    } catch (e) {
        console.warn('[Homepage] Session save failed:', e);
    }
}

function scheduleIdleTask(callback) {
    if ('requestIdleCallback' in window) {
        requestIdleCallback(callback);
    } else {
        setTimeout(callback, 150);
    }
}

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

async function loadHomepageData() {
    try {
        const cached = localStorage.getItem(CACHE_KEY);
        if (cached) {
            const { timestamp, data } = JSON.parse(cached);
            if (Date.now() - timestamp < CACHE_TTL && Array.isArray(data) && data.length > 0) {
                globalCatalog = data.slice(0, MAX_INITIAL_ITEMS);
                renderHomepageSections();
                return;
            }
        }
    } catch (e) {
        console.warn('[Homepage] Cache read error:', e);
    }

    const today = new Date();
    const dayOfWeek = today.getDay();
    const fileNumber = dayOfWeek === 0 ? 7 : dayOfWeek;
    const primaryPath = './data/all_' + fileNumber + '.json';

    let rawData = null;

    try {
        const res = await fetch(primaryPath, { cache: 'force-cache' });
        if (res.ok) {
            rawData = await res.json();
        }
    } catch (e) {
        console.warn('[Homepage] Primary fetch error:', e);
    }

    if (!rawData || !Array.isArray(rawData)) {
        const fallbacks = ['./data/all.json', './all.json'];
        for (const fb of fallbacks) {
            try {
                const res = await fetch(fb, { cache: 'force-cache' });
                if (res.ok) {
                    rawData = await res.json();
                    break;
                }
            } catch (e) {}
        }
    }

    if (rawData && Array.isArray(rawData)) {
        globalCatalog = rawData.slice(0, MAX_INITIAL_ITEMS).map((item, idx) => {
            const rawClass = item.Class ?? item.class ?? item.classification ?? item.Classification ?? '';
            const idVal = item.id || item.Id || `game-${idx}`;

            return {
                id: idVal,
                title: item.Title ? item.Title.trim() : (item.title ? item.title.trim() : 'Untitled Game'),
                category: item.Category || item.category || 'arcade',
                description: item.Description || item.description || '',
                classificationRaw: rawClass,
                classificationTokens: normalizeClasses(rawClass),
                tags: trimToArray(item.Tags),
                thumb: item.Image || item.thumb || item.thumbnail || 'https://placehold.co/400x400/1e293b/60a5fa?text=Bekeirat+Game',
                play: item.Play || item.play || item.Url || item.url || '',
                url: './pages/game.html?id=' + encodeURIComponent(idVal)
            };
        });

        try {
            localStorage.setItem(CACHE_KEY, JSON.stringify({ timestamp: Date.now(), data: globalCatalog }));
        } catch (e) {
            console.warn('[Homepage] Cache save failed:', e);
        }
    } else {
        console.warn('[Homepage] Using mock game data fallback');
        globalCatalog = generateMockGames();
    }

    renderHomepageSections();

    scheduleIdleTask(() => {
        if (globalCatalog.length < 200) {
            // No large additional data load on first pass.
            // Keep initial interaction fast.
        }
    });
}

function renderHomepageSections() {
    renderHeroSection();

    const trending = globalCatalog.filter(g => hasClass(g, 'Hot'));
    renderCarousel('trending-carousel', trending.length > 0 ? trending.slice(0, 12) : globalCatalog.slice(0, 12), '🔥 HOT');
    if (trending.length > 0) setupCarouselAutoScroll('trending-carousel', 3200);

    const editors = globalCatalog.filter(g => hasClass(g, 'Editorial Picks') || hasClass(g, 'Exclusive'));
    renderCarousel('editors-carousel', editors.length > 0 ? editors.slice(0, 12) : globalCatalog.slice(10, 22), '🌟 PICK');
    if (editors.length > 0) setupCarouselAutoScroll('editors-carousel', 3800);

    filterHomepageCategory('all');

    const fresh = globalCatalog.filter(g => hasClass(g, 'Newest'));
    renderCarousel('fresh-carousel', fresh.length > 0 ? fresh.slice(0, 12) : globalCatalog.slice(20, 32), '🚀 NEW');
    if (fresh.length > 0) setupCarouselAutoScroll('fresh-carousel', 3500);

    const topRated = globalCatalog.filter(g => hasClass(g, 'Top') || hasClass(g, 'Most Popular'));
    renderCarousel('toprated-carousel', topRated.length > 0 ? topRated.slice(0, 12) : globalCatalog.slice(5, 17), '🏆 TOP', true);
    if (topRated.length > 0) setupCarouselAutoScroll('toprated-carousel', 4000);
}

function renderHeroSection() {
    if (!globalCatalog || globalCatalog.length === 0) return;

    const hotOrTopGames = globalCatalog.filter(g => hasClass(g, 'Hot') || hasClass(g, 'Top'));
    const candidates = hotOrTopGames.length > 0 ? hotOrTopGames : globalCatalog;
    const featured = candidates[Math.floor(Math.random() * candidates.length)];

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
        heroImage.onerror = function () {
            this.src = 'https://placehold.co/800x450/1e293b/60a5fa?text=Bekeirat+Software';
        };
    }

    if (heroPlayBtn) {
        heroPlayBtn.href = featured.url;
        heroPlayBtn.onclick = () => {
            safeSetItem('current_game_data', featured);
        };
    }

    if (heroCategoryBadge) {
        heroCategoryBadge.textContent = featured.category ? (featured.category.toUpperCase() + ' GAME') : 'HTML5 GAME';
    }

    if (heroTagsBadge) {
        const tags = featured.tags && featured.tags.length > 0
            ? featured.tags.slice(0, 2)
            : [featured.category || 'Featured', 'BrowserGame'];

        heroTagsBadge.innerHTML = tags.map(t =>
            '<a href="./pages/games.html" class="hover:text-blue-400 transition-colors z-30 cursor-pointer relative">#' + (String(t).replace(/\\s+/g, '')) + '</a>'
        ).join(' ');
    }

    if (heroBadge) {
        heroBadge.innerHTML = '<i class=\"fa-solid fa-fire text-amber-400\"></i> ' + currentDayName + '\'s Featured Pick';
    }
}

function scrollCarousel(carouselId, distance) {
    const container = document.getElementById(carouselId);
    if (!container) return;
    container.scrollBy({ left: distance, behavior: 'smooth' });
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
        container.innerHTML = '<div class=\"text-sm text-gray-500 py-8 text-center w-full\">No games available at the moment.</div>';
        return;
    }

    const cardsHtml = games.map((game, idx) => `
        <a href="${game.url}" onclick="saveGameSession('${game.id}')"
           class="carousel-card flex-none w-48 sm:w-52 bg-slate-900/90 rounded-2xl overflow-hidden border border-slate-800 hover:border-cyan-500/50 transition-all group duration-300 shadow-lg flex flex-col"
           style="min-width: 220px;">
            <div class="relative aspect-square overflow-hidden bg-slate-950 shrink-0">
                <img src="${game.thumb}"
                     alt="${game.title}"
                     loading="lazy"
                     decoding="async"
                     width="200" height="200"
                     class="w-full h-full object-cover group-hover:scale-110 transition-transform duration-500"
                     onerror="this.src='https://placehold.co/400x400/1e293b/60a5fa?text=${encodeURIComponent(game.title)}'">
                <div class="absolute inset-0 bg-gradient-to-t from-slate-950/80 via-transparent to-transparent"></div>
                <span class="absolute top-2.5 left-2.5 text-[10px] font-extrabold px-2 py-0.5 rounded-md bg-black/70 backdrop-blur-md text-cyan-400 border border-cyan-500/30 uppercase">
                    ${showRank ? '#' + (idx + 1) : badgeText}
                </span>
            </div>
            <div class="p-3 bg-slate-900 flex items-center justify-between gap-2 flex-1">
                <h3 class="text-xs font-bold text-gray-200 group-hover:text-cyan-400 transition-colors truncate" title="${game.title}">
                    ${game.title}
                </h3>
                <div class="p-1.5 rounded-lg bg-slate-800 text-gray-400 group-hover:bg-cyan-500/20 group-hover:text-cyan-400 transition-all shrink-0">
                    <i class="fa-solid fa-play text-[10px]"></i>
                </div>
            </div>
        </a>
    `);

    container.innerHTML = cardsHtml.join('');
}

function saveGameSession(gameId) {
    const game = globalCatalog.find(g => String(g.id) === String(gameId));
    if (game) {
        safeSetItem('current_game_data', JSON.stringify(game));
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
        hubGrid.innerHTML = '<div class=\"col-span-full text-sm text-gray-400 py-8 text-center\">No games found for genre \"' + category + '\".</div>';
        return;
    }

    hubGrid.innerHTML = filtered.map(game => `
        <a href="${game.url}" onclick="saveGameSession('${game.id}')"
           class="group bg-slate-900 rounded-2xl overflow-hidden border border-slate-800 hover:border-cyan-500/50 transition-all duration-300 flex flex-col shadow-lg">
            <div class="relative aspect-square overflow-hidden bg-slate-950">
                <img src="${game.thumb}" alt="${game.title}" loading="lazy" decoding="async" width="180" height="180"
                     class="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                     onerror="this.src='https://placehold.co/400x400/1e293b/60a5fa?text=${encodeURIComponent(game.title)}'">
                <div class="absolute inset-0 bg-gradient-to-t from-slate-950/80 via-transparent to-transparent"></div>
            </div>
            <div class="p-3 bg-slate-900 flex items-center justify-between gap-1 flex-1">
                <h3 class="text-xs font-bold text-gray-200 group-hover:text-cyan-400 transition-colors truncate">${game.title}</h3>
            </div>
        </a>
    `).join('');
}

function generateMockGames() {
    const cats = ['puzzle', 'arcade', 'action', 'racing', 'girls'];
    const mock = [];
    for (let i = 1; i <= 18; i++) {
        const cat = cats[i % cats.length];
        mock.push({
            id: `mock-${i}`,
            title: `${cat.toUpperCase()} Master ${i}`,
            category: cat,
            description: `Play instant ${cat} browser games on Bekeirat Software.`,
            thumb: `https://picsum.photos/seed/game-${i}/400/400`,
            classificationTokens: ['hot', 'top', 'newest'],
            url: './pages/game.html?id=mock-' + i
        });
    }
    return mock;
}