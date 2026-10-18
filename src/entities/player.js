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
    this.spinCounter = 0;

    this.chargeTime = 0;
    this.chargeMax = 0.6;
    this.chargeHardCap = 1.6;
    this.chargeReady = false;
    this.isCharging = false;
    this.chargedAttack = false;
    this._prevSpaceDown = false;

    this._isSpinAttackActive = false;
    this._spinVisualAngle = 0;
    this._swingSoundPlayed = false;

    this.isBlocking = false;
    this.blockCooldown = 0;
    this.blockTimer = 0;

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

    if (this.isBlocking && isMelee && this.blockCooldown <= 0) {
      const blockCap = 10 + this.stats.level * 2;
      if (amount <= blockCap) {
        return;
      } else {
        amount -= blockCap;
        this.blockCooldown = 1.5;
        this.isBlocking = false;
      }
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

  startAttack(charged) {
    if (!this.alive || this.attackTimer > 0) return;
    if (this.attackCooldown > 0) { this.attackQueued = true; return; }
    
    this.attackTimer = this.attackDuration;
    this.attackCooldown = charged ? 0.35 : 0.35;
    this.attackHitApplied = false;
    this.attackQueued = false;
    this.chargedAttack = !!charged;
    this._swingSoundPlayed = false;
    this.spinCounter++;
  }

  startSpinAttack() {
    if (!this.alive) return false;
    if (!this.abilities.has('spin')) return false;
    if (this.attackTimer > 0) return false;
    if (this.attackCooldown > 0) return false;
    
    this.attackTimer = 0.55;
    this.attackDuration = 0.55;
    this.attackCooldown = 0.4;
    this.attackArc = Math.PI * 2;
    this.attackHitApplied = false;
    this.chargedAttack = false;
    this._swingSoundPlayed = false;
    this._isSpinAttackActive = true;
    this._spinVisualAngle = 0;
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
    this.blockCooldown = Math.max(0, this.blockCooldown - dt);

    if (this.attackTimer > 0) {
      const p = 1 - this.attackTimer / this.attackDuration;
      if (p >= 0.15 && !this._swingSoundPlayed) {
        this.audio.swordSwing();
        this._swingSoundPlayed = true;
      }
    }

    if (this.attackTimer <= 0 && this._isSpinAttackActive) {
      this._isSpinAttackActive = false;
      this.attackArc = Math.PI * 1.35;
      this.attackDuration = 0.35;
    }

    if (this._isSpinAttackActive && this.attackTimer > 0) {
      const p = 1 - this.attackTimer / this.attackDuration;
      const spinPhase = Math.min(1, p / 0.85);
      this._spinVisualAngle = spinPhase * Math.PI * 2;
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
    const spaceDown = input.isDown('Space');
    const spaceJustPressed = spaceDown && !this._prevSpaceDown;
    const spaceJustReleased = !spaceDown && this._prevSpaceDown;

    if (input.isDown('KeyT') && this.abilities.has('spin')) {
      this.startSpinAttack();
    }

    this.isBlocking = input.mouseRightDown && this.blockCooldown <= 0 && this.attackTimer <= 0;
    if (this.isBlocking) {
      this.blockTimer += dt;
    } else {
      this.blockTimer = 0;
    }

    if (canCharge) {
      if (spaceJustPressed && this.attackTimer <= 0 && !this.isBlocking) {
        this.isCharging = true;
        this.chargeTime = 0;
      }

      if (this.isCharging && spaceDown) {
        this.chargeTime += dt;
        if (this.chargeTime >= this.chargeHardCap) {
          this.isCharging = false;
          this.attackTimer = this.attackDuration;
          this.attackCooldown = 0.35;
          this.attackHitApplied = false;
          this.chargedAttack = true;
          this._swingSoundPlayed = false;
          this.spinCounter++;
          this.chargeTime = 0;
        }
      }

      if (this.isCharging && spaceJustReleased) {
        this.isCharging = false;
        this.attackTimer = this.attackDuration;
        this.attackCooldown = 0.35;
        this.attackHitApplied = false;
        this.chargedAttack = true;
        this._swingSoundPlayed = false;
        this.spinCounter++;
      }
    }

    this._prevSpaceDown = spaceDown;

    if (input.mouseDown && !this.isBlocking) {
      this.startAttack(false);
    } else if (this.attackQueued && this.attackCooldown <= 0 && this.attackTimer <= 0) {
      this.attackQueued = false;
      this.startAttack(false);
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
        && mag > 0
        && !this.isBlocking) {
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
    if (mag > 0 && !this._isSpinAttackActive && !this.isBlocking) {
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

    if (!this._isSpinAttackActive) {
      this.faceTowards(mouseWorldX, mouseWorldY);
      this.facing = Utils.angleLerp(this.facing, this.targetFacing, Math.min(1, dt * 22));
    } else {
      this.facing = this.targetFacing + this._spinVisualAngle;
    }

    if (mag > 0) this.walkPhase += dt * 15;
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
  }

  consumeAttackHit() {
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
    let lElbowX = 10;
    let lElbowY = 2;
    let rElbowX = 10;
    let rElbowY = 4;

    if (this.isBlocking) {
      handX = 10;
      handY = -8;
      swordAngle = -Math.PI * 0.5;
    } else if (this.attackTimer > 0) {
      const p = 1 - this.attackTimer / this.attackDuration;

      if (this._isSpinAttackActive) {
        if (p < 0.85) {
          handX = 20;
          handY = 2;
          swordAngle = -Math.PI * 0.32;
        } else {
          const t = (p - 0.85) / 0.15;
          const ease = 1 - Math.pow(1 - t, 3);
          handX = Utils.lerp(20, 10, ease);
          handY = Utils.lerp(2, -10, ease);
          swordAngle = Utils.lerp(-Math.PI * 0.32, -Math.PI * 0.5, ease);
        }
      } else {
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
      ctx.globalAlpha = al * 0.4;
      ctx.fillStyle = '#b070ff';
      ctx.beginPath();
      ctx.arc(px, py, 70, 0, Math.PI * 2);
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
      const col = this.chargeReady ? '255, 220, 80' : '74, 158, 255';
      ctx.globalAlpha = 0.3 * a;
      ctx.fillStyle = 'rgb(' + col + ')';
      ctx.beginPath();
      ctx.arc(px, py, r, 0, Math.PI * 2);
      ctx.fill();

      ctx.globalAlpha = 1;
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

    if (this.trailAlpha > 0.01) {
      let startAngle, endAngle;

      if (this._isSpinAttackActive) {
        const p = 1 - this.attackTimer / this.attackDuration;
        if (p < 0.85) {
          startAngle = this.targetFacing - 0.5;
          endAngle = this.facing + 0.5;
        } else {
          startAngle = endAngle = this.facing;
        }
      } else {
        const sweep = this.attackArc * this.trailAlpha;
        startAngle = this.facing - sweep / 2;
        endAngle = this.facing + sweep / 2;
      }

      if (endAngle > startAngle) {
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
    }

    ctx.fillStyle = 'rgba(0, 0, 0, 0.5)';
    ctx.beginPath();
    ctx.ellipse(px + 4, py + 24, 22, 8, 0, 0, Math.PI * 2);
    ctx.fill();

    let flipSprite = false;
    const cosF = Math.cos(this.facing);
    if (cosF < -0.05) flipSprite = true;

    ctx.save();
    ctx.translate(px + shakeX, py + shakeY);
    if (flipSprite) ctx.scale(-1, 1);
    
    if (this._isSpinAttackActive) {
      const p = 1 - this.attackTimer / this.attackDuration;
      const crouch = Math.sin(Math.min(1, p / 0.85) * Math.PI) * 6;
      this._renderCharacter(ctx, crouch);
    } else {
      this._renderCharacter(ctx, 0);
    }

    ctx.restore();

    if (this.damageFlash > 0) {
      ctx.save();
      ctx.globalAlpha = this.damageFlash / 0.4 * 0.5;
      ctx.fillStyle = '#ff3355';
      ctx.beginPath();
      ctx.arc(px, py, 45, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();
    }
  }

  _renderCharacter(ctx, crouch) {
    const walkSin = Math.sin(this.walkPhase);
    const walkAmt = Math.abs(walkSin) > 0.05 ? 1 : 0;
    const bob = Math.sin(this.walkPhase * 2) * 3 * walkAmt;
    const breathe = Math.sin(this.breathePhase) * 1;
    
    const kneeBend = (1 - walkAmt) * (Math.sin(this.breathePhase * 0.8) * 0.5 + 0.5) * 2 + crouch;
    const weightShift = (1 - walkAmt) * Math.sin(this.breathePhase * 0.6) * 2;

    const pose = this.getWeaponPose();

    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';

    const hipX = weightShift;
    const hipY = 8 + bob * 0.5 + kneeBend;

    const legStride = walkSin * 8 * walkAmt;
    const legLift = Math.max(0, Math.cos(this.walkPhase)) * 5 * walkAmt;
    const legLiftR = Math.max(0, -Math.cos(this.walkPhase)) * 5 * walkAmt;

    ctx.strokeStyle = '#0e1524';
    ctx.lineWidth = 10;
    ctx.beginPath();
    ctx.moveTo(hipX - 4, hipY);
    ctx.lineTo(hipX - 6 + legStride * 0.5, hipY + 12 - legLift * 0.5);
    ctx.stroke();
    ctx.beginPath();
    ctx.moveTo(hipX + 4, hipY);
    ctx.lineTo(hipX + 6 - legStride * 0.5, hipY + 12 - legLiftR * 0.5);
    ctx.stroke();

    ctx.strokeStyle = '#0a0e18';
    ctx.lineWidth = 8;
    ctx.beginPath();
    ctx.moveTo(hipX - 6 + legStride * 0.5, hipY + 12 - legLift * 0.5);
    ctx.lineTo(hipX - 6 + legStride, hipY + 24 - legLift);
    ctx.stroke();
    ctx.beginPath();
    ctx.moveTo(hipX + 6 - legStride * 0.5, hipY + 12 - legLiftR * 0.5);
    ctx.lineTo(hipX + 6 - legStride, hipY + 24 - legLiftR);
    ctx.stroke();

    ctx.fillStyle = '#0a0e18';
    ctx.beginPath();
    ctx.ellipse(hipX - 6 + legStride, hipY + 25 - legLift, 6, 3, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.beginPath();
    ctx.ellipse(hipX + 6 - legStride, hipY + 25 - legLiftR, 6, 3, 0, 0, Math.PI * 2);
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