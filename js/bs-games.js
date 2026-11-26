/*
 * bs-games.js — In-house (Bekeirat Software) games module.
 * Loads data/BS_Games.json and powers:
 *   - Homepage carousel        (#original-games-carousel on index.html)
 *   - Collection filtered grid (#bs-games-grid on pages/original-games.html)
 *   - Dynamic details page     (?id=BS### on pages/bs-game.html)
 *   - Live-play popup with maximize (all pages, via [data-bs-play] buttons)
 *
 * All paths in BS_Games.json are relative to the site root; this module
 * resolves them against the current page location.
 */
(function (global) {
    'use strict';

    const CACHE_KEY = 'bekeiratBsGames';
    const CACHE_TTL = 6 * 60 * 60 * 1000;

    const STORE_META = {
        android: { icon: 'fa-brands fa-android', classes: 'from-emerald-700 to-teal-700 hover:from-emerald-600 hover:to-teal-600 border-emerald-500/40 text-white' },
        ios: { icon: 'fa-brands fa-app-store-ios', classes: 'bg-slate-800 hover:bg-blue-600 hover:text-white border-slate-700 text-gray-200' },
        windows: { icon: 'fa-brands fa-microsoft', classes: 'bg-slate-800 hover:bg-blue-600 hover:text-white border-slate-700 text-gray-200' },
        steam: { icon: 'fa-brands fa-steam', classes: 'bg-slate-800 hover:bg-blue-600 hover:text-white border-slate-700 text-gray-200' },
        itch: { icon: 'fa-solid fa-gamepad', classes: 'bg-slate-800 hover:bg-red-500 hover:text-white border-slate-700 text-gray-200' },
        web: { icon: 'fa-solid fa-globe', classes: 'bg-slate-800 hover:bg-cyan-600 hover:text-white border-slate-700 text-gray-200' },
        default: { icon: 'fa-solid fa-download', classes: 'bg-slate-800 hover:bg-blue-600 hover:text-white border-slate-700 text-gray-200' }
    };

    function siteRoot() {
        return /\/pages\//.test(global.location.pathname) ? '../' : './';
    }

    function normalizeKey(s) {
        return String(s || '').trim().toLowerCase();
    }

    function escapeHtml(s) {
        return String(s == null ? '' : s)
            .replace(/&/g, '&amp;')
            .replace(/</g, '&lt;')
            .replace(/>/g, '&gt;')
            .replace(/"/g, '&quot;')
            .replace(/'/g, '&#39;');
    }

    function resolvePath(p) {
        if (!p) return '';
        if (/^(https?:)?\/\//i.test(p)) return p;
        return siteRoot() + String(p).replace(/^\.\//, '');
    }

    function detailUrl(id) {
        return siteRoot() + 'pages/bs-game.html?id=' + encodeURIComponent(id);
    }

    function readCache() {
        try {
            const raw = global.localStorage.getItem(CACHE_KEY);
            if (!raw) return null;
            const parsed = JSON.parse(raw);
            if (parsed && Array.isArray(parsed.games) && Date.now() - parsed.timestamp < CACHE_TTL) {
                return parsed.games;
            }
        } catch (e) { /* ignore */ }
        return null;
    }

    function writeCache(games) {
        try {
            global.localStorage.setItem(CACHE_KEY, JSON.stringify({ games, timestamp: Date.now() }));
        } catch (e) { /* ignore */ }
    }

    let loadPromise = null;

    function load(forceRefresh) {
        if (loadPromise && !forceRefresh) return loadPromise;
        loadPromise = (async () => {
            if (!forceRefresh) {
                const cached = readCache();
                if (cached) return cached;
            }
            let data = null;
            const paths = [siteRoot() + 'data/BS_Games.json', 'data/BS_Games.json'];
            for (const path of paths) {
                try {
                    const res = await fetch(path, { cache: 'no-cache' });
                    if (res.ok) {
                        data = await res.json();
                        if (data && Array.isArray(data.games) && data.games.length) break;
                        data = null;
                    }
                } catch (e) {
                    console.warn('[BS Games] Fetch failed for ' + path + ':', e);
                }
            }
            const games = data && Array.isArray(data.games) ? data.games : [];
            if (games.length) writeCache(games);
            return games;
        })();
        return loadPromise;
    }

    function findById(games, id) {
        return games.find(g => String(g.id) === String(id) || normalizeKey(g.slug) === normalizeKey(id));
    }

    /* ---------- Card builders ---------- */

    function carouselCard(game) {
        const img = resolvePath(game.thumbnail);
        const badge = game.featured
            ? '<span class="absolute top-3 left-3 text-[10px] font-extrabold px-2.5 py-1 rounded-md bg-indigo-600 text-white uppercase shadow-md">Original Game</span>'
            : '<span class="absolute top-3 left-3 text-[10px] font-extrabold px-2.5 py-1 rounded-md bg-slate-800/90 text-indigo-300 border border-indigo-500/40 uppercase">Bekeirat Original</span>';
        const playBadge = game.playOnline
            ? '<span class="absolute bottom-3 right-3 w-8 h-8 rounded-full bg-emerald-600 text-white flex items-center justify-center shadow-lg"><i class="fa-solid fa-play text-[10px]"></i></span>'
            : '';
        return `
            <article class="flex-none w-[320px] sm:w-[360px] bg-slate-900/90 rounded-2xl overflow-hidden border border-slate-800 hover:border-indigo-500/60 transition-all shadow-xl group">
                <a href="${escapeHtml(detailUrl(game.id))}" class="block">
                    <div class="relative aspect-video overflow-hidden bg-slate-950">
                        <img src="${escapeHtml(img)}" alt="${escapeHtml(game.title)}" loading="lazy" decoding="async"
                            class="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                            onerror="this.src='${siteRoot()}assets/gamepad.svg'">
                        ${badge}
                        ${playBadge}
                    </div>
                    <div class="p-5">
                        <h3 class="text-lg font-bold text-white group-hover:text-indigo-300 transition-colors">${escapeHtml(game.title)}</h3>
                        <p class="text-sm text-gray-400 mt-2">${escapeHtml(game.shortDescription)}</p>
                        <span class="mt-4 inline-flex items-center gap-2 text-sm font-bold text-indigo-300 group-hover:text-indigo-200 transition-colors">
                            View Game <i class="fa-solid fa-arrow-right text-xs group-hover:translate-x-1 transition-transform"></i>
                        </span>
                    </div>
                </a>
            </article>`;
    }

    function gridCard(game) {
        const img = resolvePath(game.thumbnail);
        return `
            <article class="bs-grid-card group bg-slate-900/90 rounded-2xl overflow-hidden border border-slate-800 hover:border-indigo-500/60 transition-all duration-300 shadow-xl flex flex-col">
                <a href="${escapeHtml(detailUrl(game.id))}" class="block relative aspect-video overflow-hidden bg-slate-950">
                    <img src="${escapeHtml(img)}" alt="${escapeHtml(game.title)}" loading="lazy" decoding="async"
                        class="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                        onerror="this.src='${siteRoot()}assets/gamepad.svg'">
                    <span class="absolute top-3 left-3 text-[10px] font-extrabold px-2.5 py-1 rounded-md bg-indigo-600 text-white uppercase">Original</span>
                    ${game.playOnline ? '<span class="absolute bottom-3 right-3 w-9 h-9 rounded-full bg-emerald-600 text-white flex items-center justify-center shadow-lg"><i class="fa-solid fa-play text-xs"></i></span>' : ''}
                </a>
                <div class="p-4 flex flex-col gap-2 flex-1">
                    <h3 class="font-bold text-white group-hover:text-indigo-300 transition-colors truncate">${escapeHtml(game.title)}</h3>
                    <p class="text-xs text-gray-400 line-clamp-2 flex-1">${escapeHtml(game.shortDescription)}</p>
                    <div class="flex items-center justify-between gap-2 pt-1">
                        <span class="text-[10px] font-bold uppercase tracking-wider text-indigo-400 bg-indigo-500/10 border border-indigo-500/30 px-2 py-0.5 rounded-md">${escapeHtml(game.genre || game.category || 'Game')}</span>
                        ${game.playOnline ? `<button type="button" data-bs-play="${escapeHtml(game.id)}" class="text-xs font-bold text-emerald-400 hover:text-emerald-300 transition-colors flex items-center gap-1.5"><i class="fa-solid fa-circle-play"></i> Play Now</button>` : ''}
                    </div>
                </div>
            </article>`;
    }

    /* ---------- Homepage carousel ---------- */

    async function renderCarousel() {
        const container = document.getElementById('original-games-carousel');
        if (!container) return;
        const games = await load();
        const sorted = [...games].sort((a, b) => (b.featured ? 1 : 0) - (a.featured ? 1 : 0));
        if (!sorted.length) {
            container.innerHTML = '<p class="text-gray-400 text-sm py-8">Our in-house games are coming soon.</p>';
            return;
        }
        container.innerHTML = sorted.map(carouselCard).join('');
    }

    /* ---------- Collection page (filtered grid) ---------- */

    async function renderCollectionGrid() {
        const grid = document.getElementById('bs-games-grid');
        const chipsBar = document.getElementById('bs-filter-chips');
        const searchInput = document.getElementById('bs-games-search');
        const countEl = document.getElementById('bs-games-count');
        if (!grid) return;

        const games = await load();
        let activeCategory = 'all';
        let query = '';

        const categories = [];
        games.forEach(g => {
            const key = normalizeKey(g.category);
            if (key && !categories.some(c => c.key === key)) {
                categories.push({ key, name: g.category });
            }
        });

        if (countEl) countEl.textContent = String(games.length);

        if (chipsBar) {
            const chips = [{ key: 'all', name: 'All Games' }]
                .concat(categories.map(c => ({ key: c.key, name: c.name })));
            chipsBar.innerHTML = chips.map((c, i) => `
                <button type="button" data-bs-category="${escapeHtml(c.key)}"
                    class="bs-chip px-4 py-2 rounded-xl text-xs font-bold uppercase tracking-wider border transition-all ${i === 0 ? 'active' : ''}">
                    ${escapeHtml(c.name)}
                </button>`).join('');
            chipsBar.addEventListener('click', e => {
                const chip = e.target.closest('[data-bs-category]');
                if (!chip) return;
                activeCategory = chip.dataset.bsCategory;
                chipsBar.querySelectorAll('.bs-chip').forEach(el => el.classList.remove('active'));
                chip.classList.add('active');
                draw();
            });
        }

        if (searchInput) {
            searchInput.addEventListener('input', () => {
                query = searchInput.value.trim().toLowerCase();
                draw();
            });
        }

        function matches(game) {
            const inCategory = activeCategory === 'all' || normalizeKey(game.category) === activeCategory;
            const inQuery = !query
                || String(game.title).toLowerCase().includes(query)
                || String(game.shortDescription).toLowerCase().includes(query)
                || (Array.isArray(game.tags) && game.tags.some(t => String(t).toLowerCase().includes(query)));
            return inCategory && inQuery;
        }

        function draw() {
            const filtered = games.filter(matches);
            if (countEl) countEl.textContent = String(filtered.length);
            if (!filtered.length) {
                grid.innerHTML = '<div class="col-span-full py-12 text-center text-gray-400 bg-slate-900/80 rounded-2xl border border-slate-800"><p class="text-sm px-4">No in-house games match your filters yet.</p></div>';
                return;
            }
            grid.innerHTML = filtered.map(gridCard).join('');
        }

        draw();
    }

    /* ---------- Dynamic details page ---------- */

    async function renderDetailPage() {
        const root = document.getElementById('bs-game-detail');
        if (!root) return;
        const params = new URLSearchParams(global.location.search);
        const id = params.get('id') || params.get('game');
        const games = await load();
        const game = id ? findById(games, id) : null;

        const loading = document.getElementById('bs-game-loading');
        const notFound = document.getElementById('bs-game-notfound');
        if (loading) loading.classList.add('hidden');

        if (!game) {
            if (notFound) notFound.classList.remove('hidden');
            return;
        }

        document.title = game.title + ' | Bekeirat Software';
        const metaDesc = document.getElementById('meta-description');
        if (metaDesc) metaDesc.setAttribute('content', game.shortDescription || `Play ${game.title} by Bekeirat Software.`);
        const canonical = document.querySelector('link[rel="canonical"]');
        if (canonical) canonical.setAttribute('href', global.location.href);

        const rootResolved = siteRoot();
        const screenshots = (game.screenshots || []).map(s => `
            <div class="slider-item flex justify-center items-center shrink-0 w-full">
                <img src="${escapeHtml(resolvePath(s.src))}" alt="${escapeHtml(s.alt || game.title)}" loading="lazy"
                    class="max-h-[60vh] object-contain rounded-xl border border-slate-700 hover:scale-105 transition-transform cursor-pointer"
                    onerror="this.src='${rootResolved}assets/gamepad.svg'">
            </div>`).join('');

        const trailers = (game.trailers || []).map(t => `
            <div class="slider-item aspect-video relative bg-black shrink-0 w-full">
                <iframe src="${escapeHtml(t.url)}" class="w-full h-full border-none" title="${escapeHtml(t.title || 'Gameplay Trailer')}" allowfullscreen loading="lazy"></iframe>
            </div>`).join('');

        const features = (game.features || []).map(f => `
            <li class="flex items-start gap-3 bg-slate-950/40 p-3 rounded-xl border border-slate-800">
                <span class="text-xl shrink-0">${escapeHtml(f.icon || '🎮')}</span>
                <div><strong class="text-white font-semibold">${escapeHtml(f.title)}:</strong>
                <span class="text-gray-300">${escapeHtml(f.text)}</span></div>
            </li>`).join('');

        const playBtn = game.play && game.play.available && game.playOnline
            ? `<button id="live-play-btn" data-bs-play="${escapeHtml(game.id)}"
                    class="w-full py-3.5 px-4 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold transition-all shadow-lg shadow-emerald-600/20 flex items-center justify-center gap-2 cursor-pointer">
                    <i class="fa-solid fa-play text-sm"></i> Play Instant Web Version
                </button>` : '';

        const storeBtns = (game.stores || []).map(s => {
            const meta = STORE_META[s.platform] || STORE_META.default;
            const iconEl = `<i class="${escapeHtml(s.icon || meta.icon)} text-lg group-hover:scale-110 transition-transform"></i>`;
            return `
                <a href="${escapeHtml(s.url)}" target="_blank" rel="noopener"
                    class="w-full py-3.5 px-4 rounded-xl bg-gradient-to-r ${escapeHtml(meta.classes)} font-semibold border transition-all flex items-center justify-center gap-2 group shadow-lg">
                    ${iconEl} ${escapeHtml(s.label)}
                </a>`;
        }).join('');

        const paragraphs = (game.description || []).map(p => `<p class="text-gray-300 leading-relaxed text-base">${escapeHtml(p)}</p>`).join('');

        root.innerHTML = `
            <div class="relative rounded-3xl overflow-hidden border border-indigo-500/30 shadow-2xl bg-slate-900 group">
                <img src="${escapeHtml(resolvePath(game.banner || game.thumbnail))}" alt="${escapeHtml(game.title)} Banner"
                    class="w-full h-64 md:h-96 object-cover group-hover:scale-105 transition-transform duration-700"
                    onerror="this.src='${rootResolved}assets/gamepad.svg'">
                <div class="absolute inset-0 bg-gradient-to-t from-slate-950 via-slate-950/40 to-transparent p-6 md:p-10 flex flex-col justify-end">
                    <div>
                        <div class="flex flex-wrap items-center gap-2 mb-3">
                            <span class="px-3.5 py-1 rounded-full text-xs font-extrabold uppercase tracking-wider bg-indigo-600 text-white shadow-md inline-block border border-indigo-400/40">Original Game</span>
                            <span class="px-3.5 py-1 rounded-full text-xs font-semibold uppercase bg-emerald-500/20 text-emerald-400 border border-emerald-500/30">${escapeHtml(game.genre || '')}</span>
                            <span class="px-3.5 py-1 rounded-full text-xs font-semibold bg-slate-800/90 text-gray-300 border border-slate-700">v${escapeHtml(game.version || '1.0')}</span>
                        </div>
                        <h1 class="text-3xl md:text-5xl font-black text-white drop-shadow-md font-poppins tracking-wide">${escapeHtml(game.title)}</h1>
                    </div>
                </div>
            </div>

            <div class="grid grid-cols-1 lg:grid-cols-3 gap-8 items-start">
                <div class="lg:col-span-2 space-y-8 min-w-0">
                    <section class="bg-slate-900/80 p-6 md:p-8 rounded-3xl border border-slate-800 shadow-xl space-y-4">
                        <h2 class="text-2xl font-bold text-cyan-400 border-b border-slate-800 pb-3 flex items-center gap-2 font-poppins">
                            <i class="fa-solid fa-gamepad"></i> About The Game
                        </h2>
                        ${paragraphs}
                    </section>

                    ${features ? `
                    <section class="bg-slate-900/80 p-6 md:p-8 rounded-3xl border border-slate-800 shadow-xl space-y-4">
                        <h2 class="text-2xl font-bold text-amber-400 border-b border-slate-800 pb-3 flex items-center gap-2 font-poppins">
                            <i class="fa-solid fa-star"></i> Key Features
                        </h2>
                        <ul class="space-y-4 text-gray-300">${features}</ul>
                    </section>` : ''}

                    ${trailers ? `
                    <section class="bg-slate-900/80 p-6 md:p-8 rounded-3xl border border-slate-800 shadow-xl space-y-6">
                        <h2 class="text-xl font-bold text-red-400 flex items-center gap-2 font-poppins">
                            <i class="fa-solid fa-circle-play"></i> Game Trailers
                        </h2>
                        <div class="relative group video-slider-wrapper">
                            <button type="button" class="prev-btn absolute left-2 top-1/2 -translate-y-1/2 z-10 w-10 h-10 rounded-full bg-black/70 hover:bg-cyan-400 hover:text-black text-cyan-400 border border-cyan-400 flex items-center justify-center transition-all cursor-pointer" aria-label="Previous Slide">&#10094;</button>
                            <div class="snap-slider rounded-2xl overflow-hidden bg-slate-950 border border-slate-800 shadow-lg">${trailers}</div>
                            <button type="button" class="next-btn absolute right-2 top-1/2 -translate-y-1/2 z-10 w-10 h-10 rounded-full bg-black/70 hover:bg-cyan-400 hover:text-black text-cyan-400 border border-cyan-400 flex items-center justify-center transition-all cursor-pointer" aria-label="Next Slide">&#10095;</button>
                        </div>
                    </section>` : ''}

                    ${screenshots ? `
                    <section class="bg-slate-900/80 p-6 md:p-8 rounded-3xl border border-slate-800 shadow-xl space-y-6">
                        <h2 class="text-xl font-bold text-emerald-400 flex items-center gap-2 font-poppins">
                            <i class="fa-solid fa-images"></i> Game Screenshots
                        </h2>
                        <div class="relative group screenshot-slider-wrapper">
                            <button type="button" class="prev-btn absolute left-2 top-1/2 -translate-y-1/2 z-10 w-10 h-10 rounded-full bg-black/70 hover:bg-cyan-400 hover:text-black text-cyan-400 border border-cyan-400 flex items-center justify-center transition-all cursor-pointer" aria-label="Previous Slide">&#10094;</button>
                            <div class="snap-slider rounded-2xl bg-slate-950 p-4 border border-slate-800 gap-4">${screenshots}</div>
                            <button type="button" class="next-btn absolute right-2 top-1/2 -translate-y-1/2 z-10 w-10 h-10 rounded-full bg-black/70 hover:bg-cyan-400 hover:text-black text-cyan-400 border border-cyan-400 flex items-center justify-center transition-all cursor-pointer" aria-label="Next Slide">&#10095;</button>
                        </div>
                    </section>` : ''}
                </div>

                <div class="lg:sticky lg:top-24 space-y-6">
                    <div class="bg-slate-900/95 p-6 md:p-8 rounded-3xl border border-indigo-500/30 shadow-2xl space-y-6">
                        <div class="text-center space-y-2">
                            <h3 class="text-xl font-bold text-yellow-400 bg-yellow-400/10 border border-yellow-400/30 py-2.5 rounded-2xl animate-gold-glow font-poppins">🎉 Play or Download Now</h3>
                            <p class="text-xs text-gray-400">Available on browser, desktop, and mobile.</p>
                        </div>
                        <div class="flex flex-col gap-3">
                            ${playBtn}
                            ${storeBtns}
                            ${(!playBtn && !storeBtns) ? '<p class="text-sm text-gray-400 text-center py-4">This game is not published yet. Check back soon!</p>' : ''}
                        </div>
                        <div class="pt-4 border-t border-slate-800 text-center space-y-3">
                            <p class="text-xs font-bold text-gray-400 uppercase tracking-wider">Share This Game</p>
                            <div class="grid grid-cols-3 gap-2">
                                <a href="#" data-share="whatsapp" target="_blank" rel="noopener" class="py-2.5 rounded-xl bg-emerald-600/20 text-emerald-400 hover:bg-emerald-600 hover:text-white transition-all flex items-center justify-center"><i class="fa-brands fa-whatsapp text-lg"></i></a>
                                <a href="#" data-share="twitter" target="_blank" rel="noopener" class="py-2.5 rounded-xl bg-slate-800 text-white hover:bg-black transition-all flex items-center justify-center"><i class="fa-brands fa-x-twitter text-lg"></i></a>
                                <a href="#" data-share="facebook" target="_blank" rel="noopener" class="py-2.5 rounded-xl bg-blue-600/20 text-blue-400 hover:bg-blue-600 hover:text-white transition-all flex items-center justify-center"><i class="fa-brands fa-facebook-f text-lg"></i></a>
                                <a href="#" data-share="linkedin" target="_blank" rel="noopener" class="py-2.5 rounded-xl bg-blue-700/20 text-blue-300 hover:bg-blue-700 hover:text-white transition-all flex items-center justify-center"><i class="fa-brands fa-linkedin-in text-lg"></i></a>
                                <a href="#" data-share="reddit" target="_blank" rel="noopener" class="py-2.5 rounded-xl bg-orange-600/20 text-orange-400 hover:bg-orange-600 hover:text-white transition-all flex items-center justify-center"><i class="fa-brands fa-reddit-alien text-lg"></i></a>
                                <a href="#" data-share="telegram" target="_blank" rel="noopener" class="py-2.5 rounded-xl bg-sky-500/20 text-sky-400 hover:bg-sky-500 hover:text-white transition-all flex items-center justify-center"><i class="fa-brands fa-telegram text-lg"></i></a>
                            </div>
                        </div>
                        ${game.privacyPolicy ? `<p class="text-center text-xs text-gray-500"><a href="${escapeHtml(resolvePath(game.privacyPolicy))}" class="hover:text-gray-300 underline transition-colors">Privacy Policy</a></p>` : ''}
                    </div>
                </div>
            </div>

            <section class="bg-slate-900/80 p-6 md:p-8 rounded-3xl border border-slate-800 shadow-xl">
                <h2 class="text-xl font-bold text-indigo-400 flex items-center gap-2 font-poppins mb-4">
                    <i class="fa-solid fa-circle-info"></i> Game Info
                </h2>
                <dl class="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                    <div><dt class="text-gray-500 uppercase text-[10px] font-bold tracking-wider">Developer</dt><dd class="text-gray-200 font-semibold mt-1">Bekeirat Software</dd></div>
                    <div><dt class="text-gray-500 uppercase text-[10px] font-bold tracking-wider">Genre</dt><dd class="text-gray-200 font-semibold mt-1">${escapeHtml(game.genre || '—')}</dd></div>
                    <div><dt class="text-gray-500 uppercase text-[10px] font-bold tracking-wider">Version</dt><dd class="text-gray-200 font-semibold mt-1">${escapeHtml(game.version || '—')}</dd></div>
                    <div><dt class="text-gray-500 uppercase text-[10px] font-bold tracking-wider">Released</dt><dd class="text-gray-200 font-semibold mt-1">${escapeHtml(game.releaseDate || '—')}</dd></div>
                    <div><dt class="text-gray-500 uppercase text-[10px] font-bold tracking-wider">Rating</dt><dd class="text-gray-200 font-semibold mt-1">${escapeHtml(game.rating || 'Everyone')}</dd></div>
                    <div><dt class="text-gray-500 uppercase text-[10px] font-bold tracking-wider">Languages</dt><dd class="text-gray-200 font-semibold mt-1">${escapeHtml((game.languages || []).join(', ') || 'English')}</dd></div>
                    <div><dt class="text-gray-500 uppercase text-[10px] font-bold tracking-wider">Category</dt><dd class="text-gray-200 font-semibold mt-1">${escapeHtml(game.category || '—')}</dd></div>
                    <div><dt class="text-gray-500 uppercase text-[10px] font-bold tracking-wider">Plays Online</dt><dd class="text-gray-200 font-semibold mt-1">${game.playOnline ? 'Yes' : 'No'}</dd></div>
                </dl>
            </section>`;

        bindSliders(root);
        bindLightbox(root);
        bindShareLinks(game);
    }

    /* ---------- Live-play popup with maximize ---------- */

    let popupState = { frame: null, game: null };

    async function openPlayPopup(gameId) {
        const games = await load();
        const game = findById(games, gameId);
        if (!game || !game.play || !game.play.available) return;

        const overlay = document.getElementById('bs-play-popup');
        if (!overlay) return;

        popupState.game = game;
        const frame = document.getElementById('bs-play-frame');
        const titleEl = document.getElementById('bs-play-title');
        if (titleEl) titleEl.textContent = game.title;
        frame.src = resolvePath(game.play.url);
        popupState.frame = frame;

        overlay.classList.remove('hidden');
        overlay.classList.add('flex');
        document.documentElement.style.overflow = 'hidden';
        document.body.style.overflow = 'hidden';
    }

    function closePlayPopup() {
        const overlay = document.getElementById('bs-play-popup');
        if (!overlay) return;
        if (document.fullscreenElement) {
            document.exitFullscreen().catch(() => { });
        }
        overlay.classList.add('hidden');
        overlay.classList.remove('flex');
        if (popupState.frame) {
            popupState.frame.src = 'about:blank';
            popupState.frame = null;
        }
        popupState.game = null;
        document.documentElement.style.overflow = '';
        document.body.style.overflow = '';
    }

    function togglePopupMaximize() {
        const stage = document.getElementById('bs-play-stage');
        if (!stage) return;
        if (!document.fullscreenElement) {
            const req = stage.requestFullscreen || stage.webkitRequestFullscreen || stage.msRequestFullscreen;
            if (req) req.call(stage);
        } else {
            document.exitFullscreen().catch(() => { });
        }
    }

    function updateMaximizeIcon() {
        const btn = document.getElementById('bs-play-maximize');
        if (!btn) return;
        const isFull = Boolean(document.fullscreenElement);
        btn.innerHTML = isFull
            ? '<i class="fa-solid fa-compress text-sm"></i>'
            : '<i class="fa-solid fa-expand text-sm"></i>';
        btn.setAttribute('aria-label', isFull ? 'Exit maximize' : 'Maximize game screen');
    }

    function bindPlayPopup() {
        const overlay = document.getElementById('bs-play-popup');
        if (!overlay || overlay.dataset.bsBound) return;
        overlay.dataset.bsBound = '1';

        document.addEventListener('click', e => {
            const trigger = e.target.closest('[data-bs-play]');
            if (trigger) {
                e.preventDefault();
                openPlayPopup(trigger.dataset.bsPlay);
                return;
            }
            if (e.target.closest('#bs-play-close') || e.target === overlay) {
                closePlayPopup();
            }
        });

        const maximizeBtn = document.getElementById('bs-play-maximize');
        if (maximizeBtn) maximizeBtn.addEventListener('click', togglePopupMaximize);
        document.addEventListener('fullscreenchange', updateMaximizeIcon);
        document.addEventListener('keydown', e => {
            if (e.key === 'Escape' && !overlay.classList.contains('hidden')) closePlayPopup();
        });
    }

    /* ---------- Sliders / lightbox / share (details page) ---------- */

    function bindSliders(scope) {
        scope.querySelectorAll('.video-slider-wrapper, .screenshot-slider-wrapper').forEach(wrapper => {
            const slider = wrapper.querySelector('.snap-slider');
            const prev = wrapper.querySelector('.prev-btn');
            const next = wrapper.querySelector('.next-btn');
            if (!slider || !prev || !next) return;
            next.addEventListener('click', () => {
                if (slider.scrollLeft >= slider.scrollWidth - slider.clientWidth - 10) {
                    slider.scrollTo({ left: 0, behavior: 'smooth' });
                } else {
                    slider.scrollBy({ left: slider.clientWidth, behavior: 'smooth' });
                }
            });
            prev.addEventListener('click', () => {
                if (slider.scrollLeft <= 10) {
                    slider.scrollTo({ left: slider.scrollWidth, behavior: 'smooth' });
                } else {
                    slider.scrollBy({ left: -slider.clientWidth, behavior: 'smooth' });
                }
            });
        });
    }

    function bindLightbox(scope) {
        const modal = document.getElementById('bs-lightbox');
        const img = document.getElementById('bs-lightbox-img');
        if (!modal || !img) return;
        scope.querySelectorAll('.screenshot-slider-wrapper img').forEach(el => {
            el.addEventListener('click', () => {
                img.src = el.src;
                modal.classList.remove('hidden');
                modal.classList.add('flex');
            });
        });
        const close = () => {
            modal.classList.add('hidden');
            modal.classList.remove('flex');
        };
        modal.addEventListener('click', e => {
            if (e.target === modal || e.target.closest('#bs-lightbox-close')) close();
        });
        document.addEventListener('keydown', e => {
            if (e.key === 'Escape') close();
        });
    }

    function bindShareLinks(game) {
        const url = encodeURIComponent(global.location.href);
        const title = encodeURIComponent(game.title + ' — Bekeirat Software');
        const targets = {
            whatsapp: `https://wa.me/?text=${title}%20${url}`,
            twitter: `https://x.com/intent/tweet?url=${url}&text=${title}`,
            facebook: `https://www.facebook.com/sharer/sharer.php?u=${url}`,
            linkedin: `https://www.linkedin.com/sharing/share-offsite/?url=${url}`,
            reddit: `https://www.reddit.com/submit?url=${url}&title=${title}`,
            telegram: `https://t.me/share/url?url=${url}&text=${title}`
        };
        document.querySelectorAll('[data-share]').forEach(a => {
            const href = targets[a.dataset.share];
            if (href) a.href = href;
        });
    }

    /* ---------- Auto-init per page ---------- */

    document.addEventListener('DOMContentLoaded', () => {
        bindPlayPopup();
        if (document.getElementById('original-games-carousel')) renderCarousel();
        if (document.getElementById('bs-games-grid')) renderCollectionGrid();
        if (document.getElementById('bs-game-detail')) renderDetailPage();
    });

    global.BSGames = { load, findById, openPlayPopup, closePlayPopup, detailUrl, resolvePath };
})(window);
