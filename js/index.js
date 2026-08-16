let globalCatalog = [];
const autoScrollTimers = {};

/* Helper: Normalize class strings into tokens.
   Separator support: comma, pipe, slash, semicolon (DO NOT split on whitespace so multi-word classes like
   "Editorial Picks" are preserved). Matching is case-insensitive.
*/
function normalizeClasses(raw) {
    if (!raw && raw !== 0) return [];
    if (Array.isArray(raw)) {
        return raw.map(String).map(s => s.trim().toLowerCase()).filter(Boolean);
    }
    // split only on explicit separators so "Editorial Picks" remains one token
    const parts = String(raw).split(/[,\|\/;]+/).map(s => s.trim()).filter(Boolean);
    return parts.map(s => s.toLowerCase());
}

function hasClass(game, className) {
    if (!className) return false;
    const want = String(className).trim().toLowerCase();
    if (!game || !Array.isArray(game.classificationTokens)) return false;
    return game.classificationTokens.some(t => t === want);
}

document.addEventListener('DOMContentLoaded', () => {
    // Set current year
    const yearSpan = document.getElementById('current-year');
    if (yearSpan) yearSpan.textContent = new Date().getFullYear();

    // Mobile menu toggle
    const hamburgerBtn = document.getElementById('hamburger-btn');
    const mobileMenu = document.getElementById('mobile-menu');
    if (hamburgerBtn && mobileMenu) {
        hamburgerBtn.addEventListener('click', () => {
            mobileMenu.classList.toggle('hidden');
        });
    }

    // Fetch central catalog and build dynamic sections
    loadHomepageData();
});

async function loadHomepageData() {
    // Get current day of week (0 = Sunday, 1 = Monday, ..., 6 = Saturday)
    const today = new Date();
    const dayOfWeek = today.getDay(); // Returns 0-6

    // Map day to file number (1-7)
    // Sunday (0) -> all_7.json, Monday (1) -> all_1.json, ..., Saturday (6) -> all_6.json
    // OR: Sunday (0) -> all_1.json, Monday (1) -> all_2.json, ..., Saturday (6) -> all_7.json
    // Choose your mapping:

    // OPTION 1: Sunday = File 7, Monday = File 1, ..., Saturday = File 6
    const fileNumber = dayOfWeek === 0 ? 7 : dayOfWeek;

    // OPTION 2: Sunday = File 1, Monday = File 2, ..., Saturday = File 7
    // const fileNumber = dayOfWeek + 1;

    const dataPath = `./data/all_${fileNumber}.json`;

    console.log(`Loading data for day ${dayOfWeek} (${['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'][dayOfWeek]}) from ${dataPath}`);

    let fetchedData = null;

    try {
        const res = await fetch(dataPath);
        if (res.ok) {
            fetchedData = await res.json();
        } else {
            console.warn(`Failed to load ${dataPath}, status: ${res.status}`);
        }
    } catch (e) {
        console.warn(`Error loading ${dataPath}:`, e);
    }

    // Fallback: Try other files if the day-specific one fails
    if (!fetchedData || !Array.isArray(fetchedData)) {
        console.log('Trying fallback files...');
        const fallbackPaths = [
            './data/all_1.json',
            './data/all_2.json',
            './data/all_3.json',
            './data/all_4.json',
            './data/all_5.json',
            './data/all_6.json',
            './data/all_7.json',
            './data/all.json',  // Original file as last resort
            './all.json'       // Root level
        ];

        for (const fallbackPath of fallbackPaths) {
            if (fallbackPath === dataPath) continue;

            try {
                const res = await fetch(fallbackPath);
                if (res.ok) {
                    fetchedData = await res.json();
                    console.log(`Loaded fallback from ${fallbackPath}`);
                    break;
                }
            } catch (e) {
                // Continue to next fallback
            }
        }
    }

    // Process data
    if (fetchedData && Array.isArray(fetchedData)) {
        // Process in chunks to avoid blocking UI
        const chunkSize = 20;
        globalCatalog = [];

        for (let i = 0; i < fetchedData.length; i += chunkSize) {
            const chunk = fetchedData.slice(i, i + chunkSize);
            const processed = chunk.map((item, idx) => {
                const rawClass = item.Class ?? item.class ?? item.classification ?? item.Classification ?? '';
                const tokens = normalizeClasses(rawClass);
                return {
                    id: item.id || item.Id || `game-${i}-${idx}`,
                    title: item.Title ? item.Title.trim() : (item.title ? item.title.trim() : "Untitled Game"),
                    category: item.Category || item.category || 'arcade',
                    classificationRaw: rawClass,
                    classificationTokens: tokens,
                    tags: Array.isArray(item.Tags) ? item.Tags : (item.Tags ? String(item.Tags).split(',').map(t => t.trim()) : []),
                    thumb: item.Image || item.thumb || item.thumbnail || 'https://placehold.co/400x400/1e293b/60a5fa?text=Bekeirat+Game',
                    url: item.Url || item.url || item.Play || item.play || `./pages/game.html?id=${encodeURIComponent(item.id || item.Id || `game-${i}-${idx}`)}`
                };
            });
            globalCatalog.push(...processed);

            // Yield to UI
            await new Promise(resolve => setTimeout(resolve, 0));
        }
    } else {
        // Fallback to mock data
        console.warn('No valid data found, using mock data');
        globalCatalog = generateMockGames();
    }

    renderHomepageSections();
}

function renderHomepageSections() {
    // Use robust class matching (case-insensitive, supports multi-word classes)
    // Section 2: Hot & Trending (Filtered by "Hot")
    const trending = globalCatalog.filter(g => hasClass(g, 'Hot'));
    renderCarousel('trending-carousel', trending, '🔥 HOT');
    if (trending.length > 0) setupCarouselAutoScroll('trending-carousel', 3200);

    // Section 3: Editor's Picks & Exclusives (Filtered by "Editorial Picks" OR "Exclusive")
    const editors = globalCatalog.filter(g => hasClass(g, 'Editorial Picks') || hasClass(g, 'Exclusive'));
    renderCarousel('editors-carousel', editors, '🌟 PICK');
    if (editors.length > 0) setupCarouselAutoScroll('editors-carousel', 3800);

    // Section 4: Genre Hub Default
    filterHomepageCategory('all');

    // Section 5: Fresh Releases (Filtered by "Newest")
    const fresh = globalCatalog.filter(g => hasClass(g, 'Newest'));
    renderCarousel('fresh-carousel', fresh, '🚀 NEW');
    if (fresh.length > 0) setupCarouselAutoScroll('fresh-carousel', 3500);

    // Section 6: Top Rated (Filtered by "Top" or "Most Popular")
    const topRated = globalCatalog.filter(g => hasClass(g, 'Top') || hasClass(g, 'Most Popular'));
    renderCarousel('toprated-carousel', topRated, '🏆 TOP', true);
    if (topRated.length > 0) setupCarouselAutoScroll('toprated-carousel', 4000);
}

function startAutoScroll(carouselId, intervalMs = 3500) {
    stopAutoScroll(carouselId);

    const container = document.getElementById(carouselId);
    if (!container) return;

    autoScrollTimers[carouselId] = setInterval(() => {
        if (!container) return;
        const scrollStep = 220; // Width of card + gap
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

    // Start initial timer
    startAutoScroll(carouselId, intervalMs);

    // Pause auto-scrolling on hover or touch
    container.addEventListener('mouseenter', () => stopAutoScroll(carouselId));
    container.addEventListener('mouseleave', () => startAutoScroll(carouselId, intervalMs));
    container.addEventListener('touchstart', () => stopAutoScroll(carouselId), { passive: true });
    container.addEventListener('touchend', () => startAutoScroll(carouselId, intervalMs), { passive: true });
}


function renderCarousel(containerId, games, badgeText, showRank = false) {
    const container = document.getElementById(containerId);
    if (!container) return;

    if (games.length === 0) {
        container.innerHTML = `<div class="text-sm text-gray-500 py-8 text-center w-full">No games assigned to this category yet.</div>`;
        return;
    }

    container.innerHTML = games.map((game, idx) => `
                <a href="${game.url}" 
                   class="carousel-card flex-none w-48 sm:w-52 bg-slate-900/90 rounded-2xl overflow-hidden border border-slate-800 hover:border-cyan-500/50 transition-all group duration-300 shadow-lg">
                    <div class="relative aspect-square overflow-hidden bg-slate-950">
                        <img src="${game.thumb}" 
                             alt="${game.title}"
                             loading="lazy"
                             decoding="async"
                             class="w-full h-full object-cover group-hover:scale-110 transition-transform duration-500"
                             onerror="this.src='https://placehold.co/400x400/1e293b/60a5fa?text=${encodeURIComponent(game.title)}'">
                        <div class="absolute inset-0 bg-gradient-to-t from-slate-950/80 via-transparent to-transparent"></div>
                        <span class="absolute top-2.5 left-2.5 text-[10px] font-extrabold px-2 py-0.5 rounded-md bg-black/70 backdrop-blur-md text-cyan-400 border border-cyan-500/30 uppercase">
                            ${showRank ? `#${idx + 1}` : badgeText}
                        </span>
                    </div>
                    <div class="p-3 bg-slate-900 flex items-center justify-between gap-2">
                        <h3 class="text-xs font-bold text-gray-200 group-hover:text-cyan-400 transition-colors truncate" title="${game.title}">
                            ${game.title}
                        </h3>
                        <div class="p-1.5 rounded-lg bg-slate-800 text-gray-400 group-hover:bg-cyan-500/20 group-hover:text-cyan-400 transition-all shrink-0">
                            <i class="fa-solid fa-play text-[10px]"></i>
                        </div>
                    </div>
                </a>
            `).join('');
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

    const filtered = category === 'all'
        ? globalCatalog.slice(0, 12)
        : globalCatalog.filter(g => String(g.category || '').toLowerCase() === category.toLowerCase()).slice(0, 12);

    if (filtered.length === 0) {
        hubGrid.innerHTML = `<div class="col-span-full py-8 text-center text-xs text-gray-400">No titles found in this genre right now.</div>`;
        return;
    }

    hubGrid.innerHTML = filtered.map(game => `
                <a href="${game.url}" 
                   class="bg-slate-900 rounded-xl overflow-hidden border border-slate-800 hover:border-cyan-500/50 transition-all group duration-300 flex flex-col shadow-md">
                    <div class="aspect-square relative overflow-hidden bg-slate-950">
                        <img src="${game.thumb}" alt="${game.title}" loading="lazy" class="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                             onerror="this.src='https://placehold.co/400x400/1e293b/60a5fa?text=${encodeURIComponent(game.title)}'">
                    </div>
                    <div class="p-2.5 bg-slate-900 flex-1 flex items-center justify-between">
                        <h4 class="text-xs font-bold text-gray-300 group-hover:text-cyan-400 truncate">${game.title}</h4>
                    </div>
                </a>
            `).join('');
}

function scrollCarousel(carouselId, offset) {
    const container = document.getElementById(carouselId);
    if (container) {
        container.scrollBy({ left: offset, behavior: 'smooth' });
    }
}

function generateMockGames() {
    const list = [];
    const cats = ['puzzle', 'action', 'arcade', 'racing', 'girls'];
    const classes = ['Hot', 'Editorial Picks', 'Newest', 'Top', 'Most Popular', 'Exclusive', ''];

    for (let i = 1; i <= 28; i++) {
        const cat = cats[i % cats.length];
        const cls = classes[i % classes.length];
        const tokens = normalizeClasses(cls);
        list.push({
            id: `mock-game-${i}`,
            title: `${cat.toUpperCase()} Challenge ${i}`,
            category: cat,
            classificationRaw: cls,
            classificationTokens: tokens,
            thumb: `https://picsum.photos/seed/bekeirat-${i}/400/400`,
            url: './pages/games.html'
        });
    }
    return list;
}  