'use strict';

const TALENT_TREE = {
  root: {
    id: 'root', name: 'ПУТЬ НИНДЗЯ', desc: 'Начало',
    icon: '◈', cost: 0, requires: [], stat: 'root',
    effect: {},
  },

  str1: {
    id: 'str1', name: 'КРЕПКИЙ ХВАТ', desc: '+15% урона мечом',
    icon: '⚔', cost: 1, requires: ['root'], stat: 'str',
    effect: { damageMult: 0.15 },
  },
  str2: {
    id: 'str2', name: 'РАССЕЧЕНИЕ', desc: 'Удар задевает мобов за первым',
    icon: '◎', cost: 2, requires: ['str1'], stat: 'str',
    effect: { cleave: true },
  },
  str3: {
    id: 'str3', name: 'ЖАЖДА КРОВИ', desc: '5% урона восстанавливает HP',
    icon: '❤', cost: 2, requires: ['str1'], stat: 'str',
    effect: { lifesteal: 0.05 },
  },
  str4: {
    id: 'str4', name: 'ЯРОСТЬ', desc: '+30% урона при HP ниже 40%',
    icon: '⚡', cost: 3, requires: ['str3'], stat: 'str',
    effect: { berserk: true },
  },
  str5: {
    id: 'str5', name: 'КАЗНЬ', desc: 'Мгновенно убивает мобов с HP ниже 20%',
    icon: '💀', cost: 4, requires: ['str2', 'str4'], stat: 'str',
    effect: { execute: 0.2 },
  },

  agi1: {
    id: 'agi1', name: 'ЛЁГКИЙ ШАГ', desc: '+10% скорости',
    icon: '»', cost: 1, requires: ['root'], stat: 'agi',
    effect: { speedMult: 0.1 },
  },
  agi2: {
    id: 'agi2', name: 'ВТОРОЕ ДЫХАНИЕ', desc: '+1 заряд рывка',
    icon: '»»', cost: 2, requires: ['agi1'], stat: 'agi',
    effect: { dashCharges: 1 },
  },
  agi3: {
    id: 'agi3', name: 'ТЕНЕВОЙ ШАГ', desc: 'Рывок сквозь мобов',
    icon: '◈', cost: 2, requires: ['agi1'], stat: 'agi',
    effect: { phaseDash: true },
  },
  agi4: {
    id: 'agi4', name: 'ДВОЙНОЙ УДАР', desc: '15% шанс ударить дважды',
    icon: '✕', cost: 3, requires: ['agi2'], stat: 'agi',
    effect: { doubleStrike: 0.15 },
  },
  agi5: {
    id: 'agi5', name: 'ФАНТОМ', desc: 'Рывок оставляет двойника, наносящий урон',
    icon: '✦', cost: 4, requires: ['agi4', 'agi3'], stat: 'agi',
    effect: { phantomDash: true },
  },

  int1: {
    id: 'int1', name: 'ОСТРЫЙ ВЗГЛЯД', desc: '+15% радиуса атаки',
    icon: '◉', cost: 1, requires: ['root'], stat: 'int',
    effect: { rangeMult: 0.15 },
  },
  int2: {
    id: 'int2', name: 'ЗНАНИЕ', desc: '+20% получаемого опыта',
    icon: '✦', cost: 2, requires: ['int1'], stat: 'int',
    effect: { expMult: 0.2 },
  },
  int3: {
    id: 'int3', name: 'ЗАМОРОЗКА', desc: 'Удар замедляет моба на 1 сек',
    icon: '❄', cost: 2, requires: ['int1'], stat: 'int',
    effect: { freeze: true },
  },
  int4: {
    id: 'int4', name: 'ВИХРЬ', desc: 'Каждый 4-й удар круговой',
    icon: '◐', cost: 3, requires: ['int3'], stat: 'int',
    effect: { spinEvery: 4 },
  },
  int5: {
    id: 'int5', name: 'АРКАННЫЙ ЩИТ', desc: 'Щит 30 HP восстанавливается через 8 сек',
    icon: '⛨', cost: 4, requires: ['int2', 'int4'], stat: 'int',
    effect: { arcaneShield: 30 },
  },

  vit1: {
    id: 'vit1', name: 'ТОЛСТАЯ КОЖА', desc: '+25 макс HP',
    icon: '♥', cost: 1, requires: ['root'], stat: 'vit',
    effect: { maxHp: 25 },
  },
  vit2: {
    id: 'vit2', name: 'РЕГЕНЕРАЦИЯ', desc: '+1 HP в секунду вне боя',
    icon: '✚', cost: 2, requires: ['vit1'], stat: 'vit',
    effect: { regen: 1 },
  },
  vit3: {
    id: 'vit3', name: 'СТОЙКОСТЬ', desc: '-15% получаемого урона',
    icon: '⛨', cost: 2, requires: ['vit1'], stat: 'vit',
    effect: { damageResist: 0.15 },
  },
  vit4: {
    id: 'vit4', name: 'ЯРОСТЬ ЖИЗНИ', desc: 'Каждое убийство даёт +2 HP',
    icon: '✚', cost: 3, requires: ['vit2'], stat: 'vit',
    effect: { healOnKill: 2 },
  },
  vit5: {
    id: 'vit5', name: 'БЕССМЕРТИЕ', desc: 'Один раз за жизнь: воскрешение с 50% HP',
    icon: '✦', cost: 5, requires: ['vit3', 'vit4'], stat: 'vit',
    effect: { phoenix: true },
  },
};

class TalentSystem {
  constructor() {
    this.learned = new Set(['root']);
    this.points = 0;
    this.effects = this.recompute();
  }

  canLearn(id) {
    const node = TALENT_TREE[id];
    if (!node) return false;
    if (this.learned.has(id)) return false;
    if (this.points < node.cost) return false;
    for (const req of node.requires) {
      if (!this.learned.has(req)) return false;
    }
    return true;
  }

  learn(id) {
    if (!this.canLearn(id)) return false;
    const node = TALENT_TREE[id];
    this.learned.add(id);
    this.points -= node.cost;
    this.effects = this.recompute();
    return true;
  }

  addPoints(n) { this.points += n; }

  recompute() {
    const e = {
      damageMult: 0, speedMult: 0, rangeMult: 0, expMult: 0,
      maxHp: 0, regen: 0, dashCharges: 0, dashCooldownMult: 0,
      lifesteal: 0, damageResist: 0, healOnKill: 0,
      cleave: false, berserk: false, execute: 0,
      phaseDash: false, doubleStrike: 0, phantomDash: false,
      freeze: false, spinEvery: 0, arcaneShield: 0,
      phoenix: false,
    };

    for (const id of this.learned) {
      const node = TALENT_TREE[id];
      if (!node) continue;
      for (const key in node.effect) {
        const val = node.effect[key];
        if (typeof val === 'number') {
          if (key === 'execute') e[key] = Math.max(e[key], val);
          else if (key === 'doubleStrike') e[key] = Math.max(e[key], val);
          else if (key === 'arcaneShield') e[key] = Math.max(e[key], val);
          else e[key] += val;
        } else {
          e[key] = val;
        }
      }
    }

    return e;
  }

  listNodes() {
    const list = [];
    for (const id in TALENT_TREE) {
      const n = TALENT_TREE[id];
      list.push({
        id,
        name: n.name,
        desc: n.desc,
        icon: n.icon,
        cost: n.cost,
        requires: n.requires,
        stat: n.stat,
        learned: this.learned.has(id),
        available: this.canLearn(id),
      });
    }
    return list;
  }

  save() {}

  load() {}
}