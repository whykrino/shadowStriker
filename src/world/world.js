'use strict';

const TILE = 86;
const MAP_COLS = 60;
const MAP_ROWS = 36;
const WALL_THICKNESS = 3;

const C = {
  groundBase: '#0e1520',
  groundMid: '#16202e',
  groundHigh: '#1e2c3e',
  rockDark: '#1a2230',
  rockMid: '#2a3444',
  rockLight: '#3c4a5e',
  rockHighlight: '#6a7b92',
  treeDark: '#0a0e18',
  treeMid: '#141c2a',
  treeEdge: '#243244',
  shadow: 'rgba(0, 0, 0, 0.55)',
  blueAccent: '#4a9eff',
};

class World {
  constructor() {
    this.width = MAP_COLS * TILE;
    this.height = MAP_ROWS * TILE;
    this.wallThickness = WALL_THICKNESS * TILE;
    this.props = [];
    this.mountains = [];
    this.groundPattern = null;
    this.generateProps();
    this.generateMountains();
    this.buildCollisionList();
  }

  buildGroundPattern() {
    const c = document.createElement('canvas');
    c.width = 256;
    c.height = 256;
    const ctx = c.getContext('2d');

    ctx.fillStyle = '#0e1520';
    ctx.fillRect(0, 0, 256, 256);

    for (let i = 0; i < 400; i++) {
      const x = Math.random() * 256;
      const y = Math.random() * 256;
      const r = Math.random() * 30 + 5;
      const shade = Math.random();
      if (shade < 0.35) ctx.fillStyle = 'rgba(20, 30, 45, 0.6)';
      else if (shade < 0.7) ctx.fillStyle = 'rgba(30, 44, 62, 0.5)';
      else ctx.fillStyle = 'rgba(14, 21, 32, 0.7)';
      ctx.beginPath();
      ctx.arc(x, y, r, 0, Math.PI * 2);
      ctx.fill();
    }

    for (let i = 0; i < 300; i++) {
      const x = Math.random() * 256;
      const y = Math.random() * 256;
      const r = Math.random() * 2 + 0.5;
      const g = 60 + Math.random() * 40 | 0;
      const b = 90 + Math.random() * 40 | 0;
      ctx.fillStyle = `rgba(${g}, ${g + 10}, ${b}, 0.7)`;
      ctx.beginPath();
      ctx.arc(x, y, r, 0, Math.PI * 2);
      ctx.fill();
    }

    for (let i = 0; i < 600; i++) {
      const x = Math.random() * 256;
      const y = Math.random() * 256;
      ctx.strokeStyle = Math.random() > 0.5
        ? 'rgba(30, 60, 50, 0.6)'
        : 'rgba(20, 40, 35, 0.6)';
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.moveTo(x, y);
      ctx.lineTo(x + (Math.random() - 0.5) * 3, y - Math.random() * 4);
      ctx.stroke();
    }

    this.groundPattern = ctx.createPattern(c, 'repeat');
  }

  generateProps() {
    const rStart = WALL_THICKNESS + 1;
    const rEnd = MAP_ROWS - WALL_THICKNESS - 1;
    const cStart = WALL_THICKNESS + 1;
    const cEnd = MAP_COLS - WALL_THICKNESS - 1;

    for (let col = cStart; col < cEnd; col++) {
      for (let row = rStart; row < rEnd; row++) {
        const x = col * TILE + TILE / 2;
        const y = row * TILE + TILE / 2;
        const r = Math.random();

        if (r < 0.025) this.props.push(this.makeDeadTree(x, y));
        else if (r < 0.05) this.props.push(this.makeSpikeRock(x, y));
        else if (r < 0.09) this.props.push(this.makeShrub(x, y));
        else if (r < 0.18) this.props.push(this.makeGrass(x, y));
        else if (r < 0.195) this.props.push(this.makeCrystal(x, y));
      }
    }
    this.props.sort((a, b) => a.y - b.y);
  }

  generateMountains() {
    for (let col = 0; col < MAP_COLS; col++) {
      for (let row = 0; row < MAP_ROWS; row++) {
        const isEdge =
          col < WALL_THICKNESS || col >= MAP_COLS - WALL_THICKNESS ||
          row < WALL_THICKNESS || row >= MAP_ROWS - WALL_THICKNESS;
        if (!isEdge) continue;

        const x = col * TILE + TILE / 2;
        const y = row * TILE + TILE / 2;
        const distFromEdge = Math.min(col, MAP_COLS - 1 - col, row, MAP_ROWS - 1 - row);
        const distFromInner = WALL_THICKNESS - distFromEdge;
        const heightFactor = 1 - distFromInner / (WALL_THICKNESS + 1);
        const h = Utils.hash(col, row);
        const size = TILE * (0.9 + h * 0.6) * (0.6 + heightFactor * 0.5);

        this.mountains.push({ x, y, size, seed: h * 100, layers: Utils.randInt(2, 4) });
      }
    }
    this.mountains.sort((a, b) => a.y - b.y);
  }

  buildCollisionList() {
    this.collisionList = [];
    for (const p of this.props) {
      if (p.type === 'deadTree') {
        this.collisionList.push({ x: p.x, y: p.y + 4, radius: 12 });
      } else if (p.type === 'spikeRock') {
        this.collisionList.push({ x: p.x, y: p.y + 6, radius: p.h * 0.7 });
      }
    }
  }

  makeDeadTree(x, y) {
    return { type: 'deadTree', x, y, h: Utils.rand(50, 75), seed: Math.random() * 100, branches: Utils.randInt(3, 5) };
  }
  makeSpikeRock(x, y) {
    return { type: 'spikeRock', x, y, h: Utils.rand(24, 40), seed: Math.random() * 100, verts: this.makeVerts(Utils.rand(20, 32)) };
  }
  makeShrub(x, y) {
    return { type: 'shrub', x, y, size: Utils.rand(14, 22), seed: Math.random() * 100 };
  }
  makeGrass(x, y) {
    return { type: 'grass', x, y, size: Utils.rand(8, 14), seed: Math.random() * 100 };
  }
  makeCrystal(x, y) {
    return { type: 'crystal', x, y, size: Utils.rand(10, 16), seed: Math.random() * 100 };
  }
  makeVerts(size) {
    const verts = [];
    const n = Utils.randInt(5, 8);
    for (let i = 0; i < n; i++) {
      const a = (i / n) * Math.PI * 2;
      const r = size * Utils.rand(0.7, 1);
      verts.push([Math.cos(a) * r, Math.sin(a) * r * 0.55]);
    }
    return verts;
  }

  clampPosition(pos, radius) {
    const min = this.wallThickness + radius;
    const maxX = this.width - this.wallThickness - radius;
    const maxY = this.height - this.wallThickness - radius;
    pos.x = Utils.clamp(pos.x, min, maxX);
    pos.y = Utils.clamp(pos.y, min, maxY);
  }

  collide(pos, radius) {
    let adjusted = false;

    const min = this.wallThickness + radius;
    const maxX = this.width - this.wallThickness - radius;
    const maxY = this.height - this.wallThickness - radius;
    if (pos.x < min) { pos.x = min; adjusted = true; }
    if (pos.x > maxX) { pos.x = maxX; adjusted = true; }
    if (pos.y < min) { pos.y = min; adjusted = true; }
    if (pos.y > maxY) { pos.y = maxY; adjusted = true; }

    for (let i = 0; i < this.collisionList.length; i++) {
      const c = this.collisionList[i];
      const dx = pos.x - c.x;
      const dy = pos.y - c.y;
      const minDist = c.radius + radius;
      const d2 = dx * dx + dy * dy;
      if (d2 < minDist * minDist) {
        const d = Math.sqrt(d2) || 0.001;
        const push = (minDist - d);
        pos.x += (dx / d) * push;
        pos.y += (dy / d) * push;
        adjusted = true;
      }
    }

    return adjusted;
  }

  renderGround(ctx, camX, camY, viewW, viewH) {
    if (!this.groundPattern) this.buildGroundPattern();

    ctx.fillStyle = this.groundPattern;
    ctx.save();
    const offX = -(camX % 256);
    const offY = -(camY % 256);
    ctx.translate(offX, offY);
    ctx.fillRect(0, 0, viewW + 256, viewH + 256);
    ctx.restore();

    ctx.strokeStyle = 'rgba(0, 0, 0, 0.18)';
    ctx.lineWidth = 1;
    const startCol = Math.max(0, Math.floor(camX / TILE) - 1);
    const endCol = Math.min(MAP_COLS, Math.ceil((camX + viewW) / TILE) + 1);
    const startRow = Math.max(0, Math.floor(camY / TILE) - 1);
    const endRow = Math.min(MAP_ROWS, Math.ceil((camY + viewH) / TILE) + 1);
    for (let col = startCol; col < endCol; col++) {
      const x = col * TILE - camX;
      ctx.beginPath(); ctx.moveTo(x, 0); ctx.lineTo(x, viewH); ctx.stroke();
    }
    for (let row = startRow; row < endRow; row++) {
      const y = row * TILE - camY;
      ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(viewW, y); ctx.stroke();
    }
  }

  renderZoneOverlay(ctx, camX, camY, zones) {
    ctx.save();
    for (const zone of zones) {
      const sx = zone.x - camX;
      const sy = zone.y - camY;

      const grad = ctx.createRadialGradient(sx, sy, zone.radius * 0.3, sx, sy, zone.radius);
      grad.addColorStop(0, zone.color + '20');
      grad.addColorStop(1, zone.color + '00');
      ctx.fillStyle = grad;
      ctx.beginPath(); ctx.arc(sx, sy, zone.radius, 0, Math.PI * 2); ctx.fill();

      ctx.strokeStyle = zone.color + '55';
      ctx.lineWidth = 1.5;
      ctx.setLineDash([8, 8]);
      ctx.beginPath(); ctx.arc(sx, sy, zone.radius, 0, Math.PI * 2); ctx.stroke();
      ctx.setLineDash([]);
    }
    ctx.restore();
  }

  renderMountain(ctx, x, y, m) {
    const s = m.size;
    const h = Utils.hash(Math.floor(m.x), Math.floor(m.y));

    ctx.fillStyle = C.shadow;
    ctx.beginPath(); ctx.ellipse(x + 4, y + s * 0.35, s * 0.9, s * 0.35, 0, 0, Math.PI * 2); ctx.fill();

    ctx.fillStyle = C.rockDark;
    ctx.beginPath();
    ctx.moveTo(x - s * 0.95, y + s * 0.45);
    ctx.lineTo(x - s * 0.55, y - s * 0.85);
    ctx.lineTo(x - s * 0.15, y - s * 0.4);
    ctx.lineTo(x + s * 0.05, y - s * 1.1);
    ctx.lineTo(x + s * 0.45, y - s * 0.55);
    ctx.lineTo(x + s * 0.7, y - s * 0.9);
    ctx.lineTo(x + s * 0.95, y + s * 0.45);
    ctx.closePath(); ctx.fill();

    ctx.fillStyle = C.rockMid;
    ctx.beginPath();
    ctx.moveTo(x - s * 0.7, y + s * 0.35);
    ctx.lineTo(x - s * 0.45, y - s * 0.65);
    ctx.lineTo(x - s * 0.1, y - s * 0.35);
    ctx.lineTo(x + s * 0.1, y - s * 0.85);
    ctx.lineTo(x + s * 0.4, y - s * 0.4);
    ctx.lineTo(x + s * 0.6, y + s * 0.35);
    ctx.closePath(); ctx.fill();

    ctx.fillStyle = C.rockLight;
    ctx.beginPath();
    ctx.moveTo(x - s * 0.5, y + s * 0.2);
    ctx.lineTo(x - s * 0.3, y - s * 0.5);
    ctx.lineTo(x - s * 0.05, y - s * 0.3);
    ctx.lineTo(x + s * 0.15, y - s * 0.65);
    ctx.lineTo(x + s * 0.35, y - s * 0.3);
    ctx.lineTo(x + s * 0.45, y + s * 0.2);
    ctx.closePath(); ctx.fill();

    if (h > 0.5) {
      ctx.fillStyle = C.rockHighlight;
      ctx.beginPath();
      ctx.moveTo(x - s * 0.25, y - s * 0.5);
      ctx.lineTo(x - s * 0.1, y - s * 0.75);
      ctx.lineTo(x + s * 0.05, y - s * 0.5);
      ctx.lineTo(x + s * 0.1, y - s * 0.3);
      ctx.closePath(); ctx.fill();
    }
  }

  renderDeadTree(ctx, x, y, p, now) {
    const s = p.h;
    const sway = Math.sin(now * 0.8 + p.seed) * 1.5;

    ctx.fillStyle = C.shadow;
    ctx.beginPath(); ctx.ellipse(x + 4, y + s * 0.08, s * 0.28, s * 0.1, 0, 0, Math.PI * 2); ctx.fill();

    ctx.strokeStyle = C.treeDark;
    ctx.lineWidth = 7; ctx.lineCap = 'round';
    ctx.beginPath();
    ctx.moveTo(x, y + s * 0.1);
    ctx.quadraticCurveTo(x + sway * 0.3, y - s * 0.3, x + sway, y - s * 0.7);
    ctx.stroke();

    ctx.strokeStyle = C.treeMid;
    ctx.lineWidth = 4;
    for (let i = 0; i < p.branches; i++) {
      const t = 0.3 + (i / p.branches) * 0.55;
      const bx = x + sway * t;
      const by = y - s * t;
      const dir = (i % 2 === 0 ? 1 : -1);
      const blen = s * (0.28 - i * 0.02);
      const bAngle = -0.5 - i * 0.2;

      ctx.beginPath();
      ctx.moveTo(bx, by);
      ctx.quadraticCurveTo(bx + dir * blen * 0.5, by - blen * 0.3, bx + dir * blen, by - blen * Math.sin(bAngle + 0.5));
      ctx.stroke();

      ctx.strokeStyle = C.treeEdge;
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.moveTo(bx, by);
      ctx.quadraticCurveTo(bx + dir * blen * 0.7, by - blen * 0.6, bx + dir * blen * 1.1, by - blen * 0.85);
      ctx.stroke();
      ctx.strokeStyle = C.treeMid;
      ctx.lineWidth = 4;
    }
  }

  renderSpikeRock(ctx, x, y, p) {
    const s = p.h;
    ctx.fillStyle = C.shadow;
    ctx.beginPath(); ctx.ellipse(x + 5, y + s * 0.35, s * 1.1, s * 0.4, 0, 0, Math.PI * 2); ctx.fill();

    ctx.fillStyle = C.rockDark;
    ctx.beginPath();
    ctx.moveTo(x + p.verts[0][0], y + p.verts[0][1] + s * 0.35);
    for (let i = 1; i < p.verts.length; i++) ctx.lineTo(x + p.verts[i][0], y + p.verts[i][1] + s * 0.35);
    ctx.closePath(); ctx.fill();

    ctx.fillStyle = C.rockMid;
    ctx.beginPath();
    ctx.moveTo(x + p.verts[0][0] * 0.9, y + p.verts[0][1] * 0.9 + s * 0.15);
    for (let i = 1; i < p.verts.length; i++) ctx.lineTo(x + p.verts[i][0] * 0.9, y + p.verts[i][1] * 0.9 + s * 0.15);
    ctx.closePath(); ctx.fill();

    ctx.fillStyle = C.rockLight;
    ctx.beginPath();
    ctx.moveTo(x + p.verts[0][0] * 0.5, y + p.verts[0][1] * 0.5 - s * 0.2);
    for (let i = 1; i < p.verts.length; i++) ctx.lineTo(x + p.verts[i][0] * 0.5, y + p.verts[i][1] * 0.5 - s * 0.2);
    ctx.closePath(); ctx.fill();

    ctx.fillStyle = C.rockHighlight;
    ctx.beginPath();
    ctx.moveTo(x - s * 0.15, y - s * 0.25);
    ctx.lineTo(x - s * 0.05, y - s * 0.5);
    ctx.lineTo(x + s * 0.15, y - s * 0.35);
    ctx.lineTo(x + s * 0.05, y - s * 0.1);
    ctx.closePath(); ctx.fill();
  }

  renderShrub(ctx, x, y, p, now) {
    const s = p.size;
    const sway = Math.sin(now * 1.2 + p.seed) * 0.8;

    ctx.fillStyle = C.shadow;
    ctx.beginPath(); ctx.ellipse(x + 3, y + s * 0.4, s * 0.9, s * 0.3, 0, 0, Math.PI * 2); ctx.fill();

    ctx.fillStyle = C.treeMid;
    ctx.beginPath(); ctx.arc(x + sway, y, s * 0.55, 0, Math.PI * 2); ctx.fill();
    ctx.beginPath(); ctx.arc(x - s * 0.4 + sway, y - s * 0.15, s * 0.45, 0, Math.PI * 2); ctx.fill();
    ctx.beginPath(); ctx.arc(x + s * 0.4 + sway, y - s * 0.2, s * 0.42, 0, Math.PI * 2); ctx.fill();

    ctx.fillStyle = C.treeEdge;
    ctx.beginPath(); ctx.arc(x - s * 0.15 + sway, y - s * 0.35, s * 0.35, 0, Math.PI * 2); ctx.fill();
    ctx.beginPath(); ctx.arc(x + s * 0.25 + sway, y - s * 0.4, s * 0.3, 0, Math.PI * 2); ctx.fill();
  }

  renderGrass(ctx, x, y, p, now) {
    const s = p.size;
    const sway = Math.sin(now * 1.6 + p.seed) * 1.2;

    ctx.strokeStyle = C.treeEdge;
    ctx.lineWidth = 1.5; ctx.lineCap = 'round';
    for (let i = 0; i < 4; i++) {
      const a = (i / 4 - 0.5) * 0.8;
      const bx = x + Math.sin(a) * s * 0.5;
      const by = y + Math.cos(a) * s * 0.4;
      ctx.beginPath();
      ctx.moveTo(x, y + s * 0.15);
      ctx.quadraticCurveTo(x + (bx - x) * 0.6, y + s * 0.05, bx + sway * 0.4, by - s * 0.35);
      ctx.stroke();
    }
  }

  renderCrystal(ctx, x, y, p, now) {
    const s = p.size;
    const pulse = 0.7 + Math.sin(now * 2 + p.seed) * 0.3;

    ctx.save();
    ctx.globalCompositeOperation = 'lighter';
    const grad = ctx.createRadialGradient(x, y, 0, x, y, s * 2);
    grad.addColorStop(0, 'rgba(74, 158, 255, ' + (0.3 * pulse) + ')');
    grad.addColorStop(1, 'rgba(74, 158, 255, 0)');
    ctx.fillStyle = grad;
    ctx.fillRect(x - s * 2, y - s * 2, s * 4, s * 4);
    ctx.restore();

    ctx.fillStyle = C.rockDark;
    ctx.beginPath();
    ctx.moveTo(x - s * 0.4, y + s * 0.5);
    ctx.lineTo(x, y - s * 1.1);
    ctx.lineTo(x + s * 0.4, y + s * 0.5);
    ctx.closePath(); ctx.fill();

    ctx.fillStyle = C.blueAccent;
    ctx.beginPath();
    ctx.moveTo(x - s * 0.22, y + s * 0.35);
    ctx.lineTo(x, y - s * 0.95);
    ctx.lineTo(x + s * 0.18, y + s * 0.35);
    ctx.closePath(); ctx.fill();

    ctx.fillStyle = 'rgba(200, 230, 255, 0.9)';
    ctx.beginPath();
    ctx.moveTo(x - s * 0.05, y + s * 0.2);
    ctx.lineTo(x - s * 0.02, y - s * 0.75);
    ctx.lineTo(x + s * 0.04, y - s * 0.3);
    ctx.closePath(); ctx.fill();
  }
}