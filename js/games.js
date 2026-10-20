const GAME_CACHE_KEY = "bekeirat_games_cache_v1";
const GAME_CACHE_TTL = 24 * 60 * 60 * 1000;

const PAGE_SIZE = 24;

const CATEGORY_MAP = {
  "all": "All",
  "action": "Action",
  "arcade": "Arcade",
  "puzzle": "Puzzle",
  "racing": "Racing",
  "girls": "Girls",
  "adventure": "Adventure",
  "strategy": "Strategy",
  "kids": "Kids",
  "multiplayer": "Multiplayer",
  "simulation": "Simulation",
  "sports": "Sports",
  "boardgames": "Boardgames",
  "quiz": "Quiz",
  "casual": "Casual",
  "shooter": "Shooter",
  "platform": "Platform",
  "animals": "Animals"
};

function normalizeKey(value) {
  return String(value ?? "").trim().toLowerCase();
}

function buildMockGames() {
  const categories = ["Action", "Arcade", "Puzzle", "Racing", "Girls", "Adventure", "Strategy", "Kids"];
  const items = [];
  for (let i = 1; i <= 180; i++) {
    const category = categories[(i - 1) % categories.length];
    const id = `mock-${i}`;
    const title = `${category} Game ${i}`;
    items.push({
      id,
      title,
      category,
      tags: [category.toLowerCase(), "featured", "classic"],
      image: "https://placehold.co/600x600/1e293b/38bdf8?text=" + encodeURIComponent(title),
      url: "./game.html?id=" + id
    });
  }
  return items;
}

function readCache() {
  try {
    const raw = localStorage.getItem(GAME_CACHE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    if (!parsed || !parsed.timestamp) return null;
    if (Date.now() - parsed.timestamp < GAME_CACHE_TTL) {
      return parsed.data;
    }
  } catch (error) {
    console.warn("Cache read failed:", error);
  }
  return null;
}

function writeCache(data) {
  try {
    localStorage.setItem(GAME_CACHE_KEY, JSON.stringify({
      timestamp: Date.now(),
      data
    }));
  } catch (error) {
    console.warn("Cache write failed:", error);
  }
}

async function fetchCatalog() {
  const cached = readCache();
  if (cached && Array.isArray(cached) && cached.length) {
    return cached;
  }

  const candidates = [
    "../data/all.json",
    "../data/all_1.json",
    "../all.json"
  ];

  for (const path of candidates) {
    try {
      const response = await fetch(path, { cache: "force-cache" });
      if (!response.ok) continue;
      const data = await response.json();
      if (Array.isArray(data) && data.length) {
        writeCache(data);
        return data;
      }
    } catch (error) {
      console.warn("Data fetch failed for:", path, error);
    }
  }

  return buildMockGames();
}

function getCategoryCounts(data) {
  return data.reduce((acc, game) => {
    const key = normalizeKey(game.category || "uncategorized");
    acc[key] = (acc[key] || 0) + 1;
    return acc;
  }, {});
}

function renderCategoryMenu(data) {
  const menu = document.getElementById("category-menu");
  if (!menu) return;

  const counts = getCategoryCounts(data);

  const categories = Object.entries(counts)
    .map(([key, value]) => ({ key, value }))
    .sort((a, b) => a.key.localeCompare(b.key));

  const menuItems = [
    { key: "all", value: 0 },
    ...categories
  ].map((item) => {
    const key = normalizeKey(item.key);
    const label = item.key === "all" ? "All" : (CATEGORY_MAP[key] || key);
    const count = item.key === "all" ? data.length : item.value;
    return `
      <button class="category-btn active" data-key="${key}">
        <span class="label"><span class="category-badge">${label}</span></span>
        <span class="count">${count}</span>
      </button>
    `;
  }).join("");

  menu.innerHTML = menuItems;

  menu.querySelectorAll(".category-btn").forEach((button) => {
    button.addEventListener("click", () => {
      const currentKey = button.dataset.key;
      switchCategory(currentKey);
    });
  });

  document.querySelectorAll(".category-btn").forEach((button) => {
    button.classList.toggle("active", button.dataset.key === "all");
  });

  setActiveCategory("all");
}

function setActiveCategory(key) {
  const activeKey = normalizeKey(key);
  const currentButtons = document.querySelectorAll(".category-btn");

  currentButtons.forEach((button) => {
    button.classList.toggle("active", button.dataset.key === key);
  });
}

function getFilteredData(data, categoryKey, searchTerm, tagKey) {
  const normalizedSearch = normalizeKey(searchTerm);
  return data.filter((game) => {
    const categoryMatch = categoryKey === "all" || normalizeKey(game.category) === categoryKey;
    const searchMatch =
      normalizedSearch === "" ||
      normalizeKey(game.title).includes(normalizedSearch) ||
      (Array.isArray(game.tags) && game.tags.some((tag) => normalizeKey(tag).includes(normalizedSearch)));

    const tagMatch =
      tagKey === "all" ||
      (Array.isArray(game.tags) && game.tags.some((tag) => normalizeKey(tag).includes(normalizeKey(tagKey))));

    return categoryMatch && searchMatch && tagMatch;
  });
}

function renderTags(data, categoryKey) {
  const tagBar = document.getElementById("tag-bar");
  if (!tagBar) return;

  const tags = {};
  data.forEach((game) => {
    if (Array.isArray(game.tags)) {
      game.tags.forEach((tag) => {
        if (!tag) return;
        const key = normalizeKey(tag);
        tags[key] = (tags[key] || 0) + 1;
      });
    }
  });

  const sortedTags = Object.keys(tags)
    .sort((a, b) => b[a] - a[b])
    .slice(0, 12);

  const allBtn = document.createElement("button");
  allBtn.type = "button";
  allBtn.className = "tag-pill active";
  allBtn.textContent = "All";
  allBtn.addEventListener("click", () => {
    activeTag = "all";
    renderCatalog();
  });
  tagBar.innerHTML = "";
  tagBar.appendChild(allBtn);

  sortedTags.forEach((tag) => {
    const tagButton = document.createElement("button");
    tagButton.type = "button";
    tagButton.className = "tag-pill";
    tagButton.textContent = `${tag} (${tags[tag]})`;
    tagButton.addEventListener("click", () => {
      activeTag = tag;
      renderCatalog();
    });
    tagBar.appendChild(tagButton);
  });
}

function renderPagination(totalPages, currentPage) {
  const pagination = document.getElementById("pagination");
  if (!pagination) return;

  pagination.innerHTML = "";

  if (totalPages <= 1) {
    return;
  }

  const buttons = [];
  const maxButtons = 5;

  let startPage = Math.max(1, currentPage - 2);
  let endPage = Math.min(totalPages, startPage + maxButtons - 1);

  if (endPage - startPage + 1 < maxButtons) {
    startPage = Math.max(1, endPage - maxButtons + 1);
  }

  for (let p = startPage; p <= endPage; p++) {
    const button = document.createElement("button");
    button.type = "button";
    button.textContent = String(p);
    button.classList.toggle("active", p === currentPage);
    button.addEventListener("click", () => {
      currentPage = p;
      renderCatalog();
    });
    pagination.appendChild(button);
  }
}

function renderCatalog() {
  const grid = document.getElementById("games-grid");
  if (!grid) return;

  const filtered = getFilteredData(catalogData, activeCategory, searchValue, activeTag);
  const totalItems = filtered.length;
  const totalPages = Math.max(1, Math.ceil(totalItems / PAGE_SIZE));
  const currentPageSafe = Math.min(activePage, totalPages);

  if (currentPageSafe !== activePage) {
    activePage = currentPageSafe;
  }

  const start = (currentPageSafe - 1) * PAGE_SIZE;
  const end = Math.min(start + PAGE_SIZE, totalItems);

  const items = filtered.slice(start, end);

  const pageStart = document.getElementById("page-start");
  const pageEnd = document.getElementById("page-end");
  const totalItemsEl = document.getElementById("total-items");

  if (pageStart) pageStart.textContent = String(totalItems ? start + 1 : 0);
  if (pageEnd) pageEnd.textContent = String(totalItems ? end : 0);
  if (totalItemsEl) totalItemsEl.textContent = String(totalItems);

  const markup = items.map((game) => `
    <article class="game-card">
      <a href="${game.url || './games.html'}" aria-label="${game.title}">
        <img src="${game.image}" alt="${game.title}" loading="lazy" decoding="async" />
      </a>
      <div class="game-content">
        <h3>${game.title}</h3>
        <div class="meta">
          <span>${game.category || "Game"}</span>
          <div class="play-icon">
            <i class="fa-solid fa-play"></i>
          </div>
        </div>
      </div>
    </article>
  `).join("");

  grid.innerHTML = markup;
  renderPagination(totalPages, currentPageSafe);
}

function setupNavigation() {
  const navToggle = document.getElementById("nav-toggle");
  const navToggleTarget = document.getElementById("nav-links");

  if (!navToggle || !navToggleTarget) return;

  navToggle.addEventListener("click", () => {
    const expanded = navToggle.getAttribute("aria-expanded") === "true";
    navToggle.setAttribute("aria-expanded", String(!expanded));
    navToggleTarget.classList.toggle("open");
  });
}

function setupCurrentYear() {
  const currentYear = document.getElementById("current-year");
  if (currentYear) currentYear.textContent = new Date().getFullYear();
}

function initCatalog() {
  const searchInput = document.getElementById("game-search");
  if (searchInput) {
    searchInput.addEventListener("input", (event) => {
      searchValue = event.target.value;
      activePage = 1;
      renderCatalog();
    });
  }

  const shuffleButton = document.getElementById("shuffle-btn");
  if (shuffleButton) {
    shuffleButton.addEventListener("click", () => {
      const order = [...catalogData];
      const shuffled = order.sort(() => Math.random() - 0.5);
      catalogData = shuffled;
      activePage = 1;
      renderCatalog();
    });
  }

  const categoryButtons = document.querySelectorAll(".category-btn");
  if (categoryButtons.length) {
    categoryButtons.forEach((button) => {
      button.addEventListener("click", () => {
        const key = button.dataset.key;
        switchCategory(key);
      });
    });
  }
}

let catalogData = [];
let activeCategory = "all";
let activeTag = "all";
let activePage = 1;
let searchValue = "";

document.addEventListener("DOMContentLoaded", async () => {
  setupNavigation();
  setupCurrentYear();

  try {
    const data = await fetchCatalog();
    catalogData = data;
    renderCategoryMenu(data);
    renderTags(data, "all");
    renderCatalog();

    initCatalog();
  } catch (error) {
    console.error("error loading catalog", error);
    catalogData = buildMockGames();
    renderCategoryMenu(data);
    renderTags(data, "all");
    renderCatalog();
    initCatalog();
  }
});