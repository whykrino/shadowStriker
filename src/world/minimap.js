'use strict';

class Minimap {
  constructor(world, zones) {
    this.world = world;
    this.zones = zones;
    this.w = 300;
    this.h = 180;
    this.padding = 20;
    this.radius = 6;
    this.bgCache = null;
    this._cacheKey = '';
    this._cacheLevel = -1;
  }

  _roundRect(ctx, x, y, w, h, r) {
    ctx.beginPath();
    ctx.moveTo(x + r, y);
    ctx.lineTo(x + w - r, y);
    ctx.quadraticCurveTo(x + w, y, x + w, y + r);
    ctx.lineTo(x + w, y + h - r);
    ctx.quadraticCurveTo(x + w, y + h, x + w - r, y + h);
    ctx.lineTo(x + r, y + h);
    ctx.quadraticCurveTo(x, y + h, x, y + h - r);
    ctx.lineTo(x, y + r);
    ctx.quadraticCurveTo(x, y, x + r, y);
    ctx.closePath();
  }

  buildBackground(playerLevel) {
    const w = this.w;
    const h = this.h;
    const canvas = document.createElement('canvas');
    canvas.width = w;
    canvas.height = h;
    const ctx = canvas.getContext('2d');

    const scaleX = w / this.world.width;
    const scaleY = h / this.world.height;

    ctx.fillStyle = '#0b1219';
    ctx.fillRect(0, 0, w, h);

    ctx.save();
    ctx.beginPath();
    ctx.rect(0, 0, w, h);
    ctx.clip();

    ctx.fillStyle = 'rgba(30, 44, 62, 0.85)';
    for (const p of this.world.props) {
      if (p.type === 'deadTree') {
        ctx.fillRect(p.x * scaleX - 0.5, p.y * scaleY - 0.5, 1, 1);
      } else if (p.type === 'spikeRock') {
        ctx.fillRect(p.x * scaleX - 1, p.y * scaleY - 1, 2, 2);
      }
    }

    for (const zone of this.zones) {
      const zx = zone.x * scaleX;
      const zy = zone.y * scaleY;
      const zr = zone.radius * scaleX;

      ctx.fillStyle = zone.color + '20';
      ctx.beginPath(); ctx.arc(zx, zy, zr, 0, Math.PI * 2); ctx.fill();

      ctx.strokeStyle = zone.color + '70';
      ctx.lineWidth = 1;
      ctx.setLineDash([4, 4]);
      ctx.beginPath(); ctx.arc(zx, zy, zr, 0, Math.PI * 2); ctx.stroke();
      ctx.setLineDash([]);
    }

    for (const zone of this.zones) {
      if (playerLevel >= zone.recommendedLevel) continue;
      const zx = zone.x * scaleX;
      const zy = zone.y * scaleY;
      const color = zone.danger === 'safe' ? '#4a9eff'
                  : zone.danger === 'mid' ? '#b070ff'
                  : '#ff3355';

      const rr = 10;
      ctx.fillStyle = 'rgba(5, 7, 13, 0.85)';
      ctx.beginPath();
      ctx.arc(zx, zy, rr, 0, Math.PI * 2);
      ctx.fill();

      ctx.strokeStyle = color;
      ctx.lineWidth = 1.5;
      ctx.beginPath();
      ctx.arc(zx, zy, rr, 0, Math.PI * 2);
      ctx.stroke();

      ctx.fillStyle = color;
      ctx.font = 'bold 9px monospace';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText(zone.recommendedLevel, zx, zy + 0.5);
    }

    ctx.restore();

    this.bgCache = canvas;
    this._cacheLevel = playerLevel;
  }

  render(displayCtx, player, monsters, screenW, screenH, playerLevel) {
    const w = this.w;
    const h = this.h;
    const px = screenW - w - this.padding;
    const py = screenH - h - this.padding;

    const key = this.world.width + 'x' + this.world.height;
    if (this._cacheKey !== key || !this.bgCache || this._cacheLevel !== playerLevel) {
      this.buildBackground(playerLevel);
      this._cacheKey = key;
    }

    displayCtx.save();

    this._roundRect(displayCtx, px, py, w, h, this.radius);
    displayCtx.clip();

    displayCtx.drawImage(this.bgCache, px, py);

    const scaleX = w / this.world.width;
    const scaleY = h / this.world.height;

    for (let i = 0; i < monsters.length; i++) {
      const m = monsters[i];
      if (!m.alive) continue;
      const mx = px + m.x * scaleX;
      const my = py + m.y * scaleY;
      if (m.archetypeId === 'boss') {
        displayCtx.fillStyle = '#ff3355';
        displayCtx.fillRect(mx - 3, my - 3, 6, 6);
      } else {
        displayCtx.fillStyle = (m.archetype && m.archetype.color3) || '#4a9eff';
        displayCtx.fillRect(mx - 1, my - 1, 2, 2);
      }
    }

    const nx = px + player.x * scaleX;
    const ny = py + player.y * scaleY;

    displayCtx.fillStyle = '#e8eef5';
    displayCtx.fillRect(nx - 3, ny - 3, 6, 6);

    displayCtx.restore();

    displayCtx.strokeStyle = 'rgba(74, 158, 255, 0.35)';
    displayCtx.lineWidth = 1;
    this._roundRect(displayCtx, px + 0.5, py + 0.5, w - 1, h - 1, this.radius - 1);
    displayCtx.stroke();
  }
}