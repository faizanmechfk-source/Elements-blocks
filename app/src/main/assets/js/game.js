(function (global) {
  'use strict';

  const EB = (global.EB = global.EB || {});

  const ELEMENT_PALETTES = {
    fire: {
      top: '#FFAB40',
      mid: '#FF5722',
      bot: '#BF360C',
      border: '#FFD180',
      glow: 'rgba(255, 109, 0, 0.55)'
    },
    water: {
      top: '#80D8FF',
      mid: '#00B0FF',
      bot: '#0D47A1',
      border: '#B2EBF2',
      glow: 'rgba(0, 229, 255, 0.55)'
    },
    earth: {
      top: '#69F0AE',
      mid: '#00C853',
      bot: '#3E2723',
      border: '#B9F6CA',
      glow: 'rgba(0, 230, 118, 0.5)'
    },
    air: {
      top: '#F3E5F5',
      mid: '#B388FF',
      bot: '#4A148C',
      border: '#FFFFFF',
      glow: 'rgba(179, 136, 255, 0.55)'
    }
  };

  const Game = {
    canvas: null,
    ctx: null,
    dpr: 1,
    width: 360,
    height: 600,
    board: null,
    tray: [null, null, null],

    // Layout geometry
    boardX: 0,
    boardY: 0,
    boardSize: 300,
    cellSize: 36,
    trayY: 0,
    trayHeight: 120,
    slotCenters: [],

    // Drag & Drop state
    drag: null,
    returningPiece: null,
    hoverBoardCell: null,

    // Power-up targeting state
    activePowerUp: null,
    isGameOver: false,
    runUnlockedAchievements: [],
    lastTime: 0,
    elapsed: 0,
    rafId: null,

    init() {
      this.canvas = document.getElementById('game-canvas');
      this.ctx = this.canvas.getContext('2d');
      this.board = new EB.Board();

      this.bindInput();
      this.bindPowerUps();
      global.addEventListener('resize', () => this.resizeCanvas());

      this.runSplashSequence();
    },

    runSplashSequence() {
      const bar = document.getElementById('splash-progress');
      let pct = 0;
      const timer = setInterval(() => {
        pct += 18;
        if (bar) bar.style.width = `${Math.min(100, pct)}%`;
        if (pct >= 100) {
          clearInterval(timer);
          setTimeout(() => {
            EB.UI.showScreen('menu', false);
          }, 220);
        }
      }, 95);
    },

    startNewGame() {
      this.board.reset();
      EB.Scoring.resetRun();
      EB.Particles.clear();
      this.isGameOver = false;
      this.activePowerUp = null;
      this.drag = null;
      this.returningPiece = null;
      this.runUnlockedAchievements = [];
      this.updatePowerUpBanner();

      // Place initial star on board
      this.board.spawnStarOnBoard();
      this.tray = EB.Shapes.generateTray(this.board);

      this.saveActiveGameState();
      this.resizeCanvas();
      EB.UI.renderGameHud();
      EB.Audio.play('gameStart');
      this.updateMusicMood();
    },

    resumeSavedGame() {
      const saved = EB.Storage.data.activeGame;
      if (!saved) {
        this.startNewGame();
        return;
      }
      this.board = new EB.Board(saved.grid);
      EB.Scoring.loadRun(saved.scoring);
      this.tray = Array.isArray(saved.tray) ? saved.tray : EB.Shapes.generateTray(this.board);
      this.isGameOver = false;
      this.activePowerUp = null;
      this.drag = null;
      this.returningPiece = null;
      this.runUnlockedAchievements = [];
      this.updatePowerUpBanner();
      EB.Particles.clear();
      this.resizeCanvas();
      EB.UI.renderGameHud();
      EB.Audio.play('gameStart');
      this.updateMusicMood();
    },

    updateMusicMood() {
      if (!EB.Audio) return;
      if (this.isGameOver) {
        EB.Audio.stopMusic();
        return;
      }
      if (this.activePowerUp) {
        EB.Audio.setMusicMood('powerup', EB.Scoring.multiplier);
        EB.Audio.syncMusicSetting();
        return;
      }
      let occupied = 0;
      for (let r = 0; r < 8; r++) {
        for (let c = 0; c < 8; c++) {
          if (this.board.grid[r][c].element !== null) occupied++;
        }
      }
      if (occupied >= 42) {
        EB.Audio.setMusicMood('tension', EB.Scoring.multiplier);
      } else if (EB.Scoring.multiplier >= 3) {
        EB.Audio.setMusicMood('combo', EB.Scoring.multiplier);
      } else {
        EB.Audio.setMusicMood('gameplay', EB.Scoring.multiplier);
      }
      EB.Audio.syncMusicSetting();
    },

    resetBoardState() {
      this.board.reset();
      EB.Scoring.resetRun();
      this.tray = [null, null, null];
      this.isGameOver = false;
      this.activePowerUp = null;
      this.updatePowerUpBanner();
    },

    saveActiveGameState() {
      if (this.isGameOver) {
        EB.Storage.data.activeGame = null;
      } else {
        EB.Storage.data.activeGame = {
          grid: this.board.serialize(),
          tray: this.tray,
          scoring: EB.Scoring.serializeRun()
        };
      }
      EB.Storage.saveData();
    },

    resizeCanvas() {
      if (!this.canvas) return;
      const stage = document.getElementById('canvas-stage');
      if (!stage) return;

      const rect = stage.getBoundingClientRect();
      if (rect.width <= 0 || rect.height <= 0) return;

      this.dpr = Math.min(window.devicePixelRatio || 1, 2.5);
      this.width = rect.width;
      this.height = rect.height;

      this.canvas.width = Math.floor(this.width * this.dpr);
      this.canvas.height = Math.floor(this.height * this.dpr);

      const maxBoardW = this.width - 16;
      const maxBoardH = this.height * 0.67;
      const rawBoard = Math.floor(Math.min(maxBoardW, maxBoardH));
      this.cellSize = Math.floor((rawBoard - 16) / 8);
      this.boardSize = this.cellSize * 8;
      this.boardX = Math.floor((this.width - this.boardSize) / 2);
      this.boardY = Math.max(8, Math.floor((maxBoardH - this.boardSize) / 2));

      this.trayY = this.boardY + this.boardSize + 14;
      this.trayHeight = Math.max(88, this.height - this.trayY - 6);

      const slotW = this.width / 3;
      this.slotCenters = [0, 1, 2].map((i) => ({
        x: slotW * i + slotW * 0.5,
        y: this.trayY + this.trayHeight * 0.5,
        maxW: slotW - 14,
        maxH: this.trayHeight - 14
      }));
    },

    bindPowerUps() {
      ['dynamite', 'lightning', 'hammer', 'shuffle'].forEach((id) => {
        const btn = document.getElementById(`pu-${id}`);
        if (!btn) return;
        btn.addEventListener('click', () => {
          if (this.isGameOver) return;
          EB.Audio.play('click');
          this.activatePowerUp(id);
        });
      });

      document.getElementById('btn-cancel-powerup').addEventListener('click', () => {
        EB.Audio.play('click');
        this.cancelPowerUp();
      });

      document.querySelectorAll('#lightning-element-picker [data-el]').forEach((btn) => {
        btn.addEventListener('click', () => {
          const el = btn.getAttribute('data-el');
          this.executeLightning(el);
        });
      });
    },

    activatePowerUp(id) {
      if (this.activePowerUp === id) {
        this.cancelPowerUp();
        return;
      }

      if (!EB.PowerUps.canAfford(id)) {
        EB.Audio.play('invalid');
        EB.UI.showToast('★', 'Not Enough Stars', `Need ${EB.PowerUps.DEFINITIONS[id].cost} ★ for ${EB.PowerUps.DEFINITIONS[id].name}`);
        return;
      }

      if (id === 'shuffle') {
        if (EB.PowerUps.consumePowerUpCost('shuffle')) {
          this.tray = EB.Shapes.generateTray(this.board);
          EB.Audio.play('shuffle');
          EB.Particles.spawnFloatingText(
            'TRAY SHUFFLED!',
            this.width * 0.5,
            this.trayY + 12,
            '#00E5FF',
            18
          );
          this.saveActiveGameState();
          EB.UI.renderGameHud();
          this.checkGameOver();
        }
        return;
      }

      if ((id === 'hammer' || id === 'lightning') && !this.board.hasAnyOccupiedCell()) {
        EB.Audio.play('invalid');
        EB.UI.showToast('ℹ', 'Board Empty', 'Place some blocks before using this power-up.');
        return;
      }

      this.activePowerUp = id;
      this.hoverBoardCell = null;
      this.updatePowerUpBanner();
      EB.UI.renderGameHud();
      EB.Audio.play('powerupSelect');
      this.updateMusicMood();
    },

    cancelPowerUp() {
      this.activePowerUp = null;
      this.hoverBoardCell = null;
      this.updatePowerUpBanner();
      EB.UI.renderGameHud();
      this.updateMusicMood();
    },

    updatePowerUpBanner() {
      const banner = document.getElementById('powerup-banner');
      const text = document.getElementById('powerup-banner-text');
      const picker = document.getElementById('lightning-element-picker');

      if (!this.activePowerUp) {
        banner.classList.add('hidden');
        picker.classList.add('hidden');
        return;
      }

      banner.classList.remove('hidden');
      if (this.activePowerUp === 'dynamite') {
        text.textContent = '🧨 Tap any cell to blast a 3×3 zone';
        picker.classList.add('hidden');
      } else if (this.activePowerUp === 'hammer') {
        text.textContent = '🔨 Tap any occupied block to smash it';
        picker.classList.add('hidden');
      } else if (this.activePowerUp === 'lightning') {
        text.textContent = '⚡ Tap a block or pick element:';
        picker.classList.remove('hidden');
      }
    },

    screenToCanvas(clientX, clientY) {
      const rect = this.canvas.getBoundingClientRect();
      return {
        x: clientX - rect.left,
        y: clientY - rect.top
      };
    },

    canvasToBoardCell(x, y) {
      const col = Math.floor((x - this.boardX) / this.cellSize);
      const row = Math.floor((y - this.boardY) / this.cellSize);
      if (row < 0 || row >= 8 || col < 0 || col >= 8) return null;
      return { row, col };
    },

    bindInput() {
      const c = this.canvas;

      c.addEventListener('pointerdown', (e) => {
        if (this.isGameOver || EB.UI.currentScreen !== 'game') return;
        EB.Audio.ensureContext();
        EB.Audio.syncMusicSetting();

        const pt = this.screenToCanvas(e.clientX, e.clientY);

        // Handle active Power-Up board tap
        if (this.activePowerUp) {
          const cell = this.canvasToBoardCell(pt.x, pt.y);
          if (cell) {
            this.handlePowerUpBoardTap(cell.row, cell.col);
          }
          return;
        }

        // Check tray slots
        const slotIdx = this.hitTestTraySlot(pt.x, pt.y);
        if (slotIdx !== -1 && this.tray[slotIdx]) {
          try {
            c.setPointerCapture(e.pointerId);
          } catch (_) {}

          const piece = this.tray[slotIdx];
          const offsetY = Math.max(58, this.cellSize * 1.55);
          this.drag = {
            pointerId: e.pointerId,
            slotIdx,
            piece,
            x: pt.x,
            y: pt.y - offsetY,
            rawY: pt.y,
            offsetY,
            anchorRow: null,
            anchorCol: null,
            isValid: false,
            previewClears: { rows: [], cols: [] }
          };
          this.updateDragSnap();
          EB.Audio.play('pickup', { element: piece.element });
        }
      });

      c.addEventListener('pointermove', (e) => {
        const pt = this.screenToCanvas(e.clientX, e.clientY);

        if (this.activePowerUp) {
          this.hoverBoardCell = this.canvasToBoardCell(pt.x, pt.y);
          return;
        }

        if (!this.drag || e.pointerId !== this.drag.pointerId) return;
        this.drag.x = pt.x;
        this.drag.rawY = pt.y;
        this.drag.y = pt.y - this.drag.offsetY;
        this.updateDragSnap();
      });

      const handleRelease = (e) => {
        if (!this.drag || e.pointerId !== this.drag.pointerId) return;
        const drag = this.drag;
        this.drag = null;

        if (drag.isValid && drag.anchorRow !== null && drag.anchorCol !== null) {
          this.commitPlacement(drag);
        } else {
          // If released over board area, feedback invalid
          const overBoard =
            drag.y >= this.boardY - this.cellSize &&
            drag.y <= this.boardY + this.boardSize + this.cellSize;
          if (overBoard) {
            EB.Audio.play('invalid');
          }
          const slot = this.slotCenters[drag.slotIdx];
          this.returningPiece = {
            slotIdx: drag.slotIdx,
            piece: drag.piece,
            fromX: drag.x,
            fromY: drag.y,
            toX: slot.x,
            toY: slot.y,
            progress: 0
          };
        }
      };

      c.addEventListener('pointerup', handleRelease);
      c.addEventListener('pointercancel', handleRelease);
    },

    hitTestTraySlot(x, y) {
      if (y < this.trayY - 12) return -1;
      for (let i = 0; i < 3; i++) {
        if (!this.tray[i]) continue;
        const slot = this.slotCenters[i];
        const halfW = this.width / 6;
        if (Math.abs(x - slot.x) <= halfW && Math.abs(y - slot.y) <= this.trayHeight * 0.55) {
          return i;
        }
      }
      return -1;
    },

    updateDragSnap() {
      const d = this.drag;
      if (!d) return;
      const pieceW = d.piece.width * this.cellSize;
      const pieceH = d.piece.height * this.cellSize;
      const topLeftX = d.x - pieceW * 0.5;
      const topLeftY = d.y - pieceH * 0.5;

      const col = Math.round((topLeftX - this.boardX) / this.cellSize);
      const row = Math.round((topLeftY - this.boardY) / this.cellSize);

      const nearBoard =
        col >= -2 && col <= 9 && row >= -2 && row <= 9;

      if (!nearBoard) {
        d.anchorRow = null;
        d.anchorCol = null;
        d.isValid = false;
        d.previewClears = { rows: [], cols: [] };
        return;
      }

      const prevRow = d.anchorRow;
      const prevCol = d.anchorCol;
      d.anchorRow = row;
      d.anchorCol = col;
      d.isValid = this.board.canPlace(d.piece, row, col);
      d.previewClears = d.isValid
        ? this.board.previewLineClears(d.piece, row, col)
        : { rows: [], cols: [] };

      if (d.isValid && (row !== prevRow || col !== prevCol)) {
        const hasLinePreview =
          d.previewClears.rows.length > 0 || d.previewClears.cols.length > 0;
        EB.Audio.play('snapHover', { previewClear: hasLinePreview });
      }
    },

    commitPlacement(drag) {
      const { piece, anchorRow, anchorCol, slotIdx } = drag;
      const placeInfo = this.board.placePiece(piece, anchorRow, anchorCol);
      if (!placeInfo) return;

      this.tray[slotIdx] = null;
      EB.Audio.play('place', { element: piece.element });

      placeInfo.placedCells.forEach(({ r, c, element, hadStar }) => {
        const px = this.boardX + c * this.cellSize;
        const py = this.boardY + r * this.cellSize;
        EB.Particles.spawnPlacementRipple(px, py, this.cellSize, element);
        if (hadStar) {
          this.awardCollectedStars(1, px + this.cellSize * 0.5, py + this.cellSize * 0.5);
        }
      });

      const placePts = EB.Scoring.scorePlacement(placeInfo.placedCells.length);
      EB.Storage.data.totalMoves++;
      EB.Storage.data.totalScore += placePts;

      const clearRes = this.board.clearCompletedLines();
      const scoreRes = EB.Scoring.scoreClearResult(clearRes);

      if (clearRes.totalLines > 0) {
        EB.Storage.data.totalLinesCleared += clearRes.totalLines;
        EB.Storage.data.totalScore += scoreRes.totalAwarded;

        if (clearRes.totalLines > EB.Storage.data.maxCombo) {
          EB.Storage.data.maxCombo = clearRes.totalLines;
        }
        if (scoreRes.multiplier > EB.Storage.data.maxMultiplier) {
          EB.Storage.data.maxMultiplier = scoreRes.multiplier;
        }

        // Line flashes
        clearRes.fullRows.forEach((r) => {
          EB.Particles.spawnLineFlash(
            this.boardX,
            this.boardY + r * this.cellSize,
            this.boardSize,
            this.cellSize
          );
        });
        clearRes.fullCols.forEach((c) => {
          EB.Particles.spawnLineFlash(
            this.boardX + c * this.cellSize,
            this.boardY,
            this.cellSize,
            this.boardSize
          );
        });

        // Particle burst & stars
        let sumX = 0;
        let sumY = 0;
        clearRes.clearedCells.forEach(({ r, c, element, hadStar }) => {
          const px = this.boardX + c * this.cellSize;
          const py = this.boardY + r * this.cellSize;
          sumX += px + this.cellSize * 0.5;
          sumY += py + this.cellSize * 0.5;
          EB.Particles.spawnBlockBurst(px, py, this.cellSize, element, 10);
          if (hadStar) {
            this.awardCollectedStars(1, px + this.cellSize * 0.5, py + this.cellSize * 0.5);
          }
        });

        const cx = sumX / clearRes.clearedCells.length;
        const cy = sumY / clearRes.clearedCells.length;

        EB.Audio.play(clearRes.totalLines > 1 ? 'multiClear' : 'clear', {
          lines: clearRes.totalLines,
          multiplier: scoreRes.multiplier
        });
        if (scoreRes.multiplierIncreased) {
          EB.Audio.play('multiplierUp', { multiplier: scoreRes.multiplier });
        }
        EB.Particles.spawnFloatingText(`+${scoreRes.totalAwarded}`, cx, cy, '#00E5FF', 22);
        if (scoreRes.comboLabel) {
          EB.Particles.spawnFloatingText(scoreRes.comboLabel, cx, cy - 30, '#FFD740', 20);
        }
        if (scoreRes.multiplier > 1) {
          EB.Particles.spawnFloatingText(`${scoreRes.multiplier}x MULTIPLIER`, cx, cy + 28, '#FF9100', 15);
        }
      } else {
        const cx = this.boardX + (anchorCol + piece.width * 0.5) * this.cellSize;
        const cy = this.boardY + (anchorRow + piece.height * 0.5) * this.cellSize;
        EB.Particles.spawnFloatingText(`+${placePts}`, cx, cy, '#9FB4D9', 15);
      }

      // Update best score
      if (EB.Scoring.score > EB.Storage.data.bestScore) {
        EB.Storage.data.bestScore = EB.Scoring.score;
      }

      // Update Daily Quests
      EB.Achievements.updateDailyProgress({
        moves: 1,
        lines: clearRes.totalLines,
        points: placePts + scoreRes.totalAwarded,
        stars: clearRes.starsCollected + placeInfo.starsCollectedOnPlace,
        combo: clearRes.totalLines
      });

      // Periodically spawn a collectible star on board
      if (this.board.countStars() === 0 || (EB.Scoring.movesThisRun % 3 === 0 && this.board.countStars() < 2)) {
        this.board.spawnStarOnBoard();
      }

      // Refill tray if all 3 pieces placed
      if (this.tray.every((p) => p === null)) {
        this.tray = EB.Shapes.generateTray(this.board);
      }

      this.evaluateAchievements();
      EB.UI.renderGameHud(scoreRes.multiplierIncreased);
      this.updateMusicMood();
      this.saveActiveGameState();
      this.checkGameOver();
    },

    awardCollectedStars(count, fromX, fromY) {
      if (count <= 0) return;
      EB.Storage.data.stars += count;
      EB.Storage.data.totalStarsCollected += count;
      EB.Scoring.starsThisRun += count;
      EB.Audio.play('star');

      const targetX = this.width - 36;
      const targetY = -12;
      for (let i = 0; i < count; i++) {
        EB.Particles.spawnStarFly(fromX, fromY, targetX, targetY);
      }
      EB.Particles.spawnFloatingText(`+${count} ★`, fromX, fromY - 18, '#FFD740', 18);
    },

    handlePowerUpBoardTap(row, col) {
      if (this.activePowerUp === 'dynamite') {
        if (!EB.PowerUps.consumePowerUpCost('dynamite')) return;
        const res = this.board.clearArea3x3(row, col);
        const cx = this.boardX + (col + 0.5) * this.cellSize;
        const cy = this.boardY + (row + 0.5) * this.cellSize;

        EB.Particles.spawnExplosion(cx, cy, this.cellSize * 2.4);
        EB.Audio.play('dynamite');

        if (res.starsCollected > 0) {
          this.awardCollectedStars(res.starsCollected, cx, cy);
        }
        const pts = EB.Scoring.scorePowerUpDestroy(res.removed.length);
        if (pts > 0) {
          EB.Storage.data.totalScore += pts;
          if (EB.Scoring.score > EB.Storage.data.bestScore) {
            EB.Storage.data.bestScore = EB.Scoring.score;
          }
          EB.Particles.spawnFloatingText(`+${pts}`, cx, cy - 20, '#FF9100', 20);
        }

        this.cancelPowerUp();
        this.evaluateAchievements();
        this.saveActiveGameState();
        EB.UI.renderGameHud();
        this.checkGameOver();
      } else if (this.activePowerUp === 'hammer') {
        const cell = this.board.grid[row][col];
        if (cell.element === null) {
          EB.Audio.play('invalid');
          EB.UI.showToast('🔨', 'Empty Cell', 'Tap an occupied block to smash it.');
          return;
        }
        if (!EB.PowerUps.consumePowerUpCost('hammer')) return;
        const removed = this.board.clearSingleCell(row, col);
        const cx = this.boardX + (col + 0.5) * this.cellSize;
        const cy = this.boardY + (row + 0.5) * this.cellSize;
        EB.Particles.spawnBlockBurst(
          this.boardX + col * this.cellSize,
          this.boardY + row * this.cellSize,
          this.cellSize,
          removed.element,
          16
        );
        EB.Particles.spawnPlacementRipple(
          this.boardX + col * this.cellSize,
          this.boardY + row * this.cellSize,
          this.cellSize,
          removed.element
        );
        EB.Audio.play('hammer');
        if (removed.hadStar) this.awardCollectedStars(1, cx, cy);
        const pts = EB.Scoring.scorePowerUpDestroy(1);
        EB.Storage.data.totalScore += pts;
        if (EB.Scoring.score > EB.Storage.data.bestScore) {
          EB.Storage.data.bestScore = EB.Scoring.score;
        }
        EB.Particles.spawnFloatingText(`+${pts}`, cx, cy - 12, '#00E5FF', 18);

        this.cancelPowerUp();
        this.evaluateAchievements();
        this.saveActiveGameState();
        EB.UI.renderGameHud();
        this.checkGameOver();
      } else if (this.activePowerUp === 'lightning') {
        const cell = this.board.grid[row][col];
        if (cell.element === null) {
          EB.Audio.play('invalid');
          EB.UI.showToast('⚡', 'Select Element', 'Tap a colored block or choose an element above.');
          return;
        }
        this.executeLightning(cell.element);
      }
    },

    executeLightning(element) {
      if (this.activePowerUp !== 'lightning') return;
      if (!EB.PowerUps.consumePowerUpCost('lightning')) return;

      const res = this.board.clearByElement(element);
      EB.Audio.play('lightning');

      res.removed.forEach(({ r, c, element: el, hadStar }) => {
        const px = this.boardX + c * this.cellSize;
        const py = this.boardY + r * this.cellSize;
        const cx = px + this.cellSize * 0.5;
        const cy = py + this.cellSize * 0.5;
        EB.Particles.spawnLightningStrike(cx, cy, this.boardY - 12);
        EB.Particles.spawnBlockBurst(px, py, this.cellSize, el, 10);
        if (hadStar) this.awardCollectedStars(1, cx, cy);
      });

      const pts = EB.Scoring.scorePowerUpDestroy(res.removed.length);
      if (pts > 0) {
        EB.Storage.data.totalScore += pts;
        if (EB.Scoring.score > EB.Storage.data.bestScore) {
          EB.Storage.data.bestScore = EB.Scoring.score;
        }
        EB.Particles.spawnFloatingText(
          `⚡ +${pts}`,
          this.boardX + this.boardSize * 0.5,
          this.boardY + this.boardSize * 0.5,
          '#00E5FF',
          22
        );
      }

      this.cancelPowerUp();
      this.evaluateAchievements();
      this.saveActiveGameState();
      EB.UI.renderGameHud();
      this.checkGameOver();
    },

    evaluateAchievements() {
      const newly = EB.Achievements.evaluate(EB.Scoring);
      if (newly.length > 0) {
        EB.Audio.play('achievement');
        newly.forEach((a) => {
          this.runUnlockedAchievements.push(a);
          EB.UI.showToast('🏆', `Unlocked: ${a.title}`, `+${a.reward} ★ Rewarded`);
        });
      }
    },

    checkGameOver() {
      if (this.isGameOver) return;
      if (this.board.hasAnyValidMove(this.tray)) return;

      this.isGameOver = true;
      EB.Audio.stopMusic();
      EB.Audio.play('gameover');

      const d = EB.Storage.data;
      const finalScore = EB.Scoring.score;
      const prevBest = d.bestScore;
      const isNewBest = finalScore > 0 && finalScore >= prevBest;

      d.totalGames++;
      if (finalScore > d.bestScore) d.bestScore = finalScore;

      const today = EB.Storage.getTodayKey();
      d.highScores.push({
        score: finalScore,
        combo: EB.Scoring.maxComboThisRun,
        lines: EB.Scoring.linesThisRun,
        date: today
      });
      d.highScores.sort((a, b) => b.score - a.score);
      d.highScores = d.highScores.slice(0, 10);

      d.activeGame = null;
      EB.Storage.saveData();

      this.evaluateAchievements();

      setTimeout(() => {
        EB.UI.showGameOver({
          score: finalScore,
          bestScore: d.bestScore,
          isNewBest,
          starsEarned: EB.Scoring.starsThisRun,
          maxCombo: EB.Scoring.maxComboThisRun,
          unlockedAchievements: this.runUnlockedAchievements
        });
      }, 420);
    },

    startLoop() {
      const tick = (now) => {
        const dt = this.lastTime ? Math.min(0.05, (now - this.lastTime) / 1000) : 0.016;
        this.lastTime = now;
        this.elapsed += dt;

        if (EB.UI.currentScreen === 'game') {
          this.update(dt);
          this.render();
        }
        this.rafId = requestAnimationFrame(tick);
      };
      this.rafId = requestAnimationFrame(tick);
    },

    update(dt) {
      EB.Particles.update(dt);
      if (this.returningPiece) {
        this.returningPiece.progress += dt * 7.5;
        if (this.returningPiece.progress >= 1) {
          this.returningPiece = null;
        }
      }
    },

    render() {
      const ctx = this.ctx;
      if (!ctx) return;

      ctx.save();
      ctx.scale(this.dpr, this.dpr);
      ctx.clearRect(0, 0, this.width, this.height);

      // Camera shake offset
      if (EB.Particles.shakeTime > 0) {
        const mag = EB.Particles.shakeMagnitude * (EB.Particles.shakeTime / 0.32);
        ctx.translate((Math.random() - 0.5) * mag, (Math.random() - 0.5) * mag);
      }

      this.renderBoardPanel(ctx);
      this.renderBoardCells(ctx);
      this.renderPlacementPreview(ctx);
      this.renderPowerUpPreview(ctx);
      this.renderTray(ctx);
      EB.Particles.render(ctx);
      this.renderFloatingDragPiece(ctx);

      ctx.restore();
    },

    renderBoardPanel(ctx) {
      const pad = 8;
      const bx = this.boardX - pad;
      const by = this.boardY - pad;
      const bw = this.boardSize + pad * 2;
      const bh = this.boardSize + pad * 2;

      ctx.save();
      ctx.fillStyle = 'rgba(10, 20, 52, 0.85)';
      ctx.strokeStyle = 'rgba(0, 229, 255, 0.32)';
      ctx.lineWidth = 2;
      ctx.shadowColor = 'rgba(0, 0, 0, 0.5)';
      ctx.shadowBlur = 18;
      roundRect(ctx, bx, by, bw, bh, 18);
      ctx.fill();
      ctx.shadowBlur = 0;
      ctx.stroke();

      // Empty cell grid slots
      for (let r = 0; r < 8; r++) {
        for (let c = 0; c < 8; c++) {
          const x = this.boardX + c * this.cellSize + 2;
          const y = this.boardY + r * this.cellSize + 2;
          const s = this.cellSize - 4;
          ctx.fillStyle = (r + c) % 2 === 0 ? 'rgba(22, 41, 92, 0.65)' : 'rgba(18, 34, 78, 0.65)';
          ctx.strokeStyle = 'rgba(86, 178, 255, 0.12)';
          ctx.lineWidth = 1;
          roundRect(ctx, x, y, s, s, 6);
          ctx.fill();
          ctx.stroke();
        }
      }
      ctx.restore();
    },

    renderBoardCells(ctx) {
      const pulse = 0.85 + Math.sin(this.elapsed * 4.5) * 0.15;
      for (let r = 0; r < 8; r++) {
        for (let c = 0; c < 8; c++) {
          const cell = this.board.grid[r][c];
          const x = this.boardX + c * this.cellSize + 2;
          const y = this.boardY + r * this.cellSize + 2;
          const s = this.cellSize - 4;

          if (cell.element) {
            this.drawElementalBlock(ctx, x, y, s, cell.element, 1);
          }

          if (cell.hasStar) {
            ctx.save();
            ctx.translate(x + s * 0.5, y + s * 0.5);
            ctx.scale(pulse, pulse);
            ctx.fillStyle = '#FFD740';
            ctx.shadowColor = '#FFD740';
            ctx.shadowBlur = 12;
            EB.drawStarShape(ctx, 0, 0, 5, s * 0.34, s * 0.16);
            ctx.fill();
            ctx.strokeStyle = '#FFF8E1';
            ctx.lineWidth = 1.2;
            ctx.stroke();
            ctx.restore();
          }
        }
      }
    },

    renderPlacementPreview(ctx) {
      const d = this.drag;
      if (!d || d.anchorRow === null || d.anchorCol === null) return;

      // Highlight full rows/cols that will clear
      if (d.isValid && d.previewClears) {
        ctx.save();
        ctx.fillStyle = 'rgba(0, 229, 255, 0.18)';
        ctx.strokeStyle = 'rgba(0, 229, 255, 0.75)';
        ctx.lineWidth = 2;
        d.previewClears.rows.forEach((r) => {
          roundRect(
            ctx,
            this.boardX,
            this.boardY + r * this.cellSize,
            this.boardSize,
            this.cellSize,
            6
          );
          ctx.fill();
          ctx.stroke();
        });
        d.previewClears.cols.forEach((c) => {
          roundRect(
            ctx,
            this.boardX + c * this.cellSize,
            this.boardY,
            this.cellSize,
            this.boardSize,
            6
          );
          ctx.fill();
          ctx.stroke();
        });
        ctx.restore();
      }

      // Draw preview blocks
      d.piece.cells.forEach(([dr, dc]) => {
        const r = d.anchorRow + dr;
        const c = d.anchorCol + dc;
        if (r < 0 || r >= 8 || c < 0 || c >= 8) return;
        const x = this.boardX + c * this.cellSize + 2;
        const y = this.boardY + r * this.cellSize + 2;
        const s = this.cellSize - 4;

        if (d.isValid) {
          this.drawElementalBlock(ctx, x, y, s, d.piece.element, 0.45);
        } else {
          ctx.save();
          ctx.fillStyle = 'rgba(255, 82, 82, 0.32)';
          ctx.strokeStyle = 'rgba(255, 82, 82, 0.85)';
          ctx.lineWidth = 2;
          roundRect(ctx, x, y, s, s, 6);
          ctx.fill();
          ctx.stroke();
          ctx.restore();
        }
      });
    },

    renderPowerUpPreview(ctx) {
      if (!this.activePowerUp || !this.hoverBoardCell) return;
      const { row, col } = this.hoverBoardCell;

      ctx.save();
      if (this.activePowerUp === 'dynamite') {
        for (let dr = -1; dr <= 1; dr++) {
          for (let dc = -1; dc <= 1; dc++) {
            const r = row + dr;
            const c = col + dc;
            if (r >= 0 && r < 8 && c >= 0 && c < 8) {
              const x = this.boardX + c * this.cellSize + 2;
              const y = this.boardY + r * this.cellSize + 2;
              const s = this.cellSize - 4;
              ctx.fillStyle = 'rgba(255, 109, 0, 0.35)';
              ctx.strokeStyle = '#FFD740';
              ctx.lineWidth = 2;
              roundRect(ctx, x, y, s, s, 6);
              ctx.fill();
              ctx.stroke();
            }
          }
        }
      } else if (this.activePowerUp === 'hammer') {
        const x = this.boardX + col * this.cellSize + 2;
        const y = this.boardY + row * this.cellSize + 2;
        const s = this.cellSize - 4;
        ctx.fillStyle = 'rgba(0, 229, 255, 0.35)';
        ctx.strokeStyle = '#00E5FF';
        ctx.lineWidth = 2;
        roundRect(ctx, x, y, s, s, 6);
        ctx.fill();
        ctx.stroke();
      }
      ctx.restore();
    },

    renderTray(ctx) {
      // Tray glass panel
      ctx.save();
      ctx.fillStyle = 'rgba(12, 23, 58, 0.72)';
      ctx.strokeStyle = 'rgba(86, 178, 255, 0.22)';
      ctx.lineWidth = 1.5;
      roundRect(ctx, 8, this.trayY, this.width - 16, this.trayHeight, 16);
      ctx.fill();
      ctx.stroke();
      ctx.restore();

      for (let i = 0; i < 3; i++) {
        const piece = this.tray[i];
        if (!piece) continue;
        if (this.drag && this.drag.slotIdx === i) continue;
        if (this.returningPiece && this.returningPiece.slotIdx === i) continue;

        const slot = this.slotCenters[i];
        const maxCell = Math.min(this.cellSize * 0.56, slot.maxW / Math.max(piece.width, 3), slot.maxH / Math.max(piece.height, 3));
        const fits = this.board.canPieceFitAnywhere(piece);
        this.drawPieceCentered(ctx, piece, slot.x, slot.y, maxCell, fits ? 1 : 0.42);
      }

      if (this.returningPiece) {
        const rp = this.returningPiece;
        const t = 1 - Math.pow(1 - Math.min(1, rp.progress), 3);
        const curX = rp.fromX + (rp.toX - rp.fromX) * t;
        const curY = rp.fromY + (rp.toY - rp.fromY) * t;
        const slot = this.slotCenters[rp.slotIdx];
        const targetCell = Math.min(this.cellSize * 0.56, slot.maxW / Math.max(rp.piece.width, 3));
        const curCell = this.cellSize + (targetCell - this.cellSize) * t;
        this.drawPieceCentered(ctx, rp.piece, curX, curY, curCell, 0.95);
      }
    },

    renderFloatingDragPiece(ctx) {
      if (!this.drag) return;
      this.drawPieceCentered(ctx, this.drag.piece, this.drag.x, this.drag.y, this.cellSize, 0.94);
    },

    drawPieceCentered(ctx, piece, cx, cy, cellSize, alpha) {
      const totalW = piece.width * cellSize;
      const totalH = piece.height * cellSize;
      const startX = cx - totalW * 0.5;
      const startY = cy - totalH * 0.5;
      const gap = Math.max(1.5, cellSize * 0.06);

      piece.cells.forEach(([r, c]) => {
        const x = startX + c * cellSize + gap;
        const y = startY + r * cellSize + gap;
        const s = cellSize - gap * 2;
        this.drawElementalBlock(ctx, x, y, s, piece.element, alpha);
      });
    },

    drawElementalBlock(ctx, x, y, s, element, alpha = 1) {
      const pal = ELEMENT_PALETTES[element] || ELEMENT_PALETTES.water;
      const radius = Math.max(4, s * 0.18);

      ctx.save();
      ctx.globalAlpha = alpha;

      // Base bevel gradient
      const grad = ctx.createLinearGradient(x, y, x + s, y + s);
      grad.addColorStop(0, pal.top);
      grad.addColorStop(0.5, pal.mid);
      grad.addColorStop(1, pal.bot);

      ctx.shadowColor = pal.glow;
      ctx.shadowBlur = alpha >= 0.9 ? 8 : 0;
      ctx.fillStyle = grad;
      roundRect(ctx, x, y, s, s, radius);
      ctx.fill();

      ctx.shadowBlur = 0;

      // Elemental inner texture
      ctx.save();
      roundRect(ctx, x, y, s, s, radius);
      ctx.clip();

      if (element === 'fire') {
        // Flame tongue highlight
        ctx.fillStyle = 'rgba(255, 235, 130, 0.34)';
        ctx.beginPath();
        ctx.moveTo(x + s * 0.25, y + s * 0.85);
        ctx.quadraticCurveTo(x + s * 0.35, y + s * 0.3, x + s * 0.52, y + s * 0.2);
        ctx.quadraticCurveTo(x + s * 0.72, y + s * 0.45, x + s * 0.75, y + s * 0.85);
        ctx.closePath();
        ctx.fill();
      } else if (element === 'water') {
        // Shimmering wave crest
        ctx.fillStyle = 'rgba(255, 255, 255, 0.28)';
        ctx.beginPath();
        ctx.moveTo(x, y + s * 0.42);
        ctx.quadraticCurveTo(x + s * 0.35, y + s * 0.22, x + s * 0.65, y + s * 0.42);
        ctx.quadraticCurveTo(x + s * 0.85, y + s * 0.54, x + s, y + s * 0.35);
        ctx.lineTo(x + s, y);
        ctx.lineTo(x, y);
        ctx.closePath();
        ctx.fill();
      } else if (element === 'earth') {
        // Chiseled stone facet
        ctx.strokeStyle = 'rgba(255, 255, 255, 0.24)';
        ctx.lineWidth = Math.max(1, s * 0.06);
        ctx.beginPath();
        ctx.moveTo(x + s * 0.18, y + s * 0.55);
        ctx.lineTo(x + s * 0.48, y + s * 0.32);
        ctx.lineTo(x + s * 0.82, y + s * 0.65);
        ctx.stroke();
      } else if (element === 'air') {
        // Swirling wind arc
        ctx.strokeStyle = 'rgba(255, 255, 255, 0.48)';
        ctx.lineWidth = Math.max(1.2, s * 0.07);
        ctx.beginPath();
        ctx.arc(x + s * 0.5, y + s * 0.52, s * 0.26, Math.PI * 0.2, Math.PI * 1.55);
        ctx.stroke();
      }

      // Top glossy sheen
      ctx.fillStyle = 'rgba(255, 255, 255, 0.22)';
      ctx.fillRect(x + 2, y + 2, s - 4, s * 0.24);
      ctx.restore();

      // Luminous rim border
      ctx.strokeStyle = pal.border;
      ctx.lineWidth = 1.3;
      roundRect(ctx, x + 0.5, y + 0.5, s - 1, s - 1, radius);
      ctx.stroke();

      ctx.restore();
    }
  };

  function roundRect(ctx, x, y, w, h, r) {
    const rad = Math.min(r, w * 0.5, h * 0.5);
    ctx.beginPath();
    ctx.moveTo(x + rad, y);
    ctx.arcTo(x + w, y, x + w, y + h, rad);
    ctx.arcTo(x + w, y + h, x, y + h, rad);
    ctx.arcTo(x, y + h, x, y, rad);
    ctx.arcTo(x, y, x + w, y, rad);
    ctx.closePath();
  }

  // Android lifecycle & back hooks
  global.onAndroidBack = function () {
    if (EB.UI) EB.UI.goBack();
    return 'HANDLED';
  };

  global.onAppPause = function () {
    if (EB.Audio) EB.Audio.onPause();
    if (EB.Game && EB.UI && EB.UI.currentScreen === 'game' && !EB.Game.isGameOver) {
      EB.Game.saveActiveGameState();
    }
  };

  global.onAppResume = function () {
    if (EB.Audio) EB.Audio.onResume();
    if (EB.Storage && EB.UI) {
      EB.Storage.ensureTodayDaily();
      if (EB.UI.currentScreen === 'menu') EB.UI.renderMenu();
      if (EB.UI.currentScreen === 'daily') EB.UI.renderDaily();
    }
  };

  document.addEventListener('DOMContentLoaded', () => {
    EB.Storage.init();
    EB.UI.init();
    Game.init();
    Game.startLoop();

    const unlockAudio = () => {
      EB.Audio.ensureContext();
      EB.Audio.syncMusicSetting();
      document.removeEventListener('pointerdown', unlockAudio);
    };
    document.addEventListener('pointerdown', unlockAudio, { passive: true });
  });

  EB.Game = Game;
})(window);
