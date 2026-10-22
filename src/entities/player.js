'use strict';

class Player {
  constructor(x, y, stats, abilities, talents) {
    this.x = x;
    this.y = y;
    this.stats = stats;
    this.abilities = abilities;
    this.talents = talents;
    this.radius = 18;
    this.alive = true;

    this.hp = stats.maxHp;

    this.facing = 0;
    this.targetFacing = 0;

    this.attackTimer = 0;
    this.attackCooldown = 0;
    this.attackDuration = 0.35;
    this.attackArc = Math.PI * 1.35;
    this.attackHitApplied = false;
    this.attackQueued = false;

    this.chargeTime = 0;
    this.chargeMax = 0.6;
    this.chargeHardCap = 1.6;
    this.chargeReady = false;
    this.isCharging = false;
    this.chargedAttack = false;
    this.chargedAmount = 0;
    this._prevChargeKeyDown = false;

    this._swingSoundPlayed = false;

    this.isBlocking = false;
    this.blockCooldown = 0;
    this.blockTimer = 0;
    this.blockHitsLeft = 6;
    this.blockMaxHits = 6;
    this.blockRechargeTimer = 0;
    this.blockRechargeTime = 2.5;

    this.dashTimer = 0;
    this.dashCooldown = 0;
    this.maxDashCharges = 3;
    this.dashCharges = 3;
    this.dashDuration = 0.16;
    this.dashRechargeTime = 2.5;
    this.dashRechargeTimer = 0;
    this.invulnTimer = 0;

    this.walkPhase = 0;
    this.breathePhase = 0;
    this.hitShake = 0;

    this.trailAlpha = 0;
    this.levelUpFlash = 0;
    this.damageFlash = 0;

    this.shieldHp = 0;
    this.shieldMax = 0;
    this.shieldTimer = 0;
    this.kills = 0;

    this.buffTimer = 0;
    this.buffType = null;

    this.phoenixUsed = false;

    this.z = 0;
    this.vz = 0;
    this.isAirborne = false;
    this.jumpCooldown = 0;
    this.airSlamPending = false;
    this.pendingSlam = false;
    this.slamFx = [];
    this.landCrouch = 0;
    this.postSlamLock = 0;

    this.recompute();

    this.phantoms = [];
  }

  recompute() {
    const s = this.stats;
    const t = this.talents.effects;

    this._cachedMaxHp = Math.round(s.maxHp + t.maxHp);
    this._cachedSpeed = s.speed * (1 + t.speedMult);
    this._cachedDash = s.dashSpeed * (1 + t.speedMult);
    this._cachedRange = s.attackRange * (1 + t.rangeMult);

    this.maxDashCharges = 3 + Math.floor(t.dashCharges);
    if (this.dashCharges > this.maxDashCharges) this.dashCharges = this.maxDashCharges;
    this.blockMaxHits = 6 + Math.floor(t.blockCharges);
    if (this.blockHitsLeft > this.blockMaxHits) this.blockHitsLeft = this.blockMaxHits;

    if (this.shieldMax !== t.arcaneShield) {
      this.shieldMax = t.arcaneShield;
      this.shieldHp = t.arcaneShield;
    }
  }

  get damage() {
    const s = this.stats;
    const t = this.talents.effects;
    return s.damage * (1 + t.damageMult);
  }

  refreshStats() {
    const oldMax = this._cachedMaxHp;
    this.recompute();
    if (this._cachedMaxHp > oldMax) this.hp += this._cachedMaxHp - oldMax;
    this.hp = Math.min(this.hp, this._cachedMaxHp);
  }

  takeDamage(amount, isMelee) {
    if (this.invulnTimer > 0 || !this.alive) return;

    if (this.isBlocking && this.blockHitsLeft > 0) {
      const blockCap = isMelee
        ? 10 + this.stats.level * 2
        : (10 + this.stats.level * 2) * 0.5;

      this.blockHitsLeft--;
      if (this.audio) this.audio.blockHit();

      if (this.blockHitsLeft <= 0) {
        this.isBlocking = false;
        if (this.audio) this.audio.blockBreak();
      }

      if (amount <= blockCap) {
        this.invulnTimer = 0.3;
        return;
      }

      amount -= blockCap;
      this.isBlocking = false;
      if (this.audio) this.audio.blockBreak();
    }

    const t = this.talents.effects;
    let dmg = amount * (1 - t.damageResist);

    if (this.shieldHp > 0) {
      const absorbed = Math.min(this.shieldHp, dmg);
      this.shieldHp -= absorbed;
      dmg -= absorbed;
    }

    if (dmg > 0) {
      this.hp -= dmg;
      if (this.hp <= 0) { this.hp = 0; this.alive = false; }
    }
    this.invulnTimer = 0.8;
    this.hitShake = 0.3;
    this.damageFlash = 0.4;
  }

  heal(amount) {
    this.hp = Math.min(this.hp + amount, this._cachedMaxHp);
  }

  onKill() {
    this.kills++;
    const t = this.talents.effects;
    if (t.healOnKill > 0) this.heal(t.healOnKill);
  }

  onLevelUp() {
    this.levelUpFlash = 0.6;
    this.refreshStats();
    this.hp = this._cachedMaxHp;
  }

  startAttack(charged, chargeAmount) {
    if (!this.alive || this.attackTimer > 0) return;
    if (this.postSlamLock > 0) return;
    if (this.attackCooldown > 0) { this.attackQueued = true; return; }

    this.attackTimer = this.attackDuration;
    this.attackCooldown = 0.35;
    this.attackHitApplied = false;
    this.attackQueued = false;
    this.chargedAttack = !!charged;
    this.chargedAmount = chargeAmount || 0;
    this._swingSoundPlayed = false;
  }

  faceTowards(x, y) {
    const dx = x - this.x;
    const dy = y - this.y;
    if (Math.abs(dx) < 0.001 && Math.abs(dy) < 0.001) return;
    this.targetFacing = Math.atan2(dy, dx);
  }

  update(dt, input, world, mouseWorldX, mouseWorldY, audio) {
    if (!this.alive) return;
    this.audio = audio;

    this.attackTimer = Math.max(0, this.attackTimer - dt);
    this.attackCooldown = Math.max(0, this.attackCooldown - dt);
    this.invulnTimer = Math.max(0, this.invulnTimer - dt);
    this.dashTimer = Math.max(0, this.dashTimer - dt);
    this.hitShake = Math.max(0, this.hitShake - dt);
    this.levelUpFlash = Math.max(0, this.levelUpFlash - dt);
    this.damageFlash = Math.max(0, this.damageFlash - dt);
    this.jumpCooldown = Math.max(0, this.jumpCooldown - dt);
    if (this.landCrouch > 0) this.landCrouch = Math.max(0, this.landCrouch - dt * 3);
    if (this.postSlamLock > 0) this.postSlamLock = Math.max(0, this.postSlamLock - dt);

    for (let i = this.slamFx.length - 1; i >= 0; i--) {
      const fx = this.slamFx[i];
      fx.t += dt;
      if (fx.t >= fx.life) this.slamFx.splice(i, 1);
    }

    if (this.attackTimer > 0) {
      const p = 1 - this.attackTimer / this.attackDuration;
      if (p >= 0.15 && !this._swingSoundPlayed) {
        this.audio.swordSwing();
        this._swingSoundPlayed = true;
      }
    }

    if (this.buffTimer > 0) {
      this.buffTimer -= dt;
      if (this.buffTimer <= 0) this.buffType = null;
    }

    if (this.shieldMax > 0 && this.shieldHp < this.shieldMax) {
      this.shieldTimer += dt;
      if (this.shieldTimer >= 8) {
        this.shieldHp = this.shieldMax;
        this.shieldTimer = 0;
      }
    }

    if (this.blockHitsLeft < this.blockMaxHits) {
      this.blockRechargeTimer -= dt;
      if (this.blockRechargeTimer <= 0) {
        this.blockHitsLeft++;
        this.blockRechargeTimer = this.blockRechargeTime;
      }
    } else {
      this.blockRechargeTimer = this.blockRechargeTime;
    }

    const spaceDown = input.isDown('Space');
    const spaceJustPressed = spaceDown && !this._prevSpaceDown;

    if (spaceJustPressed && !this.isAirborne && !this.isBlocking && this.jumpCooldown <= 0) {
      this.jump();
    }

    this._prevSpaceDown = spaceDown;

    if (this.isAirborne) {
      if (input.mouseDown && !this.airSlamPending && this.stats.level >= 4 && this.z > 30) {
        this.airSlamPending = true;
        this.vz = -1000;
        this._swingSoundPlayed = false;
        this.audio.swordSwing();
      }
    }

    this.isBlocking = input.mouseRightDown
      && this.blockHitsLeft > 0
      && this.attackTimer <= 0
      && !this.isAirborne
      && !this.airSlamPending
      && !this.isCharging;

    if (this.isBlocking) {
      this.blockTimer += dt;
    } else {
      this.blockTimer = 0;
    }

    const chargeKeyDown = input.isDown('KeyT');
    const chargeJustPressed = chargeKeyDown && !this._prevChargeKeyDown;
    const canCharge = this.abilities.has('charge');

    if (canCharge && !this.isAirborne && !this.isBlocking && !this.airSlamPending) {
      if (chargeJustPressed && this.attackTimer <= 0 && !this.isCharging) {
        this.isCharging = true;
        this.chargeTime = 0;
      }

      if (this.isCharging && chargeKeyDown) {
        this.chargeTime += dt;
        if (this.chargeTime >= this.chargeHardCap) {
          const cap = this.chargeHardCap;
          this.isCharging = false;
          this.chargeTime = 0;
          this.startAttack(true, cap);
        }
      }

      if (this.isCharging && !chargeKeyDown) {
        const amt = this.chargeTime;
        this.isCharging = false;
        this.chargeTime = 0;
        this.startAttack(true, amt);
      }
    } else if (this.isCharging) {
      this.isCharging = false;
      this.chargeTime = 0;
    }

    this._prevChargeKeyDown = chargeKeyDown;

    if (!this.isAirborne && !this.isCharging && !this.airSlamPending && this.postSlamLock <= 0) {
      if (input.mouseDown && !this.isBlocking) {
        this.startAttack(false, 0);
      } else if (this.attackQueued && this.attackCooldown <= 0 && this.attackTimer <= 0) {
        this.attackQueued = false;
        this.startAttack(false, 0);
      }
    }

    const mv = input.moveVector;
    const mag = Math.hypot(mv.x, mv.y);

    if (this.dashCharges < this.maxDashCharges) {
      this.dashRechargeTimer -= dt;
      if (this.dashRechargeTimer <= 0) {
        this.dashCharges++;
        this.dashRechargeTimer = this.dashRechargeTime;
      }
    } else {
      this.dashRechargeTimer = this.dashRechargeTime;
    }

    if (this.abilities.has('dash')
        && input.consumeDash()
        && this.dashTimer <= 0
        && this.dashCharges > 0
        && mag > 0) {
      this.dashCharges--;
      this.dashTimer = this.dashDuration;
      this.invulnTimer = Math.max(this.invulnTimer, this.dashDuration + 0.1);
      if (this.dashCharges === this.maxDashCharges - 1) {
        this.dashRechargeTimer = this.dashRechargeTime;
      }
      if (this.talents.effects.phantomDash) {
        this.phantoms.push({
          x: this.x, y: this.y, facing: this.facing,
          life: 0.4, maxLife: 0.4, damage: Math.round(this.damage * 0.5),
        });
      }
    }

    let vx = 0, vy = 0;
    if (mag > 0) {
      const nx = mv.x / mag;
      const ny = mv.y / mag;
      let spd = this.dashTimer > 0 ? this._cachedDash : this._cachedSpeed;
      if (this.isBlocking) spd *= 0.45;
      if (this.buffType === 'speed' && this.buffTimer > 0) spd *= 1.5;
      if (this.isAirborne) spd *= 0.85;
      if (this.isCharging) spd *= 0.5;
      vx = nx * spd;
      vy = ny * spd;
    }

    this.x += vx * dt;
    this.y += vy * dt;

    if (this.isAirborne) {
      world.clampPosition(this, this.radius);
    } else {
      world.collide(this, this.radius);
    }

    this.faceTowards(mouseWorldX, mouseWorldY);
    this.facing = Utils.angleLerp(this.facing, this.targetFacing, Math.min(1, dt * 22));

    if (mag > 0) this.walkPhase += dt * 15 * (this.isBlocking ? 0.6 : 1);
    this.breathePhase += dt * 2.5;

    if (this.attackTimer > 0) {
      const p = 1 - this.attackTimer / this.attackDuration;
      if (p > 0.15 && p < 0.9) {
        const tt = (p - 0.15) / 0.75;
        this.trailAlpha = Math.sin(tt * Math.PI);
      } else {
        this.trailAlpha = 0;
      }
    } else {
      this.trailAlpha *= Math.pow(0.001, dt);
    }

    for (let i = this.phantoms.length - 1; i >= 0; i--) {
      this.phantoms[i].life -= dt;
      if (this.phantoms[i].life <= 0) this.phantoms.splice(i, 1);
    }

    this.updateAir(dt);
  }

  jump() {
    if (this.isAirborne) return;
    if (this.jumpCooldown > 0) return;
    this.vz = 540;
    this.isAirborne = true;
    this.jumpCooldown = 0.35;
    if (this.audio) this.audio.jump();
  }

  updateAir(dt) {
    if (!this.isAirborne) return;
    this.vz -= 1500 * dt;
    this.z += this.vz * dt;
    if (this.z <= 0) {
      this.z = 0;
      this.vz = 0;
      this.isAirborne = false;
      this.landCrouch = 0.4;
      if (this.airSlamPending) {
        this.airSlamPending = false;
        this.pendingSlam = true;
        this.postSlamLock = 0.35;
        this.slamFx.push({ t: 0, life: 0.55, maxR: 110 });
      }
    }
  }

  consumeAttackHit() {
    if (this.isAirborne) return false;
    if (this.airSlamPending) return false;
    if (this.attackTimer > 0 && !this.attackHitApplied) {
      const p = 1 - this.attackTimer / this.attackDuration;
      if (p > 0.3 && p < 0.7) {
        this.attackHitApplied = true;
        return true;
      }
    }
    return false;
  }

  getWeaponPose() {
    let handX = 16;
    let handY = 2;
    let swordAngle = -Math.PI * 0.32;

    if (this.airSlamPending) {
      handX = 14;
      handY = 0;
      swordAngle = Math.PI * 0.5;
    } else if (this.isAirborne) {
      handX = 18;
      handY = -4;
      swordAngle = -Math.PI * 0.15;
    } else if (this.isBlocking) {
      handX = 10;
      handY = -8;
      swordAngle = -Math.PI * 0.5;
    } else if (this.attackTimer > 0) {
      const p = 1 - this.attackTimer / this.attackDuration;
      const wEnd = 0.35, sEnd = 0.7;

      let angleOff;
      if (p < wEnd) {
        const t = p / wEnd;
        const e = t * t;
        angleOff = Utils.lerp(0, -0.7, e);
      } else if (p < sEnd) {
        const t = (p - wEnd) / (sEnd - wEnd);
        const e = 1 - Math.pow(1 - t, 3);
        angleOff = Utils.lerp(-0.7, 1.6, e);
      } else {
        const t = (p - sEnd) / (1 - sEnd);
        const e = t * t * (3 - 2 * t);
        angleOff = Utils.lerp(1.6, 0, e);
      }

      handX = 16 + Math.cos(-Math.PI * 0.32 + angleOff * 0.5) * 6;
      handY = 2 + Math.sin(-Math.PI * 0.32 + angleOff * 0.5) * 6;

      swordAngle = -Math.PI * 0.32 + angleOff;
    }

    return { handX, handY, swordAngle };
  }

  render(ctx, camX, camY) {
    if (!this.alive) return;
    const px = this.x - camX;
    const py = this.y - camY;

    for (const fx of this.slamFx) {
      const prog = fx.t / fx.life;
      const r = fx.maxR * (1 - Math.pow(1 - prog, 2));
      const alpha = 1 - prog;

      ctx.save();
      ctx.globalCompositeOperation = 'lighter';

      ctx.strokeStyle = 'rgba(255, 230, 140, ' + (alpha * 0.9) + ')';
      ctx.lineWidth = 4 * alpha + 1;
      ctx.beginPath();
      ctx.ellipse(px, py + 20, r, r * 0.45, 0, 0, Math.PI * 2);
      ctx.stroke();

      ctx.strokeStyle = 'rgba(255, 180, 80, ' + (alpha * 0.55) + ')';
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.ellipse(px, py + 20, r * 0.7, r * 0.32, 0, 0, Math.PI * 2);
      ctx.stroke();

      const slashH = 210 * (1 - prog);
      const slashW = 7 * alpha;
      const grad = ctx.createLinearGradient(px, py - slashH + 20, px, py + 20);
      grad.addColorStop(0, 'rgba(255, 255, 255, 0)');
      grad.addColorStop(0.35, 'rgba(255, 255, 255, ' + alpha + ')');
      grad.addColorStop(1, 'rgba(255, 240, 200, ' + (alpha * 0.6) + ')');
      ctx.fillStyle = grad;
      ctx.fillRect(px - slashW / 2, py - slashH + 20, slashW, slashH);

      const sparks = 10;
      for (let s = 0; s < sparks; s++) {
        const a = (s / sparks) * Math.PI * 2 + prog * 1.5;
        const dist = r * 0.88;
        const sx = px + Math.cos(a) * dist;
        const sy = py + 20 + Math.sin(a) * dist * 0.45;
        const len = 14 * alpha;
        ctx.strokeStyle = 'rgba(255, 220, 120, ' + alpha + ')';
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.moveTo(sx, sy);
        ctx.lineTo(sx + Math.cos(a) * len, sy + Math.sin(a) * len * 0.45);
        ctx.stroke();
      }

      ctx.restore();
    }

    if (this.levelUpFlash > 0) {
      ctx.save();
      ctx.globalCompositeOperation = 'lighter';
      const al = this.levelUpFlash / 0.6;
      ctx.globalAlpha = al * 0.4;
      ctx.fillStyle = '#b070ff';
      ctx.beginPath();
      ctx.arc(px, py - this.z, 70, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();
    }

    if (this.isBlocking) {
      ctx.save();
      ctx.globalCompositeOperation = 'lighter';
      const pulse = Math.sin(this.blockTimer * 10) * 0.2 + 0.8;
      const grad = ctx.createRadialGradient(px, py, 0, px, py, 40);
      grad.addColorStop(0, 'rgba(74, 158, 255, 0)');
      grad.addColorStop(0.6, 'rgba(74, 158, 255, ' + (0.15 * pulse) + ')');
      grad.addColorStop(1, 'rgba(74, 158, 255, 0)');
      ctx.fillStyle = grad;
      ctx.beginPath();
      ctx.arc(px, py, 40, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();
    }

    if (this.isCharging) {
      ctx.save();
      ctx.globalCompositeOperation = 'lighter';
      const a = Math.min(1, this.chargeTime / this.chargeHardCap);
      const r = 30 + a * 25;
      const col = '74, 158, 255';
      ctx.globalAlpha = 0.3 * a;
      ctx.fillStyle = 'rgb(' + col + ')';
      ctx.beginPath();
      ctx.arc(px, py, r, 0, Math.PI * 2);
      ctx.fill();

      ctx.globalAlpha = 1;
      ctx.strokeStyle = '#4a9eff';
      ctx.lineWidth = 3;
      ctx.beginPath();
      ctx.arc(px, py, 26, -Math.PI / 2, -Math.PI / 2 + a * Math.PI * 2);
      ctx.stroke();
      ctx.restore();
    }

    if (this.shieldHp > 0) {
      ctx.save();
      ctx.globalCompositeOperation = 'lighter';
      const a = this.shieldHp / this.shieldMax;
      ctx.globalAlpha = a * 0.3;
      ctx.strokeStyle = '#64b4ff';
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.arc(px, py, this.radius * 2.2, 0, Math.PI * 2);
      ctx.stroke();
      ctx.restore();
    }

    if (this.buffTimer > 0) {
      ctx.save();
      ctx.globalCompositeOperation = 'lighter';
      const color = this.buffType === 'damage' ? '#ff6464' : '#64ffc8';
      const a = Math.min(1, this.buffTimer / 2);
      ctx.globalAlpha = a * 0.2;
      ctx.fillStyle = color;
      ctx.beginPath();
      ctx.arc(px, py, this.radius * 2.5, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();
    }

    const shakeX = this.hitShake > 0 ? (Math.random() - 0.5) * this.hitShake * 10 : 0;
    const shakeY = this.hitShake > 0 ? (Math.random() - 0.5) * this.hitShake * 10 : 0;

    const blink = this.invulnTimer > 0 && this.dashTimer <= 0
      && Math.floor(this.invulnTimer * 20) % 2 === 0;
    if (blink) return;

    for (let i = 0; i < this.phantoms.length; i++) {
      const ph = this.phantoms[i];
      const a = ph.life / ph.maxLife;
      ctx.save();
      ctx.globalAlpha = a * 0.5;
      ctx.globalCompositeOperation = 'lighter';
      ctx.fillStyle = 'rgba(74, 158, 255, 0.6)';
      ctx.beginPath();
      ctx.arc(ph.x - camX, ph.y - camY, 18, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();
    }

    if (this.trailAlpha > 0.01 && !this.isAirborne && !this.airSlamPending) {
      const sweep = this.attackArc * this.trailAlpha;
      const startAngle = this.facing - sweep / 2;
      const endAngle = this.facing + sweep / 2;

      const range = this._cachedRange * (this.chargedAttack ? 1.4 : 1);
      const col = this.chargedAttack ? '255, 200, 80' : '74, 158, 255';

      ctx.save();
      ctx.globalCompositeOperation = 'lighter';
      ctx.globalAlpha = this.trailAlpha * 0.35;
      ctx.fillStyle = 'rgb(' + col + ')';
      ctx.beginPath();
      ctx.moveTo(px, py);
      ctx.arc(px, py, range, startAngle, endAngle);
      ctx.closePath();
      ctx.fill();

      ctx.globalAlpha = this.trailAlpha * 0.7;
      ctx.fillStyle = 'rgba(255, 240, 220, 1)';
      ctx.beginPath();
      ctx.arc(px, py, range - 4, startAngle, endAngle);
      ctx.arc(px, py, range - 18, endAngle, startAngle, true);
      ctx.closePath();
      ctx.fill();
      ctx.restore();
    }

    const shadowScale = Math.max(0.4, 1 - this.z * 0.0018);
    const shadowAlpha = Math.max(0.12, 0.5 - this.z * 0.0012);
    ctx.fillStyle = 'rgba(0, 0, 0, ' + shadowAlpha + ')';
    ctx.beginPath();
    ctx.ellipse(px + 4, py + 24, 22 * shadowScale, 8 * shadowScale, 0, 0, Math.PI * 2);
    ctx.fill();

    let flipSprite = false;
    const cosF = Math.cos(this.facing);
    if (cosF < -0.05) flipSprite = true;

    ctx.save();
    ctx.translate(px + shakeX, py + shakeY - this.z);
    if (flipSprite) ctx.scale(-1, 1);
    this._renderCharacter(ctx, this.landCrouch * 8);
    ctx.restore();

    if (this.damageFlash > 0) {
      ctx.save();
      ctx.globalAlpha = this.damageFlash / 0.4 * 0.5;
      ctx.fillStyle = '#ff3355';
      ctx.beginPath();
      ctx.arc(px, py - this.z, 45, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();
    }
  }

  _renderCharacter(ctx, crouch) {
    const walkSin = Math.sin(this.walkPhase);
    const walkAmt = Math.abs(walkSin) > 0.05 ? 1 : 0;
    const bob = Math.sin(this.walkPhase * 2) * 3 * walkAmt * (this.isAirborne ? 0 : 1);

    const airT = this.isAirborne ? Math.min(1, this.z / 90) : 0;
    const airTuck = airT * 14;

    const kneeBend = (1 - walkAmt) * (Math.sin(this.breathePhase * 0.8) * 0.5 + 0.5) * 2 + crouch + airTuck * 0.4;
    const weightShift = (1 - walkAmt) * Math.sin(this.breathePhase * 0.6) * 2;

    const pose = this.getWeaponPose();

    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';

    const hipX = weightShift;
    const hipY = 8 + bob * 0.5 + kneeBend;

    const legStride = walkSin * 8 * walkAmt * (this.isAirborne ? 0.3 : 1);
    const legLift = Math.max(0, Math.cos(this.walkPhase)) * 5 * walkAmt;
    const legLiftR = Math.max(0, -Math.cos(this.walkPhase)) * 5 * walkAmt;

    ctx.strokeStyle = '#0e1524';
    ctx.lineWidth = 10;
    ctx.beginPath();
    ctx.moveTo(hipX - 4, hipY);
    ctx.lineTo(hipX - 6 + legStride * 0.5, hipY + 12 - legLift * 0.5 - airTuck * 0.5);
    ctx.stroke();
    ctx.beginPath();
    ctx.moveTo(hipX + 4, hipY);
    ctx.lineTo(hipX + 6 - legStride * 0.5, hipY + 12 - legLiftR * 0.5 - airTuck * 0.5);
    ctx.stroke();

    ctx.strokeStyle = '#0a0e18';
    ctx.lineWidth = 8;
    ctx.beginPath();
    ctx.moveTo(hipX - 6 + legStride * 0.5, hipY + 12 - legLift * 0.5 - airTuck * 0.5);
    ctx.lineTo(hipX - 6 + legStride - airTuck * 0.4, hipY + 24 - legLift - airTuck * 1.8);
    ctx.stroke();
    ctx.beginPath();
    ctx.moveTo(hipX + 6 - legStride * 0.5, hipY + 12 - legLiftR * 0.5 - airTuck * 0.5);
    ctx.lineTo(hipX + 6 - legStride + airTuck * 0.4, hipY + 24 - legLiftR - airTuck * 1.8);
    ctx.stroke();

    ctx.fillStyle = '#0a0e18';
    ctx.beginPath();
    ctx.ellipse(hipX - 6 + legStride - airTuck * 0.4, hipY + 25 - legLift - airTuck * 1.8, 6, 3, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.beginPath();
    ctx.ellipse(hipX + 6 - legStride + airTuck * 0.4, hipY + 25 - legLiftR - airTuck * 1.8, 6, 3, 0, 0, Math.PI * 2);
    ctx.fill();

    const torsoBottomY = hipY - 2;
    const torsoTopY = hipY - 26;

    ctx.fillStyle = '#1a2438';
    ctx.beginPath();
    ctx.moveTo(hipX - 10, torsoBottomY);
    ctx.lineTo(hipX + 10, torsoBottomY);
    ctx.lineTo(hipX + 12, torsoTopY + 6);
    ctx.lineTo(hipX + 10, torsoTopY);
    ctx.lineTo(hipX - 10, torsoTopY);
    ctx.lineTo(hipX - 12, torsoTopY + 6);
    ctx.closePath();
    ctx.fill();

    ctx.fillStyle = '#11192a';
    ctx.beginPath();
    ctx.moveTo(hipX - 8, torsoBottomY - 3);
    ctx.lineTo(hipX + 8, torsoBottomY - 3);
    ctx.lineTo(hipX + 9, torsoTopY + 8);
    ctx.lineTo(hipX - 9, torsoTopY + 8);
    ctx.closePath();
    ctx.fill();

    ctx.strokeStyle = '#4a9eff';
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.moveTo(hipX - 10, hipY - 2);
    ctx.lineTo(hipX + 10, hipY - 2);
    ctx.stroke();

    ctx.fillStyle = '#4a9eff';
    ctx.beginPath();
    ctx.ellipse(hipX, hipY - 2, 4, 4, 0, 0, Math.PI * 2);
    ctx.fill();

    const headX = hipX + 2 + weightShift * 0.3;
    const headY = torsoTopY - 8;

    ctx.fillStyle = '#06090f';
    ctx.beginPath();
    ctx.arc(headX, headY, 11, 0, Math.PI * 2);
    ctx.fill();

    ctx.fillStyle = '#0e1524';
    ctx.beginPath();
    ctx.arc(headX + 1, headY, 10, 0, Math.PI * 2);
    ctx.fill();

    ctx.fillStyle = '#1e2c44';
    ctx.beginPath();
    ctx.arc(headX + 3, headY - 1, 6.5, 0, Math.PI * 2);
    ctx.fill();

    ctx.fillStyle = '#4a9eff';
    ctx.fillRect(headX - 5, headY - 1, 13, 2.5);

    ctx.strokeStyle = '#0a0e18';
    ctx.lineWidth = 3.5;
    ctx.beginPath();
    ctx.moveTo(headX - 7, headY + 2);
    ctx.lineTo(headX - 18, headY + 5);
    ctx.stroke();

    const shoulderLX = hipX - 10;
    const shoulderLY = torsoTopY + 5;
    const shoulderRX = hipX + 10;
    const shoulderRY = torsoTopY + 5;

    const handX = pose.handX + weightShift;
    const handY = hipY + pose.handY;

    const elbowX = (shoulderLX + handX) / 2 - 6;
    const elbowY = (shoulderLY + handY) / 2 + 8;

    ctx.strokeStyle = '#11192a';
    ctx.lineWidth = 7;
    ctx.beginPath();
    ctx.moveTo(shoulderLX, shoulderLY);
    ctx.quadraticCurveTo(elbowX, elbowY, handX - 2, handY);
    ctx.stroke();

    ctx.strokeStyle = '#0a0e18';
    ctx.lineWidth = 6;
    ctx.beginPath();
    ctx.moveTo(shoulderRX, shoulderRY);
    ctx.quadraticCurveTo(shoulderRX + 8, shoulderRY + 10, handX + 4, handY);
    ctx.stroke();

    ctx.fillStyle = '#0a0e18';
    ctx.beginPath();
    ctx.arc(handX, handY, 4.5, 0, Math.PI * 2);
    ctx.fill();

    const swordLen = 40;
    const swordAngle = pose.swordAngle;
    const swordEndX = handX + Math.cos(swordAngle) * swordLen;
    const swordEndY = handY + Math.sin(swordAngle) * swordLen;

    ctx.strokeStyle = '#3a2412';
    ctx.lineWidth = 5;
    const hiltEndX = handX - Math.cos(swordAngle) * 6;
    const hiltEndY = handY - Math.sin(swordAngle) * 6;
    ctx.beginPath();
    ctx.moveTo(hiltEndX, hiltEndY);
    ctx.lineTo(handX, handY);
    ctx.stroke();

    ctx.strokeStyle = '#1a1a1a';
    ctx.lineWidth = 4.5;
    const guardDist = 6;
    const guardX = handX + Math.cos(swordAngle) * guardDist;
    const guardY = handY + Math.sin(swordAngle) * guardDist;
    const guardPerpX = Math.cos(swordAngle + Math.PI / 2) * 7;
    const guardPerpY = Math.sin(swordAngle + Math.PI / 2) * 7;
    ctx.beginPath();
    ctx.moveTo(guardX - guardPerpX, guardY - guardPerpY);
    ctx.lineTo(guardX + guardPerpX, guardY + guardPerpY);
    ctx.stroke();

    ctx.strokeStyle = '#c8d6e5';
    ctx.lineWidth = 3.5;
    ctx.beginPath();
    ctx.moveTo(guardX, guardY);
    ctx.lineTo(swordEndX, swordEndY);
    ctx.stroke();

    ctx.strokeStyle = '#ffffff';
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.moveTo(guardX + Math.cos(swordAngle + 1.2) * 2, guardY + Math.sin(swordAngle + 1.2) * 2);
    ctx.lineTo(swordEndX - Math.cos(swordAngle) * 4, swordEndY - Math.sin(swordAngle) * 4);
    ctx.stroke();

    ctx.fillStyle = '#e8eef5';
    ctx.beginPath();
    ctx.arc(swordEndX, swordEndY, 2.5, 0, Math.PI * 2);
    ctx.fill();
  }
}