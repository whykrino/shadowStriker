'use strict';

const ZONE_DANGER = {
  safe: { color: '#4a9eff', recommendedLevel: 1 },
  mid: { color: '#b070ff', recommendedLevel: 5 },
  hard: { color: '#ff3355', recommendedLevel: 10 },
};

class Zone {
  constructor(x, y, radius, danger, name, spawnList) {
    this.x = x;
    this.y = y;
    this.radius = radius;
    this.danger = danger;
    this.name = name;
    this.color = ZONE_DANGER[danger].color;
    this.recommendedLevel = ZONE_DANGER[danger].recommendedLevel;
    this.spawnList = spawnList;
    this.targetCount = spawnList.length;
    this.spawnInterval = danger === 'hard' ? 4.0 : danger === 'mid' ? 3.5 : 2.5;
  }

  contains(x, y) {
    const dx = x - this.x;
    const dy = y - this.y;
    return dx * dx + dy * dy < this.radius * this.radius;
  }
}

class ZoneManager {
  constructor(world, pool) {
    this.zones = [];
    this.monsters = [];
    this.pool = pool;
    this.bulletPool = null;
    this.world = world;
    this.playerLevel = 1;

    this.zones.push(new Zone(1000, 1100, 500, 'safe', 'Луга слизней',
      ['slime', 'slime', 'slime', 'slime', 'slime', 'slime', 'slime']));

    this.zones.push(new Zone(3600, 1600, 520, 'mid', 'Пепелище',
      ['tank', 'tank', 'ranger', 'ghost', 'worm', 'shaman', 'flyer', 'kamikaze', 'assassin']));

    this.zones.push(new Zone(6100, 1500, 520, 'hard', 'Проклятый сад',
      ['assassin', 'assassin', 'ghost', 'sentinel', 'shaman', 'flyer', 'kamikaze', 'worm', 'summoner']));

    this.spawnTimers = new Float32Array(this.zones.length);
    for (let i = 0; i < this.zones.length; i++) {
      this.spawnTimers[i] = Math.random() * 0.5;
    }

    for (let i = 0; i < this.zones.length; i++) {
      const z = this.zones[i];
      for (let k = 0; k < z.targetCount; k++) this.spawnInZone(z);
    }
  }

  attachBulletPool(pool) {
    this.bulletPool = pool;
  }

  onPlayerLevel(level) {
    this.playerLevel = level;
  }

  spawnInZone(zone, forcedId, forcedX, forcedY) {
    if (!zone) return null;

    let id;
    if (forcedId) {
      id = forcedId;
    } else if (this.playerLevel > 0 && this.playerLevel % 10 === 0 && zone.danger === 'hard') {
      id = 'boss';
    } else {
      id = zone.spawnList[Math.floor(Math.random() * zone.spawnList.length)];
    }
    if (!ARCHETYPES[id]) return null;

    let x, y;
    if (forcedX !== undefined && forcedY !== undefined) {
      x = forcedX;
      y = forcedY;
    } else {
      const a = Math.random() * Math.PI * 2;
      const r = Math.sqrt(Math.random()) * zone.radius * 0.8;
      x = zone.x + Math.cos(a) * r;
      y = zone.y + Math.sin(a) * r;
    }

    const m = this.pool.obtain({ x, y, archetypeId: id, homeZone: zone, playerLevel: this.playerLevel });
    this.monsters.push(m);
    return m;
  }

  update(dt, player, damageNumbers) {
    const zones = this.zones;

    for (let i = 0; i < zones.length; i++) {
      const zone = zones[i];

      let count = 0;
      for (let j = 0; j < this.monsters.length; j++) {
        const m = this.monsters[j];
        if (m.alive && m.homeZone === zone) count++;
      }

      if (count < zone.targetCount) {
        this.spawnTimers[i] -= dt;
        if (this.spawnTimers[i] <= 0) {
          this.spawnInZone(zone);
          this.spawnTimers[i] = zone.spawnInterval;
        }
      } else {
        this.spawnTimers[i] = zone.spawnInterval;
      }
    }

    const monsters = this.monsters;
    for (let i = 0; i < monsters.length; i++) {
      monsters[i].update(dt, player, this, damageNumbers, this.world);
    }

    for (let i = monsters.length - 1; i >= 0; i--) {
      if (!monsters[i].alive) {
        this.pool.release(monsters[i]);
        monsters.splice(i, 1);
      }
    }
  }
}