(function (global) {
  'use strict';

  const EB = (global.EB = global.EB || {});

  const UI = {
    currentScreen: 'splash',
    historyStack: [],
    toastTimer: null,
    dialogConfirmCb: null,
    returnAfterSubScreen: 'menu',

    init() {
      this.bindNavigation();
      this.bindSettings();
      this.bindModals();
      this.refreshAll();
    },

    showScreen(name, pushHistory = true) {
      if (pushHistory && this.currentScreen && this.currentScreen !== name && this.currentScreen !== 'splash') {
        this.historyStack.push(this.currentScreen);
      }

      document.querySelectorAll('.screen').forEach((el) => {
        el.classList.remove('screen-active');
      });

      const target = document.getElementById(`screen-${name}`);
      if (target) {
        target.classList.add('screen-active');
      }
      this.currentScreen = name;

      if (name === 'menu') {
        EB.Audio.setMusicMood('menu', 1);
        this.renderMenu();
      }
      if (name === 'game') {
        if (EB.Game) {
          EB.Game.resizeCanvas();
          requestAnimationFrame(() => EB.Game.resizeCanvas());
          EB.Game.updateMusicMood();
        }
        this.renderGameHud();
      } else if (name !== 'splash') {
        EB.Audio.setMusicMood('menu', 1);
      }
      if (name === 'settings') this.renderSettings();
      if (name === 'achievements') this.renderAchievements();
      if (name === 'highscores') this.renderHighScores();
      if (name === 'shop') this.renderShop();
      if (name === 'daily') this.renderDaily();
      if (name === 'statistics') this.renderStatistics();
    },

    goBack() {
      if (!document.getElementById('modal-dialog').classList.contains('hidden')) {
        this.closeDialog();
        return;
      }
      if (!document.getElementById('modal-pause').classList.contains('hidden')) {
        this.hidePause();
        return;
      }
      if (!document.getElementById('modal-gameover').classList.contains('hidden')) {
        this.hideGameOver();
        this.historyStack = [];
        this.showScreen('menu', false);
        return;
      }

      if (this.currentScreen === 'game') {
        if (EB.Game && EB.Game.activePowerUp) {
          EB.Game.cancelPowerUp();
          return;
        }
        this.showPause();
        return;
      }

      if (this.currentScreen === 'menu' || this.currentScreen === 'splash') {
        this.openDialog(
          'Exit Element Blocks',
          'Return to your Android home screen? Your current game progress is safely saved.',
          'Exit',
          () => {
            if (global.AndroidBridge && typeof global.AndroidBridge.exitApp === 'function') {
              global.AndroidBridge.exitApp();
            }
          }
        );
        return;
      }

      const prev = this.historyStack.pop() || this.returnAfterSubScreen || 'menu';
      this.showScreen(prev, false);
    },

    bindNavigation() {
      document.querySelectorAll('[data-nav]').forEach((el) => {
        el.addEventListener('click', () => {
          EB.Audio.play('click');
          this.returnAfterSubScreen = this.currentScreen === 'game' ? 'game' : 'menu';
          this.showScreen(el.getAttribute('data-nav'));
        });
      });

      document.querySelectorAll('[data-back]').forEach((el) => {
        el.addEventListener('click', () => {
          EB.Audio.play('back');
          this.goBack();
        });
      });

      document.getElementById('btn-new-game').addEventListener('click', () => {
        EB.Audio.ensureContext();
        EB.Audio.syncMusicSetting();
        EB.Audio.play('click');
        this.historyStack = ['menu'];
        EB.Game.startNewGame();
        this.showScreen('game', false);
      });

      document.getElementById('btn-resume-game').addEventListener('click', () => {
        EB.Audio.ensureContext();
        EB.Audio.syncMusicSetting();
        EB.Audio.play('click');
        this.historyStack = ['menu'];
        EB.Game.resumeSavedGame();
        this.showScreen('game', false);
      });

      document.getElementById('btn-daily-play').addEventListener('click', () => {
        EB.Audio.ensureContext();
        EB.Audio.syncMusicSetting();
        EB.Audio.play('click');
        this.historyStack = ['menu'];
        if (EB.Storage.data.activeGame) {
          EB.Game.resumeSavedGame();
        } else {
          EB.Game.startNewGame();
        }
        this.showScreen('game', false);
      });

      document.getElementById('btn-pause').addEventListener('click', () => {
        EB.Audio.play('click');
        this.showPause();
      });
    },

    bindSettings() {
      const s = EB.Storage.settings;
      const tSound = document.getElementById('toggle-sound');
      const tMusic = document.getElementById('toggle-music');
      const tVib = document.getElementById('toggle-vibration');
      const tHap = document.getElementById('toggle-haptics');

      tSound.checked = s.soundEnabled;
      tMusic.checked = s.musicEnabled;
      tVib.checked = s.vibrationEnabled;
      tHap.checked = s.hapticsEnabled;

      tSound.addEventListener('change', () => {
        EB.Storage.settings.soundEnabled = tSound.checked;
        EB.Storage.saveSettings();
        if (tSound.checked) EB.Audio.play('click');
      });

      tMusic.addEventListener('change', () => {
        EB.Storage.settings.musicEnabled = tMusic.checked;
        EB.Storage.saveSettings();
        EB.Audio.play('click');
        EB.Audio.syncMusicSetting();
      });

      tVib.addEventListener('change', () => {
        EB.Storage.settings.vibrationEnabled = tVib.checked;
        EB.Storage.saveSettings();
        EB.Audio.play('click');
      });

      tHap.addEventListener('change', () => {
        EB.Storage.settings.hapticsEnabled = tHap.checked;
        EB.Storage.saveSettings();
        EB.Audio.play('click');
      });

      document.getElementById('btn-privacy-info').addEventListener('click', () => {
        EB.Audio.play('click');
        this.openDialog(
          'Privacy Information',
          'Element Blocks by YSF Tech runs 100% offline on your device. No personal data, analytics, or network requests are collected or transmitted.',
          'Got It',
          null,
          true
        );
      });

      document.getElementById('btn-reset-stats').addEventListener('click', () => {
        EB.Audio.play('click');
        this.openDialog(
          'Reset All Data?',
          'This permanently deletes your high scores, stars, achievements, power-ups, and statistics. This action cannot be undone.',
          'Reset Everything',
          () => {
            EB.Storage.resetAllGameData();
            if (EB.Game) EB.Game.resetBoardState();
            this.refreshAll();
            this.showToast('🗑', 'Data Reset', 'All statistics and progress cleared.');
          }
        );
      });
    },

    bindModals() {
      document.getElementById('btn-pause-resume').addEventListener('click', () => {
        EB.Audio.play('click');
        this.hidePause();
      });

      document.getElementById('btn-pause-restart').addEventListener('click', () => {
        EB.Audio.play('click');
        this.hidePause();
        EB.Game.startNewGame();
        this.renderGameHud();
      });

      document.getElementById('btn-pause-howto').addEventListener('click', () => {
        EB.Audio.play('click');
        this.hidePause();
        this.returnAfterSubScreen = 'game';
        this.showScreen('howto');
      });

      document.getElementById('btn-pause-settings').addEventListener('click', () => {
        EB.Audio.play('click');
        this.hidePause();
        this.returnAfterSubScreen = 'game';
        this.showScreen('settings');
      });

      document.getElementById('btn-pause-menu').addEventListener('click', () => {
        EB.Audio.play('click');
        this.hidePause();
        this.historyStack = [];
        this.showScreen('menu', false);
      });

      document.getElementById('btn-go-play-again').addEventListener('click', () => {
        EB.Audio.play('click');
        this.hideGameOver();
        EB.Game.startNewGame();
        this.renderGameHud();
      });

      document.getElementById('btn-go-stats').addEventListener('click', () => {
        EB.Audio.play('click');
        this.hideGameOver();
        this.returnAfterSubScreen = 'menu';
        this.showScreen('statistics', false);
      });

      document.getElementById('btn-go-menu').addEventListener('click', () => {
        EB.Audio.play('click');
        this.hideGameOver();
        this.historyStack = [];
        this.showScreen('menu', false);
      });

      document.getElementById('btn-dialog-cancel').addEventListener('click', () => {
        EB.Audio.play('click');
        this.closeDialog();
      });

      document.getElementById('btn-dialog-confirm').addEventListener('click', () => {
        EB.Audio.play('click');
        const cb = this.dialogConfirmCb;
        this.closeDialog();
        if (typeof cb === 'function') cb();
      });
    },

    openDialog(title, message, confirmLabel, onConfirm, singleButton = false) {
      document.getElementById('dialog-title').textContent = title;
      document.getElementById('dialog-message').textContent = message;
      document.getElementById('btn-dialog-confirm').textContent = confirmLabel || 'Confirm';
      document.getElementById('btn-dialog-cancel').classList.toggle('hidden', Boolean(singleButton));
      this.dialogConfirmCb = onConfirm;
      document.getElementById('modal-dialog').classList.remove('hidden');
    },

    closeDialog() {
      document.getElementById('modal-dialog').classList.add('hidden');
      this.dialogConfirmCb = null;
    },

    showPause() {
      EB.Audio.play('pause');
      EB.Audio.setMusicMood('menu', 1);
      document.getElementById('modal-pause').classList.remove('hidden');
    },

    hidePause() {
      EB.Audio.play('resume');
      document.getElementById('modal-pause').classList.add('hidden');
      if (this.currentScreen === 'game' && EB.Game) {
        EB.Game.updateMusicMood();
      }
    },

    showGameOver(summary) {
      document.getElementById('go-score').textContent = summary.score.toLocaleString();
      document.getElementById('go-best').textContent = summary.bestScore.toLocaleString();
      document.getElementById('go-stars').textContent = `${summary.starsEarned} ★`;
      document.getElementById('go-combo').textContent = `${summary.maxCombo}`;
      document.getElementById('go-new-best-badge').classList.toggle('hidden', !summary.isNewBest);

      const achBox = document.getElementById('go-achievements-box');
      const achList = document.getElementById('go-achievements-list');
      achList.innerHTML = '';
      if (summary.unlockedAchievements && summary.unlockedAchievements.length > 0) {
        summary.unlockedAchievements.forEach((a) => {
          const li = document.createElement('li');
          li.textContent = `${a.title} (+${a.reward} ★)`;
          achList.appendChild(li);
        });
        achBox.classList.remove('hidden');
      } else {
        achBox.classList.add('hidden');
      }

      document.getElementById('modal-gameover').classList.remove('hidden');
    },

    hideGameOver() {
      document.getElementById('modal-gameover').classList.add('hidden');
    },

    showToast(icon, title, desc) {
      const banner = document.getElementById('toast-banner');
      document.getElementById('toast-icon').textContent = icon;
      document.getElementById('toast-title').textContent = title;
      document.getElementById('toast-desc').textContent = desc;
      banner.classList.remove('hidden');

      if (this.toastTimer) clearTimeout(this.toastTimer);
      this.toastTimer = setTimeout(() => {
        banner.classList.add('hidden');
      }, 2800);
    },

    refreshAll() {
      this.renderMenu();
      this.renderGameHud();
      this.renderSettings();
    },

    renderMenu() {
      const d = EB.Storage.data;
      if (!d) return;
      EB.Storage.ensureTodayDaily();
      const streak = (d.loginStreak && d.loginStreak.currentStreak) || 1;

      document.getElementById('menu-best-score').textContent = d.bestScore.toLocaleString();
      document.getElementById('menu-streak-days').textContent = `${streak}d`;
      document.getElementById('menu-stars').textContent = d.stars.toLocaleString();
      document.getElementById('menu-ach-count').textContent = `${d.achievements.unlockedIds.length}/${EB.Achievements.LIST.length}`;

      const done = d.daily.quests.filter((q) => q.progress >= q.target).length;
      document.getElementById('menu-daily-summary').textContent = `${done}/3 Completed • ${streak}-Day Streak`;

      const resumeBtn = document.getElementById('btn-resume-game');
      if (d.activeGame && d.activeGame.scoring) {
        resumeBtn.classList.remove('hidden');
        document.getElementById('menu-saved-score').textContent = (d.activeGame.scoring.score || 0).toLocaleString();
      } else {
        resumeBtn.classList.add('hidden');
      }

      if (this.currentScreen === 'menu') {
        const bonus = EB.Storage.consumePendingStreakBonus();
        if (bonus) {
          EB.Audio.play('achievement');
          this.showToast(
            '🔥',
            `${bonus.streak}-Day Login Streak!`,
            `+${bonus.bonusStars} ★ 7-day consecutive bonus awarded!`
          );
        }
      }
    },

    renderGameHud(bumpMultiplier = false) {
      const d = EB.Storage.data;
      if (!d) return;
      document.getElementById('hud-score').textContent = EB.Scoring.score.toLocaleString();
      document.getElementById('hud-best').textContent = Math.max(d.bestScore, EB.Scoring.score).toLocaleString();
      document.getElementById('hud-stars').textContent = d.stars.toLocaleString();
      document.getElementById('hud-multiplier').textContent = `${EB.Scoring.multiplier}x`;

      if (bumpMultiplier) {
        const pill = document.getElementById('hud-multiplier-pill');
        pill.classList.remove('mult-bump');
        void pill.offsetWidth;
        pill.classList.add('mult-bump');
      }

      ['dynamite', 'lightning', 'hammer', 'shuffle'].forEach((id) => {
        const btn = document.getElementById(`pu-${id}`);
        const costEl = document.getElementById(`pu-cost-${id}`);
        if (!btn || !costEl) return;
        costEl.textContent = EB.PowerUps.getDisplayCost(id);
        const affordable = EB.PowerUps.canAfford(id);
        btn.classList.toggle('pu-disabled', !affordable);
        btn.classList.toggle('pu-active', EB.Game && EB.Game.activePowerUp === id);
      });
    },

    renderSettings() {
      const s = EB.Storage.settings;
      if (!s) return;
      document.getElementById('toggle-sound').checked = s.soundEnabled;
      document.getElementById('toggle-music').checked = s.musicEnabled;
      document.getElementById('toggle-vibration').checked = s.vibrationEnabled;
      document.getElementById('toggle-haptics').checked = s.hapticsEnabled;

      let ver = '1.0.0';
      if (global.AndroidBridge && typeof global.AndroidBridge.getAppVersion === 'function') {
        try {
          ver = global.AndroidBridge.getAppVersion() || '1.0.0';
        } catch (_) {}
      }
      document.getElementById('settings-version').textContent = ver;
    },

    renderAchievements() {
      const d = EB.Storage.data;
      const list = document.getElementById('achievements-list');
      const unlockedSet = new Set(d.achievements.unlockedIds);
      document.getElementById('ach-header-progress').textContent = `${unlockedSet.size}/${EB.Achievements.LIST.length}`;

      list.innerHTML = '';
      EB.Achievements.LIST.forEach((ach) => {
        const isUnlocked = unlockedSet.has(ach.id);
        const cur = Math.min(ach.target, ach.progress(d, EB.Scoring));
        const pct = Math.round((cur / ach.target) * 100);

        const card = document.createElement('div');
        card.className = `list-card ${isUnlocked ? 'unlocked' : ''}`;
        card.innerHTML = `
          <div class="card-main">
            <strong>${isUnlocked ? '✅ ' : '🔒 '}${ach.title}</strong>
            <small>${ach.desc} (${cur}/${ach.target})</small>
            <div class="progress-track"><div class="progress-fill" style="width:${pct}%"></div></div>
          </div>
          <span class="reward-chip">${isUnlocked ? 'Earned' : `+${ach.reward} ★`}</span>
        `;
        list.appendChild(card);
      });
    },

    renderHighScores() {
      const d = EB.Storage.data;
      document.getElementById('hs-alltime-best').textContent = d.bestScore.toLocaleString();
      const list = document.getElementById('highscores-list');
      list.innerHTML = '';

      if (!d.highScores || d.highScores.length === 0) {
        const empty = document.createElement('div');
        empty.className = 'glass-panel';
        empty.innerHTML = '<p style="margin:0;text-align:center;color:var(--text-secondary)">No completed games yet. Play a round to set your first record!</p>';
        list.appendChild(empty);
        return;
      }

      d.highScores.forEach((entry, idx) => {
        const card = document.createElement('div');
        card.className = 'list-card';
        card.innerHTML = `
          <div class="card-main">
            <strong>#${idx + 1} — ${entry.score.toLocaleString()} pts</strong>
            <small>${entry.lines} lines • Max Combo ${entry.combo} • ${entry.date}</small>
          </div>
          <span class="reward-chip">${idx === 0 ? '👑 Best' : `#${idx + 1}`}</span>
        `;
        list.appendChild(card);
      });
    },

    renderShop() {
      const d = EB.Storage.data;
      document.getElementById('shop-stars').textContent = d.stars.toLocaleString();
      const list = document.getElementById('shop-items-list');
      list.innerHTML = '';

      Object.values(EB.PowerUps.DEFINITIONS).forEach((pu) => {
        const owned = (d.inventory && d.inventory[pu.id]) || 0;
        const card = document.createElement('div');
        card.className = 'glass-panel';
        card.innerHTML = `
          <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:8px;">
            <strong style="font-size:16px;">${pu.icon} ${pu.name}</strong>
            <span class="reward-chip">Owned: ${owned}</span>
          </div>
          <p style="margin:0 0 12px;font-size:12px;color:var(--text-secondary);">${pu.desc}</p>
          <div style="display:flex;gap:8px;">
            <button class="shop-buy-btn" style="flex:1;" data-buy="${pu.id}" data-qty="1">Buy 1 (${pu.cost} ★)</button>
            <button class="shop-buy-btn" style="flex:1;background:linear-gradient(135deg,#FF9100,#FF6D00);border-color:rgba(255,215,64,0.6);" data-buy="${pu.id}" data-qty="3">Buy 3 (${pu.bundleCost} ★)</button>
          </div>
        `;
        list.appendChild(card);
      });

      list.querySelectorAll('[data-buy]').forEach((btn) => {
        btn.addEventListener('click', () => {
          const id = btn.getAttribute('data-buy');
          const qty = parseInt(btn.getAttribute('data-qty'), 10);
          const res = EB.PowerUps.buyInShop(id, qty);
          if (res.ok) {
            EB.Audio.play('purchase');
            this.renderShop();
            this.renderMenu();
            this.showToast('🛒', 'Purchased!', `Added ${qty}× ${EB.PowerUps.DEFINITIONS[id].name}`);
          } else {
            EB.Audio.play('invalid');
            this.showToast('⚠', 'Insufficient Stars', res.reason);
          }
        });
      });
    },

    renderDaily() {
      EB.Storage.ensureTodayDaily();
      const d = EB.Storage.data;
      document.getElementById('daily-date-pill').textContent = d.daily.dateKey;

      const streakObj = d.loginStreak || { currentStreak: 1, bestStreak: 1 };
      const curStreak = streakObj.currentStreak || 1;
      const bestStreak = streakObj.bestStreak || curStreak;
      const cycleDay = ((curStreak - 1) % 7) + 1;
      const daysRemaining = 7 - cycleDay;

      document.getElementById('daily-streak-title').textContent = `🔥 ${curStreak} ${curStreak === 1 ? 'Day' : 'Days'} Streak`;
      document.getElementById('daily-best-streak').textContent = `Best: ${bestStreak}d`;
      document.getElementById('daily-streak-sub').textContent =
        daysRemaining === 0
          ? `7-Day Milestone Reached Today! (+${EB.Storage.SEVEN_DAY_BONUS_STARS} ★ Bonus Awarded)`
          : `${daysRemaining} more consecutive ${daysRemaining === 1 ? 'day' : 'days'} until +${EB.Storage.SEVEN_DAY_BONUS_STARS} ★ bonus!`;

      const track = document.getElementById('daily-streak-track');
      track.innerHTML = '';
      for (let day = 1; day <= 7; day++) {
        const node = document.createElement('div');
        const reached = day <= cycleDay;
        node.className = `streak-day-node ${reached ? 'done' : ''} ${day === 7 ? 'milestone' : ''}`;
        node.innerHTML = day === 7
          ? `<span>D7</span><span>★+${EB.Storage.SEVEN_DAY_BONUS_STARS}</span>`
          : `<span>D${day}</span><span>${reached ? '🔥' : '•'}</span>`;
        track.appendChild(node);
      }

      const list = document.getElementById('daily-list');
      list.innerHTML = '';

      d.daily.quests.forEach((q) => {
        const complete = q.progress >= q.target;
        const pct = Math.min(100, Math.round((q.progress / q.target) * 100));
        const card = document.createElement('div');
        card.className = `list-card ${complete ? 'unlocked' : ''}`;

        let rightHtml = `<span class="reward-chip">+${q.reward} ★</span>`;
        if (q.claimed) {
          rightHtml = '<span class="reward-chip">Claimed ✓</span>';
        } else if (complete) {
          rightHtml = `<button class="claim-btn" data-claim="${q.id}">Claim +${q.reward}★</button>`;
        }

        card.innerHTML = `
          <div class="card-main">
            <strong>${q.title}</strong>
            <small>${q.desc} (${q.progress}/${q.target})</small>
            <div class="progress-track"><div class="progress-fill" style="width:${pct}%"></div></div>
          </div>
          ${rightHtml}
        `;
        list.appendChild(card);
      });

      list.querySelectorAll('[data-claim]').forEach((btn) => {
        btn.addEventListener('click', () => {
          const qid = btn.getAttribute('data-claim');
          const reward = EB.Achievements.claimDailyReward(qid);
          if (reward) {
            EB.Audio.play('achievement');
            this.renderDaily();
            this.renderMenu();
            this.showToast('🌟', 'Daily Reward Claimed!', `+${reward} ★ added to balance`);
          }
        });
      });
    },

    renderStatistics() {
      const d = EB.Storage.data;
      const streakObj = d.loginStreak || { currentStreak: 1, bestStreak: 1 };
      const grid = document.getElementById('stats-grid');
      const items = [
        ['Best Score', d.bestScore.toLocaleString()],
        ['Total Score', d.totalScore.toLocaleString()],
        ['Total Games', d.totalGames.toLocaleString()],
        ['Total Moves', d.totalMoves.toLocaleString()],
        ['Lines Cleared', d.totalLinesCleared.toLocaleString()],
        ['Star Balance', `${d.stars.toLocaleString()} ★`],
        ['Stars Collected', `${d.totalStarsCollected.toLocaleString()} ★`],
        ['Max Combo', `${d.maxCombo}`],
        ['Max Multiplier', `${d.maxMultiplier}x`],
        ['Power-Ups Used', d.powerUpsUsed.toLocaleString()],
        ['Achievements', `${d.achievements.unlockedIds.length}/${EB.Achievements.LIST.length}`],
        ['Daily Rewards', (d.dailyCompletedCount || 0).toLocaleString()],
        ['Day Streak', `🔥 ${streakObj.currentStreak || 1}d`],
        ['Best Day Streak', `${streakObj.bestStreak || 1}d`]
      ];

      grid.innerHTML = items
        .map(
          ([label, val]) => `
            <div class="stat-tile">
              <span>${label}</span>
              <strong>${val}</strong>
            </div>
          `
        )
        .join('');
    }
  };

  EB.UI = UI;
})(window);
