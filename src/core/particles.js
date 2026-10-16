'use strict';

class ParticleSystem {
  constructor() {
    this.max = 120;
    this.pool = new Array(this.max);
    for (let i = 0; i < this.max; i++) {
      this.pool[i] = { a: false, x: 0, y: 0, vx: 0, vy: 0, l: 0, ml: 1, c: '#4a9eff', s: 3 };
    }
    this.cursor = 0;
  }

  burst(x, y, count, color, power) {
    if (count > 6) count = 6;
    for (let i = 0; i < count; i++) {
      const p = this.pool[this.cursor];
      this.cursor = (this.cursor + 1) % this.max;

      p.a = true;
      p.x = x; p.y = y;
      const ang = Math.random() * Math.PI * 2;
      const spd = Math.random() * power + power * 0.3;
      p.vx = Math.cos(ang) * spd * 60;
      p.vy = Math.sin(ang) * spd * 60;
      p.l = 0.35 + Math.random() * 0.35;
      p.ml = p.l;
      p.c = color;
      p.s = 2 + Math.random() * 3;
    }
  }

  update(dt) {
    for (let i = 0; i < this.max; i++) {
      const p = this.pool[i];
      if (!p.a) continue;
      p.l -= dt;
      if (p.l <= 0) { p.a = false; continue; }
      p.x += p.vx * dt;
      p.y += p.vy * dt;
      p.vx *= Math.pow(0.1, dt);
      p.vy *= Math.pow(0.1, dt);
    }
  }

  render(ctx, camX, camY) {
    for (let i = 0; i < this.max; i++) {
      const p = this.pool[i];
      if (!p.a) continue;
      const a = p.l / p.ml;
      ctx.globalAlpha = a;
      ctx.fillStyle = p.c;
      const sx = p.x - camX;
      const sy = p.y - camY;
      const sz = p.s * a;
      ctx.fillRect(sx - sz / 2, sy - sz / 2, sz, sz);
    }
    ctx.globalAlpha = 1;
  }
}