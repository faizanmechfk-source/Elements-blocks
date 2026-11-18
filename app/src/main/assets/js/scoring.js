(function (global) {
  'use strict';

  const EB = (global.EB = global.EB || {});

  const Scoring = {
    score: 0,
    combo: 0,
    maxComboThisRun: 0,
    multiplier: 1,
    streak: 0,
    starsThisRun: 0,
    linesThisRun: 0,
    movesThisRun: 0,

    resetRun() {
      this.score = 0;
      this.combo = 0;
      this.maxComboThisRun = 0;
      this.multiplier = 1;
      this.streak = 0;
      this.starsThisRun = 0;
      this.linesThisRun = 0;
      this.movesThisRun = 0;
    },

    loadRun(saved) {
      if (!saved) {
        this.resetRun();
        return;
      }
      this.score = saved.score || 0;
      this.combo = saved.combo || 0;
      this.maxComboThisRun = saved.maxComboThisRun || 0;
      this.multiplier = Math.max(1, saved.multiplier || 1);
      this.streak = saved.streak || 0;
      this.starsThisRun = saved.starsThisRun || 0;
      this.linesThisRun = saved.linesThisRun || 0;
      this.movesThisRun = saved.movesThisRun || 0;
    },

    serializeRun() {
      return {
        score: this.score,
        combo: this.combo,
        maxComboThisRun: this.maxComboThisRun,
        multiplier: this.multiplier,
        streak: this.streak,
        starsThisRun: this.starsThisRun,
        linesThisRun: this.linesThisRun,
        movesThisRun: this.movesThisRun
      };
    },

    scorePlacement(cellCount) {
      this.movesThisRun++;
      const pts = cellCount * 2;
      this.score += pts;
      return pts;
    },

    scoreClearResult(clearResult) {
      const { fullRows, fullCols, totalLines, clearedCells } = clearResult;

      if (totalLines === 0) {
        // Gradually reset streak and multiplier on no-clear moves
        if (this.streak > 0) {
          this.streak = Math.max(0, this.streak - 1);
        }
        if (this.multiplier > 1) {
          this.multiplier = Math.max(1, this.multiplier - 1);
        }
        this.combo = 0;
        return {
          totalAwarded: 0,
          multiplierIncreased: false,
          multiplier: this.multiplier,
          comboLabel: ''
        };
      }

      // Consecutive line clears increase streak and multiplier
      this.streak++;
      const prevMult = this.multiplier;
      const multGain = totalLines >= 2 ? totalLines : 1;
      this.multiplier = Math.min(20, this.multiplier + multGain);

      this.combo = totalLines;
      if (this.combo > this.maxComboThisRun) {
        this.maxComboThisRun = this.combo;
      }
      this.linesThisRun += totalLines;

      const cellPoints = clearedCells.length * 10;
      const rowBonus = fullRows.length * 20;
      const colBonus = fullCols.length * 20;
      const multiLineBonus = totalLines > 1 ? totalLines * totalLines * 25 : 0;
      const streakBonus = this.streak > 1 ? (this.streak - 1) * 15 : 0;

      const bonusPool = rowBonus + colBonus + multiLineBonus + streakBonus;
      const totalAwarded = cellPoints + bonusPool * this.multiplier;

      this.score += totalAwarded;

      let comboLabel = '';
      if (totalLines === 2) comboLabel = 'DOUBLE CLEAR!';
      else if (totalLines === 3) comboLabel = 'TRIPLE CLEAR!';
      else if (totalLines === 4) comboLabel = 'QUAD ELEMENT!';
      else if (totalLines >= 5) comboLabel = 'MEGA CLEAR!';

      return {
        totalAwarded,
        multiplierIncreased: this.multiplier > prevMult,
        multiplier: this.multiplier,
        comboLabel
      };
    },

    scorePowerUpDestroy(removedCount) {
      if (removedCount <= 0) return 0;
      const pts = removedCount * 8;
      this.score += pts;
      return pts;
    }
  };

  EB.Scoring = Scoring;
})(window);
