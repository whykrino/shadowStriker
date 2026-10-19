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

    this.state = 'menu';
    this.menuBg = new MenuBackground();

    this.uiWrapper = [
      document.getElementById('hud'), 
      document.getElementById('controls'), 
      document.getElementById('notifications'), 
      document.getElementById('dash-indicator'), 
      document.getElementById('block-indicator')
    ];
    document.getElementById('main-menu').classList.add('show');

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

    this.setupMenus();

    this.monsterPool = new MonsterPool();
    this.bulletPool = new BulletPool();
    this.damageNumbers = new DamageNumberPool();
    this.lootPool = new LootPool();

    this.zones = new ZoneManager(this.world, this.monsterPool);
    this.zones.attachBulletPool(this.bulletPool);

    const spawn = this.findSafeSpawn();
    this.spawnPoint = spawn;
    this.world.buildRuins(spawn.x, spawn.y);

    this.player = new Player(spawn.x, spawn.y, this.stats, this.abilities, this.talents);

    this.minimap = new Minimap(this.world, this.zones.zones);

    this.camX = this.player.x - this.width / 2;
    this.camY = this.player.y - this.height / 2;

    this.running = true;
    this.renderList = [];
    this._regenTimer = 0;

    this.hud.onTalentClick = (id) => {
      if (this.talents.learn(id)) {
        this.player.refreshStats();
        this.talents.save();
        this.hud.updateSkillMenu(this.talents, this.abilities);
        this.audio.notificationAbility();
      }
    };

    this.hud.update(this.player.hp, this.stats.maxHp, this.stats.exp, this.stats.expToNext, this.stats.level);
    this.hud.updateDash(this.player, this.abilities.has('dash'));
    this.hud.updateBlock(this.player, true);

    this.notifications.info(
      'ДОБРО ПОЖАЛОВАТЬ',
      'Синяя зона слева, там безопасно',
      '◈'
    );

    this.lastTime = performance.now();
    this.loop = this.loop.bind(this);
    requestAnimationFrame(this.loop);

    if (typeof CheatMenu !== 'undefined') {
      this.cheatMenu = new CheatMenu(this);
    }
  }

  setupMenus() {
    const toggleUI = (show) => {
      this.uiWrapper.forEach(el => {
        if (el) el.style.display = show ? '' : 'none';
      });
    };

    toggleUI(false);

    document.getElementById('btn-start').addEventListener('click', () => {
      document.getElementById('main-menu').classList.remove('show');
      this.state = 'playing';
      toggleUI(true);
      this.menuBg = null;
      if (!this.audio.ctx) this.audio.init();
      else this.audio.startMusic();
    });

    document.getElementById('btn-audio').addEventListener('click', () => {
      document.getElementById('audio-menu').classList.add('show');
    });

    document.getElementById('btn-resume').addEventListener('click', () => {
      document.getElementById('pause-menu').classList.remove('show');
      this.state = 'playing';
    });

    document.getElementById('btn-restart').addEventListener('click', () => {
      window.location.reload();
    });

    document.getElementById('btn-pause-audio').addEventListener('click', () => {
      document.getElementById('audio-menu').classList.add('show');
    });
  }

  findSafeSpawn() {
    const w = this.world;
    let safe = null;
    for (const z of this.zones.zones) {
      if (z.danger === 'safe') { safe = z; break; }
    }
    if (!safe) {
      return { x: w.width / 2, y: w.height / 2 };
    }
    return { x: safe.x + safe.radius + 480, y: safe.y };
  }

  resize() {
    const dpr = Math.min(window.devicePixelRatio || 1, 1);
    this.width = window.innerWidth;
    this.height = window.innerHeight;
    this.canvas.width = Math.floor(this.width * dpr);
    this.canvas.height = Math.floor(this.height * dpr);
    this.canvas.style.width = this.width + 'px';
    this.canvas.style.height = this.height + 'px';
    this.ctx.imageSmoothingEnabled = false;
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
    if (this.state === 'menu') {
      if (this.menuBg) this.menuBg.update(dt);
      if (this.input.wasPressed('Escape') && this.hud.isAudioMenuOpen()) {
        this.hud.toggleAudioMenu(false);
      }
      this.input.endFrame();
      return;
    }

    if (this.state === 'paused') {
      if (this.input.wasPressed('Escape')) {
        if (this.hud.isAudioMenuOpen()) {
          this.hud.toggleAudioMenu(false);
        } else {
          document.getElementById('pause-menu').classList.remove('show');
          this.state = 'playing';
        }
      }
      this.input.endFrame();
      return;
    }

    if (this.input.wasPressed('KeyM')) {
      this.minimap.toggleFull();
    }

    if (this.input.wasPressed('Escape')) {
      if (this.minimap.fullMapOpen) {
        this.minimap.toggleFull();
      } else {
        this.state = 'paused';
        document.getElementById('pause-menu').classList.add('show');
      }
      this.input.endFrame();
      return;
    }

    if (this.hud.isSkillMenuOpen() || this.hud.isAudioMenuOpen() || this.codex.isOpen() || this.minimap.fullMapOpen) {
      this.input.endFrame();
      return;
    }

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
    if (this.input.wasPressed('KeyK')) {
      const open = this.codex.isOpen();
      this.codex.toggle(!open);
      if (!open) {
        this.hud.toggleSkillMenu(false);
        this.hud.toggleAudioMenu(false);
      }
    }

    if (!this.running) { this.input.endFrame(); return; }

    const mw = this.screenToWorld(this.input.mouseScreenX, this.input.mouseScreenY);

    const wasDashing = this.player.dashTimer > 0;
    this.input.consumeClick(dt);
    this.player.update(dt, this.input, this.world, mw.x, mw.y, this.audio);

    if (!wasDashing && this.player.dashTimer > 0) {
      this.audio.dash();
    }

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
        p.takeDamage(m.damage, true);
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
        p.takeDamage(b.damage, false);
        if (p.hp < hpBefore) this.audio.playerHurt();
        this.bulletPool.release(b);
        this.particles.burst(b.x, b.y, 4, '#ff5577', 3);
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
    this.hud.updateBlock(p, true);

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
    let damage = p.damage;

    if (p.chargedAttack) {
      const chargeBonus = 1.0 + Math.min(1.6, p.chargedAmount) * 1.5;
      damage = damage * chargeBonus;
    }
    if (p._isSpinAttackActive) {
      damage = damage * 1.6;
    }

    if (t.berserk && p.hp / this.stats.maxHp < 0.4) {
      damage = damage * 1.3;
    }
    if (p.buffType === 'damage' && p.buffTimer > 0) {
      damage = damage * 1.5;
    }

    const isDouble = t.doubleStrike > 0 && Math.random() < t.doubleStrike;
    if (isDouble) damage = damage * 0.7;

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

      const mobToPlayerX = p.x - m.x;
      const mobToPlayerY = p.y - m.y;
      const mpLen = Math.hypot(mobToPlayerX, mobToPlayerY) || 1;
      const mobFacingX = Math.cos(m.facing);
      const mobFacingY = Math.sin(m.facing);
      const facingDot = (mobToPlayerX * mobFacingX + mobToPlayerY * mobFacingY) / mpLen;
      const fromBehind = facingDot < -0.5;

      let dmg = damage;
      if (fromBehind) dmg = dmg * 2;

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

      if (!m.archetype.knockbackResist || Math.random() > m.archetype.knockbackResist) {
        const nx = dx / (d || 1);
        const ny = dy / (d || 1);
        m.x += nx * 22;
        m.y += ny * 22;
      }
    }

    p.chargedAmount = 0;

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

  renderGameWorld() {
    const ctx = this.ctx;
    const camX = Math.floor(this.camX);
    const camY = Math.floor(this.camY);
    const W = this.width;
    const H = this.height;

    this.world.renderGround(ctx, camX, camY, W, H);
    this.world.renderZoneOverlay(ctx, camX, camY, this.zones.zones);

    const list = this.renderList;
    list.length = 0;

    const padX = 160;
    const padY = 220;
    const minX = camX - padX;
    const maxX = camX + W + padX;
    const minY = camY - padY;
    const maxY = camY + H + padY;

    const props = this.world.props;
    for (let i = 0; i < props.length; i++) {
      const p = props[i];
      if (p.type !== 'tree' && p.type !== 'spikeRock') continue;
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

    list.sort((a, b) => a.y - b.y);

    for (let i = 0; i < list.length; i++) {
      const e = list[i];
      if (e === this.player) {
        e.render(ctx, camX, camY);
      } else if (e.type === 'tree') {
        this.world.renderTree(ctx, e.x - camX, e.y - camY, e);
      } else if (e.type === 'spikeRock') {
        this.world.renderSpikeRock(ctx, e.x - camX, e.y - camY, e);
      } else if (e.alive !== undefined && e.archetypeId) {
        e.render(ctx, camX, camY);
      }
    }

    this.bulletPool.render(ctx, camX, camY);
    this.lootPool.render(ctx, camX, camY);
    this.particles.render(ctx, camX, camY);
    this.damageNumbers.render(ctx, camX, camY);
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

  render() {
    if (this.state === 'menu') {
      if (this.menuBg) this.menuBg.render(this.ctx, this.width, this.height);
      return;
    }
    this.renderGameWorld();
  }

  loop(time) {
    const dt = Math.min((time - this.lastTime) / 1000, 0.05);
    this.lastTime = time;
    this.update(dt);
    this.render();
    requestAnimationFrame(this.loop);
  }
}

class MenuBackground {
  constructor() {
    this.canvas = document.getElementById('menu-bg-canvas');
    this.ctx = this.canvas.getContext('2d');
    this.ctx.imageSmoothingEnabled = false;
    
    this.resize();
    window.addEventListener('resize', () => this.resize());
  }
  
  resize() {
    this.canvas.width = window.innerWidth;
    this.canvas.height = window.innerHeight;
    this.generateScene();
  }

  seededRandom(seed) {
    let x = Math.sin(seed++) * 10000;
    return x - Math.floor(x);
  }

  generateScene() {
    const ctx = this.ctx;
    const w = this.canvas.width;
    const h = this.canvas.height;
    let seed = 98765;

    ctx.fillStyle = '#080c14';
    ctx.fillRect(0, 0, w, h);

    for (let i = 0; i < 4000; i++) {
      const x = this.seededRandom(seed++) * w;
      const y = this.seededRandom(seed++) * h;
      const r = this.seededRandom(seed++) * 80 + 20;
      const shade = this.seededRandom(seed++);
      if (shade < 0.4) ctx.fillStyle = 'rgba(13, 20, 30, 0.7)';
      else if (shade < 0.8) ctx.fillStyle = 'rgba(8, 12, 20, 0.8)';
      else ctx.fillStyle = 'rgba(22, 36, 54, 0.4)';
      ctx.beginPath();
      ctx.arc(x, y, r, 0, Math.PI * 2);
      ctx.fill();
    }

    const tempWorld = new World();
    tempWorld.buildTreeSprites();

    const trees = [];
    const rocks = [];

    for (let i = 0; i < 400; i++) {
      const x = this.seededRandom(seed++) * w;
      const y = this.seededRandom(seed++) * h;

      if (this.seededRandom(seed++) < 0.7) {
        trees.push({
          x: x,
          y: y,
          spriteIdx: Math.floor(this.seededRandom(seed++) * tempWorld.treeSprites.length)
        });
      } else {
        rocks.push({ x, y });
      }
    }

    trees.sort((a, b) => a.y - b.y);

    for (const r of rocks) {
      ctx.fillStyle = '#0a0e14';
      ctx.beginPath();
      ctx.moveTo(r.x - 15, r.y + 10);
      ctx.lineTo(r.x - 5, r.y - 10);
      ctx.lineTo(r.x + 10, r.y - 5);
      ctx.lineTo(r.x + 20, r.y + 15);
      ctx.fill();
      
      ctx.fillStyle = '#141e30';
      ctx.beginPath();
      ctx.moveTo(r.x - 10, r.y + 5);
      ctx.lineTo(r.x - 3, r.y - 5);
      ctx.lineTo(r.x + 8, r.y - 2);
      ctx.fill();
    }

    for (const t of trees) {
      const sprite = tempWorld.treeSprites[t.spriteIdx];
      ctx.drawImage(sprite, t.x - sprite.width / 2, t.y - sprite.height + 20);
    }

    const vignette = ctx.createRadialGradient(w/2, h/2, 200, w/2, h/2, w*0.7);
    vignette.addColorStop(0, 'rgba(0,0,0,0)');
    vignette.addColorStop(1, 'rgba(0,0,0,0.95)');
    ctx.fillStyle = vignette;
    ctx.fillRect(0, 0, w, h);
  }

  update(dt) {}

  render(ctx, w, h) {
    ctx.drawImage(this.canvas, 0, 0);
  }
}

window.addEventListener('DOMContentLoaded', () => {
  window.game = new Game();
});