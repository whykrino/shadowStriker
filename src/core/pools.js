'use strict';

class ObjectPool {
  constructor(factory, resetFn, initialSize) {
    this.factory = factory;
    this.resetFn = resetFn;
    this.free = [];
    this.active = [];

    for (let i = 0; i < (initialSize || 0); i++) {
      this.free.push(factory());
    }
  }

  obtain(args) {
    let obj;
    if (this.free.length > 0) {
      obj = this.free.pop();
    } else {
      obj = this.factory();
    }
    this.resetFn(obj, args);
    this.active.push(obj);
    return obj;
  }

  release(obj) {
    const i = this.active.indexOf(obj);
    if (i === -1) return;
    this.active.splice(i, 1);
    this.free.push(obj);
  }

  releaseAll(predicate) {
    for (let i = this.active.length - 1; i >= 0; i--) {
      if (!predicate || predicate(this.active[i])) {
        this.free.push(this.active[i]);
        this.active.splice(i, 1);
      }
    }
  }

  get count() { return this.active.length; }
}

class BulletPool extends ObjectPool {
  constructor() {
    super(
      () => ({ x: 0, y: 0, vx: 0, vy: 0, radius: 6, damage: 0, life: 0, alive: false, color: '#fff' }),
      (b, args) => {
        b.x = args.x; b.y = args.y;
        b.vx = args.vx; b.vy = args.vy;
        b.damage = args.damage;
        b.life = args.life || 3.0;
        b.radius = args.radius || 6;
        b.color = args.color || '#ff5577';
        b.alive = true;
      },
      200
    );
  }

  update(dt) {
    for (let i = this.active.length - 1; i >= 0; i--) {
      const b = this.active[i];
      b.x += b.vx * dt;
      b.y += b.vy * dt;
      b.life -= dt;
      if (b.life <= 0) {
        b.alive = false;
        this.release(b);
      }
    }
  }

  render(ctx, camX, camY) {
    ctx.save();
    ctx.globalCompositeOperation = 'lighter';
    for (let i = 0; i < this.active.length; i++) {
      const b = this.active[i];
      const px = b.x - camX;
      const py = b.y - camY;

      ctx.fillStyle = 'rgba(255, 90, 120, 0.35)';
      ctx.beginPath();
      ctx.arc(px, py, 10, 0, Math.PI * 2);
      ctx.fill();

      ctx.fillStyle = 'rgba(255, 140, 170, 0.85)';
      ctx.beginPath();
      ctx.arc(px, py, 4, 0, Math.PI * 2);
      ctx.fill();

      ctx.fillStyle = '#ffe0ea';
      ctx.beginPath();
      ctx.arc(px, py, 2, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.restore();
  }
}

class DamageNumberPool {
  constructor() {
    this.pool = [];
    for (let i = 0; i < 60; i++) {
      this.pool.push({ active: false, x: 0, y: 0, vx: 0, vy: 0, life: 0, value: 0, crit: false, color: '#fff' });
    }
    this.cursor = 0;
  }

  spawn(x, y, value, color, crit) {
    const d = this.pool[this.cursor];
    this.cursor = (this.cursor + 1) % this.pool.length;
    d.active = true;
    d.x = x + (Math.random() - 0.5) * 12;
    d.y = y - 20;
    d.vx = (Math.random() - 0.5) * 40;
    d.vy = -60 - Math.random() * 30;
    d.life = 0.9;
    d.value = Math.round(value);
    d.crit = crit || false;
    d.color = color || '#ffffff';
  }

  update(dt) {
    for (let i = 0; i < this.pool.length; i++) {
      const d = this.pool[i];
      if (!d.active) continue;
      d.life -= dt;
      if (d.life <= 0) { d.active = false; continue; }
      d.x += d.vx * dt;
      d.y += d.vy * dt;
      d.vy += 80 * dt;
    }
  }

  render(ctx, camX, camY) {
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    let lastFont = '';
    let lastAlpha = -1;
    let lastColor = '';

    for (let i = 0; i < this.pool.length; i++) {
      const d = this.pool[i];
      if (!d.active) continue;
      const a = Math.min(1, d.life / 0.5);
      const size = d.crit ? 16 : 12;
      const font = 'bold ' + size + 'px monospace';
      if (font !== lastFont) { ctx.font = font; lastFont = font; }

      const col = d.crit ? '#ffdd44' : d.color;
      if (col !== lastColor) { ctx.fillStyle = col; lastColor = col; }
      if (a !== lastAlpha) { ctx.globalAlpha = a; lastAlpha = a; }

      ctx.fillText(d.value, d.x - camX + 1, d.y - camY + 1);
    }
    ctx.globalAlpha = 1;
  }
}

class LootPool {
  constructor() {
    this.pool = [];
    for (let i = 0; i < 60; i++) {
      this.pool.push({
        active: false, x: 0, y: 0,
        vx: 0, vy: 0,
        type: 'hp', value: 0,
        life: 12, radius: 14,
        bobPhase: Math.random() * Math.PI * 2,
      });
    }
    this.cursor = 0;
  }

  spawn(x, y, type, value) {
    const l = this.pool[this.cursor];
    this.cursor = (this.cursor + 1) % this.pool.length;

    l.active = true;
    l.x = x;
    l.y = y;
    const a = Math.random() * Math.PI * 2;
    l.vx = Math.cos(a) * 60;
    l.vy = Math.sin(a) * 60;
    l.type = type;
    l.value = value;
    l.life = 12;
    l.bobPhase = Math.random() * Math.PI * 2;
  }

  update(dt) {
    for (let i = 0; i < this.pool.length; i++) {
      const l = this.pool[i];
      if (!l.active) continue;
      l.life -= dt;
      if (l.life <= 0) { l.active = false; continue; }

      l.x += l.vx * dt;
      l.y += l.vy * dt;
      l.vx *= Math.pow(0.02, dt);
      l.vy *= Math.pow(0.02, dt);
      l.bobPhase += dt * 4;
    }
  }

  render(ctx, camX, camY) {
    ctx.save();
    ctx.globalCompositeOperation = 'lighter';
    for (let i = 0; i < this.pool.length; i++) {
      const l = this.pool[i];
      if (!l.active) continue;

      const px = l.x - camX;
      const py = l.y - camY + Math.sin(l.bobPhase) * 4;
      const pulse = 0.7 + Math.sin(l.bobPhase * 2) * 0.3;

      let color = '#44ff88';
      let symbol = '+';
      if (l.type === 'exp') { color = '#c890ff'; symbol = '✦'; }
      else if (l.type === 'buff') { color = '#ffcc44'; symbol = '⚡'; }

      ctx.globalAlpha = 0.35;
      ctx.fillStyle = color;
      ctx.beginPath();
      ctx.arc(px, py, l.radius * 1.8, 0, Math.PI * 2);
      ctx.fill();

      ctx.globalAlpha = 1;
      ctx.fillStyle = color;
      ctx.beginPath();
      ctx.arc(px, py, l.radius * (0.8 + pulse * 0.2), 0, Math.PI * 2);
      ctx.fill();

      ctx.globalCompositeOperation = 'source-over';
      ctx.fillStyle = '#05070d';
      ctx.font = 'bold 14px monospace';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText(symbol, px, py + 1);
      ctx.globalCompositeOperation = 'lighter';
    }
    ctx.restore();
  }

  forEachActive(fn) {
    for (let i = 0; i < this.pool.length; i++) {
      if (this.pool[i].active) fn(this.pool[i]);
    }
  }
}