const CONFIG = {
    dataPaths: ['../data/'],
    itemsPerPage: 60,
    defaultCategory: 'all'
};

let dataCache = {};
let currentDataset = [];
let activeCategory = 'all';
let activeSubCategory = 'all';
let searchQuery = '';
let currentPage = 1;

function shuffleArray(array) {
    const shuffled = [...array];
    for (let i = shuffled.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
    }
    return shuffled;
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

    switchCategory(CONFIG.defaultCategory);

    function updateSidebarTopOffset() {
        const nav = document.querySelector('nav.navbar');
        const topOffset = nav ? (nav.getBoundingClientRect().height + 12) : 16;
        document.documentElement.style.setProperty('--sidebar-top', `${topOffset}px`);
    }

    updateSidebarTopOffset();
    window.addEventListener('resize', updateSidebarTopOffset);
    window.addEventListener('orientationchange', updateSidebarTopOffset);
});

async function switchCategory(category, element = null) {
    activeCategory = category.toLowerCase().trim();
    activeSubCategory = 'all';
    currentPage = 1;

    if (element) {
        document.querySelectorAll('.cat-btn').forEach(btn => btn.classList.remove('active'));
        element.classList.add('active');
    } else {
        const defaultBtn = document.querySelector(`.cat-btn[onclick*="'${activeCategory}'"]`);
        if (defaultBtn) {
            document.querySelectorAll('.cat-btn').forEach(btn => btn.classList.remove('active'));
            defaultBtn.classList.add('active');
        }
    }

    if (dataCache[activeCategory]) {
        currentDataset = shuffleArray(dataCache[activeCategory]);
        buildSubCategoryTags();
        renderGrid();
        return;
    }

    showLoadingState();

    let rawData = null;

    // FIX: Use Promise.any to fetch from all data paths concurrently. 
    // This prevents the browser from stalling when it encounters a 404 error, drastically speeding up load times.
    const fetchPromises = CONFIG.dataPaths.map(basePath =>
        fetch(`${basePath}${activeCategory}.json`).then(response => {
            if (!response.ok) throw new Error('Network response was not ok');
            return response.json();
        })
    );

    try {
        rawData = await Promise.any(fetchPromises);
    } catch (error) {
        // All paths failed, falling back to mock data
        rawData = null;
    }

    if (rawData && Array.isArray(rawData)) {
        dataCache[activeCategory] = rawData.map((item, idx) => ({
            id: item.id || item.Id || `game-${idx}`,
            title: item.Title ? item.Title.trim() : (item.title ? item.title.trim() : "Untitled Game"),
            description: item.Description || item.description || "",
            instructions: item.Instructions || item.instructions || "",
            play: item.Play || item.play || "",
            url: item.Url || item.url || item.gameUrl || '#',
            category: item.Category || item.category || activeCategory,
            tags: Array.isArray(item.Tags)
                ? item.Tags.map(t => t.toLowerCase().trim())
                : (item.Tags ? item.Tags.split(',').map(t => t.trim().toLowerCase()) :
                    (Array.isArray(item.tags) ? item.tags.map(t => t.toLowerCase().trim()) :
                        (item.tags ? item.tags.split(',').map(t => t.trim().toLowerCase()) : []))),
            thumb: item.Image || item.thumb || item.thumbnail || item.image || 'https://placehold.co/400x300/12141f/00ffcc?text=Bekeirat+Game',
            width: item.Width || item.width || "1280",
            height: item.Height || item.height || "720",
            video: item.Video || item.video || "",
            gender: item.Gender || item.gender || "",
            languages: item.Languages || item.languages || "",
            embed: item.Embed || item.embed || ""
        }));

        currentDataset = shuffleArray(dataCache[activeCategory]);
        buildSubCategoryTags();
        renderGrid();
    } else {
        const mockData = generateMockGames(activeCategory);
        dataCache[activeCategory] = mockData;
        currentDataset = shuffleArray(mockData);
        buildSubCategoryTags();
        renderGrid();
    }
}

function generateMockGames(category) {
    const categories = ['multiplayer', 'action', 'shooting', 'adventure', 'strategy', 'sports', 'racing', 'simulation', '2-player', '3d', 'battle', 'stickman', 'io', 'puzzle', 'match-3', 'hypercasual', 'casual', 'arcade', 'skill', 'clicker', 'merge', 'football', 'soccer', 'basketball', 'boardgames', 'cards', 'mahjong', 'bejeweled', 'bubble-shooter', 'jigsaw', 'boys', 'girls', 'dress-up', 'cooking', 'care', 'baby-hazel', 'art', 'kids', 'educational', 'quiz', 'agility', 'mouse'];
    const games = [];
    const count = 30;

    for (let i = 1; i <= count; i++) {
        const catName = category === 'all' ? categories[Math.floor(Math.random() * categories.length)] : category;
        games.push({
            id: `${catName}-game-${i}`,
            title: `${catName.charAt(0).toUpperCase() + catName.slice(1)} Quest ${i}`,
            description: `Experience thrilling non-stop ${catName} gameplay directly in your browser.`,
            url: '#',
            category: catName,
            tags: [catName, i % 2 === 0 ? 'arcade' : 'classic', i % 3 === 0 ? 'popular' : 'new'],
            thumb: `https://picsum.photos/seed/${catName}-${i}/400/400`,
            embed: ''
        });
    }
    return games;
}

function reshuffleGrid() {
    currentDataset = shuffleArray(currentDataset);
    renderGrid();
}

function buildSubCategoryTags() {
    const tagsContainer = document.getElementById('tags-filter-bar');
    tagsContainer.innerHTML = '';

    const tagCounts = {};
    currentDataset.forEach(game => {
        if (Array.isArray(game.tags)) {
            game.tags.forEach(tag => {
                if (tag) tagCounts[tag] = (tagCounts[tag] || 0) + 1;
            });
        }
    });

    const sortedTags = Object.keys(tagCounts).sort((a, b) => tagCounts[b] - tagCounts[a]).slice(0, 15);
    if (sortedTags.length === 0) return;

    const allBtn = document.createElement('button');
    allBtn.className = `tag-pill px-3.5 py-1.5 rounded-xl text-xs font-semibold whitespace-nowrap transition-all border capitalize ${activeSubCategory === 'all'
        ? 'active bg-cyan-500/20 text-cyan-300 border-cyan-500/40 shadow-sm'
        : 'bg-gray-800/80 text-gray-400 hover:bg-gray-700/80 border-gray-700/60'
        }`;
    allBtn.textContent = 'All Sub-types';
    allBtn.onclick = () => filterSubCategory('all', allBtn);
    tagsContainer.appendChild(allBtn);

    sortedTags.forEach(tag => {
        const btn = document.createElement('button');
        btn.className = 'tag-pill px-3.5 py-1.5 rounded-xl text-xs font-semibold bg-gray-800/80 text-gray-400 hover:bg-gray-700/80 border border-gray-700/60 whitespace-nowrap transition-all capitalize';
        btn.textContent = `${tag} (${tagCounts[tag]})`;
        btn.onclick = () => filterSubCategory(tag, btn);
        tagsContainer.appendChild(btn);
    });
}

function filterSubCategory(tag, element) {
    activeSubCategory = tag;
    currentPage = 1;

    Array.from(element.parentElement.children).forEach(child => {
        child.className = 'tag-pill px-3.5 py-1.5 rounded-xl text-xs font-semibold bg-gray-800/80 text-gray-400 hover:bg-gray-700/80 border border-gray-700/60 whitespace-nowrap transition-all capitalize';
    });
    element.className = 'tag-pill active px-3.5 py-1.5 rounded-xl text-xs font-bold bg-cyan-500/20 text-cyan-300 border border-cyan-500/40 whitespace-nowrap transition-all capitalize';

    renderGrid();
}

function handleSearch(query) {
    searchQuery = query.toLowerCase().trim();
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
    const filtered = getFilteredData();
    const totalItems = filtered.length;
    const totalPages = Math.ceil(totalItems / CONFIG.itemsPerPage) || 1;

    if (currentPage > totalPages) currentPage = totalPages;

    const startIndex = (currentPage - 1) * CONFIG.itemsPerPage;
    const endIndex = Math.min(startIndex + CONFIG.itemsPerPage, totalItems);
    const pageItems = filtered.slice(startIndex, endIndex);

    document.getElementById('total-games-count').textContent = totalItems.toLocaleString();
    document.getElementById('page-start-idx').textContent = totalItems > 0 ? (startIndex + 1).toLocaleString() : 0;
    document.getElementById('page-end-idx').textContent = endIndex.toLocaleString();

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
            sessionStorage.setItem('current_game_data', JSON.stringify(game));
        });

        card.className = 'game-card group cursor-pointer bg-[#12141f] rounded-2xl overflow-hidden border border-gray-800/90 hover:border-cyan-500/50 transition-all duration-300 flex flex-col shadow-lg relative';

        // FIX: Added `decoding="async"` alongside `loading="lazy"` to speed up the main thread rendering
        card.innerHTML = `
                    <div class="game-thumb-container relative w-full aspect-square overflow-hidden bg-[#0a0b10]">
                        <img src="${game.thumb}" 
                             alt="${game.title}" 
                             loading="lazy"
                             decoding="async"
                             class="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500 ease-out"
                             onerror="this.src='https://placehold.co/400x400/12141f/00ffcc?text=${encodeURIComponent(game.title)}'"/>
                        <div class="absolute inset-0 bg-gradient-to-t from-[#12141f] via-transparent to-transparent opacity-80"></div>
                        <span class="absolute top-2.5 right-2.5 text-[10px] font-bold px-2 py-0.5 rounded-md bg-black/60 backdrop-blur-md text-cyan-400 border border-cyan-500/30 capitalize">
                            ${game.category}
                        </span>
                    </div>
                    <div class="p-3.5 bg-[#12141f] flex items-center justify-between flex-1">
                        <h3 class="font-bold text-xs sm:text-sm text-gray-200 group-hover:text-cyan-400 transition-colors truncate" title="${game.title}">
                            ${game.title}
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

function renderPagination(totalPages) {
    const container = document.getElementById('pagination-controls');
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

function showLoadingState() {
    const grid = document.getElementById('main-games-grid');
    grid.innerHTML = `
                <div class="col-span-full py-16 text-center text-gray-400">
                    <div class="inline-block animate-spin rounded-full h-8 w-8 border-2 border-cyan-400 border-t-transparent mb-3"></div>
                    <p class="text-sm font-semibold text-gray-300">Loading Shuffled Games Grid...</p>
                </div>
            `;
}

function renderEmptyState(message) {
    const grid = document.getElementById('main-games-grid');
    grid.innerHTML = `
                <div class="col-span-full py-12 text-center text-gray-400 bg-[#12141f] rounded-2xl border border-gray-800">
                    <svg class="w-12 h-12 mx-auto text-gray-600 mb-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"></path>
                    </svg>
                    <p class="text-sm font-medium text-gray-300 px-4">${message}</p>
                </div>
            `;
} 