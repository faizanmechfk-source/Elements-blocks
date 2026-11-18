(function (global) {
  'use strict';

  const EB = (global.EB = global.EB || {});

  const DATA_KEY = 'element_blocks_save_v1';
  const SETTINGS_KEY = 'element_blocks_settings_v1';

  function getTodayKey() {
    const d = new Date();
    const y = d.getFullYear();
    const m = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    return `${y}-${m}-${day}`;
  }

  function parseDateKeyToNoonMs(dateKey) {
    if (typeof dateKey !== 'string') return NaN;
    const parts = dateKey.split('-');
    if (parts.length !== 3) return NaN;
    const y = parseInt(parts[0], 10);
    const m = parseInt(parts[1], 10);
    const d = parseInt(parts[2], 10);
    if (!Number.isFinite(y) || !Number.isFinite(m) || !Number.isFinite(d)) return NaN;
    return new Date(y, m - 1, d, 12, 0, 0, 0).getTime();
  }

  function diffCalendarDays(fromKey, toKey) {
    const a = parseDateKeyToNoonMs(fromKey);
    const b = parseDateKeyToNoonMs(toKey);
    if (!Number.isFinite(a) || !Number.isFinite(b)) return NaN;
    return Math.round((b - a) / 86400000);
  }

  const SEVEN_DAY_BONUS_STARS = 25;

  function hashString(str) {
    let h = 2166136261;
    for (let i = 0; i < str.length; i++) {
      h ^= str.charCodeAt(i);
      h = Math.imul(h, 16777619);
    }
    return h >>> 0;
  }

  function generateDailyQuests(dateKey) {
    const seed = hashString(dateKey);
    const pool = [
      { id: 'lines_10', type: 'lines', title: 'Line Sweeper', desc: 'Clear 10 lines today', target: 10, reward: 15 },
      { id: 'lines_18', type: 'lines', title: 'Grid Master', desc: 'Clear 18 lines today', target: 18, reward: 25 },
      { id: 'score_500', type: 'score', title: 'Point Surge', desc: 'Score 500 points in games today', target: 500, reward: 15 },
      { id: 'score_1500', type: 'score', title: 'Elemental Legend', desc: 'Score 1,500 points today', target: 1500, reward: 30 },
      { id: 'stars_5', type: 'stars', title: 'Star Seeker', desc: 'Collect 5 board stars today', target: 5, reward: 20 },
      { id: 'moves_30', type: 'moves', title: 'Steady Strategist', desc: 'Complete 30 moves today', target: 30, reward: 15 },
      { id: 'combo_2', type: 'combo', title: 'Chain Reaction', desc: 'Clear 2+ lines in one move', target: 1, reward: 20 }
    ];

    const picked = [];
    const usedTypes = new Set();
    let idx = seed % pool.length;
    for (let attempt = 0; attempt < pool.length * 2 && picked.length < 3; attempt++) {
      const candidate = pool[(idx + attempt * 2) % pool.length];
      if (!usedTypes.has(candidate.type)) {
        usedTypes.add(candidate.type);
        picked.push({
          id: `${dateKey}_${candidate.id}`,
          type: candidate.type,
          title: candidate.title,
          desc: candidate.desc,
          target: candidate.target,
          progress: 0,
          reward: candidate.reward,
          claimed: false
        });
      }
    }
    return picked;
  }

  function createDefaultData() {
    const today = getTodayKey();
    return {
      version: 1,
      stars: 15,
      bestScore: 0,
      totalScore: 0,
      totalGames: 0,
      totalMoves: 0,
      totalLinesCleared: 0,
      totalStarsCollected: 0,
      maxCombo: 0,
      maxMultiplier: 1,
      powerUpsUsed: 0,
      dailyCompletedCount: 0,
      inventory: {
        dynamite: 0,
        lightning: 0,
        hammer: 0,
        shuffle: 0
      },
      highScores: [],
      achievements: {
        unlockedIds: []
      },
      daily: {
        dateKey: today,
        quests: generateDailyQuests(today)
      },
      loginStreak: {
        currentStreak: 1,
        bestStreak: 1,
        lastLoginDate: today,
        lastBonusStreakDay: 0
      },
      activeGame: null
    };
  }

  function createDefaultSettings() {
    return {
      soundEnabled: true,
      musicEnabled: true,
      vibrationEnabled: true,
      hapticsEnabled: true
    };
  }

  function safeParse(raw) {
    if (!raw || typeof raw !== 'string') return null;
    try {
      const parsed = JSON.parse(raw);
      return parsed && typeof parsed === 'object' ? parsed : null;
    } catch (_) {
      return null;
    }
  }

  function readRaw(key) {
    let nativeVal = '';
    if (global.AndroidBridge && typeof global.AndroidBridge.loadJson === 'function') {
      try {
        nativeVal = global.AndroidBridge.loadJson(key) || '';
      } catch (_) {}
    }
    if (nativeVal) return nativeVal;
    try {
      return global.localStorage ? global.localStorage.getItem(key) || '' : '';
    } catch (_) {
      return '';
    }
  }

  function writeRaw(key, json) {
    try {
      if (global.localStorage) {
        global.localStorage.setItem(key, json);
      }
    } catch (_) {}
    if (global.AndroidBridge && typeof global.AndroidBridge.saveJson === 'function') {
      try {
        global.AndroidBridge.saveJson(key, json);
      } catch (_) {}
    }
  }

  function validateData(rawObj) {
    const def = createDefaultData();
    if (!rawObj) return def;

    const num = (v, fallback, min = 0) =>
      typeof v === 'number' && Number.isFinite(v) && v >= min ? Math.floor(v) : fallback;

    const data = {
      version: 1,
      stars: num(rawObj.stars, def.stars),
      bestScore: num(rawObj.bestScore, 0),
      totalScore: num(rawObj.totalScore, 0),
      totalGames: num(rawObj.totalGames, 0),
      totalMoves: num(rawObj.totalMoves, 0),
      totalLinesCleared: num(rawObj.totalLinesCleared, 0),
      totalStarsCollected: num(rawObj.totalStarsCollected, 0),
      maxCombo: num(rawObj.maxCombo, 0),
      maxMultiplier: num(rawObj.maxMultiplier, 1, 1),
      powerUpsUsed: num(rawObj.powerUpsUsed, 0),
      dailyCompletedCount: num(rawObj.dailyCompletedCount, 0),
      inventory: {
        dynamite: num(rawObj.inventory && rawObj.inventory.dynamite, 0),
        lightning: num(rawObj.inventory && rawObj.inventory.lightning, 0),
        hammer: num(rawObj.inventory && rawObj.inventory.hammer, 0),
        shuffle: num(rawObj.inventory && rawObj.inventory.shuffle, 0)
      },
      highScores: Array.isArray(rawObj.highScores) ? rawObj.highScores.slice(0, 10) : [],
      achievements: {
        unlockedIds: Array.isArray(rawObj.achievements && rawObj.achievements.unlockedIds)
          ? [...new Set(rawObj.achievements.unlockedIds)]
          : []
      },
      daily: rawObj.daily && typeof rawObj.daily === 'object' ? rawObj.daily : def.daily,
      loginStreak: {
        currentStreak: num(rawObj.loginStreak && rawObj.loginStreak.currentStreak, 1, 1),
        bestStreak: num(rawObj.loginStreak && rawObj.loginStreak.bestStreak, 1, 1),
        lastLoginDate:
          rawObj.loginStreak && typeof rawObj.loginStreak.lastLoginDate === 'string'
            ? rawObj.loginStreak.lastLoginDate
            : today,
        lastBonusStreakDay: num(rawObj.loginStreak && rawObj.loginStreak.lastBonusStreakDay, 0, 0)
      },
      activeGame: rawObj.activeGame || null
    };

    if (data.loginStreak.bestStreak < data.loginStreak.currentStreak) {
      data.loginStreak.bestStreak = data.loginStreak.currentStreak;
    }

    const today = getTodayKey();
    if (!data.daily || data.daily.dateKey !== today || !Array.isArray(data.daily.quests)) {
      data.daily = {
        dateKey: today,
        quests: generateDailyQuests(today)
      };
    }

    return data;
  }

  const Storage = {
    data: null,
    settings: null,
    pendingStreakBonus: null,

    init() {
      const parsedData = safeParse(readRaw(DATA_KEY));
      this.data = validateData(parsedData);

      let nativeSettings = null;
      if (global.AndroidBridge && typeof global.AndroidBridge.getSettingsJson === 'function') {
        try {
          nativeSettings = safeParse(global.AndroidBridge.getSettingsJson());
        } catch (_) {}
      }
      const localSettings = safeParse(readRaw(SETTINGS_KEY));
      this.settings = Object.assign(createDefaultSettings(), localSettings || {}, nativeSettings || {});

      this.recordDailyLogin();
      this.saveData();
      this.saveSettings();
    },

    recordDailyLogin(dateKeyOverride) {
      if (!this.data) return null;
      const today = dateKeyOverride || getTodayKey();
      const streakObj = this.data.loginStreak || {
        currentStreak: 1,
        bestStreak: 1,
        lastLoginDate: today,
        lastBonusStreakDay: 0
      };

      let bonusGranted = null;
      const diff = diffCalendarDays(streakObj.lastLoginDate, today);

      if (diff === 1) {
        streakObj.currentStreak += 1;
        if (streakObj.currentStreak > streakObj.bestStreak) {
          streakObj.bestStreak = streakObj.currentStreak;
        }
        streakObj.lastLoginDate = today;

        if (
          streakObj.currentStreak > 0 &&
          streakObj.currentStreak % 7 === 0 &&
          streakObj.lastBonusStreakDay !== streakObj.currentStreak
        ) {
          this.data.stars += SEVEN_DAY_BONUS_STARS;
          streakObj.lastBonusStreakDay = streakObj.currentStreak;
          bonusGranted = {
            streak: streakObj.currentStreak,
            bonusStars: SEVEN_DAY_BONUS_STARS
          };
          this.pendingStreakBonus = bonusGranted;
        }
      } else if (diff > 1 || Number.isNaN(diff)) {
        streakObj.currentStreak = 1;
        streakObj.lastLoginDate = today;
        streakObj.lastBonusStreakDay = 0;
      }

      this.data.loginStreak = streakObj;
      this.saveData();
      return bonusGranted;
    },

    consumePendingStreakBonus() {
      const info = this.pendingStreakBonus;
      this.pendingStreakBonus = null;
      return info;
    },

    ensureTodayDaily() {
      const today = getTodayKey();
      this.recordDailyLogin(today);
      if (!this.data.daily || this.data.daily.dateKey !== today) {
        this.data.daily = {
          dateKey: today,
          quests: generateDailyQuests(today)
        };
        this.saveData();
      }
    },

    SEVEN_DAY_BONUS_STARS,

    saveData() {
      if (!this.data) return;
      writeRaw(DATA_KEY, JSON.stringify(this.data));
    },

    saveSettings() {
      if (!this.settings) return;
      const json = JSON.stringify(this.settings);
      writeRaw(SETTINGS_KEY, json);
      if (global.AndroidBridge && typeof global.AndroidBridge.updateSettingsJson === 'function') {
        try {
          global.AndroidBridge.updateSettingsJson(json);
        } catch (_) {}
      }
    },

    resetAllGameData() {
      this.data = createDefaultData();
      this.saveData();
    },

    getTodayKey
  };

  EB.Storage = Storage;
})(window);
