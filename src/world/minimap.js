'use strict';

class Minimap {
  constructor(world, zones) {
    this.world = world;
    this.zones = zones;
    this.size = 180;
    this.padding = 20;
    this.bgCache = null;
    this._cacheKey = '';
    this._dangerCache = new Map();
  }

  buildBackground() {
    const size = this.size;
    const canvas = document.createElement('canvas');
    canvas.width = size;
    canvas.height = size;
    const ctx = canvas.getContext('2d');

    const scaleX = size / this.world.width;
    const scaleY = size / this.world.height;

    ctx.fillStyle = 'rgba(5, 8, 18, 0.92)';
    ctx.fillRect(0, 0, size, size);

    const innerX = this.world.wallThickness * scaleX;
    const innerY = this.world.wallThickness * scaleY;
    const innerW = size - innerX * 2;
    const innerH = size - innerY * 2;

    ctx.fillStyle = '#0e1520';
    ctx.fillRect(innerX, innerY, innerW, innerH);

    ctx.strokeStyle = '#1a2230';
    ctx.lineWidth = 1;
    for (let i = 0; i <= 6; i++) {
      const gx = innerX + (innerW / 6) * i;
      const gy = innerY + (innerH / 6) * i;
      ctx.beginPath(); ctx.moveTo(gx, innerY); ctx.lineTo(gx, innerY + innerH); ctx.stroke();
      ctx.beginPath(); ctx.moveTo(innerX, gy); ctx.lineTo(innerX + innerW, gy); ctx.stroke();
    }

    ctx.strokeStyle = '#2a3444';
    ctx.lineWidth = 2;
    ctx.strokeRect(innerX, innerY, innerW, innerH);

    for (const zone of this.zones) {
      const zx = zone.x * scaleX;
      const zy = zone.y * scaleY;
      const zr = zone.radius * scaleX;

      ctx.fillStyle = zone.color + '38';
      ctx.beginPath(); ctx.arc(zx, zy, zr, 0, Math.PI * 2); ctx.fill();

      ctx.strokeStyle = zone.color + 'aa';
      ctx.lineWidth = 1.5;
      ctx.setLineDash([4, 4]);
      ctx.beginPath(); ctx.arc(zx, zy, zr, 0, Math.PI * 2); ctx.stroke();
      ctx.setLineDash([]);
    }

    this.bgCache = canvas;
  }

  render(displayCtx, player, monsters, screenW, screenH, playerLevel) {
    const size = this.size;
    const px = screenW - size - this.padding;
    const py = screenH - size - this.padding;

    const key = this.world.width + 'x' + this.world.height;
    if (this._cacheKey !== key || !this.bgCache) {
      this.buildBackground();
      this._cacheKey = key;
    }

    displayCtx.drawImage(this.bgCache, px, py);

    const scaleX = size / this.world.width;
    const scaleY = size / this.world.height;

    for (const m of monsters) {
      if (!m.alive) continue;
      const mx = px + m.x * scaleX;
      const my = py + m.y * scaleY;
      displayCtx.fillStyle = (m.archetype && m.archetype.color3) || '#4a9eff';
      displayCtx.fillRect(mx - 1.5, my - 1.5, 3, 3);
    }

    for (const zone of this.zones) {
      if (playerLevel >= zone.recommendedLevel) continue;
      this.drawSkull(
        displayCtx,
        px + zone.x * scaleX,
        py + zone.y * scaleY,
        zone.danger,
        zone.recommendedLevel,
        playerLevel
      );
    }

    const nx = px + player.x * scaleX;
    const ny = py + player.y * scaleY;

    displayCtx.save();
    displayCtx.globalCompositeOperation = 'lighter';
    const grad = displayCtx.createRadialGradient(nx, ny, 0, nx, ny, 8);
    grad.addColorStop(0, 'rgba(143, 201, 255, 0.9)');
    grad.addColorStop(1, 'rgba(143, 201, 255, 0)');
    displayCtx.fillStyle = grad;
    displayCtx.fillRect(nx - 8, ny - 8, 16, 16);
    displayCtx.restore();

    displayCtx.fillStyle = '#e0e8f0';
    displayCtx.beginPath(); displayCtx.arc(nx, ny, 3, 0, Math.PI * 2); displayCtx.fill();

    displayCtx.strokeStyle = 'rgba(74, 158, 255, 0.8)';
    displayCtx.lineWidth = 1.5;
    displayCtx.strokeRect(px - 1, py - 1, size + 2, size + 2);
  }

  drawSkull(ctx, x, y, danger, recommendedLevel, playerLevel) {
    const now = performance.now() * 0.003;
    const pulse = 0.75 + Math.sin(now) * 0.25;

    const auraColor = danger === 'hard' ? '255, 50, 80' : '176, 112, 255';
    const r = danger === 'hard' ? 22 : 18;

    ctx.save();
    ctx.globalCompositeOperation = 'lighter';
    const grad = ctx.createRadialGradient(x, y, 0, x, y, r * 1.8);
    grad.addColorStop(0, 'rgba(' + auraColor + ', ' + (0.5 * pulse) + ')');
    grad.addColorStop(1, 'rgba(' + auraColor + ', 0)');
    ctx.fillStyle = grad;
    ctx.fillRect(x - r * 2, y - r * 2, r * 4, r * 4);
    ctx.restore();

    ctx.save();
    ctx.translate(x, y);
    const s = danger === 'hard' ? 10 : 8;

    ctx.fillStyle = danger === 'hard' ? '#ff5577' : '#d0a0ff';
    ctx.beginPath();
    ctx.arc(0, -s * 0.15, s * 0.6, 0, Math.PI * 2);
    ctx.fill();

    ctx.fillRect(-s * 0.32, s * 0.3, s * 0.64, s * 0.45);

    ctx.fillStyle = '#05070d';
    ctx.beginPath();
    ctx.arc(-s * 0.22, -s * 0.18, s * 0.15, 0, Math.PI * 2);
    ctx.fill();
    ctx.beginPath();
    ctx.arc(s * 0.22, -s * 0.18, s * 0.15, 0, Math.PI * 2);
    ctx.fill();

    ctx.fillRect(-s * 0.08, s * 0.05, s * 0.16, s * 0.16);

    ctx.strokeStyle = '#05070d';
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(-s * 0.15, s * 0.4);
    ctx.lineTo(-s * 0.15, s * 0.7);
    ctx.moveTo(0, s * 0.4);
    ctx.lineTo(0, s * 0.75);
    ctx.moveTo(s * 0.15, s * 0.4);
    ctx.lineTo(s * 0.15, s * 0.7);
    ctx.stroke();

    ctx.fillStyle = danger === 'hard' ? '#ff5577' : '#d0a0ff';
    ctx.font = 'bold 10px monospace';
    ctx.textAlign = 'left';
    ctx.textBaseline = 'middle';
    ctx.fillText('Lv' + recommendedLevel, s * 0.9, 0);

    ctx.restore();
  }
}