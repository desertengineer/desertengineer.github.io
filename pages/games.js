// games.js — updated: tag color gradients + sidebar category emojis
//
// Changes in this version:
// - Sidebar category buttons now show representative emojis (getCategoryEmoji).
// - Tag pill buttons receive dynamic gradient colors computed from the tag text.
// - When a tag is selected, inline gradients are cleared so the active CSS style applies.
// - Small cleanups to ensure gradients reapply correctly when switching tags/categories.
//
// Drop this file in place of the existing games.js.

const CONFIG = {
    // Candidate master data file locations (ordered). The code will pick the first successful file.
    dataPaths: ['../data/all.json'],
    itemsPerPage: 60,
    defaultCategory: 'all'
};

let dataCache = {};           // keyed by normalized category -> array of games (cached filtered arrays)
let globalCatalog = [];       // full list of games loaded from the master JSON
let currentDataset = [];      // dataset currently used for the grid (filtered by category + shuffle)
let activeCategory = 'all';   // normalized
let activeSubCategory = 'all';
let searchQuery = '';
let currentPage = 1;

/* -----------------------
   Utility helpers
   ----------------------- */
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

/* -----------------------
   Visual helpers
   ----------------------- */

// Map category keys or names to a representative emoji.
// This is intentionally forgiving: it checks the normalized key and label (both lowercased).
function getCategoryEmoji(categoryKeyOrLabel) {
    const s = normalizeKey(categoryKeyOrLabel || '');
    // Common mappings - extend as needed
    const map = {
        'all': '🌐',
        'puzzle': '🧩',
        'match-3': '💎',
        'jigsaw': '🧩',
        'arcade': '🕹️',
        'action': '⚔️',
        'adventure': '🗺️',
        'racing': '🏎️',
        'racing & driving': '🚗',
        'sports': '🏅',
        'football': '⚽',
        'soccer': '⚽',
        'basketball': '🏀',
        'girls': '👗',
        'kids': '🧒',
        'multiplayer': '👥',
        '.io': '🌐',
        'io': '🌐',
        '3d': '🎮',
        'shooter': '🔫',
        'shooting': '🔫',
        'horror': '👻',
        'strategy': '🧠',
        'simulation': '⚙️',
        'puzzle': '🧩',
        'idle': '😌',
        'casual': '☕',
        'arcade': '🕹️',
        'boardgames': '🎲',
        'cards': '🃏',
        'racing & driving': '🚘',
        'racing & driving': '🚘',
        'jigsaw': '🧩',
        'match': '🔗',
        'quiz': '❓',
        'music': '🎵',
        'platform': '🧗',
        'animal': '🐾',
        'animals': '🐾',
        'cooking': '🍳',
        'dress-up': '👗',
        'funny': '🤣',
        'zombie': '🧟',
        'default': '🎮'
    };
    // direct lookup
    if (map[s]) return map[s];
    // partial matches for broader grouping
    if (s.includes('puzzle') || s.includes('jigsaw')) return '🧩';
    if (s.includes('racing') || s.includes('driving')) return '🏎️';
    if (s.includes('sport') || s.includes('football') || s.includes('soccer') || s.includes('basketball')) return '🏅';
    if (s.includes('girl') || s.includes('make-up') || s.includes('dress')) return '👗';
    if (s.includes('music')) return '🎵';
    if (s.includes('arcade') || s.includes('hypercasual')) return '🕹️';
    if (s.includes('io') || s.includes('.io')) return '🌐';
    if (s.includes('shooter') || s.includes('gun')) return '🔫';
    if (s.includes('horror') || s.includes('zombie')) return '👻';
    if (s.includes('kids') || s.includes('baby')) return '🧒';
    return map['default'];
}

// Produce a pleasant linear-gradient CSS value for a given tag string.
// We'll hash the tag into a hue and create a gentle two-color gradient.
function tagGradient(tag) {
    const s = String(tag || '');
    let h = 0;
    for (let i = 0; i < s.length; i++) {
        h = (h << 5) - h + s.charCodeAt(i);
        h = h & h;
    }
    const hue = Math.abs(h) % 360;
    const hue2 = (hue + 36) % 360;
    // darker saturation and lightness than before
    return `linear-gradient(90deg, hsl(${hue} 62% 36%), hsl(${hue2} 58% 40%))`;
}

/* -----------------------
   Initialization
   ----------------------- */
document.addEventListener('DOMContentLoaded', async () => {
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

    // Sidebar top offset for sticky sidebar
    function updateSidebarTopOffset() {
        const nav = document.querySelector('nav.navbar');
        const topOffset = nav ? (nav.getBoundingClientRect().height + 12) : 16;
        document.documentElement.style.setProperty('--sidebar-top', `${topOffset}px`);
    }
    updateSidebarTopOffset();
    window.addEventListener('resize', updateSidebarTopOffset);
    window.addEventListener('orientationchange', updateSidebarTopOffset);

    // Load master data, build categories and render initial view
    await loadMasterData();
    populateCategoryMenu();
    // default view
    switchCategory(CONFIG.defaultCategory);
});

/* -----------------------
   Master data loader
   ----------------------- */
async function loadMasterData() {

    const fetchPromises = CONFIG.dataPaths.map(path =>
        fetch(path).then(res => {
            if (!res.ok) throw new Error(`Failed to load ${path}`);
            return res.json();
        })
    );

    let rawData = null;
    try {
        rawData = await Promise.any(fetchPromises);
    } catch (e) {
        rawData = null;
    }

    if (rawData && Array.isArray(rawData)) {
        globalCatalog = rawData.map((item, idx) => {
            const categoryRaw = item.Category ?? item.category ?? item.cat ?? 'uncategorized';
            const category = String(categoryRaw).trim() || 'uncategorized';
            const tagsArray = Array.isArray(item.Tags)
                ? item.Tags.map(t => String(t).trim()).filter(Boolean)
                : (item.Tags ? String(item.Tags).split(',').map(t => t.trim()).filter(Boolean) : []);
            return {
                id: item.id || item.Id || `game-${idx}`,
                title: item.Title ? item.Title.trim() : (item.title ? item.title.trim() : `Untitled Game ${idx + 1}`),
                description: item.Description || item.description || "",
                instructions: item.Instructions || item.instructions || "",
                play: item.Play || item.play || "",
                url: item.Url || item.url || item.gameUrl || `./game.html?id=${encodeURIComponent(item.id || idx)}`,
                category: category,
                categoryKey: normalizeKey(category),
                tags: tagsArray.map(t => String(t).toLowerCase()),
                thumb: item.Image || item.thumb || item.thumbnail || item.image || 'https://placehold.co/400x300/12141f/00ffcc?text=Bekeirat+Game',
                width: item.Width || item.width || "1280",
                height: item.Height || item.height || "720",
                video: item.Video || item.video || "",
                gender: item.Gender || item.gender || "",
                languages: item.Languages || item.languages || "",
                embed: item.Embed || item.embed || ""
            };
        });
    } else {
        globalCatalog = generateMockGames();
    }

    dataCache = {};
}

/* -----------------------
   Sidebar / category menu generation
   ----------------------- */
function populateCategoryMenu() {
    const nav = document.getElementById('category-menu');
    if (!nav) return;

    // Compute category counts
    const counts = globalCatalog.reduce((acc, g) => {
        const key = g.categoryKey || 'uncategorized';
        acc[key] = acc[key] || { name: g.category || 'Uncategorized', count: 0 };
        acc[key].count++;
        return acc;
    }, {});

    // Sort categories: All first, then by count desc, then alphabetically
    const categories = Object.entries(counts)
        .map(([key, info]) => ({ key, name: info.name, count: info.count }))
        .sort((a, b) => {
            if (a.key === 'all') return -1;
            if (b.key === 'all') return 1;
            // primary by count desc
            if (b.count !== a.count) return b.count - a.count;
            return a.name.localeCompare(b.name);
        });

    // Clear the existing nav (this will remove the static buttons in current HTML)
    nav.innerHTML = '';

    // Add "All Games" button
    const allBtn = createCategoryButton('all', 'All Games', globalCatalog.length, true);
    nav.appendChild(allBtn);

    // Add top N categories (or all)
    const maxToShow = 200; // generous
    const toShow = categories.slice(0, maxToShow);

    for (const cat of toShow) {
        // Skip if category key is 'all' (we already rendered All)
        if (normalizeKey(cat.key) === 'all') continue;
        const btn = createCategoryButton(cat.key, cat.name, cat.count, false);
        nav.appendChild(btn);
    }
}

function createCategoryButton(categoryKey, label, count, isActive = false) {
    const btn = document.createElement('button');
    btn.className = `cat-btn w-full flex items-center justify-between px-3.5 py-2.5 rounded-xl text-sm font-semibold text-gray-300 hover:bg-gray-800/80 border border-transparent transition-all group`;
    if (isActive) btn.classList.add('active');

    const displayLabel = `${label}`;
    const left = document.createElement('div');
    left.className = 'flex items-center gap-3';
    const iconBox = document.createElement('div');
    iconBox.className = 'icon-box p-2 rounded-lg bg-gray-800/80 text-gray-400 group-hover:text-cyan-400 group-hover:bg-cyan-500/10 transition-all';

    // Emoji based on category (use label first, fallback to categoryKey)
    const emoji = getCategoryEmoji(label) || getCategoryEmoji(categoryKey);
    iconBox.textContent = emoji; // emoji shown only here (icon box)

    left.appendChild(iconBox);
    const span = document.createElement('span');
    span.textContent = displayLabel; // label WITHOUT emoji to avoid duplication
    left.appendChild(span);

    const right = document.createElement('span');
    right.className = 'text-xs px-2 py-0.5 rounded-full bg-gray-800/80 text-gray-400 font-mono font-bold group-hover:text-cyan-400';
    right.textContent = String(count).toLocaleString();

    btn.appendChild(left);
    btn.appendChild(right);

    // data attribute holds original category key
    btn.dataset.category = normalizeKey(label === 'All Games' ? 'all' : categoryKey);

    btn.addEventListener('click', function () {
        switchCategory(btn.dataset.category, btn);
    });

    return btn;
}

/* -----------------------
   Category switching & filtering
   ----------------------- */
function switchCategory(category, element = null) {
    if (!category) category = 'all';
    activeCategory = normalizeKey(category);
    activeSubCategory = 'all';
    currentPage = 1;

    // Update active class on sidebar buttons
    document.querySelectorAll('#category-menu .cat-btn').forEach(btn => btn.classList.remove('active'));
    if (element instanceof Element) {
        element.classList.add('active');
    } else {
        // find button by dataset
        const btn = document.querySelector(`#category-menu .cat-btn[data-category="${activeCategory}"]`);
        if (btn) btn.classList.add('active');
    }

    // If we've cached the filtered dataset for this category, use it
    if (dataCache[activeCategory]) {
        currentDataset = shuffleArray(dataCache[activeCategory].slice());
        buildSubCategoryTags();
        renderGrid();
        return;
    }

    // Build the filtered data by scanning globalCatalog
    let filtered;
    if (activeCategory === 'all') {
        filtered = globalCatalog.slice();
    } else {
        filtered = globalCatalog.filter(g => normalizeKey(g.category) === activeCategory);
    }

    // Cache it for faster subsequent switches
    dataCache[activeCategory] = filtered.slice();
    currentDataset = shuffleArray(filtered.slice());

    buildSubCategoryTags();
    renderGrid();
}

/* -----------------------
   Sub-category tags (unchanged logic, uses currentDataset)
   ----------------------- */
function buildSubCategoryTags() {
    const tagsContainer = document.getElementById('tags-filter-bar');
    if (!tagsContainer) return;
    tagsContainer.innerHTML = '';

    const tagCounts = {};
    currentDataset.forEach(game => {
        if (Array.isArray(game.tags)) {
            game.tags.forEach(tag => {
                if (!tag) return;
                tagCounts[tag] = (tagCounts[tag] || 0) + 1;
            });
        }
    });

    const sortedTags = Object.keys(tagCounts).sort((a, b) => tagCounts[b] - tagCounts[a]).slice(0, 15);
    if (sortedTags.length === 0) {
        const allBtn = document.createElement('button');
        allBtn.className = `tag-pill px-3.5 py-1.5 rounded-xl text-xs font-semibold whitespace-nowrap transition-all border capitalize active bg-cyan-500/20 text-cyan-300 border-cyan-500/40 shadow-sm`;
        allBtn.textContent = 'All Sub-types';
        allBtn.onclick = () => filterSubCategory('all', allBtn);
        tagsContainer.appendChild(allBtn);
        return;
    }

    const allBtn = document.createElement('button');
    allBtn.className = `tag-pill px-3.5 py-1.5 rounded-xl text-xs font-semibold whitespace-nowrap transition-all border capitalize ${activeSubCategory === 'all' ? 'active bg-cyan-500/20 text-cyan-300 border-cyan-500/40 shadow-sm' : 'bg-gray-800/80 text-gray-400 hover:bg-gray-700/80 border-gray-700/60'}`;
    allBtn.textContent = 'All Sub-types';
    allBtn.onclick = () => filterSubCategory('all', allBtn);
    tagsContainer.appendChild(allBtn);

    sortedTags.forEach(tag => {
        const btn = document.createElement('button');
        btn.className = 'tag-pill px-3.5 py-1.5 rounded-xl text-xs font-semibold bg-gray-800/80 text-gray-400 hover:bg-gray-700/80 border border-gray-700/60 whitespace-nowrap transition-all capitalize';
        btn.textContent = `${tag} (${tagCounts[tag]})`;

        // create darker gradient and add a dark overlay at top for richer/darker look
        const grad = tagGradient(tag);
        const darkOverlay = 'linear-gradient(rgba(0,0,0,0.26), rgba(0,0,0,0.26))';
        const composed = `${darkOverlay}, ${grad}`;

        btn.dataset.grad = composed;
        btn.style.backgroundImage = composed;
        btn.style.color = '#e6fff9';
        btn.style.border = '1px solid rgba(255,255,255,0.04)';

        btn.onclick = () => filterSubCategory(tag, btn);
        tagsContainer.appendChild(btn);
    });
}

function filterSubCategory(tag, element) {
    activeSubCategory = tag;
    currentPage = 1;

    if (!element || !element.parentElement) return;

    Array.from(element.parentElement.children).forEach(child => {
        // base class
        child.className = 'tag-pill px-3.5 py-1.5 rounded-xl text-xs font-semibold bg-gray-800/80 text-gray-400 hover:bg-gray-700/80 border border-gray-700/60 whitespace-nowrap transition-all capitalize';
        // restore gradient if present
        if (child.dataset && child.dataset.grad) {
            child.style.backgroundImage = child.dataset.grad;
            child.style.color = '#e6fff9';
        } else {
            child.style.backgroundImage = '';
            child.style.color = '';
        }
    });

    // Active: use CSS .tag-pill.active look (clear inline gradient)
    element.className = 'tag-pill active px-3.5 py-1.5 rounded-xl text-xs font-bold bg-cyan-500/20 text-cyan-300 border border-cyan-500/40 whitespace-nowrap transition-all capitalize';
    element.style.backgroundImage = '';
    element.style.color = '';

    renderGrid();
}

/* -----------------------
   Search, filtering and grid rendering
   ----------------------- */
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
        renderEmptyState('No games found matching your search or category criteria.');
        renderPagination(1);
        return;
    }

    const fragment = document.createDocumentFragment();

    pageItems.forEach(game => {
        const card = document.createElement('a');
        card.href = `game.html?id=${encodeURIComponent(game.id)}`;
        card.addEventListener('click', () => {
            try { sessionStorage.setItem('current_game_data', JSON.stringify(game)); } catch (e) { /* ignore */ }
        });

        card.className = 'game-card group cursor-pointer bg-[#12141f] rounded-2xl overflow-hidden border border-gray-800/90 hover:border-cyan-500/50 transition-all duration-300 flex flex-col shadow-lg relative';

        const thumbSrc = game.thumb || 'https://placehold.co/400x400/12141f/00ffcc?text=Bekeirat+Game';

        card.innerHTML = `
            <div class="game-thumb-container relative w-full aspect-square overflow-hidden bg-[#0a0b10]">
                <img src="${thumbSrc}"
                     alt="${escapeHtml(game.title)}"
                     loading="lazy"
                     decoding="async"
                     class="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500 ease-out"
                     onerror="this.src='https://placehold.co/400x400/12141f/00ffcc?text=${encodeURIComponent(game.title)}'"/>
                <div class="absolute inset-0 bg-gradient-to-t from-[#12141f] via-transparent to-transparent opacity-80"></div>
                <span class="absolute top-2.5 right-2.5 text-[10px] font-bold px-2 py-0.5 rounded-md bg-black/60 backdrop-blur-md text-cyan-400 border border-cyan-500/30 capitalize">
                    ${escapeHtml(game.category)}
                </span>
            </div>
            <div class="p-3.5 bg-[#12141f] flex items-center justify-between flex-1">
                <h3 class="font-bold text-xs sm:text-sm text-gray-200 group-hover:text-cyan-400 transition-colors truncate" title="${escapeHtml(game.title)}">
                    ${escapeHtml(game.title)}
                </h3>
                <div class="p-1.5 rounded-lg bg-gray-800/80 group-hover:bg-cyan-500/20 text-gray-400 group-hover:text-cyan-400 transition-all">
                    <svg class="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M14.752 11.168l-3.197-2.132A1 1 0 0010 9.87v4.263a1 1 0 001.555.832l3.197-2.132a1 1 0 000-1.664z"/></svg>
                </div>
            </div>
        `;

        fragment.appendChild(card);
    });

    gridContainer.appendChild(fragment);
    renderPagination(totalPages);
}

/* -----------------------
   Pagination & UI helpers (unchanged logic)
   ----------------------- */
function renderPagination(totalPages) {
    const container = document.getElementById('pagination-controls');
    if (!container) return;
    container.innerHTML = '';

    if (totalPages <= 1) return;

    const createBtn = (label, page, isActive = false, isDisabled = false) => {
        const btn = document.createElement('button');
        btn.innerHTML = label;
        btn.disabled = isDisabled;

        let baseClass = "px-3.5 py-1.5 rounded-xl text-xs font-semibold transition-all ";
        if (isDisabled) {
            baseClass += "bg-gray-900 text-gray-600 cursor-not-allowed border border-gray-800";
        } else if (isActive) {
            baseClass += "bg-cyan-500 text-black font-bold shadow-lg shadow-cyan-500/20";
        } else {
            baseClass += "bg-[#12141f] text-gray-300 hover:bg-gray-800 hover:text-white border border-gray-800/90";
        }

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

    container.appendChild(createBtn('&laquo; First', 1, false, currentPage === 1));
    container.appendChild(createBtn('&lsaquo; Prev', currentPage - 1, false, currentPage === 1));

    const maxVisiblePages = 5;
    let startPage = Math.max(1, currentPage - Math.floor(maxVisiblePages / 2));
    let endPage = Math.min(totalPages, startPage + maxVisiblePages - 1);
    if (endPage - startPage + 1 < maxVisiblePages) {
        startPage = Math.max(1, endPage - maxVisiblePages + 1);
    }

    for (let p = startPage; p <= endPage; p++) {
        container.appendChild(createBtn(p.toString(), p, p === currentPage));
    }

    container.appendChild(createBtn('Next &rsaquo;', currentPage + 1, false, currentPage === totalPages));
    container.appendChild(createBtn('Last &raquo;', totalPages, false, currentPage === totalPages));
}

/* -----------------------
   Loading / empty UI
   ----------------------- */
function showLoadingState() {
    const grid = document.getElementById('main-games-grid');
    if (!grid) return;
    grid.innerHTML = `
        <div class="col-span-full py-16 text-center text-gray-400">
            <div class="inline-block animate-spin rounded-full h-8 w-8 border-2 border-cyan-400 border-t-transparent mb-3"></div>
            <p class="text-sm font-semibold text-gray-300">Loading Games Grid...</p>
        </div>
    `;
}

function renderEmptyState(message) {
    const grid = document.getElementById('main-games-grid');
    if (!grid) return;
    grid.innerHTML = `
        <div class="col-span-full py-12 text-center text-gray-400 bg-[#12141f] rounded-2xl border border-gray-800">
            <svg class="w-12 h-12 mx-auto text-gray-600 mb-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"></path>
            </svg>
            <p class="text-sm font-medium text-gray-300 px-4">${escapeHtml(message)}</p>
        </div>
    `;
}

/* -----------------------
   Small helpers
   ----------------------- */
function escapeHtml(s) {
    return String(s || '')
        .replaceAll('&', '&amp;')
        .replaceAll('<', '&lt;')
        .replaceAll('>', '&gt;')
        .replaceAll('"', '&quot;')
        .replaceAll("'", '&#39;');
}

/* -----------------------
   Mock data generator (fallback)
   ----------------------- */
function generateMockGames(category = 'all') {
    const categories = ['multiplayer', 'action', 'shooting', 'adventure', 'strategy', 'sports', 'racing', 'simulation', '2-player', '3d', 'battle', 'stickman', 'io', 'puzzle', 'match-3', 'hypercasual', 'casual', 'arcade', 'skill', 'clicker', 'merge', 'football', 'soccer', 'basketball', 'boardgames', 'cards', 'mahjong', 'bejeweled', 'bubble-shooter', 'jigsaw', 'boys', 'girls', 'dress-up', 'cooking', 'care', 'baby-hazel', 'art', 'kids', 'educational', 'quiz', 'agility', 'mouse'];
    const games = [];
    const count = 30;

    for (let i = 1; i <= count; i++) {
        const catName = category === 'all' ? categories[Math.floor(Math.random() * categories.length)] : category;
        const id = `${catName}-game-${i}`;
        games.push({
            id,
            title: `${catName.charAt(0).toUpperCase() + catName.slice(1)} Quest ${i}`,
            description: `Experience thrilling non-stop ${catName} gameplay directly in your browser.`,
            url: '#',
            category: catName,
            categoryKey: normalizeKey(catName),
            tags: [catName, i % 2 === 0 ? 'arcade' : 'classic', i % 3 === 0 ? 'popular' : 'new'],
            thumb: `https://picsum.photos/seed/${catName}-${i}/400/400`,
            embed: ''
        });
    }
    return games;
}