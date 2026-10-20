const CACHE_KEY = "bekeirat_homepage_data_v1";
const CACHE_TTL = 12 * 60 * 60 * 1000; // 12 hours

const CATEGORY_SET = ["Puzzle", "Action", "Arcade", "Racing", "Girls", "Adventure", "Strategy", "Kids"];

function normalizeText(value) {
  return String(value ?? "").trim().toLowerCase();
}

function generateMockGames() {
  const categories = ["Puzzle", "Action", "Arcade", "Racing", "Girls", "Adventure", "Strategy", "Kids"];
  const items = [];
  for (let i = 1; i <= 48; i++) {
    const category = categories[(i - 1) % categories.length];
    const id = `mock-${i}`;
    items.push({
      id,
      title: `${category} Game ${i}`,
      category,
      description: `Play ${category.toLowerCase()} games instantly in your browser. Family-friendly and easy to use.`,
      tags: [category.toLowerCase(), "featured", "arcade"],
      image: "https://placehold.co/800x450/1e293b/38bdf8?text=" + encodeURIComponent(`${category} Game ${i}`),
      url: "./pages/games.html",
      featured: i % 3 === 0
    });
  }
  return items;
}

function getCachedData() {
  try {
    const raw = localStorage.getItem(CACHE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    if (!parsed || !parsed.timestamp) return null;
    if (Date.now() - parsed.timestamp < CACHE_TTL) {
      return parsed.data;
    }
  } catch (error) {
    console.warn("Cache read failed:", error);
  }
  return null;
}

function setCachedData(data) {
  try {
    localStorage.setItem(CACHE_KEY, JSON.stringify({
      timestamp: Date.now(),
      data
    }));
  } catch (error) {
    console.warn("Cache write failed:", error);
  }
}

async function fetchCatalog() {
  const localData = getCachedData();
  if (localData && Array.isArray(localData) && localData.length) {
    return localData;
  }

  const candidates = [
    "./data/all.json",
    "./data/all_1.json",
    "./all.json"
  ];

  for (const path of candidates) {
    try {
      const response = await fetch(path, { cache: "force-cache" });
      if (!response.ok) continue;
      const data = await response.json();
      if (Array.isArray(data) && data.length) {
        setCachedData(data);
        return data;
      }
    } catch (error) {
      console.warn("Catalog fetch failed for:", path, error);
    }
  }

  return generateMockGames();
}

function pickFeaturedGame(data) {
  if (!data || !data.length) return null;
  const eligible = data.filter((game) => game.featured || game.category === "Puzzle" || game.category === "Arcade");
  return eligible.length ? eligible[Math.floor(Math.random() * eligible.length)] : data[0];
}

function renderHero(game) {
  const heroImage = document.getElementById("hero-image");
  const heroTitle = document.getElementById("hero-title");
  const heroCategory = document.getElementById("hero-category");
  const heroCta = document.getElementById("hero-cta");

  if (!game) return;

  heroImage.src = game.image || "https://placehold.co/800x450/1e293b/38bdf8?text=Featured+Game";
  heroImage.alt = game.title;
  heroImage.onerror = () => {
    heroImage.src = "https://placehold.co/800x450/1e293b/38bdf8?text=Featured+Game";
  };

  heroTitle.textContent = game.title;
  heroCategory.textContent = game.category ? game.category.toUpperCase() : "INSTANT PLAY";

  heroCta.href = game.url || "./pages/games.html";
}

function renderCardRow(containerId, items, mode = "default") {
  const container = document.getElementById(containerId);
  if (!container) return;

  const cards = items.slice(0, 12).map((game) => {
    const image = game.image || "https://placehold.co/600x400/1e293b/38bdf8?text=Bekeirat";
    const title = game.title || "Untitled Game";
    const url = game.url || "./pages/games.html";
    return `
      <article class="card-item">
        <a href="${url}" aria-label="${title}">
          <img src="${image}" alt="${title}" loading="lazy" decoding="async" />
        </a>
        <div class="card-content">
          <h3>${title}</h3>
          <div class="play-mark">
            <i class="fa-solid fa-play"></i>
          </div>
        </div>
      </article>
    `;
  }).join("");

  container.innerHTML = cards;
}

function renderCategoryTabs(data) {
  const container = document.getElementById("category-tabs");
  if (!container) return;

  const categories = ["All", "Puzzle", "Action", "Arcade", "Racing", "Girls", "Adventure", "Strategy", "Kids"];
  const tabMarkup = categories.map((category, index) => `
    <button class="category-tab ${index === 0 ? "active" : ""}" data-category="${category.toLowerCase()}">
      ${category}
    </button>
  `).join("");

  container.innerHTML = tabMarkup;

  container.querySelectorAll(".category-tab").forEach((button) => {
    button.addEventListener("click", () => {
      const category = button.dataset.category;
      const all = category === "all";
      const filtered = all
        ? data
        : data.filter((game) => normalizeText(game.category).includes(category));

      renderCategoryGrid(filtered.slice(0, 15));
      document.querySelectorAll(".category-tab").forEach((tab) => {
        tab.classList.toggle("active", tab.dataset.category === category);
      });
    });
  });
}

function renderCategoryGrid(items) {
  const grid = document.getElementById("category-grid");
  if (!grid) return;

  const cards = items.map((game) => {
    const image = game.image || "https://placehold.co/500x500/1e293b/38bdf8?text=Bekeirat";
    const title = game.title || "Untitled Game";
    const url = game.url || "./pages/games.html";
    return `
      <article class="category-card">
        <a href="${url}" aria-label="${title}">
          <img src="${image}" alt="${title}" loading="lazy" decoding="async" />
        </a>
        <div class="card-content">
          <h3>${title}</h3>
        </div>
      </article>
    `;
  }).join("");

  grid.innerHTML = cards;
}

function renderHomepage(data) {
  const trending = data.filter((game) => game.category === "Puzzle" || game.category === "Arcade" || game.category === "Action");
  const editors = data.filter((game) => game.category === "Girls" || game.category === "Adventure" || game.category === "Strategy");
  const fresh = data.filter((game) => game.category === "Kids" || game.category === "Racing" || game.category === "Puzzle");

  renderHero(pickFeaturedGame(data));
  renderCardRow("trending-carousel", trending);
  renderCardRow("editors-carousel", editors);
  renderCardRow("fresh-carousel", fresh);
  renderCategoryTabs(data);
  renderCategoryGrid(data.slice(0, 15));
}

function setupNavigation() {
  const navToggle = document.getElementById("nav-toggle");
  const navLinks = document.getElementById("nav-links");

  if (!navToggle || !navLinks) return;

  navToggle.addEventListener("click", () => {
    const expanded = navToggle.getAttribute("aria-expanded") === "true";
    navToggle.setAttribute("aria-expanded", String(!expanded));
    navLinks.classList.toggle("open");
  });
}

function setupCurrentYear() {
  const yearEl = document.getElementById("current-year");
  if (yearEl) yearEl.textContent = new Date().getFullYear();
}

document.addEventListener("DOMContentLoaded", () => {
  setupNavigation();
  setupCurrentYear();

  fetchCatalog()
    .then((data) => {
      renderHomepage(data);
    })
    .catch(() => {
      renderHomepage(generateMockGames());
    });
});