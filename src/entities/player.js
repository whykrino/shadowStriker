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
    this.attackDuration = 0.3;
    this.attackArc = Math.PI * 1.35;
    this.attackHitApplied = false;
    this.attackQueued = false;
    this.spinCounter = 0;

    this.chargeTime = 0;
    this.chargeMax = 0.6;
    this.chargeHardCap = 1.6;
    this.chargeReady = false;
    this.isCharging = false;
    this.chargedAttack = false;
    this._prevMouseDown = false;

    this._isSpinAttackActive = false;

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

    this.recompute();

    this.phantoms = [];
  }

  recompute() {
    const s = this.stats;
    const t = this.talents.effects;

    this._cachedMaxHp = Math.round(s.maxHp + t.maxHp);
    this._cachedDamage = Math.round(s.damage * (1 + t.damageMult));
    this._cachedSpeed = s.speed * (1 + t.speedMult);
    this._cachedDash = s.dashSpeed * (1 + t.speedMult);
    this._cachedRange = s.attackRange * (1 + t.rangeMult);

    this.maxDashCharges = 3 + Math.floor(t.dashCharges);
    if (this.dashCharges > this.maxDashCharges) this.dashCharges = this.maxDashCharges;

    if (this.shieldMax !== t.arcaneShield) {
      this.shieldMax = t.arcaneShield;
      this.shieldHp = t.arcaneShield;
    }
  }

  refreshStats() {
    const oldMax = this._cachedMaxHp;
    this.recompute();
    if (this._cachedMaxHp > oldMax) this.hp += this._cachedMaxHp - oldMax;
    this.hp = Math.min(this.hp, this._cachedMaxHp);
  }

  takeDamage(amount) {
    if (this.invulnTimer > 0 || !this.alive) return;
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

  startAttack(charged) {
    if (!this.alive || this.attackTimer > 0) return;
    if (this.attackCooldown > 0) { this.attackQueued = true; return; }
    this.attackTimer = this.attackDuration;
    this.attackCooldown = charged ? 0.7 : 0.4;
    this.attackHitApplied = false;
    this.attackQueued = false;
    this.chargedAttack = !!charged;
    this.spinCounter++;
  }

  startSpinAttack() {
    if (!this.alive) return false;
    if (!this.abilities.has('spin')) return false;
    if (this.attackTimer > 0) return false;
    if (this.attackCooldown > 0) return false;
    this.attackTimer = 0.45;
    this.attackDuration = 0.45;
    this.attackCooldown = 0.9;
    this.attackArc = Math.PI * 2;
    this.attackHitApplied = false;
    this.chargedAttack = false;
    this._isSpinAttackActive = true;
    return true;
  }

  isSpinAttack() {
    if (this._isSpinAttackActive) return true;
    const t = this.talents.effects;
    return t.spinEvery > 0 && this.spinCounter % t.spinEvery === 0;
  }

  faceTowards(x, y) {
    const dx = x - this.x;
    const dy = y - this.y;
    if (Math.abs(dx) < 0.001 && Math.abs(dy) < 0.001) return;
    this.targetFacing = Math.atan2(dy, dx);
  }

  update(dt, input, world, mouseWorldX, mouseWorldY) {
    if (!this.alive) return;

    this.attackTimer = Math.max(0, this.attackTimer - dt);
    this.attackCooldown = Math.max(0, this.attackCooldown - dt);
    this.invulnTimer = Math.max(0, this.invulnTimer - dt);
    this.dashTimer = Math.max(0, this.dashTimer - dt);
    this.hitShake = Math.max(0, this.hitShake - dt);
    this.levelUpFlash = Math.max(0, this.levelUpFlash - dt);
    this.damageFlash = Math.max(0, this.damageFlash - dt);

    if (this.attackTimer <= 0 && this._isSpinAttackActive) {
      this._isSpinAttackActive = false;
      this.attackArc = Math.PI * 1.35;
      this.attackDuration = 0.3;
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

    const canCharge = this.stats.level >= 3 || this.abilities.has('charge');
    const mouseDown = input.mouseDown;
    const mouseJustPressed = mouseDown && !this._prevMouseDown;
    const mouseJustReleased = !mouseDown && this._prevMouseDown;

    if (canCharge) {
      if (mouseJustPressed) {
        this.isCharging = true;
        this.chargeTime = 0;
        this.chargeReady = false;
      }

      if (this.isCharging && mouseDown) {
        this.chargeTime += dt;

        if (this.chargeTime >= this.chargeMax) {
          this.chargeReady = true;
        }

        if (this.chargeTime >= this.chargeHardCap) {
          this.isCharging = false;
          const charged = this.chargeReady;
          this.chargeTime = 0;
          this.chargeReady = false;
          this.startAttack(charged);
        }
      }

      if (this.isCharging && mouseJustReleased) {
        const charged = this.chargeReady;
        this.isCharging = false;
        this.chargeTime = 0;
        this.chargeReady = false;
        this.startAttack(charged);
      }

      if (this.attackQueued && this.attackCooldown <= 0 && this.attackTimer <= 0 && !this.isCharging) {
        this.attackQueued = false;
        this.startAttack(false);
      }
    } else {
      if (input.attacking) {
        this.startAttack(false);
      } else if (this.attackQueued && this.attackCooldown <= 0 && this.attackTimer <= 0) {
        this.attackQueued = false;
        this.startAttack(false);
      }
    }

    this._prevMouseDown = mouseDown;

    if (input.consumeRightClick(dt)) {
      this.startSpinAttack();
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
          life: 0.4, maxLife: 0.4, damage: Math.round(this._cachedDamage * 0.5),
        });
      }
    }

    let vx = 0, vy = 0;
    if (mag > 0) {
      const nx = mv.x / mag;
      const ny = mv.y / mag;
      let spd = this.dashTimer > 0 ? this._cachedDash : this._cachedSpeed;
      if (this.buffType === 'speed' && this.buffTimer > 0) spd *= 1.5;
      vx = nx * spd;
      vy = ny * spd;
    }

    this.x += vx * dt;
    this.y += vy * dt;

    world.collide(this, this.radius);

    this.faceTowards(mouseWorldX, mouseWorldY);
    this.facing = Utils.angleLerp(this.facing, this.targetFacing, Math.min(1, dt * 22));

    if (mag > 0) this.walkPhase += dt * 12;
    this.breathePhase += dt * 2.5;

    if (this.attackTimer > 0) {
      const p = 1 - this.attackTimer / this.attackDuration;
      if (p > 0.2 && p < 0.85) {
        const tt = (p - 0.2) / 0.65;
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
  }

  consumeAttackHit() {
    if (this.attackTimer > 0 && !this.attackHitApplied) {
      const p = 1 - this.attackTimer / this.attackDuration;
      if (p > 0.35 && p < 0.65) {
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
    let lElbowX = 10;
    let lElbowY = 2;
    let rElbowX = 10;
    let rElbowY = 4;

    const attackActive = this.attackTimer > 0;

    if (attackActive) {
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

      lElbowX = (8 + handX) / 2 - 2;
      lElbowY = (2 + handY) / 2 + 3;
      rElbowX = (10 + handX) / 2 + 2;
      rElbowY = (4 + handY) / 2 + 3;
    }

    return {
      handX, handY, swordAngle,
      lElbowX, lElbowY,
      rElbowX, rElbowY,
    };
  }

  render(ctx, camX, camY) {
    if (!this.alive) return;
    const px = this.x - camX;
    const py = this.y - camY;

    if (this.levelUpFlash > 0) {
      ctx.save();
      ctx.globalCompositeOperation = 'lighter';
      const al = this.levelUpFlash / 0.6;
      const grad = ctx.createRadialGradient(px, py, 0, px, py, 140);
      grad.addColorStop(0, 'rgba(176, 112, 255, ' + (al * 0.6) + ')');
      grad.addColorStop(1, 'rgba(176, 112, 255, 0)');
      ctx.fillStyle = grad;
      ctx.fillRect(px - 140, py - 140, 280, 280);
      ctx.restore();
    }

    if (this.isCharging) {
      ctx.save();
      ctx.globalCompositeOperation = 'lighter';
      const a = Math.min(1, this.chargeTime / this.chargeMax);
      const r = 30 + a * 20;
      const grad = ctx.createRadialGradient(px, py, 0, px, py, r);
      const col = this.chargeReady ? '255, 220, 80' : '74, 158, 255';
      grad.addColorStop(0, 'rgba(' + col + ', ' + (0.4 * a) + ')');
      grad.addColorStop(1, 'rgba(' + col + ', 0)');
      ctx.fillStyle = grad;
      ctx.beginPath();
      ctx.arc(px, py, r, 0, Math.PI * 2);
      ctx.fill();

      ctx.strokeStyle = this.chargeReady ? '#ffdd44' : '#4a9eff';
      ctx.lineWidth = 3;
      ctx.beginPath();
      ctx.arc(px, py, 26, -Math.PI / 2, -Math.PI / 2 + a * Math.PI * 2);
      ctx.stroke();
      ctx.restore();
    }

    if (this.shieldHp > 0) {
      ctx.save();
      ctx.globalCompositeOperation = 'lighter';
      const grad = ctx.createRadialGradient(px, py, this.radius * 0.5, px, py, this.radius * 2.5);
      const a = this.shieldHp / this.shieldMax;
      grad.addColorStop(0, 'rgba(100, 180, 255, 0)');
      grad.addColorStop(1, 'rgba(100, 180, 255, ' + (a * 0.4) + ')');
      ctx.fillStyle = grad;
      ctx.beginPath();
      ctx.arc(px, py, this.radius * 2.5, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();
    }

    if (this.buffTimer > 0) {
      ctx.save();
      ctx.globalCompositeOperation = 'lighter';
      const color = this.buffType === 'damage' ? '255, 100, 100' : '100, 255, 200';
      const a = Math.min(1, this.buffTimer / 2);
      const grad = ctx.createRadialGradient(px, py, 0, px, py, this.radius * 3);
      grad.addColorStop(0, 'rgba(' + color + ', ' + (a * 0.25) + ')');
      grad.addColorStop(1, 'rgba(' + color + ', 0)');
      ctx.fillStyle = grad;
      ctx.beginPath();
      ctx.arc(px, py, this.radius * 3, 0, Math.PI * 2);
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

    if (this.trailAlpha > 0.01) {
      const sweep = this.attackArc * this.trailAlpha;
      const startAngle = this.facing - sweep / 2;
      const endAngle = this.facing + sweep / 2;
      const range = this._cachedRange * (this.chargedAttack ? 1.4 : 1);

      const col = this.chargedAttack ? '255, 200, 80' : '74, 158, 255';
      const grad = ctx.createRadialGradient(px, py, range * 0.4, px, py, range);
      grad.addColorStop(0, 'rgba(' + col + ', 0)');
      grad.addColorStop(0.6, 'rgba(' + col + ', ' + (this.trailAlpha * 0.55) + ')');
      grad.addColorStop(1, 'rgba(255, 240, 200, 0)');

      ctx.save();
      ctx.globalCompositeOperation = 'lighter';
      ctx.beginPath();
      ctx.moveTo(px, py);
      ctx.arc(px, py, range, startAngle, endAngle);
      ctx.closePath();
      ctx.fillStyle = grad;
      ctx.fill();

      ctx.beginPath();
      ctx.arc(px, py, range - 4, startAngle, endAngle);
      ctx.arc(px, py, range - 18, endAngle, startAngle, true);
      ctx.closePath();
      ctx.fillStyle = 'rgba(255, 240, 220, ' + (this.trailAlpha * 0.5) + ')';
      ctx.fill();
      ctx.restore();
    }

    ctx.fillStyle = 'rgba(0, 0, 0, 0.65)';
    ctx.beginPath();
    ctx.ellipse(px + 3, py + 20, 18, 6, 0, 0, Math.PI * 2);
    ctx.fill();

    let flipSprite = false;
    const cosF = Math.cos(this.facing);
    if (cosF < -0.05) flipSprite = true;

    ctx.save();
    ctx.translate(px + shakeX, py + shakeY);
    if (flipSprite) ctx.scale(-1, 1);
    this._renderCharacter(ctx);
    ctx.restore();

    if (this.damageFlash > 0) {
      ctx.save();
      ctx.globalAlpha = this.damageFlash / 0.4 * 0.5;
      ctx.fillStyle = '#ff3355';
      ctx.beginPath();
      ctx.arc(px, py, 40, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();
    }
  }

  _renderCharacter(ctx) {
    const walkSin = Math.sin(this.walkPhase);
    const walkAmt = Math.abs(walkSin) > 0.05 ? 1 : 0;
    const bob = Math.sin(this.walkPhase * 2) * 1.5 * walkAmt;
    const breathe = Math.sin(this.breathePhase) * 0.6;

    const pose = this.getWeaponPose();

    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';

    const hipX = 0;
    const hipY = 8 + bob * 0.3;

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
    const torsoTopY = hipY - 18 + breathe * 0.3;

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

    const shoulderLX = hipX - 8;
    const shoulderLY = torsoTopY + 4;
    const shoulderRX = hipX + 8;
    const shoulderRY = torsoTopY + 4;

    const handX = pose.handX;
    const handY = hipY + pose.handY;

    ctx.strokeStyle = '#11192a';
    ctx.lineWidth = 6;
    ctx.beginPath();
    ctx.moveTo(shoulderLX, shoulderLY);
    ctx.quadraticCurveTo(
      pose.lElbowX,
      pose.lElbowY + torsoTopY + 4,
      handX - 2,
      handY
    );
    ctx.stroke();

    ctx.strokeStyle = '#0a0e18';
    ctx.lineWidth = 5;
    ctx.beginPath();
    ctx.moveTo(shoulderRX, shoulderRY);
    ctx.quadraticCurveTo(
      pose.rElbowX,
      pose.rElbowY + torsoTopY + 4,
      handX + 2,
      handY
    );
    ctx.stroke();

    ctx.fillStyle = '#0a0e18';
    ctx.beginPath();
    ctx.arc(handX, handY, 4, 0, Math.PI * 2);
    ctx.fill();

    const swordLen = 34;
    const swordEndX = handX + Math.cos(pose.swordAngle) * swordLen;
    const swordEndY = handY + Math.sin(pose.swordAngle) * swordLen;

    ctx.strokeStyle = '#3a2412';
    ctx.lineWidth = 5;
    const hiltEndX = handX - Math.cos(pose.swordAngle) * 4;
    const hiltEndY = handY - Math.sin(pose.swordAngle) * 4;
    ctx.beginPath();
    ctx.moveTo(hiltEndX, hiltEndY);
    ctx.lineTo(handX, handY);
    ctx.stroke();

    ctx.strokeStyle = '#1a1a1a';
    ctx.lineWidth = 4;
    const guardDist = 5;
    const guardX = handX + Math.cos(pose.swordAngle) * guardDist;
    const guardY = handY + Math.sin(pose.swordAngle) * guardDist;
    const guardPerpX = Math.cos(pose.swordAngle + Math.PI / 2) * 6;
    const guardPerpY = Math.sin(pose.swordAngle + Math.PI / 2) * 6;
    ctx.beginPath();
    ctx.moveTo(guardX - guardPerpX, guardY - guardPerpY);
    ctx.lineTo(guardX + guardPerpX, guardY + guardPerpY);
    ctx.stroke();

    ctx.strokeStyle = '#c8d6e5';
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.moveTo(guardX, guardY);
    ctx.lineTo(swordEndX, swordEndY);
    ctx.stroke();

    ctx.fillStyle = '#e8eef5';
    ctx.beginPath();
    ctx.arc(swordEndX, swordEndY, 2, 0, Math.PI * 2);
    ctx.fill();
  }
}