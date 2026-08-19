const urlParams = new URLSearchParams(window.location.search);
const gameId = urlParams.get('id');
const JSON_FEED_PATH = '../data/all.json';

let allGamesData = []; // Store all games for the carousel

function toggleMobileMenu() {
    const menu = document.getElementById('mobile-menu');
    menu.classList.toggle('hidden');
    menu.classList.toggle('active');
}

async function loadGameData() {
    if (!gameId) {
        showError("No Game ID specified in the URL. Please return to the games list and select a game.");
        return;
    }

    try {
        // Simulate network delay for loading effect
        await new Promise(resolve => setTimeout(resolve, 500));

        const response = await fetch(JSON_FEED_PATH);
        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }

        const games = await response.json();

        let gameData = null;
        if (Array.isArray(games)) {
            allGamesData = games;
            gameData = games.find(g => String(g.id) === String(gameId) || String(g.gameId) === String(gameId));
        } else if (games && typeof games === 'object') {
            const list = games.games || games.items || Object.values(games);
            if (Array.isArray(list)) {
                allGamesData = list;
                gameData = list.find(g => g && (String(g.id) === String(gameId) || String(g.gameId) === String(gameId)));
            }
        }

        if (gameData) {
            renderGamePage(gameData);
        } else {
            showError(`Game ID "${gameId}" was not found inside "${JSON_FEED_PATH}". Please verify the game exists in your JSON list.`);
        }
    } catch (err) {
        showError(`Failed to load or parse "${JSON_FEED_PATH}". Error: ${err.message}`);
        console.error("Fetch error details:", err);
    }
}

function renderGamePage(game) {
    const title = game.Title || game.title || game.name || "Untitled Game";
    const description = game.Description || game.description || game.desc || "No description provided.";
    const category = game.Category || game.category || game.genre || "Arcade";
    const tags = game.Tags || game.tags || game.keywords || "";
    const thumb = game.Image || game.thumb || game.thumbnail || game.image || "https://placehold.co/512x384/1e293b/60a5fa?text=Game";
    const id = game.id || game.gameId || gameId;

    // Use the Embed HTML if provided, otherwise fallback to Url
    let embedCode = game.Embed;
    if (!embedCode) {
        const url = game.Url || game.Play || game.url || game.gameUrl || game.link || "";
        embedCode = `<iframe id="game-iframe" src="${url}" class="absolute top-0 left-0 w-full h-full border-0" allow="autoplay; fullscreen; encrypted-media; accelerometer; gyroscope" allowfullscreen="true" scrolling="no"></iframe>`;
    }

    let formattedDesc = String(description).replace(/&ndash;/g, '-').replace(/&amp;/g, '&').replace(/\*\*/g, '');

    const categoriesArray = String(category).split(',').map(c => c.trim()).filter(c => c !== '');
    let categoriesHtml = '';
    categoriesArray.forEach(cat => {
        categoriesHtml += `<a href="./games.html?category=${encodeURIComponent(cat)}" class="category-badge"><i class="fa-solid fa-gamepad mr-2 opacity-70"></i>${cat}</a>`;
    });

    const tagsArray = String(tags).split(',').map(tag => tag.trim()).filter(tag => tag !== '');
    let tagsHtml = '';
    if (tagsArray.length > 0) {
        tagsArray.forEach(tag => {
            tagsHtml += `<a href="./games.html?tag=${encodeURIComponent(tag)}" class="tag-badge"><i class="fa-solid fa-hashtag mr-1 text-blue-400"></i>${tag}</a>`;
        });
    } else {
        tagsHtml = `<a href="./games.html?tag=HTML5" class="tag-badge"><i class="fa-brands fa-html5 mr-1 text-orange-500"></i>HTML5</a>`;
    }

    // Get related games for carousel (same category or random)
    let relatedGames = allGamesData.filter(g =>
        (String(g.id) !== String(id) && String(g.gameId) !== String(id)) &&
        (String(g.Category || g.category || g.genre).includes(categoriesArray[0]))
    );

    if (relatedGames.length < 6) {
        const otherGames = allGamesData.filter(g => String(g.id) !== String(id) && String(g.gameId) !== String(id));
        const needed = 6 - relatedGames.length;
        for (let i = 0; i < needed && i < otherGames.length; i++) {
            if (!relatedGames.includes(otherGames[i])) {
                relatedGames.push(otherGames[i]);
            }
        }
    }

    let carouselItemsHtml = '';
    relatedGames.slice(0, 10).forEach(rg => {
        const rgThumb = rg.Image || rg.thumb || rg.thumbnail || rg.image || "https://placehold.co/512x384/1e293b/60a5fa?text=Game";
        const rgTitle = rg.Title || rg.title || rg.name || "Game";
        const rgId = rg.id || rg.gameId;
        carouselItemsHtml += `
                    <div class="carousel-item" onclick="window.location.href='?id=${rgId}'">
                        <img src="${rgThumb}" alt="${rgTitle}" loading="lazy">
                        <div class="carousel-item-title">${rgTitle}</div>
                    </div>
                `;
    });

    const htmlContent = `
                <div class="max-w-7xl mx-auto px-4 py-8 w-full text-slate-200">
                    
                    <!-- Header Section with Smooth Fade In -->
                    <div class="game-header animate-[fadeIn_0.5s_ease-out]">
                        <img src="${thumb}" alt="${title}" class="w-24 h-24 md:w-32 md:h-32 rounded-2xl shadow-xl border-2 border-slate-700 object-cover hidden sm:block transition-transform duration-500 hover:scale-110 hover:rotate-2">
                        <div class="game-title-area">
                            <h1 class="text-3xl md:text-5xl font-extrabold text-white mb-4 tracking-tight drop-shadow-md bg-gradient-to-r from-blue-400 via-indigo-300 to-purple-400 bg-clip-text text-transparent">${title}</h1>
                            <div class="mb-4 flex flex-wrap gap-2">
                                ${categoriesHtml}
                            </div>
                        </div>
                    </div>

                    <div class="flex flex-col lg:flex-row gap-6 lg:gap-8">
                        
                        <!-- Main Left Column -->
                        <div class="lg:w-2/3 flex flex-col gap-6">
                            
                            <!-- Game Iframe Container -->
                            <div class="relative w-full rounded-2xl overflow-hidden shadow-2xl border border-slate-700/80 transition-all duration-300 hover:shadow-blue-500/10 animate-slide-up" style="padding-top: 56.25%; animation-delay: 0.1s;" id="game-container">
                               ${embedCode}
                            </div>

                            <!-- Description Section -->
                            <div class="section-panel animate-slide-up" style="animation-delay: 0.2s;">
                                <h2 class="section-title"><i class="fa-solid fa-align-left mr-2 text-blue-400"></i>Description</h2>
                                <p class="text-slate-300 leading-relaxed text-[16px] font-medium">${formattedDesc}</p>
                            </div>
                            
                            <!-- Tags Section -->
                            <div class="section-panel animate-slide-up" style="animation-delay: 0.3s;">
                                <h2 class="section-title"><i class="fa-solid fa-tags mr-2 text-purple-400"></i>Tags</h2>
                                <div class="flex flex-wrap gap-2 pt-2">
                                    ${tagsHtml}
                                </div>
                            </div>
                        </div>

                        <!-- Right Sidebar -->
                        <div class="lg:w-1/3 flex flex-col gap-6">
                            
                            <!-- Game Trailer Section -->
                            <div class="section-panel !p-4">
                                <h2 class="section-title text-sm uppercase tracking-widest text-slate-400 border-none mb-3 pb-0"><i class="fa-solid fa-video mr-2 text-red-500"></i>Game Walkthrough</h2>
                                <div id="gamemonetize-video" class="rounded-lg overflow-hidden border border-slate-700 min-h-[250px] bg-slate-800 shadow-inner"></div>
                            </div>

                            <!-- Thumbnail Section (visible on mobile if header thumb is hidden) -->
                            <div class="section-panel sm:hidden animate-slide-up" style="animation-delay: 0.3s;">
                                 <img src="${thumb}" alt="${title}" class="w-full h-auto rounded-xl shadow-md border border-slate-700 object-cover aspect-[4/3]">
                            </div>

                            <!-- Carousel Section -->
                            <div class="section-panel small-carousel-panel animate-slide-up" style="animation-delay: 0.4s;">
                                <h2 class="section-title text-sm uppercase tracking-widest text-slate-400 border-none mb-4 pb-0"><i class="fa-solid fa-fire mr-2 text-orange-500"></i>You may also like</h2>
                                <div class="carousel-container" id="related-carousel">
                                    <div class="carousel-track" id="carousel-track">
                                        ${carouselItemsHtml}
                                    </div>
                                </div>
                            </div>
                            
                        </div>
                    </div>
                </div>
            `;

    document.getElementById('app-container').innerHTML = htmlContent;
    document.title = title + " - Bekeirat Software";

    // Initialize GameMonetize Trailer properly
    // 1. Initialize configuration options
    window.VIDEO_OPTIONS = {
        gameid: String(id), // Passed directly from database
        width: "100%",
        height: "480px",
        color: "#3f007e",
        getAds: "true"
    };

    // 2. Assure the container is completely empty before executing
    const trailerContainer = document.getElementById('gamemonetize-video');
    if (trailerContainer) {
        trailerContainer.innerHTML = '';
    }

    // 3. Remove old API tracking script instances 
    const oldApiScript = document.getElementById('gamemonetize-video-api');
    if (oldApiScript) {
        oldApiScript.remove();
    }

    // 4. Safely evaluate partner's inline IIFE precisely as requested
    (function (a, b, c) {
        var d = a.getElementsByTagName(b)[0];
        a.getElementById(c) || (a = a.createElement(b), a.id = c, a.src = "https://api.gamemonetize.com/video.js", d.parentNode.insertBefore(a, d))
    })(document, "script", "gamemonetize-video-api");

    initCarousel();
}

function initCarousel() {
    const track = document.getElementById('carousel-track');
    if (!track) return;

    let currentIndex = 0;
    const items = track.children;
    if (items.length === 0) return;

    const totalItems = items.length;

    let itemsPerView = 3;
    if (window.innerWidth <= 640) itemsPerView = 1;
    else if (window.innerWidth <= 1024) itemsPerView = 2;

    setInterval(() => {
        if (totalItems <= itemsPerView) return;

        currentIndex++;
        if (currentIndex > totalItems - itemsPerView) {
            currentIndex = 0;
        }

        const itemWidth = items[0].getBoundingClientRect().width;
        const gap = parseFloat(window.getComputedStyle(track).gap) || 16;

        const slideAmount = currentIndex * (itemWidth + gap);
        track.style.transform = `translateX(-${slideAmount}px)`;
    }, 3500); // Slightly longer interval

    window.addEventListener('resize', () => {
        currentIndex = 0;
        track.style.transform = `translateX(0px)`;
        if (window.innerWidth <= 640) itemsPerView = 1;
        else if (window.innerWidth <= 1024) itemsPerView = 2;
        else itemsPerView = 3;
    });
}

function showError(message) {
    document.getElementById('app-container').innerHTML = `
                <div id="error-message" class="py-20 animate-slide-up">
                    <i class="fa-solid fa-triangle-exclamation text-6xl mb-6 text-red-500 drop-shadow-lg"></i>
                    <h2 class="text-3xl font-bold text-white mb-4">Oops!</h2>
                    <p class="mb-4 text-slate-300 max-w-lg mx-auto text-lg">${message}</p>
                    <a href="../index.html" class="inline-block mt-8 px-8 py-3 bg-gradient-to-r from-blue-600 to-indigo-600 text-white font-bold rounded-xl shadow-lg hover:shadow-xl hover:from-blue-500 hover:to-indigo-500 transform hover:-translate-y-1 transition-all duration-300">Return to Home</a>
                </div>
            `;
}

window.onload = loadGameData; 