'use strict';

const ABILITIES = {
  dash: {
    id: 'dash',
    name: 'РЫВОК',
    desc: 'SHIFT - стремительный рывок',
    icon: '»',
    unlockLevel: 2,
  },
  spin: {
    id: 'spin',
    name: 'ВИХРЬ',
    desc: 'ПКМ - круговой удар',
    icon: '◎',
    unlockLevel: 4,
  },
  heal: {
    id: 'heal',
    name: 'РЕГЕНЕРАЦИЯ',
    desc: '+3 HP в секунду вне боя',
    icon: '✚',
    unlockLevel: 6,
  },
  berserk: {
    id: 'berserk',
    name: 'ЯРОСТЬ',
    desc: '+25% урона при HP ниже 30%',
    icon: '⚔',
    unlockLevel: 8,
  },
  phoenix: {
    id: 'phoenix',
    name: 'ФЕНИКС',
    desc: 'Один раз за жизнь: воскрешение с 50% HP',
    icon: '✦',
    unlockLevel: 12,
  },
};

class AbilitySystem {
  constructor() {
    this.unlocked = new Set();
    this.usedOnce = new Set();
  }

  checkUnlocks(level, notifications) {
    const newlyUnlocked = [];
    for (const id in ABILITIES) {
      const ab = ABILITIES[id];
      if (ab.unlockLevel <= level && !this.unlocked.has(id)) {
        this.unlocked.add(id);
        newlyUnlocked.push(ab);
        if (notifications) {
          notifications.ability(
            'НОВАЯ СПОСОБНОСТЬ',
            ab.name + ' - ' + ab.desc,
            ab.icon
          );
        }
      }
    }
    return newlyUnlocked;
  }

  has(id) { return this.unlocked.has(id); }

  consumeOnce(id) {
    if (this.usedOnce.has(id)) return false;
    this.usedOnce.add(id);
    return true;
  }

  list() {
    const result = [];
    for (const id in ABILITIES) {
      const ab = ABILITIES[id];
      result.push({
        id,
        name: ab.name,
        desc: ab.desc,
        icon: ab.icon,
        unlockLevel: ab.unlockLevel,
        unlocked: this.unlocked.has(id),
      });
    }
    return result.sort((a, b) => a.unlockLevel - b.unlockLevel);
  }
}