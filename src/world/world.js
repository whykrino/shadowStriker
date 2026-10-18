'use strict';

const TILE = 86;
const MAP_COLS = 84;
const MAP_ROWS = 36;
const WALL_THICKNESS = 3;
const COLLISION_CELL = 128;

const C = {
  groundBase: '#080c14',
  groundMid: '#0d141e',
  groundHigh: '#162436',
  rockDark: '#121a26',
  rockMid: '#1e2a3a',
  rockLight: '#2a384c',
  rockHighlight: '#425872',
  treeDark: '#05080e',
  treeMid: '#0e1824',
  treeEdge: '#1e3a2e',
  shadow: 'rgba(0, 0, 0, 0.65)',
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
    this.paths = [];
    this.mapCanvas = null;
    this.collisionGrid = null;
    this.gridCols = 0;
    this.gridRows = 0;
    this._collideFrame = 0;
    this.zones = [];
    this.treeSprites = [];
    this._dashOffset = 0;
  }

  initWorld(zones) {
    this.zones = zones;
    this.generatePaths();
    this.generateProps();
    this.generateMountains();
    this.buildCollisionList();
    this.buildTreeSprites();
    this.buildMapCanvas();
  }

  generatePaths() {
    this.paths = [];
    if (!this.zones || this.zones.length < 2) return;

    const spawn = this.zones[0];
    const addPath = (p1, p2, width) => {
      const pts = [];
      const dx = p2.x - p1.x;
      const dy = p2.y - p1.y;
      const dist = Math.hypot(dx, dy);
      const steps = Math.ceil(dist / 40);
      const wave = Math.random() * 100;
      for (let i = 0; i <= steps; i++) {
        const t = i / steps;
        const x = p1.x + dx * t + Math.sin(t * Math.PI * 3 + wave) * 60 * (1 - Math.abs(t - 0.5) * 2);
        const y = p1.y + dy * t + Math.cos(t * Math.PI * 3 + wave) * 60 * (1 - Math.abs(t - 0.5) * 2);
        pts.push({ x, y });
      }
      this.paths.push({ points: pts, width });
    };

    for (let i = 1; i < this.zones.length; i++) {
      const z = this.zones[i];
      addPath({ x: spawn.x, y: spawn.y }, { x: z.x, y: z.y }, 110);
    }
    for (let i = 1; i < this.zones.length - 1; i++) {
      addPath({ x: this.zones[i].x, y: this.zones[i].y }, { x: this.zones[i+1].x, y: this.zones[i+1].y }, 90);
    }
  }

  isInsidePath(x, y, margin) {
    for (let i = 0; i < this.paths.length; i++) {
      const p = this.paths[i];
      const pts = p.points;
      for (let j = 0; j < pts.length - 1; j++) {
        const ax = pts[j].x;
        const ay = pts[j].y;
        const bx = pts[j+1].x;
        const by = pts[j+1].y;
        const dx = bx - ax;
        const dy = by - ay;
        const lenSq = dx * dx + dy * dy;
        if (lenSq === 0) continue;
        let t = ((x - ax) * dx + (y - ay) * dy) / lenSq;
        t = Math.max(0, Math.min(1, t));
        const cx = ax + t * dx;
        const cy = ay + t * dy;
        const distSq = (x - cx) * (x - cx) + (y - cy) * (y - cy);
        const rad = p.width / 2 + margin;
        if (distSq < rad * rad) return true;
      }
    }
    return false;
  }

  isInsideZone(x, y, margin) {
    if (!this.zones) return false;
    for (let i = 0; i < this.zones.length; i++) {
      const z = this.zones[i];
      const dx = x - z.x;
      const dy = y - z.y;
      const rad = z.radius + margin;
      if (dx * dx + dy * dy < rad * rad) return true;
    }
    return false;
  }

  generateProps() {
    const rStart = WALL_THICKNESS + 1;
    const rEnd = MAP_ROWS - WALL_THICKNESS - 1;
    const cStart = WALL_THICKNESS + 1;
    const cEnd = MAP_COLS - WALL_THICKNESS - 1;

    for (let col = cStart; col < cEnd; col++) {
      for (let row = rStart; row < rEnd; row++) {
        const baseX = col * TILE + TILE / 2;
        const baseY = row * TILE + TILE / 2;
        
        for (let k = 0; k < 3; k++) {
          if (Math.random() > 0.7) continue;
          const x = baseX + (Math.random() - 0.5) * TILE * 1.6;
          const y = baseY + (Math.random() - 0.5) * TILE * 1.6;
          
          if (this.isInsidePath(x, y, 50)) continue;
          if (this.isInsideZone(x, y, 60)) continue;
          
          const inZoneEdge = this.isInsideZone(x, y, 160);
          const r = Math.random();
          
          if (inZoneEdge) {
            if (r < 0.1) this.props.push(this.makeTree(x, y));
            else if (r < 0.2) this.props.push(this.makeShrub(x, y));
            else if (r < 0.25) this.props.push(this.makeGrass(x, y));
          } else {
            let isOverlapping = false;
            for (let j = 0; j < this.props.length; j++) {
              const p = this.props[j];
              if (p.type === 'tree' || p.type === 'spikeRock') {
                const dx = x - p.x;
                const dy = y - p.y;
                if (dx * dx + dy * dy < 65 * 65) {
                  isOverlapping = true;
                  break;
                }
              }
            }
            if (isOverlapping) continue;
            if (r < 0.35) this.props.push(this.makeTree(x, y));
            else if (r < 0.5) this.props.push(this.makeShrub(x, y));
            else if (r < 0.65) this.props.push(this.makeGrass(x, y));
            else if (r < 0.68) this.props.push(this.makeSpikeRock(x, y));
          }
        }
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
        this.addCollision({ x: r.x, y: r.y + 4, radius: r.w * 0.5 });
      }
    }
  }

  buildCollisionList() {
    this.collisionList = [];
    for (const p of this.props) {
      if (p.type === 'tree') {
        this.collisionList.push({ x: p.x, y: p.y - 2, radius: 10, _frame: -1 });
      } else if (p.type === 'spikeRock') {
        this.collisionList.push({ x: p.x, y: p.y + 2, radius: p.h * 0.4, _frame: -1 });
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

  buildTreeSprites() {
    this.treeSprites = [];
    for (let i = 0; i < 10; i++) {
      const w = 160;
      const h = 180;
      const canvas = document.createElement('canvas');
      canvas.width = w;
      canvas.height = h;
      const ctx = canvas.getContext('2d');
      const cx = w / 2;
      const cy = h - 20;
      const th = 80 + Math.random() * 30;
      const tr = 20 + Math.random() * 22;

      ctx.fillStyle = '#0a0e14';
      ctx.fillRect(cx - 4, cy - th * 0.4, 8, th * 0.4);

      ctx.fillStyle = 'rgba(0, 0, 0, 0.4)';
      ctx.beginPath(); ctx.ellipse(cx + 4, cy + 4, tr * 0.8, tr * 0.25, 0, 0, Math.PI * 2); ctx.fill();

      ctx.fillStyle = '#0d1824';
      ctx.beginPath();
      ctx.ellipse(cx, cy - th * 0.6, tr * 1.1, tr * 0.9, 0, 0, Math.PI * 2); ctx.fill();
      ctx.beginPath();
      ctx.ellipse(cx - tr * 0.4, cy - th * 0.4, tr * 0.7, tr * 0.6, 0, 0, Math.PI * 2); ctx.fill();
      ctx.beginPath();
      ctx.ellipse(cx + tr * 0.4, cy - th * 0.45, tr * 0.7, tr * 0.6, 0, 0, Math.PI * 2); ctx.fill();

      ctx.fillStyle = '#142438';
      ctx.beginPath();
      ctx.ellipse(cx - tr * 0.2, cy - th * 0.65, tr * 0.7, tr * 0.5, 0, 0, Math.PI * 2); ctx.fill();
      ctx.beginPath();
      ctx.ellipse(cx + tr * 0.3, cy - th * 0.55, tr * 0.5, tr * 0.4, 0, 0, Math.PI * 2); ctx.fill();

      ctx.fillStyle = '#1e3a2e';
      ctx.beginPath();
      ctx.ellipse(cx - tr * 0.3, cy - th * 0.75, tr * 0.4, tr * 0.3, 0, 0, Math.PI * 2); ctx.fill();
      ctx.beginPath();
      ctx.ellipse(cx + tr * 0.1, cy - th * 0.7, tr * 0.3, tr * 0.2, 0, 0, Math.PI * 2); ctx.fill();

      this.treeSprites.push(canvas);
    }
  }

  buildMapCanvas() {
    this.mapCanvas = document.createElement('canvas');
    this.mapCanvas.width = 1024;
    this.mapCanvas.height = 512;
    const ctx = this.mapCanvas.getContext('2d');

    const scaleX = this.mapCanvas.width / this.width;
    const scaleY = this.mapCanvas.height / this.height;
    
    ctx.save();
    ctx.scale(scaleX, scaleY);

    ctx.fillStyle = C.groundBase;
    ctx.fillRect(0, 0, this.width, this.height);

    for (let i = 0; i < 4000; i++) {
      const x = Math.random() * this.width;
      const y = Math.random() * this.height;
      const r = Math.random() * 80 + 20;
      const shade = Math.random();
      if (shade < 0.4) ctx.fillStyle = 'rgba(13, 20, 30, 0.7)';
      else if (shade < 0.8) ctx.fillStyle = 'rgba(8, 12, 20, 0.8)';
      else ctx.fillStyle = 'rgba(22, 36, 54, 0.4)';
      ctx.beginPath();
      ctx.arc(x, y, r, 0, Math.PI * 2);
      ctx.fill();
    }
    
    for (let i = 0; i < 5000; i++) {
      const x = Math.random() * this.width;
      const y = Math.random() * this.height;
      ctx.fillStyle = 'rgba(20, 40, 30, ' + (Math.random() * 0.3) + ')';
      ctx.fillRect(x, y, 2 + Math.random() * 4, 2 + Math.random() * 4);
    }

    for (let i = 0; i < this.paths.length; i++) {
      const p = this.paths[i];
      const pts = p.points;
      
      for (let j = 0; j < pts.length - 1; j++) {
        const pt = pts[j];
        
        ctx.fillStyle = 'rgba(16, 24, 36, 0.6)';
        for (let k = 0; k < 10; k++) {
          const ox = (Math.random() - 0.5) * p.width;
          const oy = (Math.random() - 0.5) * p.width;
          if (ox * ox + oy * oy < (p.width * 0.5) * (p.width * 0.5)) {
            const r = Math.random() * 30 + 10;
            ctx.beginPath();
            ctx.arc(pt.x + ox, pt.y + oy, r, 0, Math.PI * 2);
            ctx.fill();
          }
        }

        ctx.fillStyle = 'rgba(10, 16, 26, 0.7)';
        for (let k = 0; k < 5; k++) {
          const ox = (Math.random() - 0.5) * p.width * 0.7;
          const oy = (Math.random() - 0.5) * p.width * 0.7;
          if (ox * ox + oy * oy < (p.width * 0.35) * (p.width * 0.35)) {
            const r = Math.random() * 15 + 5;
            ctx.beginPath();
            ctx.arc(pt.x + ox, pt.y + oy, r, 0, Math.PI * 2);
            ctx.fill();
          }
        }
        
        if (Math.random() > 0.6) {
          ctx.fillStyle = 'rgba(30, 44, 60, 0.4)';
          const ox = (Math.random() - 0.5) * p.width * 0.5;
          const oy = (Math.random() - 0.5) * p.width * 0.5;
          ctx.fillRect(pt.x + ox, pt.y + oy, 3, 3);
        }
      }
    }

    for (let i = 0; i < this.props.length; i++) {
      const p = this.props[i];
      if (p.type === 'tree' || p.type === 'spikeRock') continue;
      if (p.type === 'shrub') this.renderShrub(ctx, p.x, p.y, p, 0);
      else if (p.type === 'grass') this.renderGrass(ctx, p.x, p.y, p, 0);
      else if (p.type === 'crystal') this.renderCrystal(ctx, p.x, p.y, p, 0);
    }
    for (let i = 0; i < this.ruins.length; i++) {
      const r = this.ruins[i];
      if (r.type === 'ruinPillar') this.renderRuinPillar(ctx, r.x, r.y, r, 0);
      else if (r.type === 'rubble') this.renderRubble(ctx, r.x, r.y, r);
      else if (r.type === 'ruinWall') this.renderRuinWall(ctx, r.x, r.y, r);
    }
    ctx.restore();
  }

  makeTree(x, y) {
    return { type: 'tree', x, y, h: Utils.rand(60, 110), r: Utils.rand(20, 42), spriteIdx: Utils.randInt(0, 9), seed: Math.random() * 100 };
  }
  makeSpikeRock(x, y) {
    return { type: 'spikeRock', x, y, h: Utils.rand(20, 30), seed: Math.random() * 100, verts: this.makeVerts(Utils.rand(20, 32)) };
  }
  makeShrub(x, y) {
    return { type: 'shrub', x, y, size: Utils.rand(14, 20), seed: Math.random() * 100 };
  }
  makeGrass(x, y) {
    return { type: 'grass', x, y, size: Utils.rand(10, 14), seed: Math.random() * 100 };
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
    const sx = camX * (this.mapCanvas.width / this.width);
    const sy = camY * (this.mapCanvas.height / this.height);
    const sw = viewW * (this.mapCanvas.width / this.width);
    const sh = viewH * (this.mapCanvas.height / this.height);

    ctx.drawImage(this.mapCanvas, sx, sy, sw, sh, 0, 0, viewW, viewH);
  }

  renderZoneOverlay(ctx, camX, camY, zones) {
    this._dashOffset -= 0.02;

    for (let i = 0; i < zones.length; i++) {
      const zone = zones[i];
      const sx = zone.x - camX;
      const sy = zone.y - camY;
      const r = zone.radius;

      if (sx + r < 0 || sx - r > ctx.canvas.width) continue;
      if (sy + r < 0 || sy - r > ctx.canvas.height) continue;

      const segments = 60;
      const angleStep = (Math.PI * 2) / segments;
      const startAngle = this._dashOffset * 0.05;

      ctx.save();
      
      ctx.strokeStyle = zone.color;
      ctx.lineWidth = 7;
      ctx.lineCap = 'round';
      ctx.globalAlpha = 0.6;
      ctx.shadowColor = zone.color;
      ctx.shadowBlur = 25;

      for (let j = 0; j < segments; j++) {
        if (j % 2 !== 0) continue;
        const a1 = startAngle + j * angleStep;
        const a2 = a1 + angleStep * 0.8;
        
        ctx.beginPath();
        ctx.arc(sx, sy, r, a1, a2);
        ctx.stroke();
      }

      ctx.restore();
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

  renderTree(ctx, x, y, p) {
    const sprite = this.treeSprites[p.spriteIdx];
    const w = sprite.width;
    const h = sprite.height;
    ctx.drawImage(sprite, x - w / 2, y - h + 20);
  }

  renderSpikeRock(ctx, x, y, p) {
    const s = p.h;
    ctx.fillStyle = C.shadow;
    ctx.beginPath(); ctx.ellipse(x + 4, y + s * 0.3, s * 1.1, s * 0.4, 0, 0, Math.PI * 2); ctx.fill();

    ctx.fillStyle = C.rockDark;
    ctx.beginPath();
    ctx.moveTo(x + p.verts[0][0], y + p.verts[0][1] + s * 0.3);
    for (let i = 1; i < p.verts.length; i++) ctx.lineTo(x + p.verts[i][0], y + p.verts[i][1] + s * 0.3);
    ctx.closePath(); ctx.fill();

    ctx.fillStyle = C.rockMid;
    ctx.beginPath();
    ctx.moveTo(x + p.verts[0][0] * 0.9, y + p.verts[0][1] * 0.9 + s * 0.1);
    for (let i = 1; i < p.verts.length; i++) ctx.lineTo(x + p.verts[i][0] * 0.9, y + p.verts[i][1] * 0.9 + s * 0.1);
    ctx.closePath(); ctx.fill();

    ctx.fillStyle = C.rockLight;
    ctx.beginPath();
    ctx.moveTo(x + p.verts[0][0] * 0.5, y + p.verts[0][1] * 0.5 - s * 0.2);
    for (let i = 1; i < p.verts.length; i++) ctx.lineTo(x + p.verts[i][0] * 0.5, y + p.verts[i][1] * 0.5 - s * 0.2);
    ctx.closePath(); ctx.fill();

    ctx.fillStyle = C.rockHighlight;
    ctx.beginPath();
    ctx.moveTo(x - s * 0.15, y - s * 0.25);
    ctx.lineTo(x - s * 0.05, y - s * 0.4);
    ctx.lineTo(x + s * 0.1, y - s * 0.3);
    ctx.lineTo(x + s * 0.05, y - s * 0.1);
    ctx.closePath(); ctx.fill();
  }

  renderShrub(ctx, x, y, p, now) {
    const s = p.size;

    ctx.fillStyle = C.shadow;
    ctx.beginPath(); ctx.ellipse(x + 3, y + s * 0.4, s * 0.9, s * 0.3, 0, 0, Math.PI * 2); ctx.fill();

    ctx.fillStyle = '#0a121e';
    ctx.beginPath(); ctx.ellipse(x, y, s * 0.55, s * 0.4, 0, 0, Math.PI * 2); ctx.fill();
    ctx.beginPath(); ctx.ellipse(x - s * 0.4, y - s * 0.15, s * 0.45, s * 0.3, 0, 0, Math.PI * 2); ctx.fill();
    ctx.beginPath(); ctx.ellipse(x + s * 0.4, y - s * 0.2, s * 0.42, s * 0.3, 0, 0, Math.PI * 2); ctx.fill();

    ctx.fillStyle = '#142438';
    ctx.beginPath(); ctx.ellipse(x - s * 0.15, y - s * 0.35, s * 0.35, s * 0.25, 0, 0, Math.PI * 2); ctx.fill();
    ctx.beginPath(); ctx.ellipse(x + s * 0.25, y - s * 0.4, s * 0.3, s * 0.2, 0, 0, Math.PI * 2); ctx.fill();
  }

  renderGrass(ctx, x, y, p, now) {
    const s = p.size;

    ctx.strokeStyle = '#1e3a2e';
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
    ctx.globalAlpha = 0.2;
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