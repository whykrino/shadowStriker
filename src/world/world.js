'use strict';

const TILE = 86;
const MAP_COLS = 84;
const MAP_ROWS = 36;
const WALL_THICKNESS = 3;
const COLLISION_CELL = 128;
const PROP_TILE = 512;

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
    this.ruins = [];
    this.groundPattern = null;
    this.collisionGrid = null;
    this.gridCols = 0;
    this.gridRows = 0;
    this._collideFrame = 0;
    this.propTiles = new Map();
    this.propTilesCols = 0;
    this.propTilesRows = 0;
    this.generateProps();
    this.generateMountains();
    this.buildCollisionList();
    this.buildPropTiles();
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
      ctx.fillStyle = 'rgba(' + g + ', ' + (g + 10) + ', ' + b + ', 0.7)';
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

  buildRuins(cx, cy) {
    this.ruins = [];

    const pillarCount = 6;
    for (let i = 0; i < pillarCount; i++) {
      const a = (i / pillarCount) * Math.PI * 2 + 0.3;
      const r = 130 + Math.random() * 40;
      this.ruins.push({
        type: 'ruinPillar',
        x: cx + Math.cos(a) * r,
        y: cy + Math.sin(a) * r * 0.7,
        h: 40 + Math.random() * 30,
        w: 14 + Math.random() * 4,
        seed: Math.random() * 100,
        broken: Math.random() < 0.5,
      });
    }

    for (let i = 0; i < 14; i++) {
      const a = Math.random() * Math.PI * 2;
      const r = 40 + Math.random() * 160;
      this.ruins.push({
        type: 'rubble',
        x: cx + Math.cos(a) * r,
        y: cy + Math.sin(a) * r * 0.7,
        size: 6 + Math.random() * 10,
        seed: Math.random() * 100,
      });
    }

    for (let i = 0; i < 5; i++) {
      const a = (i / 5) * Math.PI * 2 + 0.6;
      const r = 175;
      this.ruins.push({
        type: 'ruinWall',
        x: cx + Math.cos(a) * r,
        y: cy + Math.sin(a) * r * 0.7,
        length: 40 + Math.random() * 30,
        angle: a + Math.PI / 2,
        h: 22,
        seed: Math.random() * 100,
      });
    }

    for (const r of this.ruins) {
      if (r.type === 'ruinPillar') {
        this.addCollision({ x: r.x, y: r.y + 4, radius: r.w * 0.7 });
      }
    }

    this.propTiles.clear();
  }

  buildCollisionList() {
    this.collisionList = [];
    for (const p of this.props) {
      if (p.type === 'deadTree') {
        this.collisionList.push({ x: p.x, y: p.y + 4, radius: 12, _frame: -1 });
      } else if (p.type === 'spikeRock') {
        this.collisionList.push({ x: p.x, y: p.y + 6, radius: p.h * 0.7, _frame: -1 });
      }
    }
    this.buildCollisionGrid();
  }

  buildCollisionGrid() {
    this.gridCols = Math.ceil(this.width / COLLISION_CELL);
    this.gridRows = Math.ceil(this.height / COLLISION_CELL);
    this.collisionGrid = new Array(this.gridCols * this.gridRows);
    for (let i = 0; i < this.collisionGrid.length; i++) {
      this.collisionGrid[i] = [];
    }
    for (const c of this.collisionList) {
      const minCol = Math.max(0, Math.floor((c.x - c.radius) / COLLISION_CELL));
      const maxCol = Math.min(this.gridCols - 1, Math.floor((c.x + c.radius) / COLLISION_CELL));
      const minRow = Math.max(0, Math.floor((c.y - c.radius) / COLLISION_CELL));
      const maxRow = Math.min(this.gridRows - 1, Math.floor((c.y + c.radius) / COLLISION_CELL));
      for (let col = minCol; col <= maxCol; col++) {
        for (let row = minRow; row <= maxRow; row++) {
          this.collisionGrid[row * this.gridCols + col].push(c);
        }
      }
    }
  }

  addCollision(c) {
    c._frame = -1;
    this.collisionList.push(c);
    if (!this.collisionGrid) return;
    const minCol = Math.max(0, Math.floor((c.x - c.radius) / COLLISION_CELL));
    const maxCol = Math.min(this.gridCols - 1, Math.floor((c.x + c.radius) / COLLISION_CELL));
    const minRow = Math.max(0, Math.floor((c.y - c.radius) / COLLISION_CELL));
    const maxRow = Math.min(this.gridRows - 1, Math.floor((c.y + c.radius) / COLLISION_CELL));
    for (let col = minCol; col <= maxCol; col++) {
      for (let row = minRow; row <= maxRow; row++) {
        this.collisionGrid[row * this.gridCols + col].push(c);
      }
    }
  }

  buildPropTiles() {
    this.propTiles.clear();
    this.propTilesCols = Math.ceil(this.width / PROP_TILE);
    this.propTilesRows = Math.ceil(this.height / PROP_TILE);
  }

  _getTile(col, row) {
    const key = row * this.propTilesCols + col;
    let tile = this.propTiles.get(key);
    if (tile) return tile;

    const canvas = document.createElement('canvas');
    canvas.width = PROP_TILE;
    canvas.height = PROP_TILE;
    const tctx = canvas.getContext('2d');
    tctx.translate(-col * PROP_TILE, -row * PROP_TILE);

    const bounds = {
      minX: col * PROP_TILE,
      maxX: (col + 1) * PROP_TILE,
      minY: row * PROP_TILE,
      maxY: (row + 1) * PROP_TILE,
    };

    for (let i = 0; i < this.props.length; i++) {
      const p = this.props[i];
      if (p.x < bounds.minX - 100 || p.x > bounds.maxX + 100) continue;
      if (p.y < bounds.minY - 100 || p.y > bounds.maxY + 100) continue;
      if (p.type === 'deadTree') this.renderDeadTree(tctx, p.x, p.y, p, 0);
      else if (p.type === 'spikeRock') this.renderSpikeRock(tctx, p.x, p.y, p);
      else if (p.type === 'shrub') this.renderShrub(tctx, p.x, p.y, p, 0);
      else if (p.type === 'grass') this.renderGrass(tctx, p.x, p.y, p, 0);
      else if (p.type === 'crystal') this.renderCrystal(tctx, p.x, p.y, p, 0);
    }
    for (let i = 0; i < this.ruins.length; i++) {
      const r = this.ruins[i];
      if (r.x < bounds.minX - 200 || r.x > bounds.maxX + 200) continue;
      if (r.y < bounds.minY - 200 || r.y > bounds.maxY + 200) continue;
      if (r.type === 'ruinPillar') this.renderRuinPillar(tctx, r.x, r.y, r, 0);
      else if (r.type === 'rubble') this.renderRubble(tctx, r.x, r.y, r);
      else if (r.type === 'ruinWall') this.renderRuinWall(tctx, r.x, r.y, r);
    }

    tile = canvas;
    this.propTiles.set(key, tile);
    return tile;
  }

  renderProps(ctx, camX, camY, viewW, viewH) {
    const startCol = Math.max(0, Math.floor(camX / PROP_TILE));
    const endCol = Math.min(this.propTilesCols - 1, Math.floor((camX + viewW) / PROP_TILE));
    const startRow = Math.max(0, Math.floor(camY / PROP_TILE));
    const endRow = Math.min(this.propTilesRows - 1, Math.floor((camY + viewH) / PROP_TILE));

    for (let col = startCol; col <= endCol; col++) {
      for (let row = startRow; row <= endRow; row++) {
        const tile = this._getTile(col, row);
        ctx.drawImage(tile, col * PROP_TILE - camX, row * PROP_TILE - camY);
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

    if (!this.collisionGrid) return adjusted;

    const colMin = Math.max(0, Math.floor((pos.x - radius) / COLLISION_CELL));
    const colMax = Math.min(this.gridCols - 1, Math.floor((pos.x + radius) / COLLISION_CELL));
    const rowMin = Math.max(0, Math.floor((pos.y - radius) / COLLISION_CELL));
    const rowMax = Math.min(this.gridRows - 1, Math.floor((pos.y + radius) / COLLISION_CELL));

    const frame = ++this._collideFrame;

    for (let col = colMin; col <= colMax; col++) {
      for (let row = rowMin; row <= rowMax; row++) {
        const cell = this.collisionGrid[row * this.gridCols + col];
        for (let k = 0; k < cell.length; k++) {
          const c = cell[k];
          if (c._frame === frame) continue;
          c._frame = frame;

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
      }
    }

    return adjusted;
  }

  renderGround(ctx, camX, camY, viewW, viewH) {
    if (!this.groundPattern) this.buildGroundPattern();

    ctx.fillStyle = this.groundPattern;
    ctx.save();
    ctx.translate(-(camX % 256), -(camY % 256));
    ctx.fillRect(0, 0, viewW + 256, viewH + 256);
    ctx.restore();

    ctx.strokeStyle = 'rgba(0, 0, 0, 0.18)';
    ctx.lineWidth = 1;
    ctx.beginPath();
    const startCol = Math.max(0, Math.floor(camX / TILE) - 1);
    const endCol = Math.min(MAP_COLS, Math.ceil((camX + viewW) / TILE) + 1);
    const startRow = Math.max(0, Math.floor(camY / TILE) - 1);
    const endRow = Math.min(MAP_ROWS, Math.ceil((camY + viewH) / TILE) + 1);
    for (let col = startCol; col < endCol; col++) {
      const x = col * TILE - camX;
      ctx.moveTo(x, 0); ctx.lineTo(x, viewH);
    }
    for (let row = startRow; row < endRow; row++) {
      const y = row * TILE - camY;
      ctx.moveTo(0, y); ctx.lineTo(viewW, y);
    }
    ctx.stroke();
  }

  renderZoneOverlay(ctx, camX, camY, zones) {
    if (!this._zoneCanvases) this._buildZoneCanvases(zones);

    for (let i = 0; i < zones.length; i++) {
      const zone = zones[i];
      const c = this._zoneCanvases[i];
      if (!c) continue;
      const x = zone.x - c.half - camX;
      const y = zone.y - c.half - camY;
      if (x + c.size < 0 || x > ctx.canvas.width) continue;
      if (y + c.size < 0 || y > ctx.canvas.height) continue;
      ctx.drawImage(c.canvas, x, y);
    }
  }

  _buildZoneCanvases(zones) {
    this._zoneCanvases = [];
    for (let i = 0; i < zones.length; i++) {
      const zone = zones[i];
      const size = Math.ceil(zone.radius * 2 + 4);
      const half = size / 2;
      const canvas = document.createElement('canvas');
      canvas.width = size;
      canvas.height = size;
      const zc = canvas.getContext('2d');

      zc.globalAlpha = 0.1;
      zc.fillStyle = zone.color;
      zc.beginPath(); zc.arc(half, half, zone.radius, 0, Math.PI * 2); zc.fill();

      zc.globalAlpha = 0.4;
      zc.strokeStyle = zone.color;
      zc.lineWidth = 1.5;
      zc.setLineDash([8, 8]);
      zc.beginPath(); zc.arc(half, half, zone.radius, 0, Math.PI * 2); zc.stroke();
      zc.setLineDash([]);

      this._zoneCanvases.push({ canvas, half, size });
    }
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

    ctx.fillStyle = C.shadow;
    ctx.beginPath(); ctx.ellipse(x + 4, y + s * 0.08, s * 0.28, s * 0.1, 0, 0, Math.PI * 2); ctx.fill();

    ctx.strokeStyle = C.treeDark;
    ctx.lineWidth = 7; ctx.lineCap = 'round';
    ctx.beginPath();
    ctx.moveTo(x, y + s * 0.1);
    ctx.quadraticCurveTo(x + 0.3, y - s * 0.3, x, y - s * 0.7);
    ctx.stroke();

    ctx.strokeStyle = C.treeMid;
    ctx.lineWidth = 4;
    for (let i = 0; i < p.branches; i++) {
      const t = 0.3 + (i / p.branches) * 0.55;
      const bx = x;
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

    ctx.fillStyle = C.shadow;
    ctx.beginPath(); ctx.ellipse(x + 3, y + s * 0.4, s * 0.9, s * 0.3, 0, 0, Math.PI * 2); ctx.fill();

    ctx.fillStyle = C.treeMid;
    ctx.beginPath(); ctx.arc(x, y, s * 0.55, 0, Math.PI * 2); ctx.fill();
    ctx.beginPath(); ctx.arc(x - s * 0.4, y - s * 0.15, s * 0.45, 0, Math.PI * 2); ctx.fill();
    ctx.beginPath(); ctx.arc(x + s * 0.4, y - s * 0.2, s * 0.42, 0, Math.PI * 2); ctx.fill();

    ctx.fillStyle = C.treeEdge;
    ctx.beginPath(); ctx.arc(x - s * 0.15, y - s * 0.35, s * 0.35, 0, Math.PI * 2); ctx.fill();
    ctx.beginPath(); ctx.arc(x + s * 0.25, y - s * 0.4, s * 0.3, 0, Math.PI * 2); ctx.fill();
  }

  renderGrass(ctx, x, y, p, now) {
    const s = p.size;

    ctx.strokeStyle = C.treeEdge;
    ctx.lineWidth = 1.5; ctx.lineCap = 'round';
    for (let i = 0; i < 4; i++) {
      const a = (i / 4 - 0.5) * 0.8;
      const bx = x + Math.sin(a) * s * 0.5;
      const by = y + Math.cos(a) * s * 0.4;
      ctx.beginPath();
      ctx.moveTo(x, y + s * 0.15);
      ctx.quadraticCurveTo(x + (bx - x) * 0.6, y + s * 0.05, bx, by - s * 0.35);
      ctx.stroke();
    }
  }

  renderCrystal(ctx, x, y, p, now) {
    const s = p.size;

    ctx.save();
    ctx.globalCompositeOperation = 'lighter';
    ctx.globalAlpha = 0.25;
    ctx.fillStyle = '#4a9eff';
    ctx.beginPath(); ctx.arc(x, y, s * 1.5, 0, Math.PI * 2); ctx.fill();
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

  renderRuinPillar(ctx, x, y, p, now) {
    const h = p.h;
    const w = p.w;

    ctx.fillStyle = C.shadow;
    ctx.beginPath(); ctx.ellipse(x + 3, y + 4, w * 1.3, w * 0.5, 0, 0, Math.PI * 2); ctx.fill();

    ctx.fillStyle = C.rockDark;
    ctx.fillRect(x - w / 2 - 2, y - h + 6, w + 4, h - 4);

    ctx.fillStyle = C.rockMid;
    ctx.fillRect(x - w / 2, y - h + 2, w, h - 2);

    ctx.fillStyle = C.rockLight;
    ctx.fillRect(x - w / 2 + 2, y - h + 4, w * 0.35, h - 6);

    if (!p.broken) {
      ctx.fillStyle = C.rockMid;
      ctx.fillRect(x - w / 2 - 3, y - h - 2, w + 6, 6);
      ctx.fillStyle = C.rockHighlight;
      ctx.fillRect(x - w / 2 - 1, y - h - 1, w * 0.4, 2);
    } else {
      ctx.fillStyle = C.rockDark;
      ctx.beginPath();
      ctx.moveTo(x - w / 2, y - h + 2);
      ctx.lineTo(x - w * 0.1, y - h - 8);
      ctx.lineTo(x + w / 2, y - h + 4);
      ctx.closePath();
      ctx.fill();
    }

    ctx.strokeStyle = 'rgba(74, 158, 255, 0.15)';
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(x, y - h + 6);
    ctx.lineTo(x, y - 2);
    ctx.stroke();
  }

  renderRubble(ctx, x, y, p) {
    const s = p.size;
    ctx.fillStyle = C.shadow;
    ctx.beginPath(); ctx.ellipse(x + 2, y + 2, s * 0.9, s * 0.35, 0, 0, Math.PI * 2); ctx.fill();

    ctx.fillStyle = C.rockDark;
    ctx.beginPath();
    ctx.moveTo(x - s, y + s * 0.3);
    ctx.lineTo(x - s * 0.5, y - s * 0.6);
    ctx.lineTo(x + s * 0.2, y - s * 0.4);
    ctx.lineTo(x + s * 0.8, y + s * 0.1);
    ctx.lineTo(x + s * 0.4, y + s * 0.4);
    ctx.closePath(); ctx.fill();

    ctx.fillStyle = C.rockMid;
    ctx.beginPath();
    ctx.moveTo(x - s * 0.6, y + s * 0.2);
    ctx.lineTo(x - s * 0.3, y - s * 0.35);
    ctx.lineTo(x + s * 0.2, y - s * 0.15);
    ctx.lineTo(x + s * 0.3, y + s * 0.25);
    ctx.closePath(); ctx.fill();

    ctx.fillStyle = C.rockLight;
    ctx.beginPath();
    ctx.moveTo(x - s * 0.35, y + s * 0.1);
    ctx.lineTo(x - s * 0.15, y - s * 0.2);
    ctx.lineTo(x + s * 0.05, y - s * 0.05);
    ctx.closePath(); ctx.fill();
  }

  renderRuinWall(ctx, x, y, p) {
    const L = p.length;
    const h = p.h;
    const angle = p.angle;

    ctx.save();
    ctx.translate(x, y);
    ctx.rotate(angle);

    ctx.fillStyle = C.shadow;
    ctx.fillRect(-L / 2 + 3, 4, L, 4);

    ctx.fillStyle = C.rockDark;
    ctx.fillRect(-L / 2, -h, L, h);

    ctx.fillStyle = C.rockMid;
    ctx.fillRect(-L / 2 + 1, -h + 2, L - 2, h - 4);

    ctx.fillStyle = C.rockLight;
    ctx.fillRect(-L / 2 + 2, -h + 3, L * 0.25, 3);

    ctx.restore();
  }
}