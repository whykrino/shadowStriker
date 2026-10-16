'use strict';

const MONSTER_COLORS = {
  slime:    { c1: '#0e1a30', c2: '#1e3a5f', c3: '#4a9eff' },
  tank:     { c1: '#201510', c2: '#3a2a1a', c3: '#c89060' },
  ranger:   { c1: '#1a0e30', c2: '#3a1e5f', c3: '#b070ff' },
  assassin: { c1: '#0a0e18', c2: '#1a1e2a', c3: '#8fc9ff' },
  summoner: { c1: '#200a1a', c2: '#4a1e3a', c3: '#ff88bb' },
  kamikaze: { c1: '#3a0a10', c2: '#6a1a20', c3: '#ff3355' },
  ghost:    { c1: '#0a1420', c2: '#1a3050', c3: '#8fdfff' },
  shaman:   { c1: '#142010', c2: '#2a4020', c3: '#88ff88' },
  worm:     { c1: '#2a0e10', c2: '#5a1a20', c3: '#ff7788' },
  wormling: { c1: '#2a0e10', c2: '#5a1a20', c3: '#ff7788' },
  flyer:    { c1: '#1a1020', c2: '#3a2040', c3: '#dd88ff' },
  sentinel: { c1: '#101820', c2: '#20304a', c3: '#66ddff' },
  boss:     { c1: '#100818', c2: '#2a1040', c3: '#ff88ff' },
};

function drawMonsterShape(ctx, x, y, r, id, facingLeft) {
  const cols = MONSTER_COLORS[id] || MONSTER_COLORS.slime;

  ctx.save();
  ctx.translate(x, y);
  if (facingLeft) ctx.scale(-1, 1);

  ctx.fillStyle = cols.c1;
  ctx.beginPath();
  ctx.moveTo(-r * 0.4, r * 0.5);
  ctx.lineTo(-r * 0.9, -r * 0.8);
  ctx.lineTo(-r * 0.3, -r * 0.35);
  ctx.lineTo(0, -r * 1.15);
  ctx.lineTo(r * 0.3, -r * 0.35);
  ctx.lineTo(r * 0.9, -r * 0.8);
  ctx.lineTo(r * 0.4, r * 0.5);
  ctx.closePath();
  ctx.fill();

  ctx.fillStyle = cols.c2;
  ctx.beginPath();
  ctx.moveTo(-r * 0.7, r * 0.4);
  ctx.lineTo(-r * 0.4, -r * 0.55);
  ctx.lineTo(0, -r * 0.4);
  ctx.lineTo(r * 0.4, -r * 0.55);
  ctx.lineTo(r * 0.7, r * 0.4);
  ctx.closePath();
  ctx.fill();

  ctx.fillStyle = cols.c3;
  ctx.beginPath();
  ctx.moveTo(-r * 0.4, r * 0.2);
  ctx.lineTo(0, -r * 0.25);
  ctx.lineTo(r * 0.4, r * 0.2);
  ctx.closePath();
  ctx.fill();

  ctx.fillStyle = cols.c3;
  ctx.fillRect(-r * 0.45, -r * 0.3, 4, 3);
  ctx.fillRect(r * 0.15, -r * 0.3, 4, 3);

  ctx.fillStyle = cols.c3 + 'aa';
  ctx.fillRect(-r * 0.6, -r * 0.4, 5, 5);
  ctx.fillRect(r * 0.1, -r * 0.4, 5, 5);

  ctx.restore();
}

function drawPlayerShape(ctx, x, y, facingLeft, walkPhase) {
  const walkSin = Math.sin(walkPhase);
  const walkAmt = Math.abs(walkSin) > 0.05 ? 1 : 0;

  ctx.save();
  ctx.translate(x, y);
  if (facingLeft) ctx.scale(-1, 1);

  ctx.lineCap = 'round';
  ctx.lineJoin = 'round';

  const hipX = 0;
  const hipY = 8;
  const legStride = walkSin * 6 * walkAmt;

  ctx.strokeStyle = '#0e1524';
  ctx.lineWidth = 8;
  ctx.beginPath();
  ctx.moveTo(hipX - 3, hipY);
  ctx.lineTo(hipX - 5 + legStride, hipY + 12);
  ctx.stroke();
  ctx.beginPath();
  ctx.moveTo(hipX + 3, hipY);
  ctx.lineTo(hipX + 5 - legStride, hipY + 12);
  ctx.stroke();

  ctx.strokeStyle = '#0a0e18';
  ctx.lineWidth = 7;
  ctx.beginPath();
  ctx.moveTo(hipX - 5 + legStride, hipY + 12);
  ctx.lineTo(hipX - 5 + legStride * 1.4, hipY + 22);
  ctx.stroke();
  ctx.beginPath();
  ctx.moveTo(hipX + 5 - legStride, hipY + 12);
  ctx.lineTo(hipX + 5 - legStride * 1.4, hipY + 22);
  ctx.stroke();

  ctx.fillStyle = '#0a0e18';
  ctx.beginPath();
  ctx.ellipse(hipX - 6 + legStride * 1.4, hipY + 23, 5, 3, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.beginPath();
  ctx.ellipse(hipX + 6 - legStride * 1.4, hipY + 23, 5, 3, 0, 0, Math.PI * 2);
  ctx.fill();

  const torsoBottomY = hipY - 1;
  const torsoTopY = hipY - 18;

  ctx.fillStyle = '#1a2438';
  ctx.beginPath();
  ctx.moveTo(hipX - 8, torsoBottomY);
  ctx.lineTo(hipX + 8, torsoBottomY);
  ctx.lineTo(hipX + 9, torsoTopY + 4);
  ctx.lineTo(hipX + 8, torsoTopY);
  ctx.lineTo(hipX - 8, torsoTopY);
  ctx.lineTo(hipX - 9, torsoTopY + 4);
  ctx.closePath();
  ctx.fill();

  ctx.fillStyle = '#11192a';
  ctx.beginPath();
  ctx.moveTo(hipX - 6, torsoBottomY - 2);
  ctx.lineTo(hipX + 6, torsoBottomY - 2);
  ctx.lineTo(hipX + 7, torsoTopY + 6);
  ctx.lineTo(hipX - 7, torsoTopY + 6);
  ctx.closePath();
  ctx.fill();

  ctx.strokeStyle = '#4a9eff';
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.moveTo(hipX - 8, hipY - 2);
  ctx.lineTo(hipX + 8, hipY - 2);
  ctx.stroke();

  const headX = hipX + 1;
  const headY = torsoTopY - 6;

  ctx.fillStyle = '#06090f';
  ctx.beginPath();
  ctx.arc(headX, headY, 9, 0, Math.PI * 2);
  ctx.fill();

  ctx.fillStyle = '#0e1524';
  ctx.beginPath();
  ctx.arc(headX + 1, headY, 8, 0, Math.PI * 2);
  ctx.fill();

  ctx.fillStyle = '#1e2c44';
  ctx.beginPath();
  ctx.arc(headX + 2, headY - 1, 5, 0, Math.PI * 2);
  ctx.fill();

  ctx.fillStyle = '#4a9eff';
  ctx.fillRect(headX - 5, headY - 1, 11, 2);

  ctx.strokeStyle = '#0a0e18';
  ctx.lineWidth = 3;
  ctx.beginPath();
  ctx.moveTo(headX - 6, headY);
  ctx.lineTo(headX - 16, headY + 3);
  ctx.stroke();

  const handX = 16;
  const handY = hipY + 2;

  ctx.strokeStyle = '#11192a';
  ctx.lineWidth = 6;
  ctx.beginPath();
  ctx.moveTo(hipX - 8, torsoTopY + 4);
  ctx.quadraticCurveTo(10, torsoTopY + 8, handX - 2, handY);
  ctx.stroke();

  ctx.strokeStyle = '#0a0e18';
  ctx.lineWidth = 5;
  ctx.beginPath();
  ctx.moveTo(hipX + 8, torsoTopY + 4);
  ctx.quadraticCurveTo(12, torsoTopY + 8, handX + 2, handY);
  ctx.stroke();

  ctx.fillStyle = '#0a0e18';
  ctx.beginPath();
  ctx.arc(handX, handY, 4, 0, Math.PI * 2);
  ctx.fill();

  const swordAngle = -Math.PI * 0.32;
  const swordLen = 34;
  const swordEndX = handX + Math.cos(swordAngle) * swordLen;
  const swordEndY = handY + Math.sin(swordAngle) * swordLen;

  ctx.strokeStyle = '#3a2412';
  ctx.lineWidth = 5;
  ctx.beginPath();
  ctx.moveTo(handX - Math.cos(swordAngle) * 4, handY - Math.sin(swordAngle) * 4);
  ctx.lineTo(handX, handY);
  ctx.stroke();

  ctx.strokeStyle = '#c8d6e5';
  ctx.lineWidth = 3;
  ctx.beginPath();
  ctx.moveTo(handX + Math.cos(swordAngle) * 5, handY + Math.sin(swordAngle) * 5);
  ctx.lineTo(swordEndX, swordEndY);
  ctx.stroke();

  ctx.fillStyle = '#e8eef5';
  ctx.beginPath();
  ctx.arc(swordEndX, swordEndY, 2, 0, Math.PI * 2);
  ctx.fill();

  ctx.restore();
}

class CodexUI {
  constructor() {
    this.menu = document.getElementById('codex-menu');
    this.tabs = document.querySelectorAll('.codex-tab');
    this.tabMonsters = document.getElementById('codex-monsters');
    this.tabAbilities = document.getElementById('codex-abilities');
    this.tabZones = document.getElementById('codex-zones');

    this.detail = document.getElementById('codex-detail');
    this.detailClose = document.getElementById('codex-detail-close');
    this.detailName = document.getElementById('codex-detail-name');
    this.detailIcon = document.getElementById('codex-detail-icon');
    this.detailDesc = document.getElementById('codex-detail-desc');
    this.detailStats = document.getElementById('codex-detail-stats');
    this.detailHint = document.getElementById('codex-detail-hint');
    this.detailCanvas = document.getElementById('codex-detail-canvas');
    this.detailCtx = this.detailCanvas.getContext('2d');

    this._animId = 0;
    this._animStart = 0;
    this._currentMonster = null;

    for (const tab of this.tabs) {
      tab.addEventListener('click', () => this.switchTab(tab.dataset.tab));
    }

    this.detailClose.addEventListener('click', () => this.closeDetail());
    this.detail.addEventListener('click', (e) => {
      if (e.target === this.detail) this.closeDetail();
    });

    this.render();
  }

  switchTab(name) {
    for (const t of this.tabs) {
      t.classList.toggle('active', t.dataset.tab === name);
    }
    const map = { monsters: this.tabMonsters, abilities: this.tabAbilities, zones: this.tabZones };
    for (const key in map) {
      map[key].classList.toggle('active', key === name);
    }
  }

  render() {
    let html = '';
    for (const m of CODEX_DATA.monsters) {
      const cols = MONSTER_COLORS[m.id] || MONSTER_COLORS.slime;
      html +=
        '<div class="codex-card">' +
          '<canvas class="codex-card-icon" width="60" height="60" data-monster-icon="' + m.id + '" style="background:rgba(10,15,25,0.6);"></canvas>' +
          '<div class="codex-card-body">' +
            '<div class="codex-card-name">' + m.name + '</div>' +
            '<div class="codex-card-short">' + m.short + '</div>' +
          '</div>' +
          '<button class="codex-detail-btn" data-monster="' + m.id + '">ПОДРОБНЕЕ</button>' +
        '</div>';
    }
    this.tabMonsters.innerHTML = html;

    this.tabMonsters.querySelectorAll('canvas[data-monster-icon]').forEach(c => {
      const id = c.dataset.monsterIcon;
      const ctx = c.getContext('2d');
      ctx.clearRect(0, 0, 60, 60);
      drawMonsterShape(ctx, 30, 32, 16, id, false);
    });

    this.tabMonsters.querySelectorAll('.codex-detail-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        const id = btn.dataset.monster;
        const m = CODEX_DATA.monsters.find(x => x.id === id);
        if (m) this.openDetail(m);
      });
    });

    html = '';
    for (const a of CODEX_DATA.abilities) {
      html +=
        '<div class="codex-card">' +
          '<div class="codex-card-icon-text">' + a.icon + '</div>' +
          '<div class="codex-card-body">' +
            '<div class="codex-card-name">' + a.name + ' <small>· Ур. ' + a.unlock + '</small></div>' +
            '<div class="codex-card-desc">' + a.desc + '</div>' +
          '</div>' +
        '</div>';
    }
    this.tabAbilities.innerHTML = html;

    html = '';
    for (const z of CODEX_DATA.zones) {
      html +=
        '<div class="codex-card" style="border-left-color: ' + z.color + '">' +
          '<div class="codex-card-icon-text" style="color: ' + z.color + '">◈</div>' +
          '<div class="codex-card-body">' +
            '<div class="codex-card-name" style="color: ' + z.color + '">' + z.name + '</div>' +
            '<div class="codex-card-desc">' + z.desc + '</div>' +
          '</div>' +
        '</div>';
    }
    this.tabZones.innerHTML = html;
  }

  openDetail(m) {
    this._currentMonster = m;
    this.detailName.textContent = m.name;
    this.detailIcon.innerHTML = '';
    const iconCanvas = document.createElement('canvas');
    iconCanvas.width = 44;
    iconCanvas.height = 44;
    iconCanvas.style.width = '44px';
    iconCanvas.style.height = '44px';
    const ictx = iconCanvas.getContext('2d');
    drawMonsterShape(ictx, 22, 24, 12, m.id, false);
    this.detailIcon.innerHTML = '';
    this.detailIcon.appendChild(iconCanvas);
    this.detailDesc.textContent = m.desc;
    this.detailHint.textContent = 'СОВЕТ: ' + m.hint;
    this.detailStats.innerHTML =
      'HP <b>' + m.hp + '</b>' +
      ' · DMG <b>' + m.damage + '</b>' +
      ' · SPD <b>' + m.speed + '</b>' +
      ' · EXP <b>' + m.exp + '</b>' +
      '<br><span style="color:rgba(143,174,203,0.7)">' + m.zone + '</span>';

    this.detail.classList.add('show');
    this._animStart = performance.now();
    this._animId++;
    const myId = this._animId;
    this._animate(myId, m.behavior, m.id);
  }

  closeDetail() {
    this.detail.classList.remove('show');
    this._animId++;
    this._currentMonster = null;
  }

  isDetailOpen() {
    return this.detail.classList.contains('show');
  }

  _animate(myId, behavior, monsterId) {
    const ctx = this.detailCtx;
    const W = this.detailCanvas.width;
    const H = this.detailCanvas.height;

    const loop = (time) => {
      if (myId !== this._animId) return;
      const t = (time - this._animStart) / 1000;
      this._drawScene(ctx, W, H, t, behavior, monsterId);
      requestAnimationFrame(loop);
    };
    requestAnimationFrame(loop);
  }

  _drawScene(ctx, W, H, t, behavior, monsterId) {
    ctx.fillStyle = '#0a121e';
    ctx.fillRect(0, 0, W, H);

    ctx.strokeStyle = 'rgba(74, 158, 255, 0.06)';
    ctx.lineWidth = 1;
    for (let i = 0; i < 10; i++) {
      const x = (i / 10) * W;
      ctx.beginPath(); ctx.moveTo(x, 0); ctx.lineTo(x, H); ctx.stroke();
    }
    for (let i = 0; i < 6; i++) {
      const y = (i / 6) * H;
      ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(W, y); ctx.stroke();
    }

    const playerX = W * 0.82;
    const playerY = H * 0.55;
    const walkPhase = t * 8;

    let ex = W * 0.2;
    let ey = H * 0.55;
    let facingLeft = false;

    if (behavior === 'chaser' || behavior === 'splitter') {
      const phase = (t * 0.3) % 1;
      ex = W * 0.15 + (playerX - W * 0.15) * phase;
      ey = H * 0.55 + Math.sin(t * 4) * 4;
      facingLeft = false;
    } else if (behavior === 'ranged' || behavior === 'flyer') {
      ex = W * 0.35 + Math.sin(t * 1.5) * 15;
      ey = H * 0.55 + Math.sin(t * 3) * 12;
      facingLeft = false;

      const projPhase = (t * 0.7) % 1;
      if (projPhase < 0.9) {
        const sx = ex + 14;
        const sy = ey;
        const tx = playerX - 12;
        const ty = playerY;
        const px = sx + (tx - sx) * projPhase;
        const py = sy + (ty - sy) * projPhase;
        ctx.fillStyle = '#ff88aa';
        ctx.beginPath(); ctx.arc(px, py, 4, 0, Math.PI * 2); ctx.fill();
        ctx.strokeStyle = 'rgba(255, 136, 170, 0.4)';
        ctx.lineWidth = 1;
        ctx.beginPath(); ctx.arc(px, py, 7, 0, Math.PI * 2); ctx.stroke();
      }
    } else if (behavior === 'assassin') {
      const cycle = Math.floor(t * 1.2) % 3;
      if (cycle === 0) {
        ex = W * 0.15; ey = H * 0.35;
        ctx.globalAlpha = 1;
      } else if (cycle === 1) {
        ex = W * 0.5; ey = H * 0.7;
        ctx.globalAlpha = 0.25;
      } else {
        ex = playerX - 40; ey = playerY;
        ctx.globalAlpha = 1;
      }
      facingLeft = false;
    } else if (behavior === 'summoner' || behavior === 'healer') {
      ex = W * 0.25 + Math.sin(t * 0.6) * 10;
      ey = H * 0.55;

      const pulse = (t * 0.6) % 1;
      ctx.strokeStyle = 'rgba(136, 255, 136, ' + (1 - pulse) * 0.5 + ')';
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.arc(ex, ey, 22 + pulse * 45, 0, Math.PI * 2);
      ctx.stroke();

      if (behavior === 'summoner') {
        for (let i = 0; i < 2; i++) {
          const a = t * 1.5 + i * Math.PI;
          const sx = ex + Math.cos(a) * 45;
          const sy = ey + Math.sin(a) * 25;
          drawMonsterShape(ctx, sx, sy, 8, 'slime', false);
        }
      }
      facingLeft = false;
    } else if (behavior === 'kamikaze') {
      const phase = (t * 0.85) % 1;
      ex = W * 0.12 + (playerX - W * 0.12) * phase;
      ey = H * 0.55 + Math.sin(t * 8) * 6;
      facingLeft = false;
    } else if (behavior === 'sentinel') {
      ex = W * 0.3;
      ey = H * 0.55;
      const beamPhase = (t * 0.45) % 1;
      if (beamPhase > 0.35 && beamPhase < 0.7) {
        ctx.save();
        ctx.globalAlpha = 0.75;
        ctx.strokeStyle = '#ff3355';
        ctx.lineWidth = 3 + Math.sin(t * 30) * 1.2;
        ctx.beginPath();
        ctx.moveTo(ex + 20, ey);
        ctx.lineTo(playerX - 12, playerY);
        ctx.stroke();
        ctx.restore();
      } else if (beamPhase < 0.35) {
        ctx.strokeStyle = 'rgba(255, 51, 85, 0.4)';
        ctx.lineWidth = 1;
        ctx.setLineDash([5, 5]);
        ctx.beginPath();
        ctx.moveTo(ex + 20, ey);
        ctx.lineTo(playerX - 12, playerY);
        ctx.stroke();
        ctx.setLineDash([]);
      }
    } else if (behavior === 'boss') {
      ex = W * 0.28 + Math.sin(t * 0.5) * 20;
      ey = H * 0.55 + Math.sin(t * 1.1) * 12;

      const ringPhase = (t * 0.45) % 1;
      if (ringPhase < 0.65) {
        ctx.strokeStyle = 'rgba(255, 136, 255, ' + (1 - ringPhase / 0.65) * 0.85 + ')';
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.arc(ex, ey, 24 + ringPhase * 90, 0, Math.PI * 2);
        ctx.stroke();
      }
    }

    const playerFacingLeft = false;
    drawPlayerShape(ctx, playerX, playerY, playerFacingLeft, walkPhase);

    drawMonsterShape(ctx, ex, ey, monsterId === 'boss' ? 22 : 16, monsterId, facingLeft);

    ctx.globalAlpha = 1;

    ctx.fillStyle = 'rgba(143, 174, 203, 0.5)';
    ctx.font = 'bold 10px monospace';
    ctx.textAlign = 'center';
    ctx.fillText('ИГРОК', playerX, playerY + 42);

    const m = this._currentMonster;
    if (m) ctx.fillText(m.name.toUpperCase(), ex, ey + 40);

    ctx.strokeStyle = 'rgba(74, 158, 255, 0.25)';
    ctx.lineWidth = 1;
    ctx.strokeRect(0.5, 0.5, W - 1, H - 1);
  }

  toggle(show) {
    if (show) this.menu.classList.add('show');
    else {
      this.menu.classList.remove('show');
      this.closeDetail();
    }
  }

  isOpen() {
    return this.menu.classList.contains('show');
  }
}