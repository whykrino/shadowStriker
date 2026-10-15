'use strict';

const ZONE_SPAWN_ACTIVATE_DIST = 1200;

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
    this.spawnInterval = danger === 'hard' ? 5.0 : danger === 'mid' ? 3.5 : 2.5;
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

    const ix0 = world.wallThickness + 200;
    const ix1 = world.width - world.wallThickness - 200;
    const iy0 = world.wallThickness + 200;
    const iy1 = world.height - world.wallThickness - 200;
    const cx = (ix0 + ix1) / 2;
    const cy = (iy0 + iy1) / 2;

    this.zones.push(new Zone(ix0 + 300, iy0 + 300, 280, 'safe', 'Луга слизней',
      ['slime', 'slime', 'slime', 'slime', 'slime', 'slime', 'tank']));

    this.zones.push(new Zone(ix1 - 300, iy0 + 300, 300, 'mid', 'Пепелище',
      ['tank', 'ranger', 'ranger', 'slime', 'slime', 'kamikaze', 'kamikaze']));
    this.zones.push(new Zone(ix0 + 300, iy1 - 300, 300, 'mid', 'Логово демонов',
      ['tank', 'tank', 'ranger', 'summoner', 'slime', 'kamikaze', 'kamikaze']));
    this.zones.push(new Zone(cx, cy, 340, 'mid', 'Арена',
      ['assassin', 'ranger', 'ranger', 'tank', 'summoner', 'kamikaze', 'kamikaze']));

    this.zones.push(new Zone(ix1 - 350, iy1 - 350, 340, 'hard', 'Проклятый сад',
      ['assassin', 'assassin', 'summoner', 'summoner', 'kamikaze', 'kamikaze', 'kamikaze']));
    this.zones.push(new Zone(cx, iy0 + 200, 300, 'hard', 'Обитель теней',
      ['boss']));

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
      const r = Math.sqrt(Math.random()) * zone.radius * 0.75;
      x = zone.x + Math.cos(a) * r;
      y = zone.y + Math.sin(a) * r;
    }

    const m = this.pool.obtain({ x, y, archetypeId: id, homeZone: zone, playerLevel: this.playerLevel });
    this.monsters.push(m);
    return m;
  }

  update(dt, player, damageNumbers) {
    const zones = this.zones;
    const px = player.x;
    const py = player.y;
    const activateD2 = ZONE_SPAWN_ACTIVATE_DIST * ZONE_SPAWN_ACTIVATE_DIST;

    for (let i = 0; i < zones.length; i++) {
      const zone = zones[i];

      const zdx = zone.x - px;
      const zdy = zone.y - py;
      const zd2 = zdx * zdx + zdy * zdy;
      if (zd2 > activateD2) continue;

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

    for (let i = 0; i < this.monsters.length; i++) {
      this.monsters[i].update(dt, player, this, damageNumbers, this.world);
    }

    for (let i = this.monsters.length - 1; i >= 0; i--) {
      if (!this.monsters[i].alive) {
        this.pool.release(this.monsters[i]);
        this.monsters.splice(i, 1);
      }
    }
  }
}