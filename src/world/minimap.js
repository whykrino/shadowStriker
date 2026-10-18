'use strict';

class Minimap {
  constructor(world, zones) {
    this.world = world;
    this.zones = zones;
    this.w = 300;
    this.h = 180;
    this.padding = 20;
    this.radius = 6;
    this.zoom = 0.4;
    this.fullMapOpen = false;
    this.bgCache = null;
    this._cacheKey = '';
    this._cacheLevel = -1;
    this._dashOffset = 0;
    this._fullAlpha = 0;
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

  render(displayCtx, player, monsters, screenW, screenH, playerLevel) {
    if (!this.fullMapOpen) {
      this._fullAlpha = 0;
    }
    
    if (this.fullMapOpen) {
      this.renderFull(displayCtx, player, monsters, screenW, screenH, playerLevel);
      return;
    }

    const w = this.w;
    const h = this.h;
    const px = screenW - w - this.padding;
    const py = screenH - h - this.padding;

    displayCtx.save();
    this._roundRect(displayCtx, px, py, w, h, this.radius);
    displayCtx.clip();

    displayCtx.fillStyle = 'rgba(10, 15, 25, 0.9)';
    displayCtx.fillRect(px, py, w, h);

    const viewW = this.world.width * this.zoom;
    const viewH = this.world.height * this.zoom;

    let srcX = player.x - viewW / 2;
    let srcY = player.y - viewH / 2;

    const actualSrcX = Utils.clamp(srcX, 0, this.world.width - viewW);
    const actualSrcY = Utils.clamp(srcY, 0, this.world.height - viewH);

    displayCtx.drawImage(
      this.world.mapCanvas,
      actualSrcX * (this.world.mapCanvas.width / this.world.width), actualSrcY * (this.world.mapCanvas.height / this.world.height),
      viewW * (this.world.mapCanvas.width / this.world.width), viewH * (this.world.mapCanvas.height / this.world.height),
      px, py, w, h
    );

    const mapScaleX = w / viewW;
    const mapScaleY = h / viewH;

    displayCtx.fillStyle = 'rgba(30, 44, 62, 0.5)';
    for (const p of this.world.props) {
      if (p.type === 'tree') {
        const mx = px + (p.x - actualSrcX) * mapScaleX;
        const my = py + (p.y - actualSrcY) * mapScaleY;
        if (mx < px || mx > px + w || my < py || my > py + h) continue;
        displayCtx.fillRect(mx - 1, my - 1, 2, 2);
      }
    }

    for (let i = 0; i < this.zones.length; i++) {
      const zone = this.zones[i];
      const zx = px + (zone.x - actualSrcX) * mapScaleX;
      const zy = py + (zone.y - actualSrcY) * mapScaleY;
      const zr = zone.radius * mapScaleX;

      const segments = 60;
      const angleStep = (Math.PI * 2) / segments;
      const startAngle = this.world._dashOffset * 0.05;

      displayCtx.save();
      displayCtx.strokeStyle = zone.color;
      displayCtx.lineWidth = 2.5;
      displayCtx.lineCap = 'round';
      displayCtx.globalAlpha = 0.5;
      displayCtx.shadowColor = zone.color;
      displayCtx.shadowBlur = 8;

      for (let j = 0; j < segments; j++) {
        if (j % 2 !== 0) continue;
        const a1 = startAngle + j * angleStep;
        const a2 = a1 + angleStep * 0.8;
        
        displayCtx.beginPath();
        displayCtx.arc(zx, zy, zr, a1, a2);
        displayCtx.stroke();
      }

      displayCtx.restore();
    }

    for (let i = 0; i < monsters.length; i++) {
      const m = monsters[i];
      if (!m.alive) continue;
      const mx = px + (m.x - actualSrcX) * mapScaleX;
      const my = py + (m.y - actualSrcY) * mapScaleY;
      if (mx < px || mx > px + w || my < py || my > py + h) continue;

      if (m.archetypeId === 'boss') {
        displayCtx.fillStyle = '#ff3355';
        displayCtx.fillRect(mx - 3, my - 3, 6, 6);
      } else {
        displayCtx.fillStyle = (m.archetype && m.archetype.color3) || '#4a9eff';
        displayCtx.fillRect(mx - 1.5, my - 1.5, 3, 3);
      }
    }

    const nx = px + (player.x - actualSrcX) * mapScaleX;
    const ny = py + (player.y - actualSrcY) * mapScaleY;

    displayCtx.fillStyle = '#e8eef5';
    displayCtx.beginPath();
    displayCtx.arc(nx, ny, 2.5, 0, Math.PI * 2);
    displayCtx.fill();

    displayCtx.restore();

    displayCtx.strokeStyle = 'rgba(74, 158, 255, 0.35)';
    displayCtx.lineWidth = 1;
    this._roundRect(displayCtx, px + 0.5, py + 0.5, w - 1, h - 1, this.radius - 1);
    displayCtx.stroke();
  }

  renderFull(displayCtx, player, monsters, screenW, screenH, playerLevel) {
    this._fullAlpha += (1 - this._fullAlpha) * 0.15;

    const maxW = screenW * 0.6;
    const maxH = screenH * 0.6;
    const mapRatio = this.world.width / this.world.height;
    
    let w = maxW;
    let h = w / mapRatio;
    
    if (h > maxH) {
      h = maxH;
      w = h * mapRatio;
    }

    const px = (screenW - w) / 2;
    const py = (screenH - h) / 2;

    displayCtx.save();
    
    displayCtx.globalAlpha = this._fullAlpha;
    displayCtx.fillStyle = 'rgba(3, 5, 12, 0.85)';
    displayCtx.fillRect(0, 0, screenW, screenH);

    this._roundRect(displayCtx, px, py, w, h, 12);
    displayCtx.clip();

    displayCtx.fillStyle = '#0b1219';
    displayCtx.fillRect(px, py, w, h);

    displayCtx.drawImage(this.world.mapCanvas, px, py, w, h);

    const mapScaleX = w / this.world.width;
    const mapScaleY = h / this.world.height;

    displayCtx.fillStyle = 'rgba(30, 44, 62, 0.5)';
    for (const p of this.world.props) {
      if (p.type === 'tree') {
        displayCtx.fillRect(px + p.x * mapScaleX - 1, py + p.y * mapScaleY - 1, 2, 2);
      }
    }

    for (let i = 0; i < this.zones.length; i++) {
      const zone = this.zones[i];
      const zx = px + zone.x * mapScaleX;
      const zy = py + zone.y * mapScaleY;
      const zr = zone.radius * mapScaleX;

      const segments = 60;
      const angleStep = (Math.PI * 2) / segments;
      const startAngle = this.world._dashOffset * 0.05;

      displayCtx.save();
      displayCtx.strokeStyle = zone.color;
      displayCtx.lineWidth = 4;
      displayCtx.lineCap = 'round';
      displayCtx.globalAlpha = 0.5;
      displayCtx.shadowColor = zone.color;
      displayCtx.shadowBlur = 12;

      for (let j = 0; j < segments; j++) {
        if (j % 2 !== 0) continue;
        const a1 = startAngle + j * angleStep;
        const a2 = a1 + angleStep * 0.8;
        
        displayCtx.beginPath();
        displayCtx.arc(zx, zy, zr, a1, a2);
        displayCtx.stroke();
      }

      displayCtx.restore();

      if (playerLevel < zone.recommendedLevel) {
        displayCtx.fillStyle = 'rgba(3, 5, 12, 0.9)';
        displayCtx.strokeStyle = zone.color;
        displayCtx.lineWidth = 2;
        
        displayCtx.beginPath();
        displayCtx.arc(zx, zy, 16, 0, Math.PI * 2);
        displayCtx.fill();
        displayCtx.stroke();

        displayCtx.fillStyle = zone.color;
        displayCtx.font = 'bold 14px monospace';
        displayCtx.textAlign = 'center';
        displayCtx.textBaseline = 'middle';
        displayCtx.fillText(zone.recommendedLevel, zx, zy + 1);
      }
    }

    for (let i = 0; i < monsters.length; i++) {
      const m = monsters[i];
      if (!m.alive) continue;
      const mx = px + m.x * mapScaleX;
      const my = py + m.y * mapScaleY;
      if (m.archetypeId === 'boss') {
        displayCtx.fillStyle = '#ff3355';
        displayCtx.fillRect(mx - 4, my - 4, 8, 8);
      } else {
        displayCtx.fillStyle = (m.archetype && m.archetype.color3) || '#4a9eff';
        displayCtx.fillRect(mx - 2, my - 2, 4, 4);
      }
    }

    const nx = px + player.x * mapScaleX;
    const ny = py + player.y * mapScaleY;

    displayCtx.fillStyle = '#e8eef5';
    displayCtx.beginPath();
    displayCtx.arc(nx, ny, 4, 0, Math.PI * 2);
    displayCtx.fill();

    displayCtx.restore();

    displayCtx.globalAlpha = this._fullAlpha;
    displayCtx.strokeStyle = 'rgba(74, 158, 255, 0.5)';
    displayCtx.lineWidth = 2;
    this._roundRect(displayCtx, px, py, w, h, 12);
    displayCtx.stroke();
    displayCtx.globalAlpha = 1;
  }

  toggleFull() {
    this.fullMapOpen = !this.fullMapOpen;
  }
}