(() => {
  'use strict';

  const REPO_BASE = 'https://raw.githubusercontent.com/3worksmoulay-lab/TriviaData/main';
  const INITIAL_SCORE = 50;

  const AD_CONFIG = {
    bypassQuestionAd: {
      placementId: 'PLACEHOLDER_TV_BYPASS_PLACEMENT_ID',
      provider: 'PLACEHOLDER_AD_PROVIDER',
      rewarded: true,
      pointDeltaOnBypass: 0
    },
    topUpScoreAd: {
      placementId: 'PLACEHOLDER_TV_TOPUP_PLACEMENT_ID',
      provider: 'PLACEHOLDER_AD_PROVIDER',
      rewarded: true,
      topUpPoints: 150
    },
    bottomBannerAd: {
      placementId: 'PLACEHOLDER_BOTTOM_BANNER_PLACEMENT_ID',
      provider: 'PLACEHOLDER_AD_PROVIDER',
      enabled: true,
      excludeHomeScreen: true
    }
  };

  const WEEKLY_REWARD_POOL = {
    topPoolSize: 5,
    periodLabel: 'Weekly Top 5 Pool',
    awards: [
      { id: 'aw1', name: 'Global Book & Media Card', minScore: 500, tier: 'Top 5 Pool' },
      { id: 'aw2', name: 'Digital Game Store Voucher', minScore: 900, tier: 'Top 5 Pool' },
      { id: 'aw3', name: 'Travel & Map Gear Pass', minScore: 1300, tier: 'Top 5 Pool' },
      { id: 'aw4', name: 'Streaming & Audio Card', minScore: 1700, tier: 'Top 5 Pool' },
      { id: 'aw5', name: 'Tech & Accessories Card', minScore: 2200, tier: 'Top 5 Pool' },
      { id: 'aw6', name: 'Grand Explorer Gift Card', minScore: 2800, tier: 'Top 5 Pool' }
    ]
  };

  function triggerAdPlaceholder(adSpec, onComplete) {
    if (typeof onComplete === 'function') {
      onComplete({
        placementId: adSpec.placementId,
        provider: adSpec.provider,
        verified: true
      });
    }
  }

  function syncBottomBannerForScreen(screenId) {
    const slot = document.getElementById('bottom-banner-ad-slot');
    const placementText = document.getElementById('banner-ad-placement-text');
    if (!slot) return;

    const shouldShow =
      AD_CONFIG.bottomBannerAd.enabled &&
      !(AD_CONFIG.bottomBannerAd.excludeHomeScreen && screenId === 'screen-home');

    slot.classList.toggle('hidden', !shouldShow);
    if (shouldShow && placementText) {
      placementText.textContent = `${AD_CONFIG.bottomBannerAd.provider} • ${AD_CONFIG.bottomBannerAd.placementId}`;
    }
  }

  function getLevelCompletionBonus(level) {
    const clamped = Math.max(1, Math.min(10, Number(level) || 1));
    return 200 + (clamped - 1) * 75;
  }

  const LANGUAGE_META = {
    En: { name: 'English', flagFile: 'En.png', dir: 'ltr' },
    Es: { name: 'Español', flagFile: 'Es.png', dir: 'ltr' },
    Fr: { name: 'Français', flagFile: 'Fr.png', dir: 'ltr' },
    Ar: { name: 'العربية', flagFile: 'Ar.png', dir: 'rtl' }
  };

  const DEFAULT_APP_JSON = {
    appName: 'Geography Trivia',
    version: '1.0',
    defaultLanguage: 'En',
    supportedLanguages: ['En', 'Es', 'Fr', 'Ar'],
    directories: {
      app: 'Geography_Trivia_App',
      appAssets: 'Geography_Trivia_App/assets',
      commons: 'Commons',
      audio: 'Commons/Audio',
      backgrounds: 'Commons/Backgrounds',
      langFlags: 'Commons/LangFlags',
      achievements: 'Commons/Achievements',
      topics: 'Topics'
    },
    assets: {
      appIcon: 'App_icon.png',
      favIcon: 'favicon.png',
      ambientMusic: 'ambient1.mp3'
    },
    selectedTopics: ['landmarks', 'flags', 'capitals']
  };

  const DEFAULT_STRINGS = {
    En: {
      appTitle: 'GEOGRAPHY TRIVIA',
      settingsTitle: 'SETTINGS & INFO',
      sfxMute: 'SFX Audio',
      ambientMute: 'Ambient Music',
      sfxVolume: 'SFX Volume',
      ambientVolume: 'Ambient Volume',
      aboutUs: 'About Us',
      privacyPolicy: 'Privacy Policy',
      selectLanguage: 'Select Language',
      notifications: 'NOTIFICATIONS',
      play: 'PLAY',
      bonusGames: 'BONUS GAMES',
      missions: 'MISSIONS',
      leaderboard: 'LEADERBOARD',
      footer: 'Bekeirat Software - 2026',
      home: 'HOME',
      backToPlay: 'PLAY',
      level: 'Level',
      score: 'SCORE',
      loadingQuiz: 'Loading Trivia Data...',
      defaultPrompt: 'Identify this geography feature:',
      tvBypass: 'SKIP',
      tvTopUp: '+PTS',
      achievementsTitle: 'ACHIEVEMENTS',
      trophiesEarned: 'TROPHIES',
      bonusEarned: 'LEVEL BONUS',
      rewardAwards: 'REWARD AWARDS',
      missionGo: 'GO',
      missionDone: 'DONE',
      statusCompleted: 'Completed',
      statusPending: 'In Progress',
      personalBest: 'YOUR BEST SCORE',
      maxLevel: 'MAX LEVEL REACHED'
    },
    Es: {
      appTitle: 'TRIVIA GEOGRÁFICA',
      settingsTitle: 'AJUSTES E INFO',
      sfxMute: 'Audio SFX',
      ambientMute: 'Música Ambiental',
      sfxVolume: 'Volumen SFX',
      ambientVolume: 'Volumen Ambiental',
      aboutUs: 'Sobre Nosotros',
      privacyPolicy: 'Política de Privacidad',
      selectLanguage: 'Seleccionar Idioma',
      notifications: 'NOTIFICACIONES',
      play: 'JUGAR',
      bonusGames: 'JUEGOS EXTRA',
      missions: 'MISIONES',
      leaderboard: 'CLASIFICACIÓN',
      footer: 'Bekeirat Software - 2026',
      home: 'INICIO',
      backToPlay: 'JUGAR',
      level: 'Nivel',
      score: 'PUNTOS',
      loadingQuiz: 'Cargando preguntas...',
      defaultPrompt: 'Identifica este elemento geográfico:',
      tvBypass: 'OMITIR',
      tvTopUp: '+PTS',
      achievementsTitle: 'LOGROS',
      trophiesEarned: 'TROFEOS',
      bonusEarned: 'BONO NIVEL',
      rewardAwards: 'PREMIOS',
      missionGo: 'IR',
      missionDone: 'HECHO',
      statusCompleted: 'Completada',
      statusPending: 'En progreso',
      personalBest: 'MEJOR PUNTUACIÓN',
      maxLevel: 'NIVEL MÁXIMO'
    },
    Fr: {
      appTitle: 'TRIVIA GÉOGRAPHIE',
      settingsTitle: 'PARAMÈTRES & INFOS',
      sfxMute: 'Audio SFX',
      ambientMute: 'Musique Ambiante',
      sfxVolume: 'Volume SFX',
      ambientVolume: 'Volume Ambiant',
      aboutUs: 'À Propos',
      privacyPolicy: 'Politique de Confidentialité',
      selectLanguage: 'Choisir la Langue',
      notifications: 'NOTIFICATIONS',
      play: 'JOUER',
      bonusGames: 'JEUX BONUS',
      missions: 'MISSIONS',
      leaderboard: 'CLASSEMENT',
      footer: 'Bekeirat Software - 2026',
      home: 'ACCUEIL',
      backToPlay: 'JOUER',
      level: 'Niveau',
      score: 'SCORE',
      loadingQuiz: 'Chargement des données...',
      defaultPrompt: 'Identifiez ce lieu géographique :',
      tvBypass: 'PASSER',
      tvTopUp: '+PTS',
      achievementsTitle: 'SUCCÈS',
      trophiesEarned: 'TROPHÉES',
      bonusEarned: 'BONUS NIVEAU',
      rewardAwards: 'RÉCOMPENSES',
      missionGo: 'ALLER',
      missionDone: 'TERMINÉ',
      statusCompleted: 'Terminée',
      statusPending: 'En cours',
      personalBest: 'MEILLEUR SCORE',
      maxLevel: 'NIVEAU MAX'
    },
    Ar: {
      appTitle: 'تريفيا الجغرافيا',
      settingsTitle: 'الإعدادات والمعلومات',
      sfxMute: 'المؤثرات الصوتية',
      ambientMute: 'الموسيقى الخلفية',
      sfxVolume: 'مستوى المؤثرات',
      ambientVolume: 'مستوى الموسيقى',
      aboutUs: 'من نحن',
      privacyPolicy: 'سياسة الخصوصية',
      selectLanguage: 'اختر اللغة',
      notifications: 'الإشعارات',
      play: 'العب',
      bonusGames: 'ألعاب إضافية',
      missions: 'المهام',
      leaderboard: 'لوحة الصدارة',
      footer: 'Bekeirat Software - 2026',
      home: 'الرئيسية',
      backToPlay: 'العب',
      level: 'المستوى',
      score: 'النقاط',
      loadingQuiz: 'جارٍ تحميل الأسئلة...',
      defaultPrompt: 'حدد هذا المعلم الجغرافي:',
      tvBypass: 'تخطٍ',
      tvTopUp: '+نقاط',
      achievementsTitle: 'الإنجازات',
      trophiesEarned: 'الكؤوس',
      bonusEarned: 'مكافأة المستوى',
      rewardAwards: 'الجوائز',
      missionGo: 'ابدأ',
      missionDone: 'مكتمل',
      statusCompleted: 'مكتملة',
      statusPending: 'قيد التنفيذ',
      personalBest: 'أعلى نقاطك',
      maxLevel: 'أقصى مستوى'
    }
  };

  let appConfig = structuredClone(DEFAULT_APP_JSON);
  let stringsTable = structuredClone(DEFAULT_STRINGS);
  let activeLang = 'En';

  const STORAGE_KEY = 'DraftbitDeviceVariables_GeoTrivia_v8';

  const DEFAULT_DEVICE_VARS = {
    currentLevel: 1,
    currentScore: INITIAL_SCORE,
    highScore: INITIAL_SCORE,
    maxLevelReached: 1,
    levelBonusPoints: 0,
    completedLevels: [],
    sfxMuted: false,
    sfxVolume: 80,
    ambientMuted: false,
    ambientVolume: 45,
    missions: [
      { id: 'm1', titleKey: 'play', completed: false },
      { id: 'm2', titleKey: 'bonusGames', completed: false },
      { id: 'm3', titleKey: 'leaderboard', completed: false },
      { id: 'm4', titleKey: 'selectLanguage', completed: false },
      { id: 'm5', titleKey: 'level', completed: false },
      { id: 'm6', titleKey: 'score', completed: false }
    ],
    leaderboard: [
      { name: 'AtlasMaster', score: 1200, level: 6, isPlayer: false },
      { name: 'GlobeTrotter', score: 850, level: 4, isPlayer: false },
      { name: 'CompassPro', score: 500, level: 3, isPlayer: false },
      { name: 'You', score: INITIAL_SCORE, level: 1, isPlayer: true }
    ]
  };

  let DeviceVars = loadDeviceVars();

  function loadDeviceVars() {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (!raw) return structuredClone(DEFAULT_DEVICE_VARS);
      return { ...structuredClone(DEFAULT_DEVICE_VARS), ...JSON.parse(raw) };
    } catch {
      return structuredClone(DEFAULT_DEVICE_VARS);
    }
  }

  function syncPlayerScore(newScore, newLevel) {
    if (typeof newScore === 'number') {
      DeviceVars.currentScore = Math.max(0, newScore);
      if (DeviceVars.currentScore > DeviceVars.highScore) {
        DeviceVars.highScore = DeviceVars.currentScore;
      }
    }
    if (typeof newLevel === 'number') {
      DeviceVars.currentLevel = Math.max(1, Math.min(10, newLevel));
      DeviceVars.maxLevelReached = Math.max(DeviceVars.maxLevelReached, DeviceVars.currentLevel);
    }
    const player = DeviceVars.leaderboard.find((e) => e.isPlayer);
    if (player) {
      player.score = Math.max(DeviceVars.currentScore, DeviceVars.highScore);
      player.level = Math.max(DeviceVars.currentLevel, DeviceVars.maxLevelReached);
    }
    DeviceVars.leaderboard.sort((a, b) => b.score - a.score || b.level - a.level);
  }

  function saveDeviceVars() {
    try {
      syncPlayerScore(DeviceVars.currentScore, DeviceVars.currentLevel);
      localStorage.setItem(STORAGE_KEY, JSON.stringify(DeviceVars));
    } catch {
      // Ignore storage errors
    }
  }

  let toastTimer = null;
  function showToast(message) {
    const el = document.getElementById('toast-banner');
    if (!el) return;
    el.textContent = message;
    el.classList.remove('hidden');
    clearTimeout(toastTimer);
    toastTimer = setTimeout(() => el.classList.add('hidden'), 2600);
  }

  function capitalizeTopic(topic) {
    return topic.charAt(0).toUpperCase() + topic.slice(1).toLowerCase();
  }

  function encodeSeg(seg) {
    return encodeURIComponent(seg);
  }

  function getCommonsAudioUrl(fileName) {
    const audioDir = appConfig.directories?.audio || 'Commons/Audio';
    const segments = audioDir.split('/').filter(Boolean).map(encodeSeg).join('/');
    return `${REPO_BASE}/${segments}/${encodeSeg(fileName || 'ambient1.mp3')}`;
  }

  function getAchievementUrl(levelNum, ext = 'png') {
    const achDir = appConfig.directories?.achievements || 'Commons/Achievements';
    const segments = achDir.split('/').filter(Boolean).map(encodeSeg).join('/');
    return `${REPO_BASE}/${segments}/${encodeSeg(`level_${levelNum}.${ext}`)}`;
  }

  function getLangFlagUrl(langCode) {
    const meta = LANGUAGE_META[langCode] || LANGUAGE_META.En;
    return `${REPO_BASE}/${appConfig.directories.langFlags}/${encodeSeg(meta.flagFile)}`;
  }

  function getTopicBgUrl(topic) {
    return `${REPO_BASE}/${appConfig.directories.topics}/${topic}/${encodeSeg(`${topic}_bg.png`)}`;
  }

  function getTopicDataUrl(topic, langCode) {
    const fileName = `${langCode}${capitalizeTopic(topic)}Data.json`;
    return `${REPO_BASE}/${appConfig.directories.topics}/${topic}/${encodeSeg(fileName)}`;
  }

  function resolveTopicImageUrl(topic, imageField) {
    if (!imageField) return '';
    if (imageField.startsWith('http') || imageField.startsWith('data:')) return imageField;
    return `${REPO_BASE}/${appConfig.directories.topics}/${topic}/${topic}_images/${encodeSeg(imageField)}`;
  }

  /* ============================================================================
   * PRE-DECODED BITMAP CACHE & INSTANT DOM SWAP
   * ========================================================================== */
  const preloadedImgMap = new Map();

  function acquireDecodedImage(url) {
    if (!url) return Promise.resolve(null);
    if (preloadedImgMap.has(url)) {
      return preloadedImgMap.get(url).ready;
    }

    const img = new Image();
    img.decoding = 'sync';
    img.loading = 'eager';
    img.alt = 'Geography Clue';
    img.width = 600;
    img.height = 600;

    const ready = new Promise((resolve) => {
      const finish = () => {
        if (typeof img.decode === 'function') {
          img.decode().then(() => resolve(img)).catch(() => resolve(img));
        } else {
          resolve(img);
        }
      };
      if (img.complete && img.naturalWidth > 0) {
        finish();
      } else {
        img.onload = finish;
        img.onerror = () => resolve(img);
      }
    });

    img.src = url;
    preloadedImgMap.set(url, { img, ready });
    return ready;
  }

  function warmQueueImages(queue, startIndex) {
    if (!Array.isArray(queue) || !queue.length) return;
    const count = Math.min(queue.length, 5);
    for (let offset = 0; offset < count; offset++) {
      const q = queue[(startIndex + offset) % queue.length];
      if (q?.resolvedImage) {
        acquireDecodedImage(q.resolvedImage);
      }
    }
  }

  async function mountQuestionImage(url) {
    const box = document.getElementById('question-square-box');
    if (!box) return;

    if (!url) {
      const existing = document.getElementById('question-image');
      if (existing) existing.src = '';
      return;
    }

    const cached = preloadedImgMap.get(url);
    const decodedImg = cached ? await cached.ready : await acquireDecodedImage(url);

    const activeImg = document.getElementById('question-image');
    if (decodedImg && decodedImg.naturalWidth > 0) {
      const clone = decodedImg.cloneNode(true);
      clone.id = 'question-image';
      clone.decoding = 'sync';
      if (activeImg && activeImg.parentNode === box) {
        box.replaceChild(clone, activeImg);
      } else {
        box.appendChild(clone);
      }
    } else if (activeImg) {
      activeImg.src = url;
    }
  }

  function normalizeQuestion(rawItem, topic) {
    const rawLevel = Number(rawItem.Level ?? rawItem.level ?? 1);
    const level = Number.isFinite(rawLevel) ? Math.max(1, Math.min(10, Math.round(rawLevel))) : 1;
    const prompt = rawItem.Question ?? rawItem.prompt ?? t('defaultPrompt');
    const rawImg = rawItem['Image File'] ?? rawItem.image ?? '';

    let choices = rawItem.choices;
    if (!Array.isArray(choices) || choices.length === 0) {
      choices = [
        rawItem.Option1,
        rawItem.Option2,
        rawItem.Option3,
        rawItem.Option4
      ].filter((opt) => opt !== undefined && opt !== null);
    }

    let correctIndex = rawItem['Answer Indix'] ?? rawItem.answerIndex ?? rawItem.correctIndex;
    if (typeof correctIndex !== 'number') {
      const parsed = Number(correctIndex);
      if (!Number.isNaN(parsed)) {
        correctIndex = parsed;
      } else if (rawItem.Answer) {
        const foundIdx = choices.findIndex((c) => c === rawItem.Answer);
        correctIndex = foundIdx >= 0 ? foundIdx : 0;
      } else {
        correctIndex = 0;
      }
    }

    return {
      level,
      prompt,
      choices,
      correctIndex,
      topic,
      resolvedImage: resolveTopicImageUrl(topic, rawImg)
    };
  }

  async function safeFetchJson(url, fallback) {
    try {
      const controller = new AbortController();
      const timer = setTimeout(() => controller.abort(), 5000);
      const res = await fetch(url, { signal: controller.signal, cache: 'force-cache' });
      clearTimeout(timer);
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      return await res.json();
    } catch {
      return fallback;
    }
  }

  /* ============================================================================
   * AUDIO ENGINE & AUTOPLAY UNLOCK
   * ========================================================================== */
  const ambientAudio = new Audio();
  ambientAudio.loop = true;
  let sfxCtx = null;

  function applyAudioSettings() {
    ambientAudio.muted = DeviceVars.ambientMuted;
    ambientAudio.volume = Math.max(0, Math.min(1, DeviceVars.ambientVolume / 100));

    if (!DeviceVars.ambientMuted && ambientAudio.src) {
      ambientAudio.play().catch(() => {});
    } else {
      ambientAudio.pause();
    }

    document.getElementById('sfx-mute-btn').textContent = DeviceVars.sfxMuted ? 'MUTED' : 'ON';
    document.getElementById('sfx-mute-btn').classList.toggle('muted', DeviceVars.sfxMuted);
    document.getElementById('sfx-volume-slider').value = DeviceVars.sfxVolume;
    document.getElementById('sfx-volume-val').textContent = `${DeviceVars.sfxVolume}%`;

    document.getElementById('ambient-mute-btn').textContent = DeviceVars.ambientMuted ? 'MUTED' : 'ON';
    document.getElementById('ambient-mute-btn').classList.toggle('muted', DeviceVars.ambientMuted);
    document.getElementById('ambient-volume-slider').value = DeviceVars.ambientVolume;
    document.getElementById('ambient-volume-val').textContent = `${DeviceVars.ambientVolume}%`;
  }

  function setupAmbientAutoplayUnlock() {
    const unlock = () => {
      if (!DeviceVars.ambientMuted && ambientAudio.src && ambientAudio.paused) {
        ambientAudio.play().then(() => {
          window.removeEventListener('pointerdown', unlock);
          window.removeEventListener('keydown', unlock);
        }).catch(() => {});
      }
    };
    window.addEventListener('pointerdown', unlock);
    window.addEventListener('keydown', unlock);
  }

  function playSfx(freq = 520, type = 'sine', duration = 0.12) {
    if (DeviceVars.sfxMuted || DeviceVars.sfxVolume <= 0) return;
    try {
      if (!sfxCtx) {
        const AudioCtx = window.AudioContext || window.webkitAudioContext;
        sfxCtx = new AudioCtx();
      }
      if (sfxCtx.state === 'suspended') sfxCtx.resume();
      const osc = sfxCtx.createOscillator();
      const gain = sfxCtx.createGain();
      osc.type = type;
      osc.frequency.setValueAtTime(freq, sfxCtx.currentTime);
      const vol = (DeviceVars.sfxVolume / 100) * 0.22;
      gain.gain.setValueAtTime(vol, sfxCtx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, sfxCtx.currentTime + duration);
      osc.connect(gain);
      gain.connect(sfxCtx.destination);
      osc.start();
      osc.stop(sfxCtx.currentTime + duration);
    } catch {
      // Ignore autoplay errors
    }
  }

  /* ============================================================================
   * LOCALIZATION WITH FALLBACKS
   * ========================================================================== */
  function t(key) {
    const langDict = stringsTable[activeLang] || {};
    const langFallback = DEFAULT_STRINGS[activeLang] || {};
    const enFallback = DEFAULT_STRINGS.En || {};
    return langDict[key] ?? langFallback[key] ?? enFallback[key] ?? key;
  }

  function applyLanguage(langCode) {
    activeLang = LANGUAGE_META[langCode] ? langCode : 'En';
    const meta = LANGUAGE_META[activeLang];
    document.documentElement.lang = activeLang.toLowerCase();
    document.documentElement.dir = meta.dir;

    document.querySelectorAll('[data-i18n]').forEach((el) => {
      el.textContent = t(el.getAttribute('data-i18n'));
    });

    const flagImg = document.getElementById('active-lang-flag-img');
    flagImg.src = getLangFlagUrl(activeLang);
    document.getElementById('active-lang-code').textContent = activeLang.toUpperCase();

    renderMissionsScreen();
    renderAchievementsScreen();
    renderRewardsScreen();
    if (!document.getElementById('screen-play').classList.contains('hidden')) {
      renderQuestion();
    }
  }

  function openLanguageModal() {
    playSfx(540, 'triangle', 0.09);
    const list = document.getElementById('language-options-list');
    list.innerHTML = '';

    const remaining = (appConfig.supportedLanguages || ['En', 'Es', 'Fr', 'Ar']).filter(
      (code) => code !== activeLang
    );

    remaining.forEach((code) => {
      const meta = LANGUAGE_META[code] || { name: code };
      const btn = document.createElement('button');
      btn.className = 'lang-choice-btn focusable';
      btn.innerHTML = `<img src="${getLangFlagUrl(code)}" alt="${meta.name}" /><span>${meta.name} (${code})</span>`;
      btn.addEventListener('click', () => {
        markMissionComplete('m4');
        applyLanguage(code);
        document.getElementById('language-modal').classList.add('hidden');
        buildLevelPoolsAndStart();
      });
      list.appendChild(btn);
    });

    document.getElementById('language-modal').classList.remove('hidden');
  }

  /* ============================================================================
   * LEVEL-BY-LEVEL MULTI-TOPIC SHUFFLED ENGINE (LEVELS 1..10, NO REPEATS)
   * ========================================================================== */
  let levelPools = {};
  let levelCursor = {};
  let answerLocked = false;

  function applyBackgroundTheme(topicName) {
    const bgLayer = document.getElementById('dynamic-bg-layer');
    if (topicName) {
      bgLayer.style.backgroundImage = `url("${getTopicBgUrl(topicName)}")`;
    } else {
      bgLayer.style.backgroundImage = 'none';
    }
  }

  function shuffleArray(arr) {
    const copy = arr.slice();
    for (let i = copy.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [copy[i], copy[j]] = [copy[j], copy[i]];
    }
    return copy;
  }

  async function buildLevelPoolsAndStart() {
    const topics = Array.isArray(appConfig.selectedTopics) && appConfig.selectedTopics.length
      ? appConfig.selectedTopics
      : ['landmarks', 'flags', 'capitals'];

    const buckets = {};
    for (let lvl = 1; lvl <= 10; lvl++) {
      buckets[lvl] = [];
      levelCursor[lvl] = 0;
    }

    for (const topic of topics) {
      const url = getTopicDataUrl(topic, activeLang);
      const fetched = await safeFetchJson(url, []);
      if (Array.isArray(fetched) && fetched.length > 0) {
        fetched.forEach((rawItem) => {
          const q = normalizeQuestion(rawItem, topic);
          buckets[q.level].push(q);
        });
      }
    }

    for (let lvl = 1; lvl <= 10; lvl++) {
      levelPools[lvl] = shuffleArray(buckets[lvl]);
    }

    while (
      DeviceVars.currentLevel < 10 &&
      (levelPools[DeviceVars.currentLevel] || []).length === 0
    ) {
      DeviceVars.currentLevel += 1;
    }
    saveDeviceVars();

    const activeQueue = getActiveLevelQueue();
    if (activeQueue.length > 0) {
      await acquireDecodedImage(activeQueue[0].resolvedImage);
      warmQueueImages(activeQueue, 1);
    }
  }

  function getActiveLevelQueue() {
    const lvl = DeviceVars.currentLevel;
    return levelPools[lvl] || [];
  }

  async function initPlayScreen() {
    const loader = document.getElementById('quiz-loader');
    const card = document.getElementById('quiz-card');
    loader.classList.remove('hidden');
    card.classList.add('hidden');

    const hasAnyQuestions = Object.values(levelPools).some((arr) => arr && arr.length > 0);
    if (!hasAnyQuestions) {
      await buildLevelPoolsAndStart();
    }

    const queue = getActiveLevelQueue();
    const idx = levelCursor[DeviceVars.currentLevel] || 0;
    if (queue[idx]?.resolvedImage) {
      await acquireDecodedImage(queue[idx].resolvedImage);
      warmQueueImages(queue, idx + 1);
    }

    answerLocked = false;
    loader.classList.add('hidden');
    card.classList.remove('hidden');
    renderQuestion();
  }

  async function renderQuestion() {
    updateHud();
    const lvl = DeviceVars.currentLevel;
    const queue = getActiveLevelQueue();
    const idx = levelCursor[lvl] || 0;

    const progressBtn = document.getElementById('level-progress-btn');
    if (progressBtn) {
      progressBtn.textContent = `${t('level')} ${lvl}: ${Math.min(idx + 1, queue.length)}/${queue.length}`;
    }

    if (!queue.length) {
      document.getElementById('question-prompt').textContent = t('loadingQuiz');
      return;
    }

    const q = queue[idx];
    warmQueueImages(queue, idx + 1);
    applyBackgroundTheme(q.topic);

    document.getElementById('play-topic-badge').textContent = capitalizeTopic(q.topic);
    document.getElementById('question-prompt').textContent = q.prompt;

    await mountQuestionImage(q.resolvedImage);

    const grid = document.getElementById('choices-grid');
    grid.innerHTML = '';

    q.choices.forEach((choice, cIdx) => {
      const btn = document.createElement('button');
      btn.className = 'choice-btn focusable';
      btn.textContent = choice;
      btn.addEventListener('click', () => handleChoice(btn, cIdx, q.correctIndex));
      grid.appendChild(btn);
    });
  }

  function advanceAfterQuestion(deltaPoints) {
    syncPlayerScore(DeviceVars.currentScore + deltaPoints, DeviceVars.currentLevel);
    if (DeviceVars.currentScore >= 200) markMissionComplete('m6');

    const lvl = DeviceVars.currentLevel;
    const queue = getActiveLevelQueue();
    levelCursor[lvl] = (levelCursor[lvl] || 0) + 1;

    if (levelCursor[lvl] >= queue.length) {
      const bonus = getLevelCompletionBonus(lvl);
      if (!DeviceVars.completedLevels.includes(lvl)) {
        DeviceVars.completedLevels.push(lvl);
        DeviceVars.levelBonusPoints += bonus;
        syncPlayerScore(DeviceVars.currentScore + bonus, lvl);
        showToast(`🏆 Level ${lvl} Cleared! Trophy unlocked & +${bonus} bonus pts`);
      } else {
        showToast(`Level ${lvl} completed across all topics!`);
      }

      markMissionComplete('m5');

      if (lvl < 10) {
        const nextLvl = lvl + 1;
        levelCursor[nextLvl] = 0;
        syncPlayerScore(DeviceVars.currentScore, nextLvl);
      } else {
        levelPools[10] = shuffleArray(levelPools[10]);
        levelCursor[10] = 0;
      }
    }

    const nextQueue = getActiveLevelQueue();
    const nextIdx = levelCursor[DeviceVars.currentLevel] || 0;
    if (nextQueue[nextIdx]?.resolvedImage) {
      acquireDecodedImage(nextQueue[nextIdx].resolvedImage);
      warmQueueImages(nextQueue, nextIdx + 1);
    }

    saveDeviceVars();
    updateHud();

    setTimeout(() => {
      answerLocked = false;
      renderQuestion();
    }, 220);
  }

  function handleChoice(btn, idx, correctIdx) {
    if (answerLocked) return;
    answerLocked = true;

    const buttons = document.querySelectorAll('#choices-grid .choice-btn');
    buttons.forEach((b) => (b.disabled = true));

    if (idx === correctIdx) {
      btn.classList.add('correct');
      playSfx(680, 'sine', 0.16);
      advanceAfterQuestion(10);
    } else {
      btn.classList.add('wrong');
      if (buttons[correctIdx]) buttons[correctIdx].classList.add('correct');
      playSfx(210, 'sawtooth', 0.22);
      advanceAfterQuestion(-3);
    }
  }

  function handleTvBypassQuestion() {
    if (answerLocked) return;
    answerLocked = true;
    playSfx(580, 'triangle', 0.12);

    triggerAdPlaceholder(AD_CONFIG.bypassQuestionAd, () => {
      showToast('📺 Video ad complete: Question bypassed.');
      advanceAfterQuestion(AD_CONFIG.bypassQuestionAd.pointDeltaOnBypass);
    });
  }

  function handleTvTopUpScore() {
    playSfx(640, 'triangle', 0.12);
    triggerAdPlaceholder(AD_CONFIG.topUpScoreAd, (res) => {
      const pts = Number(AD_CONFIG.topUpScoreAd.topUpPoints) || 0;
      syncPlayerScore(DeviceVars.currentScore + pts, DeviceVars.currentLevel);
      saveDeviceVars();
      updateHud();
      renderAchievementsScreen();
      renderRewardsScreen();
      showToast(`📺 +${pts} points added (${res.provider}).`);
    });
  }

  function updateHud() {
    document.getElementById('play-level').textContent = DeviceVars.currentLevel;
    document.getElementById('play-score').textContent = DeviceVars.currentScore;
  }

  /* ============================================================================
   * ACHIEVEMENTS SCREEN
   * ========================================================================== */
  function renderAchievementsScreen() {
    const grid = document.getElementById('trophies-grid');
    if (!grid) return;

    document.getElementById('ach-current-score').textContent = DeviceVars.currentScore;
    document.getElementById('ach-trophy-count').textContent = `${DeviceVars.completedLevels.length} / 10`;
    document.getElementById('ach-bonus-total').textContent = DeviceVars.levelBonusPoints;

    grid.innerHTML = '';
    for (let lvl = 1; lvl <= 10; lvl++) {
      const unlocked = DeviceVars.completedLevels.includes(lvl);
      const bonus = getLevelCompletionBonus(lvl);

      const card = document.createElement('div');
      card.className = `trophy-card ${unlocked ? 'unlocked' : 'locked'}`;

      const img = document.createElement('img');
      img.className = 'trophy-img';
      img.alt = `Level ${lvl} Trophy`;
      img.loading = 'eager';
      img.decoding = 'async';
      img.dataset.fallbackStage = 'png';
      img.onerror = () => {
        if (img.dataset.fallbackStage === 'png') {
          img.dataset.fallbackStage = 'jpg';
          img.src = getAchievementUrl(lvl, 'jpg');
        } else if (img.dataset.fallbackStage === 'jpg') {
          img.dataset.fallbackStage = 'webp';
          img.src = getAchievementUrl(lvl, 'webp');
        }
      };
      img.src = getAchievementUrl(lvl, 'png');

      const title = document.createElement('div');
      title.className = 'trophy-title';
      title.textContent = `${t('level')} ${lvl}`;

      const pts = document.createElement('div');
      pts.className = 'trophy-pts';
      pts.textContent = `+${bonus} ${t('score')}`;

      card.appendChild(img);
      card.appendChild(title);
      card.appendChild(pts);
      grid.appendChild(card);
    }
  }

  function renderRewardsScreen() {
    const grid = document.getElementById('awards-grid');
    if (!grid) return;

    document.getElementById('rewards-current-score').textContent = DeviceVars.currentScore;
    document.getElementById('rewards-pool-info').textContent =
      `${WEEKLY_REWARD_POOL.periodLabel} (Top ${WEEKLY_REWARD_POOL.topPoolSize}) — Reach score threshold & enter top pool`;

    grid.innerHTML = '';
    WEEKLY_REWARD_POOL.awards.forEach((aw) => {
      const eligible = DeviceVars.currentScore >= aw.minScore;
      const card = document.createElement('div');
      card.className = `award-card ${eligible ? 'eligible' : ''}`;
      card.innerHTML = `
        <div class="award-title">${aw.name}</div>
        <div class="award-req">${aw.tier} • ${aw.minScore} ${t('score')}</div>
        <small>${eligible ? '✓ Threshold Met' : `Need +${aw.minScore - DeviceVars.currentScore}`}</small>
      `;
      grid.appendChild(card);
    });
  }

  /* ============================================================================
   * BONUS GAMES, MISSIONS & LEADERBOARD
   * ========================================================================== */
  async function initBonusScreen() {
    const grid = document.getElementById('bonus-grid');
    grid.innerHTML = '';

    const primaryTopic = appConfig.selectedTopics?.[0] || 'landmarks';
    const url = `${REPO_BASE}/${appConfig.directories.topics}/${primaryTopic}/bonus_games.json`;
    const fetched = await safeFetchJson(url, []);
    const list = Array.isArray(fetched) ? fetched.slice(0, 12) : [];

    for (let i = 0; i < 12; i++) {
      const game = list[i] || { title: `Bonus ${i + 1}`, image: '', url: 'https://bekeiratsoftwares.com' };
      const card = document.createElement('div');
      card.className = 'bonus-card focusable';
      card.tabIndex = 0;

      const img = document.createElement('img');
      img.alt = game.title || '';
      if (game.image) img.src = game.image;

      const title = document.createElement('div');
      title.className = 'bonus-card-title';
      title.textContent = game.title || `#${i + 1}`;

      card.appendChild(img);
      card.appendChild(title);

      const openGame = () => {
        markMissionComplete('m2');
        openExternalLink(game.url || 'https://bekeiratsoftwares.com');
      };
      card.addEventListener('click', openGame);
      card.addEventListener('keydown', (e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          openGame();
        }
      });

      grid.appendChild(card);
    }
  }

  function markMissionComplete(id) {
    const m = DeviceVars.missions.find((item) => item.id === id);
    if (m && !m.completed) {
      m.completed = true;
      saveDeviceVars();
      renderMissionsScreen();
    }
  }

  function renderMissionsScreen() {
    const list = document.getElementById('missions-list');
    if (!list) return;
    list.innerHTML = '';

    const items = DeviceVars.missions.slice(0, 6);
    const doneCount = items.filter((m) => m.completed).length;
    document.getElementById('missions-progress-badge').textContent = `${doneCount} / 6`;

    items.forEach((m) => {
      const strip = document.createElement('div');
      strip.className = 'mission-strip';

      const thumb = document.createElement('img');
      thumb.className = 'mission-thumb';
      thumb.alt = t(m.titleKey);

      const info = document.createElement('div');
      info.className = 'mission-info';
      info.innerHTML = `
        <div class="mission-title">${t(m.titleKey)}</div>
        <div class="mission-status">${m.completed ? t('statusCompleted') : t('statusPending')}</div>
      `;

      const btn = document.createElement('button');
      btn.className = `mission-action-btn focusable ${m.completed ? 'completed' : ''}`;
      btn.textContent = m.completed ? t('missionDone') : t('missionGo');
      btn.addEventListener('click', () => {
        playSfx(560, 'sine', 0.1);
        if (!m.completed) navigateTo('screen-play');
      });

      strip.appendChild(thumb);
      strip.appendChild(info);
      strip.appendChild(btn);
      list.appendChild(strip);
    });
  }

  function renderLeaderboardScreen() {
    saveDeviceVars();
    document.getElementById('lb-personal-best').textContent = DeviceVars.highScore;
    document.getElementById('lb-max-level').textContent = DeviceVars.maxLevelReached;

    const list = document.getElementById('leaderboard-list');
    list.innerHTML = '';

    DeviceVars.leaderboard.forEach((entry, i) => {
      const row = document.createElement('div');
      row.className = `lb-row ${entry.isPlayer ? 'player-row' : ''}`;
      row.innerHTML = `
        <span class="lb-rank">#${i + 1}</span>
        <span class="lb-name">${entry.name}</span>
        <div class="lb-meta">
          <div><strong>${entry.score}</strong></div>
          <small>${t('level')} ${entry.level}</small>
        </div>
      `;
      list.appendChild(row);
    });
  }

  /* ============================================================================
   * NAVIGATION & EVENT BINDINGS
   * ========================================================================== */
  function openExternalLink(url) {
    playSfx(520, 'triangle', 0.09);
    try {
      if (window.Windows?.System?.Launcher) {
        const uri = new window.Windows.Foundation.Uri(url);
        window.Windows.System.Launcher.launchUriAsync(uri);
        return;
      }
    } catch {
      // Fallback
    }
    window.open(url, '_blank', 'noopener,noreferrer');
  }

  function navigateTo(screenId) {
    playSfx(450, 'sine', 0.08);
    document.querySelectorAll('.screen').forEach((sec) => {
      sec.classList.add('hidden');
      sec.classList.remove('active');
    });

    const target = document.getElementById(screenId);
    if (target) {
      target.classList.remove('hidden');
      target.classList.add('active');
    }

    if (screenId === 'screen-home') {
      document.body.classList.add('landing-light-mode');
      document.body.classList.remove('subscreen-mode');
      applyBackgroundTheme(null);
    } else {
      document.body.classList.remove('landing-light-mode');
      document.body.classList.add('subscreen-mode');
    }

    syncBottomBannerForScreen(screenId);

    if (screenId === 'screen-play') {
      markMissionComplete('m1');
      initPlayScreen();
    } else if (screenId === 'screen-bonus') {
      initBonusScreen();
    } else if (screenId === 'screen-missions') {
      renderMissionsScreen();
    } else if (screenId === 'screen-leaderboard') {
      markMissionComplete('m3');
      renderLeaderboardScreen();
    } else if (screenId === 'screen-achievements') {
      renderAchievementsScreen();
    } else if (screenId === 'screen-rewards') {
      renderRewardsScreen();
    }
  }

  function bindEvents() {
    document.querySelectorAll('[data-nav]').forEach((btn) => {
      btn.addEventListener('click', () => navigateTo(btn.getAttribute('data-nav')));
    });

    document.getElementById('open-achievements-btn').addEventListener('click', () => {
      navigateTo('screen-achievements');
    });

    document.getElementById('open-rewards-btn').addEventListener('click', () => {
      navigateTo('screen-rewards');
    });

    document.getElementById('tv-bypass-btn').addEventListener('click', handleTvBypassQuestion);
    document.getElementById('tv-topup-btn').addEventListener('click', handleTvTopUpScore);

    const drawer = document.getElementById('side-drawer');
    const backdrop = document.getElementById('drawer-backdrop');
    document.getElementById('open-drawer-btn').addEventListener('click', () => {
      playSfx(420, 'sine', 0.08);
      drawer.classList.add('open');
      backdrop.classList.remove('hidden');
    });
    const closeDrawer = () => {
      drawer.classList.remove('open');
      backdrop.classList.add('hidden');
    };
    document.getElementById('close-drawer-btn').addEventListener('click', closeDrawer);
    backdrop.addEventListener('click', closeDrawer);

    document.querySelectorAll('[data-external-url]').forEach((btn) => {
      btn.addEventListener('click', () => openExternalLink(btn.getAttribute('data-external-url')));
    });

    document.getElementById('lang-flag-btn').addEventListener('click', openLanguageModal);
    document.getElementById('close-lang-btn').addEventListener('click', () => {
      document.getElementById('language-modal').classList.add('hidden');
    });

    document.getElementById('open-notif-btn').addEventListener('click', () => {
      playSfx(500, 'sine', 0.08);
      document.getElementById('notifications-modal').classList.remove('hidden');
    });
    document.getElementById('close-notif-btn').addEventListener('click', () => {
      document.getElementById('notifications-modal').classList.add('hidden');
    });

    document.getElementById('sfx-mute-btn').addEventListener('click', () => {
      DeviceVars.sfxMuted = !DeviceVars.sfxMuted;
      saveDeviceVars();
      applyAudioSettings();
    });
    document.getElementById('sfx-volume-slider').addEventListener('input', (e) => {
      DeviceVars.sfxVolume = Number(e.target.value);
      saveDeviceVars();
      applyAudioSettings();
    });
    document.getElementById('ambient-mute-btn').addEventListener('click', () => {
      DeviceVars.ambientMuted = !DeviceVars.ambientMuted;
      saveDeviceVars();
      applyAudioSettings();
    });
    document.getElementById('ambient-volume-slider').addEventListener('input', (e) => {
      DeviceVars.ambientVolume = Number(e.target.value);
      saveDeviceVars();
      applyAudioSettings();
    });

    document.getElementById('reset-scores-btn').addEventListener('click', () => {
      DeviceVars.currentScore = INITIAL_SCORE;
      DeviceVars.highScore = INITIAL_SCORE;
      DeviceVars.currentLevel = 1;
      DeviceVars.maxLevelReached = 1;
      DeviceVars.levelBonusPoints = 0;
      DeviceVars.completedLevels = [];
      const p = DeviceVars.leaderboard.find((e) => e.isPlayer);
      if (p) {
        p.score = INITIAL_SCORE;
        p.level = 1;
      }
      saveDeviceVars();
      renderLeaderboardScreen();
      renderAchievementsScreen();
      renderRewardsScreen();
      updateHud();
    });

    window.addEventListener('keydown', (e) => {
      if (e.key === 'Escape') {
        closeDrawer();
        document.getElementById('language-modal').classList.add('hidden');
        document.getElementById('notifications-modal').classList.add('hidden');
      }
    });
  }

  /* ============================================================================
   * 120 FPS CANVAS & XBOX GAMEPAD LOOP
   * ========================================================================== */
  const canvas = document.getElementById('bg-canvas');
  const ctx = canvas.getContext('2d', { alpha: true });
  const GEO_ICONS = ['🌍', '🧭', '🗺️', '🏔️', '🗼', '🚩'];
  let flyingIcons = [];
  let ringOffset = 0;
  let lastGpPoll = 0;
  let gpIdx = 0;

  function resizeBgCanvas() {
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    canvas.width = window.innerWidth * dpr;
    canvas.height = window.innerHeight * dpr;
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  }

  function initFlyingIcons() {
    const w = window.innerWidth;
    const h = window.innerHeight;
    flyingIcons = Array.from({ length: 14 }, (_, idx) => ({
      symbol: GEO_ICONS[idx % GEO_ICONS.length],
      x: Math.random() * w,
      y: Math.random() * h,
      vx: (Math.random() - 0.5) * 1.4,
      vy: (Math.random() - 0.5) * 1.4,
      size: 20 + Math.random() * 14,
      alpha: 0.24 + Math.random() * 0.22
    }));
  }

  function pollGamepad(now) {
    if (now - lastGpPoll < 160) return;
    const gp = navigator.getGamepads ? navigator.getGamepads()[0] : null;
    if (!gp) return;

    const focusables = Array.from(document.querySelectorAll('.focusable')).filter(
      (el) => el.offsetParent !== null && !el.disabled
    );
    if (!focusables.length) return;

    const prev = gp.buttons[12]?.pressed || gp.buttons[14]?.pressed || gp.axes[1] < -0.5;
    const next = gp.buttons[13]?.pressed || gp.buttons[15]?.pressed || gp.axes[1] > 0.5;
    const selectBtn = gp.buttons[0]?.pressed;
    const backBtn = gp.buttons[1]?.pressed;

    if (prev || next) {
      focusables.forEach((el) => el.classList.remove('gamepad-focus'));
      gpIdx = (gpIdx + (next ? 1 : -1) + focusables.length) % focusables.length;
      focusables[gpIdx].classList.add('gamepad-focus');
      focusables[gpIdx].focus();
      lastGpPoll = now;
    } else if (selectBtn) {
      focusables[gpIdx]?.click();
      lastGpPoll = now;
    } else if (backBtn) {
      navigateTo('screen-home');
      lastGpPoll = now;
    }
  }

  function loop120Fps(now) {
    const w = window.innerWidth;
    const h = window.innerHeight;
    const cx = w * 0.5;
    const cy = h * 0.5;
    const maxR = Math.hypot(cx, cy);
    const isLight = document.body.classList.contains('landing-light-mode');

    ctx.clearRect(0, 0, w, h);

    ringOffset = (ringOffset + 1.15) % 88;
    ctx.lineWidth = 1.6;
    for (let r = maxR - ringOffset; r > 26; r -= 88) {
      const ratio = r / maxR;
      ctx.beginPath();
      ctx.arc(cx, cy, r, 0, Math.PI * 2);
      ctx.strokeStyle = isLight
        ? `rgba(2, 132, 199, ${(1 - ratio) * 0.24})`
        : `rgba(147, 197, 253, ${(1 - ratio) * 0.26})`;
      ctx.stroke();
    }

    for (let i = 0; i < flyingIcons.length; i++) {
      const ic = flyingIcons[i];
      ic.x += ic.vx;
      ic.y += ic.vy;
      if (ic.x < -40) ic.x = w + 40;
      if (ic.x > w + 40) ic.x = -40;
      if (ic.y < -40) ic.y = h + 40;
      if (ic.y > h + 40) ic.y = -40;

      ctx.save();
      ctx.globalAlpha = ic.alpha;
      ctx.font = `${ic.size}px sans-serif`;
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText(ic.symbol, ic.x, ic.y);
      ctx.restore();
    }

    pollGamepad(now);
    requestAnimationFrame(loop120Fps);
  }

  /* ============================================================================
   * BOOTSTRAP
   * ========================================================================== */
  async function bootstrapApp() {
    resizeBgCanvas();
    initFlyingIcons();
    bindEvents();
    syncBottomBannerForScreen('screen-home');

    const remoteApp = await safeFetchJson(`${REPO_BASE}/Geography_Trivia_App/app.json`, DEFAULT_APP_JSON);
    appConfig = {
      ...DEFAULT_APP_JSON,
      ...remoteApp,
      directories: { ...DEFAULT_APP_JSON.directories, ...(remoteApp.directories || {}) },
      assets: { ...DEFAULT_APP_JSON.assets, ...(remoteApp.assets || {}) }
    };

    const remoteStrings = await safeFetchJson(
      `${REPO_BASE}/${appConfig.directories.app}/strings.json`,
      DEFAULT_STRINGS
    );
    stringsTable = { ...DEFAULT_STRINGS, ...(remoteStrings || {}) };

    applyLanguage('En');

    const heroImg = document.getElementById('hero-app-icon');
    if (appConfig.assets?.appIcon) {
      heroImg.src = `${REPO_BASE}/${appConfig.directories.appAssets}/${encodeSeg(appConfig.assets.appIcon)}`;
    }

    const favEl = document.getElementById('dynamic-favicon');
    if (favEl && appConfig.assets?.favIcon) {
      favEl.href = `${REPO_BASE}/${appConfig.directories.appAssets}/${encodeSeg(appConfig.assets.favIcon)}`;
    }

    ambientAudio.src = getCommonsAudioUrl(appConfig.assets?.ambientMusic || 'ambient1.mp3');
    setupAmbientAutoplayUnlock();
    applyAudioSettings();
    updateHud();

    buildLevelPoolsAndStart();

    requestAnimationFrame(loop120Fps);

    if ('serviceWorker' in navigator && window.location.protocol.startsWith('http')) {
      navigator.serviceWorker.register('./sw.js').catch(() => {});
    }
  }

  window.addEventListener('resize', resizeBgCanvas);
  window.addEventListener('DOMContentLoaded', bootstrapApp);
})();