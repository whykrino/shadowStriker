'use strict';

const ARCHETYPES = {
  slime: {
    id: 'slime', name: 'Слизень',
    hp: 130, damage: 13, speed: 65, radius: 18, exp: 6,
    color1: '#0e1a30', color2: '#1e3a5f', color3: '#4a9eff',
    behavior: 'chaser', attackRange: 22, attackCooldown: 1.0,
  },
  tank: {
    id: 'tank', name: 'Голем',
    hp: 520, damage: 24, speed: 45, radius: 26, exp: 14,
    color1: '#201510', color2: '#3a2a1a', color3: '#c89060',
    behavior: 'chaser', attackRange: 28, attackCooldown: 1.4,
    armored: true, knockbackResist: 0.8,
  },
  ranger: {
    id: 'ranger', name: 'Стрелок',
    hp: 220, damage: 16, speed: 90, radius: 20, exp: 16,
    color1: '#1a0e30', color2: '#3a1e5f', color3: '#b070ff',
    behavior: 'ranged', attackRange: 320, attackCooldown: 2.0,
    preferredRange: 240, projectileCount: 3,
  },
  assassin: {
    id: 'assassin', name: 'Убийца',
    hp: 290, damage: 40, speed: 130, radius: 20, exp: 26,
    color1: '#0a0e18', color2: '#1a1e2a', color3: '#8fc9ff',
    behavior: 'assassin', attackRange: 24, attackCooldown: 1.2,
    invisibility: true, backstab: 2.0,
  },
  summoner: {
    id: 'summoner', name: 'Призыватель',
    hp: 420, damage: 11, speed: 70, radius: 22, exp: 30,
    color1: '#200a1a', color2: '#4a1e3a', color3: '#ff88bb',
    behavior: 'summoner', attackRange: 300, attackCooldown: 3.0,
    summonInterval: 6.0, summonType: 'slime', summonCount: 2,
    preferredRange: 220,
  },
  kamikaze: {
    id: 'kamikaze', name: 'Камикадзе',
    hp: 32, damage: 60, speed: 220, radius: 16, exp: 20,
    color1: '#3a0a10', color2: '#6a1a20', color3: '#ff3355',
    behavior: 'kamikaze', attackRange: 24, attackCooldown: 0.6,
  },
  boss: {
    id: 'boss', name: 'Тень',
    hp: 3200, damage: 70, speed: 160, radius: 32, exp: 300,
    color1: '#100818', color2: '#2a1040', color3: '#ff88ff',
    behavior: 'boss', attackRange: 40, attackCooldown: 1.0,
    burstProjectileCount: 12, burstCooldown: 4.0,
    healCooldown: 12.0, blinkCooldown: 5.0,
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