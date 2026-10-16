'use strict';

const ARCHETYPES = {
  slime: {
    id: 'slime', name: 'Слизень',
    hp: 45, damage: 13, speed: 65, radius: 18, exp: 6,
    color1: '#0e1a30', color2: '#1e3a5f', color3: '#4a9eff',
    behavior: 'chaser', attackRange: 22, attackCooldown: 1.0,
    tier: 1,
  },
  tank: {
    id: 'tank', name: 'Голем',
    hp: 220, damage: 22, speed: 45, radius: 26, exp: 14,
    color1: '#201510', color2: '#3a2a1a', color3: '#c89060',
    behavior: 'chaser', attackRange: 28, attackCooldown: 1.4,
    armored: true, knockbackResist: 0.8,
    tier: 2,
  },
  ranger: {
    id: 'ranger', name: 'Стрелок',
    hp: 110, damage: 14, speed: 90, radius: 20, exp: 16,
    color1: '#1a0e30', color2: '#3a1e5f', color3: '#b070ff',
    behavior: 'ranged', attackRange: 320, attackCooldown: 2.0,
    preferredRange: 240, projectileCount: 3,
    tier: 2,
  },
  assassin: {
    id: 'assassin', name: 'Убийца',
    hp: 130, damage: 35, speed: 130, radius: 20, exp: 26,
    color1: '#0a0e18', color2: '#1a1e2a', color3: '#8fc9ff',
    behavior: 'assassin', attackRange: 24, attackCooldown: 1.2,
    invisibility: true, backstab: 2.0,
    tier: 3,
  },
  summoner: {
    id: 'summoner', name: 'Призыватель',
    hp: 180, damage: 11, speed: 70, radius: 22, exp: 30,
    color1: '#200a1a', color2: '#4a1e3a', color3: '#ff88bb',
    behavior: 'summoner', attackRange: 300, attackCooldown: 3.0,
    summonInterval: 6.0, summonType: 'slime', summonCount: 2,
    preferredRange: 220,
    tier: 3,
  },
  kamikaze: {
    id: 'kamikaze', name: 'Камикадзе',
    hp: 16, damage: 60, speed: 220, radius: 16, exp: 20,
    color1: '#3a0a10', color2: '#6a1a20', color3: '#ff3355',
    behavior: 'kamikaze', attackRange: 24, attackCooldown: 0.6,
    tier: 3,
  },

  ghost: {
    id: 'ghost', name: 'Призрак',
    hp: 90, damage: 24, speed: 110, radius: 20, exp: 32,
    color1: '#0a1420', color2: '#1a3050', color3: '#8fdfff',
    behavior: 'ghost', attackRange: 24, attackCooldown: 1.2,
    backstab: 2.5, phasing: true,
    tier: 3,
  },
  shaman: {
    id: 'shaman', name: 'Шаман',
    hp: 160, damage: 8, speed: 55, radius: 22, exp: 34,
    color1: '#142010', color2: '#2a4020', color3: '#88ff88',
    behavior: 'healer', attackRange: 260, attackCooldown: 2.5,
    healRange: 220, healAmount: 30, healInterval: 3.5,
    preferredRange: 200, projectileCount: 2,
    tier: 3,
  },
  worm: {
    id: 'worm', name: 'Червь',
    hp: 140, damage: 18, speed: 60, radius: 22, exp: 28,
    color1: '#2a0e10', color2: '#5a1a20', color3: '#ff7788',
    behavior: 'splitter', attackRange: 26, attackCooldown: 1.3,
    splitInto: 'wormling', splitCount: 2,
    tier: 3,
  },
  wormling: {
    id: 'wormling', name: 'Малый червь',
    hp: 40, damage: 9, speed: 90, radius: 14, exp: 8,
    color1: '#2a0e10', color2: '#5a1a20', color3: '#ff7788',
    behavior: 'chaser', attackRange: 18, attackCooldown: 1.0,
    tier: 2,
  },
  flyer: {
    id: 'flyer', name: 'Летун',
    hp: 100, damage: 22, speed: 150, radius: 18, exp: 30,
    color1: '#1a1020', color2: '#3a2040', color3: '#dd88ff',
    behavior: 'flyer', attackRange: 340, attackCooldown: 2.2,
    preferredRange: 260, projectileCount: 2,
    tier: 3,
  },
  sentinel: {
    id: 'sentinel', name: 'Страж',
    hp: 380, damage: 30, speed: 0, radius: 28, exp: 45,
    color1: '#101820', color2: '#20304a', color3: '#66ddff',
    behavior: 'sentinel', attackRange: 420, attackCooldown: 2.8,
    beamDamage: 30, beamDuration: 1.2, beamWindup: 1.0,
    knockbackResist: 1.0,
    tier: 4,
  },

  boss: {
    id: 'boss', name: 'Тень',
    hp: 1400, damage: 60, speed: 160, radius: 32, exp: 300,
    color1: '#100818', color2: '#2a1040', color3: '#ff88ff',
    behavior: 'boss', attackRange: 40, attackCooldown: 1.0,
    burstProjectileCount: 12, burstCooldown: 4.0,
    healCooldown: 12.0, blinkCooldown: 5.0,
    tier: 5,
  },
};

function scaleArchetype(base, playerLevel) {
  const stacks = playerLevel > 1
    ? Math.floor((playerLevel - 1) / 5)
    : 0;
  const hpMult = Math.pow(1.4, stacks);
  const dmgMult = Math.pow(1.25, stacks);
  return {
    ...base,
    hp: Math.round(base.hp * hpMult),
    damage: Math.round(base.damage * dmgMult),
    stacks,
  };
}