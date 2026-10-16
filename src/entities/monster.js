'use strict';

class Monster {
  constructor() {
    this.active = false;
  }

  reset(x, y, archetypeId, homeZone, playerLevel) {
    const base = ARCHETYPES[archetypeId];
    const scaled = scaleArchetype(base, playerLevel);

    this.archetypeId = archetypeId;
    this.archetype = base;
    this.x = x;
    this.y = y;
    this.homeX = x;
    this.homeY = y;
    this.homeZone = homeZone;
    this.stacks = scaled.stacks;

    this.radius = base.radius;
    this.maxHp = scaled.hp;
    this.hp = scaled.hp;
    this.damage = scaled.damage;
    this.speed = base.speed;
    this.expValue = base.exp;
    this.alive = true;
    this.active = true;

    this.attackCooldown = 0;
    this.hitFlash = 0;
    this.wobblePhase = Math.random() * Math.PI * 2;
    this.facing = 0;
    this.targetFacing = 0;
    this.chaseTimer = 0;
    this.wanderAngle = Math.random() * Math.PI * 2;

    this.aggroRange = base.behavior === 'ranged' || base.behavior === 'summoner' ? 340 : 260;
    this.leashRange = 500;

    this.dashTimer = 0;
    this.dashCooldown = 0;
    this.dashDuration = 0.18;
    this.dashSpeed = base.speed * 2.2;

    this.blinkCooldown = 3 + Math.random() * 4;
    this.burstCooldown = 4 + Math.random() * 3;
    this.healCooldown = 10 + Math.random() * 5;
    this.summonCooldown = 3 + Math.random() * 3;
    this.attackPattern = 0;

    this.blinkFlash = 0;
    this.healFlash = 0;
    this.frozenTimer = 0;

    this.hidden = base.invisibility === true;
    this.visibleNow = !this.hidden;

    this.phase = 1;
  }

  takeDamage(amount, fromBehind, isCrit) {
    if (!this.alive) return { killed: false, actual: 0 };

    let actual = amount;

    if (this.archetype.armored && !fromBehind) {
      actual = Math.round(actual * 0.4);
    }
    if (fromBehind && this.archetype.backstab) {
      actual = Math.round(actual * this.archetype.backstab);
    }

    this.hp -= actual;
    this.hitFlash = 0.15;
    this.chaseTimer = 3.0;

    if (this.hp <= 0) {
      this.hp = 0;
      this.alive = false;
      return { killed: true, actual };
    }
    return { killed: false, actual };
  }

  freeze(duration) {
    this.frozenTimer = Math.max(this.frozenTimer, duration);
  }

  update(dt, player, zoneManager, damageNumbers, world) {
    if (!this.alive) return;

    const dx0 = player.x - this.x;
    const dy0 = player.y - this.y;
    const dist0Sq = dx0 * dx0 + dy0 * dy0;

    if (dist0Sq > 810000 && this.chaseTimer <= 0 && this.frozenTimer <= 0) {
      return;
    }

    if (this.frozenTimer > 0) {
      this.frozenTimer -= dt;
      this.wobblePhase += dt * 2;
      this._updateVisuals(dt);
      return;
    }

    const dx = player.x - this.x;
    const dy = player.y - this.y;
    const dist = Math.hypot(dx, dy);
    const distFromHome = Math.hypot(this.x - this.homeX, this.y - this.homeY);

    let chasing = false;
    if (dist < this.aggroRange && player.alive) {
      chasing = true;
      this.chaseTimer = 2.0;
    } else if (this.chaseTimer > 0) {
      this.chaseTimer -= dt;
      chasing = true;
    }
    if (distFromHome > this.leashRange) chasing = false;

    if (this.archetype.invisibility) {
      this.visibleNow = chasing || this.attackCooldown > 0.8;
    }

    switch (this.archetype.behavior) {
      case 'chaser':
        this._updateChaser(dt, player, dx, dy, dist, chasing);
        break;
      case 'ranged':
        this._updateRanged(dt, player, dx, dy, dist, chasing, zoneManager);
        break;
      case 'assassin':
        this._updateAssassin(dt, player, dx, dy, dist, chasing);
        break;
      case 'summoner':
        this._updateSummoner(dt, player, dx, dy, dist, chasing, zoneManager, damageNumbers);
        break;
      case 'kamikaze':
        this._updateKamikaze(dt, player, dx, dy, dist, chasing);
        break;
      case 'boss':
        this._updateBoss(dt, player, dx, dy, dist, chasing, zoneManager);
        break;
    }

    if (!chasing) this._updateWander(dt);

    if (world) world.collide(this, this.radius);

    this._updateVisuals(dt);
  }

  _updateChaser(dt, player, dx, dy, dist, chasing) {
    if (!chasing) return;
    if (this.archetypeId !== 'slime' && this.archetypeId !== 'tank') {
      if (this.blinkCooldown > 0) this.blinkCooldown -= dt;
      if (this.dashCooldown > 0) this.dashCooldown -= dt;
      if (this.dashTimer > 0) this.dashTimer -= dt;

      if (this.blinkCooldown <= 0 && dist > 120) {
        const a = player.facing + Math.PI + (Math.random() - 0.5) * 0.6;
        this.x = player.x + Math.cos(a) * 80;
        this.y = player.y + Math.sin(a) * 80;
        this.blinkFlash = 0.4;
        this.blinkCooldown = 6 + Math.random() * 3;
        return;
      }
      if (this.dashCooldown <= 0 && this.dashTimer <= 0 && dist < this.aggroRange && dist > 60) {
        this.dashTimer = this.dashDuration;
        this.dashCooldown = 2.5 + Math.random() * 1.5;
      }
    }

    const spd = this.dashTimer > 0 ? this.dashSpeed : this.speed;
    if (dist > this.radius + player.radius) {
      this.x += (dx / dist) * spd * dt;
      this.y += (dy / dist) * spd * dt;
    }
    this.facing = Math.atan2(dy, dx);
  }

  _updateRanged(dt, player, dx, dy, dist, chasing, zoneManager) {
    if (this.attackCooldown > 0) this.attackCooldown -= dt;

    if (!chasing) return;

    const preferred = this.archetype.preferredRange;
    if (dist < preferred - 40) {
      this.x -= (dx / dist) * this.speed * dt;
      this.y -= (dy / dist) * this.speed * dt;
    } else if (dist > preferred + 40) {
      this.x += (dx / dist) * this.speed * dt;
      this.y += (dy / dist) * this.speed * dt;
    }

    this.facing = Math.atan2(dy, dx);

    if (this.attackCooldown <= 0 && dist < this.aggroRange && zoneManager && zoneManager.bulletPool) {
      const count = this.archetype.projectileCount;
      const spread = 0.5;
      const baseAngle = Math.atan2(dy, dx);
      for (let i = 0; i < count; i++) {
        const a = baseAngle + (i / (count - 1) - 0.5) * spread;
        zoneManager.bulletPool.obtain({
          x: this.x, y: this.y,
          vx: Math.cos(a) * 260,
          vy: Math.sin(a) * 260,
          damage: Math.round(this.damage * 0.6),
          radius: 6,
        });
      }
      this.attackCooldown = this.archetype.attackCooldown;
    }
  }

  _updateAssassin(dt, player, dx, dy, dist, chasing) {
    if (!chasing) return;

    if (this.dashTimer > 0) this.dashTimer -= dt;
    if (this.dashCooldown > 0) this.dashCooldown -= dt;

    if (this.dashCooldown <= 0 && dist < 300 && dist > 60) {
      this.dashTimer = 0.22;
      this.dashCooldown = 1.8 + Math.random() * 0.8;
    }

    const spd = this.dashTimer > 0 ? this.speed * 4 : this.speed;
    if (dist > this.radius + player.radius) {
      this.x += (dx / dist) * spd * dt;
      this.y += (dy / dist) * spd * dt;
    }
    this.facing = Math.atan2(dy, dx);
  }

  _updateSummoner(dt, player, dx, dy, dist, chasing, zoneManager, damageNumbers) {
    if (this.summonCooldown > 0) this.summonCooldown -= dt;
    if (this.attackCooldown > 0) this.attackCooldown -= dt;

    if (!chasing) return;

    const preferred = this.archetype.preferredRange;
    if (dist < preferred - 40) {
      this.x -= (dx / dist) * this.speed * dt;
      this.y -= (dy / dist) * this.speed * dt;
    } else if (dist > preferred + 40) {
      this.x += (dx / dist) * this.speed * dt;
      this.y += (dy / dist) * this.speed * dt;
    }

    this.facing = Math.atan2(dy, dx);

    if (this.summonCooldown <= 0 && zoneManager) {
      const count = this.archetype.summonCount;
      for (let i = 0; i < count; i++) {
        const a = Math.random() * Math.PI * 2;
        const sx = this.x + Math.cos(a) * 60;
        const sy = this.y + Math.sin(a) * 60;
        zoneManager.spawnInZone(this.homeZone, this.archetype.summonType, sx, sy);
      }
      this.summonCooldown = this.archetype.summonInterval;
    }

    if (this.attackCooldown <= 0 && dist < this.aggroRange && zoneManager && zoneManager.bulletPool) {
      zoneManager.bulletPool.obtain({
        x: this.x, y: this.y,
        vx: (dx / dist) * 240,
        vy: (dy / dist) * 240,
        damage: Math.round(this.damage * 0.8),
        radius: 8,
        color: '#ff88bb',
      });
      this.attackCooldown = this.archetype.attackCooldown;
    }
  }

  _updateKamikaze(dt, player, dx, dy, dist, chasing) {
    if (!chasing) return;
    if (dist > this.radius + player.radius) {
      this.x += (dx / dist) * this.speed * dt;
      this.y += (dy / dist) * this.speed * dt;
    }
    this.facing = Math.atan2(dy, dx);
  }

  _updateBoss(dt, player, dx, dy, dist, chasing, zoneManager) {
    const pct = this.hp / this.maxHp;
    if (pct < 0.2) this.phase = 3;
    else if (pct < 0.5) this.phase = 2;
    else this.phase = 1;

    if (this.blinkCooldown > 0) this.blinkCooldown -= dt;
    if (this.burstCooldown > 0) this.burstCooldown -= dt;
    if (this.healCooldown > 0) this.healCooldown -= dt;
    if (this.dashCooldown > 0) this.dashCooldown -= dt;

    if (!chasing) return;

    if (this.blinkCooldown <= 0 && dist > 120) {
      const a = player.facing + Math.PI;
      this.x = player.x + Math.cos(a) * 70;
      this.y = player.y + Math.sin(a) * 70;
      this.blinkFlash = 0.5;
      this.blinkCooldown = this.archetype.blinkCooldown / (this.phase === 3 ? 2 : this.phase === 2 ? 1.5 : 1);
      return;
    }

    if (this.burstCooldown <= 0 && dist < 340 && zoneManager && zoneManager.bulletPool) {
      const count = this.archetype.burstProjectileCount + (this.phase - 1) * 4;
      for (let i = 0; i < count; i++) {
        const a = (i / count) * Math.PI * 2;
        zoneManager.bulletPool.obtain({
          x: this.x, y: this.y,
          vx: Math.cos(a) * 240,
          vy: Math.sin(a) * 240,
          damage: Math.round(this.damage * 0.5),
          radius: 7,
        });
      }
      this.burstCooldown = this.archetype.burstCooldown;
    }

    if (this.healCooldown <= 0 && this.hp < this.maxHp * 0.5) {
      this.hp = Math.min(this.maxHp, this.hp + Math.round(this.maxHp * 0.15));
      this.healFlash = 0.7;
      this.healCooldown = this.archetype.healCooldown;
    }

    if (dist > this.radius + player.radius) {
      const spd = this.speed * (this.phase === 3 ? 1.6 : this.phase === 2 ? 1.3 : 1);
      this.x += (dx / dist) * spd * dt;
      this.y += (dy / dist) * spd * dt;
    }
    this.facing = Math.atan2(dy, dx);
  }

  _updateWander(dt) {
    this.wanderAngle += (Math.random() - 0.5) * dt * 2;
    const wx = Math.cos(this.wanderAngle);
    const wy = Math.sin(this.wanderAngle);
    const wanderSpd = this.speed * 0.3;
    this.x += wx * wanderSpd * dt;
    this.y += wy * wanderSpd * dt;

    const hx = this.homeX - this.x;
    const hy = this.homeY - this.y;
    const hd = Math.hypot(hx, hy);
    if (hd > 90) {
      this.x += (hx / hd) * this.speed * 0.5 * dt;
      this.y += (hy / hd) * this.speed * 0.5 * dt;
    }
    this.facing = Math.atan2(wy, wx);
  }

  _updateVisuals(dt) {
    this.wobblePhase += dt * 6;
    if (this.hitFlash > 0) this.hitFlash -= dt;
    if (this.attackCooldown > 0) this.attackCooldown -= dt;
    if (this.blinkFlash > 0) this.blinkFlash -= dt;
    if (this.healFlash > 0) this.healFlash -= dt;
  }

  render(ctx, camX, camY) {
    if (!this.alive) return;
    const inv = this.archetype.invisibility && !this.visibleNow;
    if (inv) {
      ctx.save();
      ctx.globalAlpha = 0.15;
    }

    const px = this.x - camX;
    const py = this.y - camY;
    const wob = Math.sin(this.wobblePhase) * 0.08;
    const flash = this.hitFlash > 0;
    const r = this.radius * (1 + wob);
    const a = this.archetype;

    if (this.blinkFlash > 0) {
      ctx.save();
      ctx.globalCompositeOperation = 'lighter';
      const al = this.blinkFlash / 0.5;
      ctx.globalAlpha = al * 0.7;
      ctx.fillStyle = '#c864ff';
      ctx.beginPath(); ctx.arc(px, py, r * 2, 0, Math.PI * 2); ctx.fill();
      ctx.restore();
    }

    if (this.healFlash > 0) {
      ctx.save();
      ctx.globalCompositeOperation = 'lighter';
      const al = this.healFlash / 0.7;
      ctx.globalAlpha = al * 0.6;
      ctx.fillStyle = '#64ff82';
      ctx.beginPath(); ctx.arc(px, py, r * 2, 0, Math.PI * 2); ctx.fill();
      ctx.restore();
    }

    ctx.save();
    ctx.translate(px, py);
    const facingLeft = Math.cos(this.facing) < 0;
    if (facingLeft) ctx.scale(-1, 1);

    if (flash) {
      ctx.fillStyle = '#ffffff';
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

      ctx.beginPath();
      ctx.arc(0, 0, r * 0.8, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();
      if (inv) ctx.restore();
      return;
    }

    ctx.fillStyle = '#040610';
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

    ctx.fillStyle = a.color1;
    ctx.beginPath();
    ctx.moveTo(-r * 0.7, r * 0.4);
    ctx.lineTo(-r * 0.4, -r * 0.55);
    ctx.lineTo(0, -r * 0.4);
    ctx.lineTo(r * 0.4, -r * 0.55);
    ctx.lineTo(r * 0.7, r * 0.4);
    ctx.closePath();
    ctx.fill();

    ctx.fillStyle = a.color2;
    ctx.beginPath();
    ctx.moveTo(-r * 0.4, r * 0.2);
    ctx.lineTo(0, -r * 0.25);
    ctx.lineTo(r * 0.4, r * 0.2);
    ctx.closePath();
    ctx.fill();

    ctx.fillStyle = a.color3;
    ctx.fillRect(-r * 0.45, -r * 0.3, 4, 3);
    ctx.fillRect(r * 0.15, -r * 0.3, 4, 3);
    ctx.fillRect(-r * 0.6, -r * 0.4, 5, 5);
    ctx.fillRect(r * 0.05, -r * 0.4, 5, 5);

    if (this.frozenTimer > 0) {
      ctx.strokeStyle = 'rgba(150, 220, 255, 0.8)';
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.arc(0, 0, r * 1.2, 0, Math.PI * 2);
      ctx.stroke();
    }

    ctx.restore();

    if ((this.archetypeId === 'boss' || this.archetypeId === 'summoner' || this.archetypeId === 'tank') && this.hp < this.maxHp) {
      const bw = r * 1.8;
      const bx = px - bw / 2;
      const by = py - r * 1.6;
      ctx.fillStyle = 'rgba(0,0,0,0.7)';
      ctx.fillRect(bx, by, bw, 3);
      ctx.fillStyle = a.color3;
      ctx.fillRect(bx, by, bw * (this.hp / this.maxHp), 3);

      if (this.archetypeId === 'boss') {
        ctx.fillStyle = 'rgba(255,255,255,0.6)';
        ctx.fillRect(bx + bw * 0.5 - 0.5, by - 2, 1, 7);
        ctx.fillRect(bx + bw * 0.8 - 0.5, by - 2, 1, 7);
      }
    }

    if (inv) ctx.restore();
  }
}