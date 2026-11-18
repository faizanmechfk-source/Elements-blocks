(function (global) {
  'use strict';

  const EB = (global.EB = global.EB || {});

  const POWERUPS = {
    dynamite: {
      id: 'dynamite',
      name: 'Dynamite',
      icon: '🧨',
      cost: 15,
      bundleCost: 38,
      desc: 'Select any spot on the board to blast a 3×3 area.'
    },
    lightning: {
      id: 'lightning',
      name: 'Lightning',
      icon: '⚡',
      cost: 20,
      bundleCost: 50,
      desc: 'Choose an element (Fire, Water, Earth, Air) and vaporize all matching blocks.'
    },
    hammer: {
      id: 'hammer',
      name: 'Hammer',
      icon: '🔨',
      cost: 10,
      bundleCost: 25,
      desc: 'Tap any single occupied cell on the board to smash it.'
    },
    shuffle: {
      id: 'shuffle',
      name: 'Shuffle',
      icon: '🔀',
      cost: 12,
      bundleCost: 30,
      desc: 'Replace all remaining tray pieces with a fresh set of 3 blocks.'
    }
  };

  const PowerUpManager = {
    DEFINITIONS: POWERUPS,
    activeMode: null,

    canAfford(id) {
      const def = POWERUPS[id];
      const data = EB.Storage.data;
      if (!def || !data) return false;
      const stocked = (data.inventory && data.inventory[id]) || 0;
      return stocked > 0 || data.stars >= def.cost;
    },

    consumePowerUpCost(id) {
      const def = POWERUPS[id];
      const data = EB.Storage.data;
      if (!def || !data) return false;

      if (data.inventory && data.inventory[id] > 0) {
        data.inventory[id]--;
        data.powerUpsUsed++;
        EB.Storage.saveData();
        return true;
      }

      if (data.stars >= def.cost) {
        data.stars -= def.cost;
        data.powerUpsUsed++;
        EB.Storage.saveData();
        return true;
      }

      return false;
    },

    buyInShop(id, qty) {
      const def = POWERUPS[id];
      const data = EB.Storage.data;
      if (!def || !data) return { ok: false, reason: 'Invalid item' };

      const price = qty === 3 ? def.bundleCost : def.cost;
      if (data.stars < price) {
        return { ok: false, reason: 'Not enough Stars!' };
      }

      data.stars -= price;
      data.inventory[id] = (data.inventory[id] || 0) + qty;
      EB.Storage.saveData();
      return { ok: true, newCount: data.inventory[id] };
    },

    getDisplayCost(id) {
      const def = POWERUPS[id];
      const data = EB.Storage.data;
      if (!def || !data) return '';
      const stocked = (data.inventory && data.inventory[id]) || 0;
      return stocked > 0 ? `×${stocked} Free` : `${def.cost} ★`;
    }
  };

  EB.PowerUps = PowerUpManager;
})(window);
