// Optimized Games Hub Logic - Bekeirat Software

const CONFIG = {
    dataPaths: [],
    itemsPerPage: 60,
    defaultCategory: 'all',
    virtualScrollThreshold: 20
};

let dataCache = {};
let globalCatalog = [];
let currentDataset = [];
let activeCategory = 'all';
let activeSubCategory = 'all';
let searchQuery = '';
let currentPage = 1;

// Cache configuration
const CACHE_CONFIG = {
    key: 'bekeiratGamesData',
    ttl: 24 * 60 * 60 * 1000, // 24 Hours
    enabled: true
};

function normalizeKey(s) {
    return String(s || '').trim().toLowerCase();
}

function shuffleArray(array) {
    const shuffled = [...array];
    for (let i = shuffled.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
    }
    return shuffled;
}

function getCategoryEmoji(categoryKeyOrLabel) {
    const s = normalizeKey(categoryKeyOrLabel || '');
    const map = {
        'all': '🌐', 'puzzle': '🧩', 'match-3': '💎', 'jigsaw': '🧩',
        'arcade': '🕹️', 'action': '⚔️', 'adventure': '🗺️', 'racing': '🏎️',
        'sports': '🏆', 'football': '⚽', 'soccer': '⚽', 'basketball': '🏀',
        'girls': '👗', 'kids': '👶', 'multiplayer': '👥', 'io': '🌐',
        '3d': '🎮', 'shooter': '🔫', 'horror': '👻', 'strategy': '🧠',
        'simulation': '⚙️', 'idle': '😌', 'casual': '☕', 'boardgames': '🎲',
        'cards': '🃏', 'quiz': '❓', 'music': '🎵', 'platform': '🧗',
        'animals': '🐾', 'cooking': '🍳', 'dress-up': '👗', 'zombie': '🧟',
        'default': '🎮'
    };
    if (map[s]) return map[s];
    if (s.includes('puzzle')) return '🧩';
    if (s.includes('racing') || s.includes('driving')) return '🏎️';
    if (s.includes('sport') || s.includes('ball')) return '🏆';
    if (s.includes('girl') || s.includes('dress')) return '👗';
    if (s.includes('arcade')) return '🕹️';
    return map['default'];
}

function tagGradient(tag) {
    let h = 0;
    const str = String(tag || '');
    for (let i = 0; i < str.length; i++) {
        h = (h << 5) - h + str.charCodeAt(i);
        h = h & h;
    }
    const hue = Math.abs(h) % 360;
    return `linear-gradient(90deg, hsl(${hue} 50% 28%), hsl(${(hue + 40) % 360} 50% 32%))`;
}

/* -----------------------
   Storage Cache Layer
   ----------------------- */
async function getCachedData() {
    if (!CACHE_CONFIG.enabled) return null;
    try {
        const cached = localStorage.getItem(CACHE_CONFIG.key);
        if (cached) {
            const { data, timestamp } = JSON.parse(cached);
            if (Date.now() - timestamp < CACHE_CONFIG.ttl) {
                console.log('[Games Page] Loaded catalog from localStorage cache');
                return data;
            }
        }
    } catch (e) {
        console.warn('[Games Page] LocalStorage cache read error:', e);
    }
    return null;
}

async function setCachedData(data) {
    if (!CACHE_CONFIG.enabled) return;
    try {
        localStorage.setItem(CACHE_CONFIG.key, JSON.stringify({
            data,
            timestamp: Date.now()
        }));
    } catch (e) {
        console.warn('[Games Page] LocalStorage cache write error:', e);
    }
}

/* -----------------------
   Initialization
   ----------------------- */
document.addEventListener('DOMContentLoaded', async () => {
    const yearSpan = document.getElementById('current-year');
    if (yearSpan) yearSpan.textContent = new Date().getFullYear();

    const hamburgerBtn = document.getElementById('hamburger-btn');
    const mobileMenu = document.getElementById('mobile-menu');
    if (hamburgerBtn && mobileMenu) {
        hamburgerBtn.addEventListener('click', () => mobileMenu.classList.toggle('hidden'));
    }

    initializeDayBasedDataPath();
    await loadMasterData();
    populateCategoryMenu();
    switchCategory(CONFIG.defaultCategory);
});

function initializeDayBasedDataPath() {
    const today = new Date();
    const dayOfWeek = today.getDay();
    const fileNumber = dayOfWeek === 0 ? 7 : dayOfWeek;
    CONFIG.dataPaths = [`../data/all_${fileNumber}.json`];
}

async function loadMasterData() {
    const cachedData = await getCachedData();
    if (cachedData && Array.isArray(cachedData) && cachedData.length > 0) {
        globalCatalog = cachedData;
        return;
    }

    const dayFilePath = CONFIG.dataPaths[0];
    const fallbackPaths = ['../data/all.json', '../all.json'];

    let rawData = null;

    try {
        const res = await fetch(dayFilePath);
        if (res.ok) rawData = await res.json();
    } catch (e) {
        console.warn(`[Games Page] Primary fetch failed for ${dayFilePath}`);
    }

    if (!rawData || !Array.isArray(rawData)) {
        for (const path of fallbackPaths) {
            try {
                const res = await fetch(path);
                if (res.ok) {
                    rawData = await res.json();
                    break;
                }
            } catch (e) {}
        }
    }

    if (rawData && Array.isArray(rawData)) {
        globalCatalog = rawData.map((item, idx) => {
            const categoryRaw = item.Category ?? item.category ?? 'arcade';
            const category = String(categoryRaw).trim() || 'arcade';
            const tagsArray = Array.isArray(item.Tags)
                ? item.Tags.map(t => String(t).trim()).filter(Boolean)
                : (item.Tags ? String(item.Tags).split(',').map(t => t.trim()).filter(Boolean) : []);

            const idVal = item.id || item.Id || `game-${idx}`;
            return {
                id: idVal,
                title: item.Title ? item.Title.trim() : (item.title ? item.title.trim() : `Untitled Game ${idx + 1}`),
                description: item.Description || item.description || "",
                instructions: item.Instructions || item.instructions || "",
                play: item.Play || item.play || item.Url || item.url || "",
                url: `./game.html?id=${encodeURIComponent(idVal)}`,
                category: category,
                categoryKey: normalizeKey(category),
                tags: tagsArray.map(t => String(t).toLowerCase()),
                thumb: item.Image || item.thumb || item.thumbnail || 'https://placehold.co/400x400/12141f/00ffcc?text=Bekeirat+Game'
            };
        });

        if (globalCatalog.length > 0) {
            await setCachedData(globalCatalog);
        }
    } else {
        globalCatalog = generateMockGames();
    }

    dataCache = {};
}

/* -----------------------
   Sidebar Categories
   ----------------------- */
function populateCategoryMenu() {
    const nav = document.getElementById('category-menu');
    if (!nav) return;

    const counts = globalCatalog.reduce((acc, g) => {
        const key = g.categoryKey || 'arcade';
        acc[key] = acc[key] || { name: g.category || 'Arcade', count: 0 };
        acc[key].count++;
        return acc;
    }, {});

    const categories = Object.entries(counts)
        .map(([key, info]) => ({ key, name: info.name, count: info.count }))
        .sort((a, b) => b.count - a.count);

    nav.innerHTML = '';
    nav.appendChild(createCategoryButton('all', 'All Games', globalCatalog.length, true));

    for (const cat of categories) {
        if (cat.key === 'all') continue;
        nav.appendChild(createCategoryButton(cat.key, cat.name, cat.count, false));
    }
}

function createCategoryButton(categoryKey, label, count, isActive = false) {
    const btn = document.createElement('button');
    btn.type = 'button';
    btn.className = `cat-btn w-full flex items-center justify-between px-3.5 py-2.5 rounded-xl text-xs sm:text-sm font-semibold text-gray-300 hover:bg-slate-800/80 border border-transparent transition-all group ${isActive ? 'active' : ''}`;
    
    const emoji = getCategoryEmoji(label || categoryKey);
    btn.innerHTML = `
        <div class="flex items-center gap-2.5">
            <div class="icon-box p-1.5 rounded-lg bg-slate-800 text-gray-400 group-hover:text-cyan-400 transition-colors flex items-center justify-center">
                ${emoji}
            </div>
            <span class="truncate">${escapeHtml(label)}</span>
        </div>
        <span class="text-[11px] px-2 py-0.5 rounded-full bg-slate-800 text-gray-400 font-mono font-bold group-hover:text-cyan-400">${count.toLocaleString()}</span>
    `;

    btn.dataset.category = normalizeKey(categoryKey);
    btn.addEventListener('click', () => switchCategory(btn.dataset.category, btn));

    return btn;
}

function switchCategory(category, element = null) {
    activeCategory = normalizeKey(category || 'all');
    activeSubCategory = 'all';
    currentPage = 1;

    document.querySelectorAll('#category-menu .cat-btn').forEach(btn => btn.classList.remove('active'));
    if (element) {
        element.classList.add('active');
    } else {
        const match = document.querySelector(`#category-menu .cat-btn[data-category="${activeCategory}"]`);
        if (match) match.classList.add('active');
    }

    if (!dataCache[activeCategory]) {
        dataCache[activeCategory] = (activeCategory === 'all')
            ? globalCatalog.slice()
            : globalCatalog.filter(g => normalizeKey(g.category) === activeCategory);
    }

    currentDataset = shuffleArray(dataCache[activeCategory].slice());
    buildSubCategoryTags();
    renderGrid();
}

/* -----------------------
   Subcategory Tags
   ----------------------- */
function buildSubCategoryTags() {
    const tagsContainer = document.getElementById('tags-filter-bar');
    if (!tagsContainer) return;
    tagsContainer.innerHTML = '';

    const tagCounts = {};
    currentDataset.forEach(game => {
        if (Array.isArray(game.tags)) {
            game.tags.forEach(tag => {
                if (tag) tagCounts[tag] = (tagCounts[tag] || 0) + 1;
            });
        }
    });

    const sortedTags = Object.keys(tagCounts).sort((a, b) => tagCounts[b] - tagCounts[a]).slice(0, 12);

    const allBtn = document.createElement('button');
    allBtn.className = `tag-pill active px-3 py-1.5 rounded-xl text-xs font-bold whitespace-nowrap border border-slate-700 bg-slate-800 text-gray-200 hover:bg-slate-700 transition-all capitalize`;
    allBtn.textContent = 'All Types';
    allBtn.onclick = () => filterSubCategory('all', allBtn);
    tagsContainer.appendChild(allBtn);

    sortedTags.forEach(tag => {
        const btn = document.createElement('button');
        btn.className = 'tag-pill px-3 py-1.5 rounded-xl text-xs font-semibold whitespace-nowrap border border-slate-700/60 bg-slate-900/90 text-gray-300 hover:bg-slate-800 transition-all capitalize';
        btn.textContent = `${tag} (${tagCounts[tag]})`;
        btn.onclick = () => filterSubCategory(tag, btn);
        tagsContainer.appendChild(btn);
    });
}

function filterSubCategory(tag, element) {
    activeSubCategory = tag;
    currentPage = 1;

    if (element && element.parentElement) {
        Array.from(element.parentElement.children).forEach(child => child.classList.remove('active'));
        element.classList.add('active');
    }

    renderGrid();
}

function handleSearch(query) {
    searchQuery = String(query || '').toLowerCase().trim();
    currentPage = 1;
    renderGrid();
}

function getFilteredData() {
    return currentDataset.filter(game => {
        const matchesSubCat = (activeSubCategory === 'all' || (Array.isArray(game.tags) && game.tags.includes(activeSubCategory)));
        const matchesSearch = searchQuery === '' ||
            game.title.toLowerCase().includes(searchQuery) ||
            (Array.isArray(game.tags) && game.tags.some(t => t.includes(searchQuery)));
        return matchesSubCat && matchesSearch;
    });
}

/* -----------------------
   Grid & Page Rendering
   ----------------------- */
function renderGrid() {
    const gridContainer = document.getElementById('main-games-grid');
    if (!gridContainer) return;

    const filtered = getFilteredData();
    const totalItems = filtered.length;
    const totalPages = Math.max(1, Math.ceil(totalItems / CONFIG.itemsPerPage));
    if (currentPage > totalPages) currentPage = totalPages;

    const startIndex = (currentPage - 1) * CONFIG.itemsPerPage;
    const endIndex = Math.min(startIndex + CONFIG.itemsPerPage, totalItems);
    const pageItems = filtered.slice(startIndex, endIndex);

    const totalEl = document.getElementById('total-games-count');
    const startEl = document.getElementById('page-start-idx');
    const endEl = document.getElementById('page-end-idx');
    if (totalEl) totalEl.textContent = totalItems.toLocaleString();
    if (startEl) startEl.textContent = totalItems > 0 ? (startIndex + 1).toLocaleString() : 0;
    if (endEl) endEl.textContent = endIndex.toLocaleString();

    gridContainer.innerHTML = '';
    if (pageItems.length === 0) {
        gridContainer.innerHTML = `<div class="col-span-full py-16 text-center text-gray-400 bg-[#12141f] rounded-2xl border border-slate-800"><i class="fa-solid fa-gamepad text-4xl mb-3 text-slate-600"></i><p class="text-sm font-medium">No games match your query.</p></div>`;
        renderPagination(1);
        return;
    }

    const fragment = document.createDocumentFragment();
    pageItems.forEach(game => {
        const card = document.createElement('a');
        card.href = game.url;
        card.className = 'game-card group cursor-pointer bg-[#12141f] rounded-2xl overflow-hidden border border-slate-800/90 hover:border-cyan-500/50 transition-all duration-300 flex flex-col shadow-lg relative';
        
        // Cache single game details to sessionStorage for instant loading in game.html
        card.addEventListener('click', () => {
            try {
                sessionStorage.setItem('current_game_data', JSON.stringify(game));
            } catch (e) {}
        });

        card.innerHTML = `
            <div class="game-thumb-container relative w-full aspect-square overflow-hidden bg-slate-950">
                <img src="${escapeHtml(game.thumb)}" alt="${escapeHtml(game.title)}" loading="lazy" decoding="async"
                     class="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500 ease-out"
                     onerror="this.src='https://placehold.co/400x400/12141f/00ffcc?text=${encodeURIComponent(game.title)}'">
                <div class="absolute inset-0 bg-gradient-to-t from-[#12141f] via-transparent to-transparent opacity-80"></div>
                <span class="absolute top-2.5 right-2.5 text-[10px] font-bold px-2 py-0.5 rounded-md bg-black/60 backdrop-blur-md text-cyan-400 border border-cyan-500/30 capitalize">${escapeHtml(game.category)}</span>
            </div>
            <div class="p-3 bg-[#12141f] flex items-center justify-between flex-1">
                <h3 class="font-bold text-xs sm:text-sm text-gray-200 group-hover:text-cyan-400 transition-colors truncate" title="${escapeHtml(game.title)}">${escapeHtml(game.title)}</h3>
                <div class="p-1.5 rounded-lg bg-slate-800 group-hover:bg-cyan-500/20 text-gray-400 group-hover:text-cyan-400 transition-all shrink-0">
                    <i class="fa-solid fa-play text-[10px]"></i>
                </div>
            </div>
        `;
        fragment.appendChild(card);
    });

    gridContainer.appendChild(fragment);
    renderPagination(totalPages);
}

function renderPagination(totalPages) {
    const container = document.getElementById('pagination-controls');
    if (!container) return;
    container.innerHTML = '';
    if (totalPages <= 1) return;

    const createBtn = (label, page, isActive = false, isDisabled = false) => {
        const btn = document.createElement('button');
        btn.innerHTML = label;
        btn.disabled = isDisabled;
        let baseClass = "px-3 py-1.5 rounded-xl text-xs font-semibold transition-all ";
        if (isDisabled) baseClass += "bg-slate-900 text-slate-600 cursor-not-allowed border border-slate-800";
        else if (isActive) baseClass += "bg-cyan-500 text-slate-950 font-bold shadow-lg shadow-cyan-500/20";
        else baseClass += "bg-[#12141f] text-gray-300 hover:bg-slate-800 hover:text-white border border-slate-800";
        btn.className = baseClass;
        btn.onclick = () => {
            if (!isDisabled && page !== currentPage) {
                currentPage = page;
                renderGrid();
                window.scrollTo({ top: 0, behavior: 'smooth' });
            }
        };
        return btn;
    };

    container.appendChild(createBtn('&laquo; Prev', currentPage - 1, false, currentPage === 1));

    const maxVisible = 5;
    let startPage = Math.max(1, currentPage - Math.floor(maxVisible / 2));
    let endPage = Math.min(totalPages, startPage + maxVisible - 1);
    if (endPage - startPage + 1 < maxVisible) startPage = Math.max(1, endPage - maxVisible + 1);

    for (let p = startPage; p <= endPage; p++) {
        container.appendChild(createBtn(p.toString(), p, p === currentPage));
    }

    container.appendChild(createBtn('Next &raquo;', currentPage + 1, false, currentPage === totalPages));
}

function reshuffleGrid() {
    if (dataCache[activeCategory]) {
        currentDataset = shuffleArray(dataCache[activeCategory].slice());
        currentPage = 1;
        buildSubCategoryTags();
        renderGrid();
    }
}

function escapeHtml(s) {
    return String(s || '')
        .replaceAll('&', '&amp;')
        .replaceAll('<', '&lt;')
        .replaceAll('>', '&gt;')
        .replaceAll('"', '&quot;')
        .replaceAll("'", '&#39;');
}

function generateMockGames() {
    const cats = ['puzzle', 'arcade', 'action', 'racing', 'girls'];
    const games = [];
    for (let i = 1; i <= 30; i++) {
        const cat = cats[i % cats.length];
        const id = `${cat}-game-${i}`;
        games.push({
            id,
            title: `${cat.toUpperCase()} Game ${i}`,
            description: `Play ${cat} game ${i} instantly in browser.`,
            url: `./game.html?id=${id}`,
            category: cat,
            categoryKey: normalizeKey(cat),
            tags: [cat, 'featured'],
            thumb: `https://picsum.photos/seed/${cat}-${i}/400/400`
        });
    }
    return games;
}