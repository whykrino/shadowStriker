'use strict';

const CONFIG = {
  camSmooth: 8,
  camOffsetY: 60,
};

class MonsterPool extends ObjectPool {
  constructor() {
    super(
      () => new Monster(),
      (m, args) => m.reset(args.x, args.y, args.archetypeId, args.homeZone, args.playerLevel),
      100
    );
  }
}

class Game {
  constructor() {
    this.canvas = document.getElementById('game');
    this.ctx = this.canvas.getContext('2d', { alpha: false });

    this.resize();
    window.addEventListener('resize', () => this.resize());

    this.audio = new AudioSystem();
    this.input = new Input();
    this.world = new World();
    this.particles = new ParticleSystem();
    this.hud = new HUD(this.audio);
    this.notifications = new NotificationSystem(this.audio);
    this.codex = new CodexUI();

    this.stats = new PlayerStats();
    this.abilities = new AbilitySystem();
    this.talents = new TalentSystem();
    this.talents.load();

    this.monsterPool = new MonsterPool();
    this.bulletPool = new BulletPool();
    this.damageNumbers = new DamageNumberPool();
    this.lootPool = new LootPool();

    this.zones = new ZoneManager(this.world, this.monsterPool);
    this.zones.attachBulletPool(this.bulletPool);

    const spawn = this.findSafeSpawn();
    this.player = new Player(spawn.x, spawn.y, this.stats, this.abilities, this.talents);

    this.minimap = new Minimap(this.world, this.zones.zones);

    this.camX = this.player.x - this.width / 2;
    this.camY = this.player.y - this.height / 2;

    this.running = true;
    this.renderList = [];
    this._vignette = null;
    this._regenTimer = 0;
    this._enemySoundTimer = 0;

    this.hud.onTalentClick = (id) => {
      if (this.talents.learn(id)) {
        this.player.refreshStats();
        this.talents.save();
        this.hud.updateSkillMenu(this.talents, this.abilities);
        this.audio.notificationAbility();
      }
    };

    this.notifications.info(
      'ДОБРО ПОЖАЛОВАТЬ',
      'Начни с синей зоны, там безопасно',
      '◈'
    );

    this.lastTime = performance.now();
    this.loop = this.loop.bind(this);
    requestAnimationFrame(this.loop);

    if (typeof CheatMenu !== 'undefined') {
      this.cheatMenu = new CheatMenu(this);
    }
  }

  findSafeSpawn() {
    const w = this.world;
    const margin = w.wallThickness + 200;
    const maxX = w.width - margin;
    const maxY = w.height - margin;
    let best = { x: w.width / 2, y: w.height / 2 };
    let bestDist = -1;
    for (let i = 0; i < 120; i++) {
      const x = margin + Math.random() * (maxX - margin);
      const y = margin + Math.random() * (maxY - margin);
      let minDistSq = Infinity;
      for (const zone of this.zones.zones) {
        const dx = x - zone.x;
        const dy = y - zone.y;
        const d2 = dx * dx + dy * dy;
        if (d2 < minDistSq) minDistSq = d2;
      }
      if (minDistSq > bestDist) { bestDist = minDistSq; best = { x, y }; }
    }
    return best;
  }

  resize() {
    this.width = window.innerWidth;
    this.height = window.innerHeight;
    this.canvas.width = this.width;
    this.canvas.height = this.height;
    this.ctx.imageSmoothingEnabled = false;
    this._vignette = null;
  }

  updateCamera(dt) {
    const t = 1 - Math.pow(0.0005, dt);
    const mapMinX = 0;
    const mapMaxX = this.world.width - this.width;
    const mapMinY = this.world.wallThickness - this.height * 0.4;
    const mapMaxY = this.world.height - this.world.wallThickness - this.height * 0.6;
    const targetX = Utils.clamp(this.player.x - this.width / 2, mapMinX, mapMaxX);
    const targetY = Utils.clamp(this.player.y - this.height / 2 + CONFIG.camOffsetY, mapMinY, mapMaxY);
    this.camX += (targetX - this.camX) * t;
    this.camY += (targetY - this.camY) * t;
  }

  screenToWorld(sx, sy) {
    return { x: sx + this.camX, y: sy + this.camY };
  }

  update(dt) {
    this.notifications.update(dt);

    if (this.input.wasPressed('KeyU')) {
      const open = this.hud.isSkillMenuOpen();
      this.hud.toggleSkillMenu(!open);
      if (!open) {
        this.hud.toggleAudioMenu(false);
        this.codex.toggle(false);
        this.hud.updateSkillMenu(this.talents, this.abilities);
      }
    }
    if (this.input.wasPressed('KeyI')) {
      const open = this.hud.isAudioMenuOpen();
      this.hud.toggleAudioMenu(!open);
      if (!open) {
        this.hud.toggleSkillMenu(false);
        this.codex.toggle(false);
      }
    }
    if (this.input.wasPressed('KeyK')) {
      const open = this.codex.isOpen();
      this.codex.toggle(!open);
      if (!open) {
        this.hud.toggleSkillMenu(false);
        this.hud.toggleAudioMenu(false);
      }
    }
    if (this.input.wasPressed('Escape')) {
      this.hud.toggleSkillMenu(false);
      this.hud.toggleAudioMenu(false);
      this.codex.toggle(false);
    }

    if (!this.running) { this.input.endFrame(); return; }
    if (this.hud.isSkillMenuOpen() || this.hud.isAudioMenuOpen() || this.codex.isOpen()) {
      this.input.endFrame();
      return;
    }

    const mw = this.screenToWorld(this.input.mouseScreenX, this.input.mouseScreenY);

    const wasDashing = this.player.dashTimer > 0;
    if (this.input.consumeClick(dt)) {
      this.audio.swordSwing();
    }
    this.player.update(dt, this.input, this.world, mw.x, mw.y);

    if (!wasDashing && this.player.dashTimer > 0) {
      this.audio.dash();
    }

    const mv = this.input.moveVector;
    const moving = Math.hypot(mv.x, mv.y) > 0.1;
    this.audio.updatePlayer(dt, moving);
    this.audio.updateListener(this.player.x, this.player.y);

    this.zones.update(dt, this.player, this.damageNumbers);
    this.bulletPool.update(dt);
    this.damageNumbers.update(dt);
    this.lootPool.update(dt);

    const p = this.player;
    this.lootPool.forEachActive((l) => {
      const dx = l.x - p.x;
      const dy = l.y - p.y;
      const r = p.radius + l.radius;
      if (dx * dx + dy * dy < r * r) {
        l.active = false;
        this.audio.pickup();
        if (l.type === 'hp') p.heal(l.value);
        else if (l.type === 'exp') this.stats.addExp(l.value);
        else if (l.type === 'buff') {
          p.buffTimer = 10;
          p.buffType = l.value;
        }
      }
    });

    if (this.player.consumeAttackHit()) this.performHit(mw.x, mw.y);

    const monsters = this.zones.monsters;
    const bullets = this.bulletPool.active;
    let inCombat = false;

    for (let i = 0; i < monsters.length; i++) {
      const m = monsters[i];
      if (!m.alive) continue;
      const dx = m.x - p.x;
      const dy = m.y - p.y;
      const d2 = dx * dx + dy * dy;

      if (d2 < m.aggroRange * m.aggroRange) inCombat = true;

      const range = m.radius + p.radius;
      if (d2 < range * range && m.attackCooldown <= 0) {
        const hpBefore = p.hp;
        p.takeDamage(m.damage);
        if (p.hp < hpBefore) this.audio.playerHurt();
        m.attackCooldown = m.archetype.attackCooldown || 1.0;
        const d = Math.sqrt(d2) || 1;
        const k = 1 - (m.archetype.knockbackResist || 0);
        m.x += (dx / d) * 15 * k;
        m.y += (dy / d) * 15 * k;
      }
    }

    for (let i = bullets.length - 1; i >= 0; i--) {
      const b = bullets[i];
      const dx = b.x - p.x;
      const dy = b.y - p.y;
      const r = b.radius + p.radius;
      if (dx * dx + dy * dy < r * r) {
        const hpBefore = p.hp;
        p.takeDamage(b.damage);
        if (p.hp < hpBefore) this.audio.playerHurt();
        this.bulletPool.release(b);
        this.particles.burst(b.x, b.y, 8, '#ff5577', 4);
      }
    }

    this._enemySoundTimer -= dt;
    if (this._enemySoundTimer <= 0 && monsters.length > 0) {
      this._enemySoundTimer = 3 + Math.random() * 3;
      for (let i = 0; i < Math.min(3, monsters.length); i++) {
        const m = monsters[Math.floor(Math.random() * monsters.length)];
        if (m.alive) this.audio.enemyRoar(m.x, m.y, m.archetypeId);
      }
    }

    const regenRate = this.talents.effects.regen;
    if (regenRate > 0 && !inCombat) {
      this._regenTimer += dt;
      if (this._regenTimer >= 1) {
        this._regenTimer -= 1;
        p.heal(regenRate);
      }
    }

    this.particles.update(dt);
    this.updateCamera(dt);

    this.hud.update(p.hp, this.stats.maxHp, this.stats.exp, this.stats.expToNext, this.stats.level);
    this.hud.updateDash(p, this.abilities.has('dash'));

    if (!p.alive) {
      if (this.talents.effects.phoenix && !p.phoenixUsed) {
        p.phoenixUsed = true;
        p.alive = true;
        p.hp = Math.round(this.stats.maxHp * 0.5);
        p.invulnTimer = 2.0;
        this.notifications.ability('БЕССМЕРТИЕ', 'Воскрешение', '✦');
      } else {
        this.running = false;
        this.hud.showGameOver();
      }
    }

    this.input.endFrame();
  }

  performHit(mouseWorldX, mouseWorldY) {
    const p = this.player;
    const dxc = mouseWorldX - p.x;
    const dyc = mouseWorldY - p.y;
    const clen = Math.hypot(dxc, dyc) || 1;
    const dirX = dxc / clen;
    const dirY = dyc / clen;

    const range = p._cachedRange * (p.chargedAttack ? 1.4 : 1);
    const t = this.talents.effects;
    let damage = p._cachedDamage;

    if (p.chargedAttack) damage = Math.round(damage * 2.5);

    if (t.berserk && p.hp / this.stats.maxHp < 0.4) {
      damage = Math.round(damage * 1.3);
    }
    if (p.buffType === 'damage' && p.buffTimer > 0) {
      damage = Math.round(damage * 1.5);
    }

    const isDouble = t.doubleStrike > 0 && Math.random() < t.doubleStrike;
    if (isDouble) damage = Math.round(damage * 0.7);

    const isSpin = p.isSpinAttack() || p.chargedAttack;
    const arc = isSpin ? Math.PI * 2 : p.attackArc;
    const minDot = Math.cos(arc / 2);

    this.particles.burst(
      p.x + dirX * range * 0.55,
      p.y + dirY * range * 0.55,
      8, p.chargedAttack ? '#ffdd44' : '#4a9eff', 4
    );

    const monsters = this.zones.monsters;
    let hitAny = false;

    for (let i = 0; i < monsters.length; i++) {
      const m = monsters[i];
      if (!m.alive) continue;

      const dx = m.x - p.x;
      const dy = m.y - p.y;
      const d = Math.hypot(dx, dy);
      if (d > range + m.radius) continue;

      if (!isSpin) {
        const dot = (dx * dirX + dy * dirY) / (d || 1);
        if (dot < minDot) continue;
      }

      const angleToMonster = Math.atan2(dy, dx);
      const facingToMonster = Math.abs(Utils.angleLerp(p.facing, angleToMonster, 1));
      const fromBehind = facingToMonster > Math.PI * 0.6;

      let dmg = damage;
      if (fromBehind) dmg = Math.round(dmg * 2);

      if (t.execute > 0 && m.hp / m.maxHp < t.execute) {
        m.hp = 0;
        m.alive = false;
        this.damageNumbers.spawn(m.x, m.y, 0, '#ff3355', true);
        this.onEnemyKilled(m);
        continue;
      }

      if (isDouble) {
        const r1 = m.takeDamage(dmg, fromBehind, false);
        const r2 = m.takeDamage(dmg, fromBehind, false);
        this.damageNumbers.spawn(m.x, m.y, r1.actual, fromBehind ? '#ff8800' : '#8fc9ff', fromBehind);
        this.damageNumbers.spawn(m.x + 10, m.y - 10, r2.actual, fromBehind ? '#ff8800' : '#8fc9ff', fromBehind);
        if (r1.killed || r2.killed) this.onEnemyKilled(m);
      } else {
        const r = m.takeDamage(dmg, fromBehind, false);
        this.damageNumbers.spawn(m.x, m.y, r.actual, fromBehind ? '#ff8800' : '#8fc9ff', fromBehind);
        if (r.killed) this.onEnemyKilled(m);
      }

      hitAny = true;

      if (t.freeze && m.alive) m.freeze(1.0);
      if (t.lifesteal > 0) p.heal(damage * t.lifesteal);

      this.particles.burst(
        m.x, m.y,
        m.alive ? 7 : 16,
        m.alive ? '#4a9eff' : '#8fc9ff',
        m.alive ? 3 : 6
      );

      if (!m.archetype.knockbackResist || Math.random() > m.archetype.knockbackResist) {
        const nx = dx / (d || 1);
        const ny = dy / (d || 1);
        m.x += nx * 22;
        m.y += ny * 22;
      }
    }

    if (hitAny) this.audio.hitEnemy();
  }

  onEnemyKilled(m) {
    this.player.onKill();
    this.audio.killEnemy();

    const dropRoll = Math.random();
    if (m.archetypeId === 'boss') {
      this.lootPool.spawn(m.x, m.y, 'hp', 50);
      this.lootPool.spawn(m.x + 20, m.y, 'exp', 100);
      this.lootPool.spawn(m.x - 20, m.y, 'buff', 'damage');
    } else {
      if (dropRoll < 0.15) this.lootPool.spawn(m.x, m.y, 'hp', 15);
      else if (dropRoll < 0.30) this.lootPool.spawn(m.x, m.y, 'exp', 10);
      else if (dropRoll < 0.38) this.lootPool.spawn(m.x, m.y, 'buff', Math.random() < 0.5 ? 'damage' : 'speed');
    }

    const leveled = this.stats.addExp(m.expValue);
    if (leveled > 0) {
      this.player.onLevelUp();
      this.zones.onPlayerLevel(this.stats.level);
      this.talents.addPoints(leveled);
      this.talents.save();
      this.hud.updateSkillMenu(this.talents, this.abilities);
      this.audio.levelUp();
      this.notifications.ability(
        'УРОВЕНЬ ' + this.stats.level,
        'Получено ' + leveled + ' очко таланта',
        '★'
      );
      this.abilities.checkUnlocks(this.stats.level, this.notifications);

      if (this.stats.level % 5 === 0) {
        this.notifications.danger('УСИЛЕНИЕ ВРАГОВ', 'Мобы стали сильнее', '!');
      }
      if (this.stats.level % 10 === 0) {
        this.notifications.danger('ПОЯВИЛСЯ БОСС', 'Найди его в красной зоне', '☠');
      }
    }
  }

  render() {
    const ctx = this.ctx;
    const camX = Math.floor(this.camX);
    const camY = Math.floor(this.camY);
    const W = this.width;
    const H = this.height;

    this.world.renderGround(ctx, camX, camY, W, H);
    this.world.renderZoneOverlay(ctx, camX, camY, this.zones.zones);

    const list = this.renderList;
    list.length = 0;

    const padX = 100;
    const padY = 150;
    const minX = camX - padX;
    const maxX = camX + W + padX;
    const minY = camY - padY;
    const maxY = camY + H + padY;

    const props = this.world.props;
    for (let i = 0; i < props.length; i++) {
      const p = props[i];
      if (p.x < minX || p.x > maxX || p.y < minY || p.y > maxY) continue;
      list.push(p);
    }

    const mons = this.zones.monsters;
    for (let i = 0; i < mons.length; i++) {
      const m = mons[i];
      if (!m.alive) continue;
      if (m.x < minX || m.x > maxX || m.y < minY || m.y > maxY) continue;
      list.push(m);
    }

    list.push(this.player);

    const mountains = this.world.mountains;
    for (let i = 0; i < mountains.length; i++) {
      const m = mountains[i];
      if (m.x < minX || m.x > maxX || m.y < minY || m.y > maxY) continue;
      list.push(m);
    }

    list.sort((a, b) => a.y - b.y);

    const now = performance.now() * 0.001;

    for (let i = 0; i < list.length; i++) {
      const e = list[i];
      if (e === this.player) { e.render(ctx, camX, camY); continue; }
      if (e.type === 'deadTree') this.world.renderDeadTree(ctx, e.x - camX, e.y - camY, e, now);
      else if (e.type === 'spikeRock') this.world.renderSpikeRock(ctx, e.x - camX, e.y - camY, e);
      else if (e.type === 'shrub') this.world.renderShrub(ctx, e.x - camX, e.y - camY, e, now);
      else if (e.type === 'grass') this.world.renderGrass(ctx, e.x - camX, e.y - camY, e, now);
      else if (e.type === 'crystal') this.world.renderCrystal(ctx, e.x - camX, e.y - camY, e, now);
      else if (e.layers !== undefined && e.seed !== undefined) this.world.renderMountain(ctx, e.x - camX, e.y - camY, e);
      else if (e.alive !== undefined && e.archetypeId) e.render(ctx, camX, camY);
    }

    this.bulletPool.render(ctx, camX, camY);
    this.lootPool.render(ctx, camX, camY);
    this.particles.render(ctx, camX, camY);
    this.damageNumbers.render(ctx, camX, camY);
    this.renderVignette(ctx);
    this.minimap.render(ctx, this.player, this.zones.monsters, W, H, this.stats.level);

    if (this.input.mouseScreenX > 0) {
      ctx.save();
      ctx.strokeStyle = 'rgba(74, 158, 255, 0.9)';
      ctx.lineWidth = 1.5;
      ctx.beginPath();
      ctx.arc(this.input.mouseScreenX, this.input.mouseScreenY, 10, 0, Math.PI * 2);
      ctx.stroke();
      ctx.beginPath();
      ctx.arc(this.input.mouseScreenX, this.input.mouseScreenY, 2, 0, Math.PI * 2);
      ctx.fillStyle = 'rgba(143, 201, 255, 1)';
      ctx.fill();
      ctx.restore();
    }
  }

  renderVignette(ctx) {
    if (!this._vignette) {
      const grad = ctx.createRadialGradient(
        this.width / 2, this.height / 2, Math.min(this.width, this.height) * 0.35,
        this.width / 2, this.height / 2, Math.max(this.width, this.height) * 0.75
      );
      grad.addColorStop(0, 'rgba(5, 8, 18, 0)');
      grad.addColorStop(1, 'rgba(5, 8, 18, 0.7)');
      this._vignette = grad;
    }
    ctx.fillStyle = this._vignette;
    ctx.fillRect(0, 0, this.width, this.height);
  }

  loop(time) {
    const dt = Math.min((time - this.lastTime) / 1000, 0.05);
    this.lastTime = time;
    this.update(dt);
    this.render();
    requestAnimationFrame(this.loop);
  }
}

window.addEventListener('DOMContentLoaded', () => {
  window.game = new Game();
});