const CONFIG = {
    dataPaths: [],
    itemsPerPage: 24,
    defaultCategory: 'all',
    virtualScrollThreshold: 12
};

let dataCache = {};
let globalCatalog = [];
let currentDataset = [];
let activeCategory = 'all';
let activeSubCategory = 'all';
let searchQuery = '';
let currentPage = 1;
let observer = null;

const CACHE_CONFIG = {
    key: 'bekeiratGamesData',
    ttl: 24 * 60 * 60 * 1000,
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
        'sports': '🏀', 'football': '⚽', 'soccer': '⚽', 'basketball': '🏀',
        'girls': '👗', 'kids': '🧒', 'multiplayer': '👥', 'io': '🌐',
        '3d': '🎮', 'shooter': '🔫', 'horror': '👻', 'strategy': '🧠',
        'simulation': '⚙️', 'idle': '😊', 'casual': '☕', 'boardgames': '🎲',
        'cards': '🃏', 'quiz': '❓', 'music': '🎵', 'platform': '🧱',
        'animals': '🐾', 'cooking': '🍳', 'dress-up': '👗', 'zombie': '🧟',
        'default': '🎮'
    };

    if (map[s]) return map[s];
    if (s.includes('puzzle') || s.includes('jigsaw')) return '🧩';
    if (s.includes('racing') || s.includes('driving')) return '🏎️';
    if (s.includes('sport') || s.includes('football') || s.includes('soccer') || s.includes('basketball')) return '🏀';
    if (s.includes('girl') || s.includes('dress') || s.includes('make-up')) return '👗';
    if (s.includes('music')) return '🎵';
    if (s.includes('arcade') || s.includes('hypercasual')) return '🕹️';
    if (s.includes('io') || s.includes('.io')) return '🌐';
    if (s.includes('shooter') || s.includes('gun')) return '🔫';
    if (s.includes('horror') || s.includes('zombie')) return '👻';
    if (s.includes('kids') || s.includes('baby')) return '🧒';
    return map['default'];
}

function tagGradient(tag) {
    const s = String(tag || '');
    let h = 0;
    for (let i = 0; i < s.length; i++) {
        h = (h << 5) - h + s.charCodeAt(i);
        h = h & h;
    }
    const hue = Math.abs(h) % 360;
    const hue2 = (hue + 36) % 360;
    return 'linear-gradient(90deg, hsl(' + hue + ' 60% 34%), hsl(' + hue2 + ' 56% 38%))';
}

function getCachedData() {
    if (!CACHE_CONFIG.enabled) return null;
    try {
        const cached = localStorage.getItem(CACHE_CONFIG.key);
        if (cached) {
            const { data, timestamp } = JSON.parse(cached);
            if (Date.now() - timestamp < CACHE_CONFIG.ttl) {
                return data;
            }
        }
    } catch (e) {
        console.warn('[Games Page] Cache read error:', e);
    }
    return null;
}

function setCachedData(data) {
    if (!CACHE_CONFIG.enabled) return;
    try {
        localStorage.setItem(CACHE_CONFIG.key, JSON.stringify({
            data,
            timestamp: Date.now()
        }));
    } catch (e) {
        console.warn('[Games Page] Cache write error:', e);
    }
}

document.addEventListener('DOMContentLoaded', async () => {
    const yearSpan = document.getElementById('current-year');
    if (yearSpan) yearSpan.textContent = new Date().getFullYear();

    const hamburgerBtn = document.getElementById('hamburger-btn');
    const mobileMenu = document.getElementById('mobile-menu');
    if (hamburgerBtn && mobileMenu) {
        hamburgerBtn.addEventListener('click', () => mobileMenu.classList.toggle('hidden'));
    }

    function updateSidebarTopOffset() {
        const nav = document.querySelector('nav.navbar');
        const topOffset = nav ? (nav.getBoundingClientRect().height + 12) : 16;
        document.documentElement.style.setProperty('--sidebar-top', String(topOffset) + 'px');
    }

    updateSidebarTopOffset();
    window.addEventListener('resize', updateSidebarTopOffset);
    window.addEventListener('orientationchange', updateSidebarTopOffset);

    initializeDayBasedDataPath();

    await loadMasterData();
    populateCategoryMenu();
    switchCategory(CONFIG.defaultCategory);
    initVirtualScrolling();
});

function initializeDayBasedDataPath() {
    const today = new Date();
    const dayOfWeek = today.getDay();
    const fileNumber = dayOfWeek === 0 ? 7 : dayOfWeek;
    CONFIG.dataPaths = ['../data/all_' + fileNumber + '.json'];
    console.log('[Games Page] Loading day file:', CONFIG.dataPaths[0]);
}

function loadMasterData() {
    return new Promise(async (resolve) => {
        const dayFilePath = CONFIG.dataPaths[0];
        const fallbackPaths = ['../data/all.json', '../all.json'].filter(path => path !== dayFilePath);

        const cachedData = await getCachedData();
        if (cachedData && Array.isArray(cachedData) && cachedData.length > 0) {
            globalCatalog = cachedData.slice(0, 1600);
            resolve();
            return;
        }

        let rawData = null;

        try {
            const res = await fetch(dayFilePath, { cache: 'force-cache', headers: { Accept: 'application/json' } });
            if (res.ok) {
                rawData = await res.json();
            }
        } catch (e) {
            console.warn('[Games Page] Error loading main file:', e);
        }

        if (!rawData || !Array.isArray(rawData)) {
            for (const fallbackPath of fallbackPaths) {
                try {
                    const res = await fetch(fallbackPath, { cache: 'force-cache', headers: { Accept: 'application/json' } });
                    if (res.ok) {
                        rawData = await res.json();
                        break;
                    }
                } catch (e) {}
            }
        }

        if (rawData && Array.isArray(rawData)) {
            globalCatalog = [];

            const chunkSize = 50;
            for (let i = 0; i < rawData.length; i += chunkSize) {
                const chunk = rawData.slice(i, i + chunkSize);
                const processed = chunk.map((item, idx) => {
                    const categoryRaw = item.Category ?? item.category ?? item.cat ?? 'uncategorized';
                    const category = String(categoryRaw).trim() || 'uncategorized';
                    const tagsArray = Array.isArray(item.Tags)
                        ? item.Tags.map(t => String(t).trim()).filter(Boolean)
                        : (item.Tags ? String(item.Tags).split(',').map(t => t.trim()).filter(Boolean) : []);

                    return {
                        id: item.id || item.Id || `game-${i}-${idx}`,
                        title: item.Title ? item.Title.trim() : (item.title ? item.title.trim() : 'Untitled Game ' + (i + idx + 1)),
                        description: item.Description || item.description || '',
                        instructions: item.Instructions || item.instructions || '',
                        play: item.Play || item.play || '',
                        url: item.Url || item.url || item.gameUrl || './game.html?id=' + encodeURIComponent(item.id || item.Id || `game-${i}-${idx}`),
                        category: category,
                        categoryKey: normalizeKey(category),
                        tags: tagsArray.map(t => String(t).toLowerCase()),
                        thumb: item.Image || item.thumb || item.thumbnail || item.image || 'https://placehold.co/400x400/1e293b/60a5fa?text=Bekeirat+Game',
                        width: item.Width || item.width || '1280',
                        height: item.Height || item.height || '720',
                        video: item.Video || item.video || '',
                        gender: item.Gender || item.gender || '',
                        languages: item.Languages || item.languages || '',
                        embed: item.Embed || item.embed || ''
                    };
                });

                globalCatalog.push(...processed);
            }

            globalCatalog = globalCatalog.slice(0, 1600);
            setCachedData(globalCatalog);
        }

        resolve();
    });
}

function initVirtualScrolling() {
    if ('IntersectionObserver' in window) {
        observer = new IntersectionObserver((entries) => {
            entries.forEach(entry => {
                if (entry.isIntersecting) {
                    const gameId = entry.target.dataset.gameId;
                    if (gameId) {
                        renderGameCard(entry.target, gameId);
                        observer.unobserve(entry.target);
                    }
                }
            });
        }, {
            threshold: 0.1,
            rootMargin: '50px'
        });
    }
}

function renderGameCard(container, gameId) {
    const game = currentDataset.find(g => String(g.id) === String(gameId));
    if (!game) {
        container.innerHTML = '<div class=\"text-center py-4 text-xs text-gray-500\">Game not found</div>';
        return;
    }

    const thumb = game.thumb || 'https://placehold.co/400x400/1e293b/60a5fa?text=Bekeirat+Game';

    container.innerHTML = `
        <a href="${game.url}" class="game-card group cursor-pointer bg-[#12141f] rounded-2xl overflow-hidden border border-gray-800/90 hover:border-cyan-500/50 transition-all duration-300 flex flex-col">
            <div class="game-thumb-container relative w-full aspect-square overflow-hidden bg-[#0a0b10]">
                <img src="${thumb}" alt="${game.title}" loading="lazy" decoding="async"
                     class="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500 ease-out"
                     onerror="this.src='https://placehold.co/400x400/1e293b/60a5fa?text=${encodeURIComponent(game.title)}'">
                <div class="absolute inset-0 bg-gradient-to-t from-[#12141f] via-transparent to-transparent opacity-80"></div>
                <span class="absolute top-2.5 right-2.5 text-[10px] font-bold px-2 py-0.5 rounded-md bg-black/60 backdrop-blur-md text-cyan-400 border border-cyan-500/30 capitalize">${game.title}</span>
            </div>
            <div class="p-3.5 bg-[#12141f] flex items-center justify-between flex-1">
                <h3 class="font-bold text-xs sm:text-sm text-gray-200 group-hover:text-cyan-400 transition-colors truncate" title="${game.title}">${game.title}</h3>
                <div class="p-1.5 rounded-lg bg-gray-800/80 group-hover:bg-cyan-500/20 text-gray-400 group-hover:text-cyan-400 transition-all">
                    <svg class="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M14.752 11.168l-3.197-2.3" /></svg>
                </div>
            </div>
        </a>
    `;
}

function populateCategoryMenu() {
    const nav = document.getElementById('category-menu');
    if (!nav) return;

    const counts = globalCatalog.reduce((acc, g) => {
        const key = g.categoryKey || 'uncategorized';
        acc[key] = acc[key] || { name: g.category || 'Uncategorized', count: 0 };
        acc[key].count++;
        return acc;
    }, {});

    const categories = Object.entries(counts)
        .map(([key, info]) => ({ key, name: info.name, count: info.count }))
        .sort((a, b) => b.count - a.count || a.name.localeCompare(b.name));

    nav.innerHTML = '';

    const allBtn = createCategoryButton('all', 'All Games', globalCatalog.length, true);
    nav.appendChild(allBtn);

    for (const cat of categories) {
        if (normalizeKey(cat.key) === 'all') continue;
        const btn = createCategoryButton(cat.key, cat.name, cat.count, false);
        nav.appendChild(btn);
    }
}

function createCategoryButton(categoryKey, label, count, isActive = false) {
    const btn = document.createElement('button');
    btn.type = 'button';
    btn.className = 'cat-btn w-full flex items-center justify-between px-3.5 py-2.5 rounded-xl text-sm font-semibold text-gray-300 hover:bg-gray-800/80 border border-transparent transition-all group';
    if (isActive) btn.classList.add('active');

    const left = document.createElement('div');
    left.className = 'flex items-center gap-3';

    const iconBox = document.createElement('div');
    iconBox.className = 'icon-box p-2 rounded-lg bg-gray-800/80 text-gray-400 transition-all flex items-center justify-center';
    const emoji = getCategoryEmoji(label) || getCategoryEmoji(categoryKey);
    iconBox.textContent = emoji;

    const span = document.createElement('span');
    span.textContent = String(label || categoryKey);

    left.appendChild(iconBox);
    left.appendChild(span);

    const right = document.createElement('span');
    right.className = 'text-xs px-2 py-0.5 rounded-full bg-gray-800/80 text-gray-400 font-mono font-bold group-hover:text-cyan-400';
    right.textContent = String(count).toLocaleString();

    btn.appendChild(left);
    btn.appendChild(right);

    btn.dataset.category = normalizeKey(label === 'All Games' ? 'all' : categoryKey);
    btn.setAttribute('aria-pressed', isActive ? 'true' : 'false');
    btn.setAttribute('aria-label', '' + emoji + ' ' + span.textContent);

    btn.addEventListener('click', function () {
        switchCategory(btn.dataset.category, btn);
    });

    return btn;
}

function switchCategory(category, element = null) {
    if (!category) category = 'all';
    activeCategory = normalizeKey(category);
    activeSubCategory = 'all';
    currentPage = 1;

    document.querySelectorAll('#category-menu .cat-btn').forEach(btn => {
        btn.classList.remove('active');
        btn.setAttribute('aria-pressed', 'false');
    });

    if (element instanceof Element) {
        element.classList.add('active');
        element.setAttribute('aria-pressed', 'true');
    } else {
        const btn = document.querySelector('#category-menu .cat-btn[data-category="' + activeCategory + '"]');
        if (btn) {
            btn.classList.add('active');
            btn.setAttribute('aria-pressed', 'true');
        }
    }

    if (dataCache[activeCategory]) {
        currentDataset = shuffleArray(dataCache[activeCategory].slice());
        buildSubCategoryTags();
        renderGrid();
        return;
    }

    const filtered = (activeCategory === 'all') ? globalCatalog.slice() : globalCatalog.filter(g => normalizeKey(g.category) === activeCategory);
    dataCache[activeCategory] = filtered.slice();
    currentDataset = shuffleArray(filtered.slice());

    buildSubCategoryTags();
    renderGrid();
}

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

    const allBtn = document.createElement('button');
    allBtn.type = 'button';
    allBtn.className = 'tag-pill px-3.5 py-1.5 rounded-xl text-xs font-semibold whitespace-nowrap transition-all border capitalize ' + (activeSubCategory === 'all' ? 'active' : '');
    allBtn.textContent = 'All Sub-types';
    allBtn.setAttribute('aria-pressed', activeSubCategory === 'all' ? 'true' : 'false');
    allBtn.onclick = function () {
        filterSubCategory('all', allBtn);
    };
    tagsContainer.appendChild(allBtn);

    if (sortedTags.length === 0) return;

    sortedTags.forEach(tag => {
        const btn = document.createElement('button');
        btn.type = 'button';
        btn.className = 'tag-pill px-3.5 py-1.5 rounded-xl text-xs font-semibold whitespace-nowrap transition-all capitalize';
        btn.textContent = tag + ' (' + tagCounts[tag] + ')';

        const grad = tagGradient(tag);
        const darkOverlay = 'linear-gradient(rgba(0,0,0,0.26), rgba(0,0,0,0.26))';
        const composed = darkOverlay + ', ' + grad;

        btn.dataset.grad = composed;
        btn.style.backgroundImage = composed;
        btn.style.color = '#e6fff9';
        btn.setAttribute('aria-pressed', 'false');

        btn.onclick = function () {
            filterSubCategory(tag, btn);
        };
        tagsContainer.appendChild(btn);
    });
}

function filterSubCategory(tag, element) {
    activeSubCategory = tag;
    currentPage = 1;

    const parent = element.parentElement;
    if (!parent) return;

    Array.from(parent.children).forEach(child => {
        child.className = 'tag-pill px-3.5 py-1.5 rounded-xl text-xs font-semibold whitespace-nowrap transition-all capitalize';
        if (child.dataset && child.dataset.grad) {
            child.style.backgroundImage = child.dataset.grad;
            child.style.color = '#e6fff9';
        } else {
            child.style.backgroundImage = '';
            child.style.color = '';
        }
        child.setAttribute('aria-pressed', 'false');
    });

    element.className = 'tag-pill active px-3.5 py-1.5 rounded-xl text-xs font-bold whitespace-nowrap capitalize';
    element.style.backgroundImage = '';
    element.style.color = '';
    element.setAttribute('aria-pressed', 'true');

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

    if (observer && pageItems.length > CONFIG.virtualScrollThreshold) {
        pageItems.forEach(game => {
            const placeholder = document.createElement('div');
            placeholder.className = 'game-card-placeholder';
            placeholder.dataset.gameId = game.id;
            gridContainer.appendChild(placeholder);
            observer.observe(placeholder);
        });
    } else {
        const fragment = document.createDocumentFragment();
        pageItems.forEach(game => {
            const card = document.createElement('a');
            card.href = game.url || '#';
            card.className = 'game-card group cursor-pointer bg-[#12141f] rounded-2xl overflow-hidden border border-gray-800/90 hover:border-cyan-500/50 transition-all duration-300 flex flex-col';
            const thumb = game.thumb || 'https://placehold.co/400x400/1e293b/60a5fa?text=Bekeirat+Game';

            card.innerHTML = `
                <div class="game-thumb-container relative w-full aspect-square overflow-hidden bg-[#0a0b10]">
                    <img src="${thumb}" alt="${game.title}" loading="lazy" decoding="async"
                         class="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500 ease-out"
                         onerror="this.src='https://placehold.co/400x400/1e293b/60a5fa?text=${encodeURIComponent(game.title)}'">
                    <div class="absolute inset-0 bg-gradient-to-t from-[#12141f] via-transparent to-transparent opacity-80"></div>
                    <span class="absolute top-2.5 right-2.5 text-[10px] font-bold px-2 py-0.5 rounded-md bg-black/60 backdrop-blur-md text-cyan-400 border border-cyan-500/30 capitalize">${game.title}</span>
                </div>
                <div class="p-3.5 bg-[#12141f] flex items-center justify-between flex-1">
                    <h3 class="font-bold text-xs sm:text-sm text-gray-200 group-hover:text-cyan-400 transition-colors truncate" title="${game.title}">${game.title}</h3>
                    <div class="p-1.5 rounded-lg bg-gray-800/80 group-hover:bg-cyan-500/20 text-gray-400 group-hover:text-cyan-400 transition-all">
                        <svg class="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M14.752 11.168l-3.197-2.3" /></svg>
                    </div>
                </div>
            `;

            fragment.appendChild(card);
        });
        gridContainer.appendChild(fragment);
    }

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
        let baseClass = 'px-3.5 py-1.5 rounded-xl text-xs font-semibold transition-all ';
        if (isDisabled) baseClass += 'bg-gray-900 text-gray-600 cursor-not-allowed border border-gray-800';
        else if (isActive) baseClass += 'bg-cyan-500 text-black font-bold shadow-lg shadow-cyan-500/20';
        else baseClass += 'bg-[#12141f] text-gray-300 hover:bg-gray-800 hover:text-white border border-gray-800/90';
        btn.className = baseClass;
        btn.onclick = function () {
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
    if (endPage - startPage + 1 < maxVisiblePages) startPage = Math.max(1, endPage - maxVisiblePages + 1);

    for (let p = startPage; p <= endPage; p++) container.appendChild(createBtn(p.toString(), p, p === currentPage));

    container.appendChild(createBtn('Next &rsaquo;', currentPage + 1, false, currentPage === totalPages));
    container.appendChild(createBtn('Last &raquo;', totalPages, false, currentPage === totalPages));
}

function renderEmptyState(message) {
    const grid = document.getElementById('main-games-grid');
    if (!grid) return;
    grid.innerHTML = '<div class=\"col-span-full py-12 text-center text-gray-400 bg-[#12141f] rounded-2xl border border-gray-800\"><svg class=\"w-12 h-12 mx-auto text-gray-600 mb-3\" fill=\"none\" stroke=\"currentColor\" viewBox=\"0 0 24 24\"><path stroke-linecap=\"round\" stroke-linejoin=\"round\" stroke-width=\"2\" d=\"M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z\"></path></svg><p class=\"text-sm font-medium text-gray-300 px-4\">' + message + '</p></div>';
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

function generateMockGames(category = 'all') {
    const cats = ['puzzle', 'arcade', 'action', 'racing', 'kids', 'multiplayer', 'adventure', 'strategy'];
    const games = [];
    for (let i = 1; i <= 20; i++) {
        const cat = category === 'all' ? cats[i % cats.length] : category;
        const id = `${cat}-game-${i}`;
        games.push({
            id,
            title: `${cat.charAt(0).toUpperCase() + cat.slice(1)} Game ${i}`,
            description: `Play ${cat} game ${i} instantly in your browser.`,
            url: '#',
            category: cat,
            categoryKey: normalizeKey(cat),
            tags: [cat, i % 2 === 0 ? 'arcade' : 'classic'],
            thumb: `https://picsum.photos/seed/${cat}-${i}/400/400`
        });
    }
    return games;
}