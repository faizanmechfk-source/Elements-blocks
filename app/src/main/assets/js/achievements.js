(function (global) {
  'use strict';

  const EB = (global.EB = global.EB || {});

  const ACHIEVEMENTS = [
    {
      id: 'first_move',
      title: 'First Move',
      desc: 'Place your very first elemental block.',
      reward: 5,
      target: 1,
      progress: (d) => d.totalMoves
    },
    {
      id: 'first_clear',
      title: 'First Line Clear',
      desc: 'Clear your first complete row or column.',
      reward: 5,
      target: 1,
      progress: (d) => d.totalLinesCleared
    },
    {
      id: 'score_100',
      title: 'Score 100',
      desc: 'Reach a score of 100 in any game.',
      reward: 5,
      target: 100,
      progress: (d, run) => Math.max(d.bestScore, run ? run.score : 0)
    },
    {
      id: 'score_500',
      title: 'Score 500',
      desc: 'Reach a score of 500 in any game.',
      reward: 10,
      target: 500,
      progress: (d, run) => Math.max(d.bestScore, run ? run.score : 0)
    },
    {
      id: 'score_1000',
      title: 'Score 1000',
      desc: 'Reach a score of 1,000 in any game.',
      reward: 20,
      target: 1000,
      progress: (d, run) => Math.max(d.bestScore, run ? run.score : 0)
    },
    {
      id: 'score_5000',
      title: 'Score 5000',
      desc: 'Reach a legendary score of 5,000.',
      reward: 50,
      target: 5000,
      progress: (d, run) => Math.max(d.bestScore, run ? run.score : 0)
    },
    {
      id: 'clear_2_lines',
      title: 'Clear 2 Lines Together',
      desc: 'Clear 2 or more lines in a single move.',
      reward: 10,
      target: 2,
      progress: (d, run) => Math.max(d.maxCombo, run ? run.maxComboThisRun : 0)
    },
    {
      id: 'clear_3_lines',
      title: 'Clear 3 Lines Together',
      desc: 'Clear 3 or more lines in a single move.',
      reward: 25,
      target: 3,
      progress: (d, run) => Math.max(d.maxCombo, run ? run.maxComboThisRun : 0)
    },
    {
      id: 'stars_10',
      title: 'Collect 10 Stars',
      desc: 'Collect 10 stars from the game board.',
      reward: 10,
      target: 10,
      progress: (d) => d.totalStarsCollected
    },
    {
      id: 'stars_50',
      title: 'Collect 50 Stars',
      desc: 'Collect 50 stars from the game board.',
      reward: 30,
      target: 50,
      progress: (d) => d.totalStarsCollected
    },
    {
      id: 'moves_100',
      title: 'Complete 100 Moves',
      desc: 'Place 100 block pieces across all games.',
      reward: 15,
      target: 100,
      progress: (d) => d.totalMoves
    },
    {
      id: 'mult_5',
      title: 'Reach 5x Multiplier',
      desc: 'Build a 5x consecutive clear multiplier.',
      reward: 20,
      target: 5,
      progress: (d, run) => Math.max(d.maxMultiplier, run ? run.multiplier : 1)
    },
    {
      id: 'mult_10',
      title: 'Reach 10x Multiplier',
      desc: 'Build a massive 10x multiplier streak.',
      reward: 50,
      target: 10,
      progress: (d, run) => Math.max(d.maxMultiplier, run ? run.multiplier : 1)
    },
    {
      id: 'games_10',
      title: 'Play 10 Games',
      desc: 'Complete 10 full puzzle sessions.',
      reward: 15,
      target: 10,
      progress: (d) => d.totalGames
    },
    {
      id: 'games_100',
      title: 'Play 100 Games',
      desc: 'Complete 100 full puzzle sessions.',
      reward: 60,
      target: 100,
      progress: (d) => d.totalGames
    }
  ];

  const AchievementManager = {
    LIST: ACHIEVEMENTS,

    evaluate(runContext) {
      const data = EB.Storage.data;
      if (!data) return [];

      const unlockedSet = new Set(data.achievements.unlockedIds);
      const newlyUnlocked = [];

      ACHIEVEMENTS.forEach((ach) => {
        if (unlockedSet.has(ach.id)) return;
        const val = ach.progress(data, runContext);
        if (val >= ach.target) {
          unlockedSet.add(ach.id);
          data.stars += ach.reward;
          newlyUnlocked.push(ach);
        }
      });

      if (newlyUnlocked.length > 0) {
        data.achievements.unlockedIds = Array.from(unlockedSet);
        EB.Storage.saveData();
      }
      return newlyUnlocked;
    },

    updateDailyProgress(delta) {
      EB.Storage.ensureTodayDaily();
      const daily = EB.Storage.data.daily;
      if (!daily || !Array.isArray(daily.quests)) return;

      daily.quests.forEach((q) => {
        if (q.type === 'lines' && delta.lines) q.progress = Math.min(q.target, q.progress + delta.lines);
        if (q.type === 'score' && delta.points) q.progress = Math.min(q.target, q.progress + delta.points);
        if (q.type === 'stars' && delta.stars) q.progress = Math.min(q.target, q.progress + delta.stars);
        if (q.type === 'moves' && delta.moves) q.progress = Math.min(q.target, q.progress + delta.moves);
        if (q.type === 'combo' && delta.combo >= 2) q.progress = Math.min(q.target, q.progress + 1);
      });

      EB.Storage.saveData();
    },

    claimDailyReward(questId) {
      EB.Storage.ensureTodayDaily();
      const data = EB.Storage.data;
      const quest = data.daily.quests.find((q) => q.id === questId);
      if (!quest) return false;
      if (quest.claimed || quest.progress < quest.target) return false;

      quest.claimed = true;
      data.stars += quest.reward;
      data.dailyCompletedCount = (data.dailyCompletedCount || 0) + 1;
      EB.Storage.saveData();
      return quest.reward;
    }
  };

  EB.Achievements = AchievementManager;
})(window);
