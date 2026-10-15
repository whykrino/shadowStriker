'use strict';

class AudioSystem {
  constructor() {
    this.ctx = null;
    this.masterGain = null;
    this.musicGain = null;
    this.sfxGain = null;

    this.masterVolume = 0.6;
    this.musicVolume = 0.75;
    this.sfxVolume = 0.7;
    this.muted = false;

    this.musicPlaying = false;
    this._musicTimer = null;
    this._stepTimer = 0;

    this._baseGains = {
      master: 0.6,
      music: 0.45,
      sfx: 0.7,
    };

    this.samples = {};
    this.listenerPos = { x: 0, y: 0 };

    const unlock = () => {
      this.init();
      window.removeEventListener('mousedown', unlock);
      window.removeEventListener('keydown', unlock);
      window.removeEventListener('touchstart', unlock);
    };
    window.addEventListener('mousedown', unlock);
    window.addEventListener('keydown', unlock);
    window.addEventListener('touchstart', unlock);
  }

  async init() {
    if (this.ctx) return;
    try {
      this.ctx = new (window.AudioContext || window.webkitAudioContext)();

      this.masterGain = this.ctx.createGain();
      this.masterGain.gain.value = this._effectiveMaster();
      this.masterGain.connect(this.ctx.destination);

      this.musicGain = this.ctx.createGain();
      this.musicGain.gain.value = this._effectiveMusic();
      this.musicGain.connect(this.masterGain);

      this.sfxGain = this.ctx.createGain();
      this.sfxGain.gain.value = this._effectiveSfx();
      this.sfxGain.connect(this.masterGain);

      if (this.ctx.listener.positionX) {
        this.ctx.listener.positionX.value = 0;
        this.ctx.listener.positionY.value = 0;
        this.ctx.listener.positionZ.value = 0;
      } else {
        this.ctx.listener.setPosition(0, 0, 0);
      }

      await this._buildSamples();
      this.startMusic();
    } catch (e) {
      console.warn('Audio init failed', e);
    }
  }

  async _buildSamples() {
    this.samples.sword = await this._renderSwordSwing();
    this.samples.hitSoft = await this._renderSoftHit();
    this.samples.enemyHurt = await this._renderEnemyHurt();
    this.samples.playerHurt = await this._renderPlayerHurt();
    this.samples.dash = await this._renderDash();
    this.samples.kill = await this._renderKill();
    this.samples.roarLow = await this._renderRoar(70, 0.6);
    this.samples.roarMid = await this._renderRoar(110, 0.55);
    this.samples.roarHigh = await this._renderRoar(160, 0.5);
    this.samples.levelUp = await this._renderLevelUp();
    this.samples.pickup = await this._renderPickup();
    this.samples.notifyInfo = await this._renderNotify(660, 880);
    this.samples.notifyAbility = await this._renderNotify(523, 880);
    this.samples.notifyDanger = await this._renderNotify(260, 200);
  }

  async _render(durationSec, buildFn) {
    const sr = this.ctx.sampleRate;
    const ctx = new OfflineAudioContext(1, Math.floor(sr * durationSec), sr);
    buildFn(ctx);
    return await ctx.startRendering();
  }

  _renderSwordSwing() {
    return this._render(0.28, (ctx) => {
      const noise = ctx.createBufferSource();
      const buf = ctx.createBuffer(1, ctx.sampleRate * 0.28, ctx.sampleRate);
      const d = buf.getChannelData(0);
      for (let i = 0; i < d.length; i++) {
        const t = i / d.length;
        const env = Math.sin(t * Math.PI) * Math.pow(1 - t, 0.6);
        d[i] = (Math.random() * 2 - 1) * env;
      }
      noise.buffer = buf;

      const bp = ctx.createBiquadFilter();
      bp.type = 'bandpass';
      bp.frequency.value = 1800;
      bp.Q.value = 1.4;

      const hp = ctx.createBiquadFilter();
      hp.type = 'highpass';
      hp.frequency.value = 800;

      const gain = ctx.createGain();
      gain.gain.value = 0.55;

      noise.connect(bp);
      bp.connect(hp);
      hp.connect(gain);
      gain.connect(ctx.destination);
      noise.start(0);
      noise.stop(0.28);
    });
  }

  _renderSoftHit() {
    return this._render(0.22, (ctx) => {
      const osc = ctx.createOscillator();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(160, 0);
      osc.frequency.exponentialRampToValueAtTime(70, 0.2);

      const oscGain = ctx.createGain();
      oscGain.gain.setValueAtTime(0.0001, 0);
      oscGain.gain.exponentialRampToValueAtTime(0.7, 0.01);
      oscGain.gain.exponentialRampToValueAtTime(0.0001, 0.22);

      const lp = ctx.createBiquadFilter();
      lp.type = 'lowpass';
      lp.frequency.value = 500;

      osc.connect(lp);
      lp.connect(oscGain);
      oscGain.connect(ctx.destination);
      osc.start(0);
      osc.stop(0.22);

      const noise = ctx.createBufferSource();
      const buf = ctx.createBuffer(1, ctx.sampleRate * 0.08, ctx.sampleRate);
      const d = buf.getChannelData(0);
      for (let i = 0; i < d.length; i++) {
        const t = i / d.length;
        d[i] = (Math.random() * 2 - 1) * Math.pow(1 - t, 4);
      }
      noise.buffer = buf;
      const ng = ctx.createGain();
      ng.gain.value = 0.2;
      const bp = ctx.createBiquadFilter();
      bp.type = 'bandpass';
      bp.frequency.value = 2500;
      noise.connect(bp);
      bp.connect(ng);
      ng.connect(ctx.destination);
      noise.start(0);
    });
  }

  _renderEnemyHurt() {
    return this._render(0.18, (ctx) => {
      const osc = ctx.createOscillator();
      osc.type = 'triangle';
      osc.frequency.setValueAtTime(220, 0);
      osc.frequency.exponentialRampToValueAtTime(120, 0.18);

      const gain = ctx.createGain();
      gain.gain.setValueAtTime(0.0001, 0);
      gain.gain.exponentialRampToValueAtTime(0.35, 0.01);
      gain.gain.exponentialRampToValueAtTime(0.0001, 0.18);

      const lp = ctx.createBiquadFilter();
      lp.type = 'lowpass';
      lp.frequency.value = 700;

      osc.connect(lp);
      lp.connect(gain);
      gain.connect(ctx.destination);
      osc.start(0);
      osc.stop(0.18);
    });
  }

  _renderPlayerHurt() {
    return this._render(0.35, (ctx) => {
      const osc = ctx.createOscillator();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(120, 0);
      osc.frequency.exponentialRampToValueAtTime(55, 0.3);

      const gain = ctx.createGain();
      gain.gain.setValueAtTime(0.0001, 0);
      gain.gain.exponentialRampToValueAtTime(0.6, 0.015);
      gain.gain.exponentialRampToValueAtTime(0.0001, 0.34);

      const lp = ctx.createBiquadFilter();
      lp.type = 'lowpass';
      lp.frequency.value = 400;

      osc.connect(lp);
      lp.connect(gain);
      gain.connect(ctx.destination);
      osc.start(0);
      osc.stop(0.35);
    });
  }

  _renderDash() {
    return this._render(0.24, (ctx) => {
      const noise = ctx.createBufferSource();
      const buf = ctx.createBuffer(1, ctx.sampleRate * 0.24, ctx.sampleRate);
      const d = buf.getChannelData(0);
      for (let i = 0; i < d.length; i++) {
        const t = i / d.length;
        d[i] = (Math.random() * 2 - 1) * Math.pow(1 - t, 1.5);
      }
      noise.buffer = buf;

      const hp = ctx.createBiquadFilter();
      hp.type = 'highpass';
      hp.frequency.value = 2200;

      const gain = ctx.createGain();
      gain.gain.value = 0.35;

      noise.connect(hp);
      hp.connect(gain);
      gain.connect(ctx.destination);
      noise.start(0);
    });
  }

  _renderKill() {
    return this._render(0.5, (ctx) => {
      const osc = ctx.createOscillator();
      osc.type = 'sawtooth';
      osc.frequency.setValueAtTime(140, 0);
      osc.frequency.exponentialRampToValueAtTime(60, 0.45);

      const gain = ctx.createGain();
      gain.gain.setValueAtTime(0.0001, 0);
      gain.gain.exponentialRampToValueAtTime(0.4, 0.02);
      gain.gain.exponentialRampToValueAtTime(0.0001, 0.48);

      const lp = ctx.createBiquadFilter();
      lp.type = 'lowpass';
      lp.frequency.value = 600;

      osc.connect(lp);
      lp.connect(gain);
      gain.connect(ctx.destination);
      osc.start(0);
      osc.stop(0.5);
    });
  }

  _renderRoar(freq, dur) {
    return this._render(dur, (ctx) => {
      const osc1 = ctx.createOscillator();
      osc1.type = 'sawtooth';
      osc1.frequency.value = freq;
      osc1.detune.value = -10;

      const osc2 = ctx.createOscillator();
      osc2.type = 'sawtooth';
      osc2.frequency.value = freq * 1.5;
      osc2.detune.value = 15;

      const sub = ctx.createOscillator();
      sub.type = 'sine';
      sub.frequency.value = freq * 0.5;

      const lp = ctx.createBiquadFilter();
      lp.type = 'lowpass';
      lp.frequency.value = 500;
      lp.Q.value = 4;

      const lfo = ctx.createOscillator();
      lfo.type = 'sine';
      lfo.frequency.value = 8;
      const lfoGain = ctx.createGain();
      lfoGain.gain.value = 15;
      lfo.connect(lfoGain);
      lfoGain.connect(osc1.frequency);

      const gain = ctx.createGain();
      gain.gain.setValueAtTime(0.0001, 0);
      gain.gain.exponentialRampToValueAtTime(0.5, 0.1);
      gain.gain.exponentialRampToValueAtTime(0.3, dur * 0.6);
      gain.gain.exponentialRampToValueAtTime(0.0001, dur);

      osc1.connect(lp);
      osc2.connect(lp);
      sub.connect(lp);
      lp.connect(gain);
      gain.connect(ctx.destination);

      lfo.start(0); lfo.stop(dur);
      osc1.start(0); osc1.stop(dur);
      osc2.start(0); osc2.stop(dur);
      sub.start(0); sub.stop(dur);
    });
  }

  _renderLevelUp() {
    return this._render(0.9, (ctx) => {
      const notes = [523.25, 659.25, 783.99, 1046.5];
      const step = 0.15;
      for (let i = 0; i < notes.length; i++) {
        const t = i * step;
        const osc = ctx.createOscillator();
        osc.type = 'sine';
        osc.frequency.value = notes[i];

        const gain = ctx.createGain();
        gain.gain.setValueAtTime(0.0001, t);
        gain.gain.exponentialRampToValueAtTime(0.28, t + 0.02);
        gain.gain.exponentialRampToValueAtTime(0.0001, t + 0.4);

        osc.connect(gain);
        gain.connect(ctx.destination);
        osc.start(t);
        osc.stop(t + 0.42);
      }
    });
  }

  _renderPickup() {
    return this._render(0.2, (ctx) => {
      const osc = ctx.createOscillator();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(880, 0);
      osc.frequency.exponentialRampToValueAtTime(1320, 0.15);

      const gain = ctx.createGain();
      gain.gain.setValueAtTime(0.0001, 0);
      gain.gain.exponentialRampToValueAtTime(0.25, 0.01);
      gain.gain.exponentialRampToValueAtTime(0.0001, 0.18);

      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start(0);
      osc.stop(0.2);
    });
  }

  _renderNotify(f1, f2) {
    return this._render(0.35, (ctx) => {
      const osc = ctx.createOscillator();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(f1, 0);
      osc.frequency.setValueAtTime(f2, 0.12);

      const gain = ctx.createGain();
      gain.gain.setValueAtTime(0.0001, 0);
      gain.gain.exponentialRampToValueAtTime(0.2, 0.02);
      gain.gain.exponentialRampToValueAtTime(0.15, 0.14);
      gain.gain.exponentialRampToValueAtTime(0.0001, 0.34);

      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start(0);
      osc.stop(0.35);
    });
  }

  _effectiveMaster() { return this.muted ? 0 : this._baseGains.master * this.masterVolume; }
  _effectiveMusic() { return this._baseGains.music * this.musicVolume; }
  _effectiveSfx() { return this._baseGains.sfx * this.sfxVolume; }

  setMaster(v) {
    this.masterVolume = Math.max(0, Math.min(1, v));
    if (this.ctx) this.masterGain.gain.linearRampToValueAtTime(this._effectiveMaster(), this.ctx.currentTime + 0.1);
  }
  setMusic(v) {
    this.musicVolume = Math.max(0, Math.min(1, v));
    if (this.ctx) this.musicGain.gain.linearRampToValueAtTime(this._effectiveMusic(), this.ctx.currentTime + 0.1);
  }
  setSfx(v) {
    this.sfxVolume = Math.max(0, Math.min(1, v));
    if (this.ctx) this.sfxGain.gain.linearRampToValueAtTime(this._effectiveSfx(), this.ctx.currentTime + 0.1);
  }
  setMuted(m) {
    this.muted = m;
    if (this.ctx) this.masterGain.gain.linearRampToValueAtTime(this._effectiveMaster(), this.ctx.currentTime + 0.15);
  }

  _playSample(buffer, volume) {
    if (!this.ctx || !buffer) return;
    const src = this.ctx.createBufferSource();
    src.buffer = buffer;
    const gain = this.ctx.createGain();
    gain.gain.value = volume;
    src.connect(gain);
    gain.connect(this.sfxGain);
    src.start(0);
  }

  _playSampleAt(buffer, volume, worldX, worldY) {
    if (!this.ctx || !buffer) return;
    const dx = worldX - this.listenerPos.x;
    const dy = worldY - this.listenerPos.y;
    const dist = Math.hypot(dx, dy);
    if (dist > 900) return;

    const src = this.ctx.createBufferSource();
    src.buffer = buffer;

    const panner = this.ctx.createPanner();
    panner.panningModel = 'HRTF';
    panner.distanceModel = 'inverse';
    panner.refDistance = 120;
    panner.maxDistance = 900;
    panner.rolloffFactor = 1.2;

    if (panner.positionX) {
      panner.positionX.value = dx;
      panner.positionY.value = 0;
      panner.positionZ.value = -dy;
    } else {
      panner.setPosition(dx, 0, -dy);
    }

    const gain = this.ctx.createGain();
    gain.gain.value = volume * Math.max(0, 1 - dist / 900);

    src.connect(panner);
    panner.connect(gain);
    gain.connect(this.sfxGain);
    src.start(0);
  }

  swordSwing() { this._playSample(this.samples.sword, 0.55); }
  hitEnemy()   { this._playSample(this.samples.hitSoft, 0.6); }
  enemyHurt()  { this._playSample(this.samples.enemyHurt, 0.4); }
  playerHurt() { this._playSample(this.samples.playerHurt, 0.7); }
  dash()       { this._playSample(this.samples.dash, 0.45); }
  killEnemy()  { this._playSample(this.samples.kill, 0.45); }
  levelUp()    { this._playSample(this.samples.levelUp, 0.55); }
  pickup()     { this._playSample(this.samples.pickup, 0.4); }
  notificationInfo()    { this._playSample(this.samples.notifyInfo, 0.35); }
  notificationAbility() { this._playSample(this.samples.notifyAbility, 0.4); }
  notificationDanger()  { this._playSample(this.samples.notifyDanger, 0.5); }
  enemyShoot() { this._playSample(this.samples.hitSoft, 0.3); }

  updateListener(x, y) {
    this.listenerPos.x = x;
    this.listenerPos.y = y;
  }

  enemyRoar(worldX, worldY, type) {
    let buf = this.samples.roarMid;
    if (type === 'boss') buf = this.samples.roarLow;
    else if (type === 'kamikaze' || type === 'assassin') buf = this.samples.roarHigh;
    this._playSampleAt(buf, 0.55, worldX, worldY);
  }

  updatePlayer(dt, moving) {
    if (!this.ctx) return;
    if (!moving) { this._stepTimer = 0; return; }
    this._stepTimer -= dt;
    if (this._stepTimer <= 0) {
      this._stepTimer = 0.4;
      this._playSample(this.samples.pickup, 0.06);
    }
  }

  enemySound(dist) { }

  startMusic() {
    if (!this.ctx || this.musicPlaying) return;
    this.musicPlaying = true;
    this._scheduleMusicCycle();
    this._musicTimer = setInterval(() => this._scheduleMusicCycle(), 15800);
  }

  _scheduleMusicCycle() {
    if (!this.ctx) return;
    const t0 = this.ctx.currentTime;
    const chordDur = 4.0;

    const bassNotes = [
      [55.00, 55.00, 65.41, 55.00],
      [65.41, 65.41, 77.78, 65.41],
      [73.42, 73.42, 87.31, 73.42],
      [49.00, 49.00, 58.27, 49.00],
    ];

    for (let chord = 0; chord < 4; chord++) {
      const notes = bassNotes[chord];
      for (let i = 0; i < notes.length; i++) {
        const t = t0 + chord * chordDur + i * (chordDur / 4);
        const osc = this.ctx.createOscillator();
        const gain = this.ctx.createGain();
        const filter = this.ctx.createBiquadFilter();

        osc.type = 'sine';
        osc.frequency.value = notes[i];
        filter.type = 'lowpass';
        filter.frequency.value = 200;

        gain.gain.setValueAtTime(0.0001, t);
        gain.gain.exponentialRampToValueAtTime(0.5, t + 0.4);
        gain.gain.exponentialRampToValueAtTime(0.35, t + 0.9);
        gain.gain.exponentialRampToValueAtTime(0.0001, t + 1.0);

        osc.connect(filter);
        filter.connect(gain);
        gain.connect(this.musicGain);
        osc.start(t);
        osc.stop(t + 1.1);
      }
    }

    const chords = [
      [220.00, 261.63, 329.63],
      [261.63, 329.63, 392.00],
      [293.66, 369.99, 440.00],
      [196.00, 246.94, 293.66],
    ];

    for (let chord = 0; chord < 4; chord++) {
      const t = t0 + chord * chordDur;
      const freqs = chords[chord];
      for (let f = 0; f < freqs.length; f++) {
        const osc = this.ctx.createOscillator();
        const gain = this.ctx.createGain();
        const filter = this.ctx.createBiquadFilter();

        osc.type = 'triangle';
        osc.frequency.value = freqs[f];
        osc.detune.value = (Math.random() - 0.5) * 6;
        filter.type = 'lowpass';
        filter.frequency.value = 900;

        gain.gain.setValueAtTime(0.0001, t);
        gain.gain.exponentialRampToValueAtTime(0.13, t + 1.5);
        gain.gain.exponentialRampToValueAtTime(0.09, t + 3.0);
        gain.gain.exponentialRampToValueAtTime(0.0001, t + chordDur - 0.1);

        osc.connect(filter);
        filter.connect(gain);
        gain.connect(this.musicGain);
        osc.start(t);
        osc.stop(t + chordDur);
      }
    }

    const pentatonic = [
      [440.00, 523.25, 587.33, 659.25, 783.99],
      [523.25, 587.33, 659.25, 783.99, 880.00],
      [587.33, 659.25, 783.99, 880.00, 1046.50],
      [392.00, 440.00, 523.25, 659.25, 783.99],
    ];

    const melodyPattern = [
      [0.5, 0], [1.2, 2], [2.0, 1], [2.8, 3], [3.4, 0],
      [4.5, 1], [5.3, 3], [6.1, 2], [6.9, 4], [7.5, 1],
      [8.5, 0], [9.3, 2], [10.1, 3], [10.9, 1], [11.5, 4],
      [12.5, 2], [13.2, 0], [14.0, 3], [14.8, 1], [15.4, 4],
    ];

    for (let i = 0; i < melodyPattern.length; i++) {
      const [timeOffset, noteIdx] = melodyPattern[i];
      const chordIdx = Math.min(3, Math.floor(timeOffset / chordDur));
      const notes = pentatonic[chordIdx];
      const freq = notes[noteIdx % notes.length];

      const t = t0 + timeOffset;
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();
      const filter = this.ctx.createBiquadFilter();

      osc.type = 'sine';
      osc.frequency.value = freq;
      filter.type = 'lowpass';
      filter.frequency.value = 2500;

      const dur = 0.7 + Math.random() * 0.4;
      gain.gain.setValueAtTime(0.0001, t);
      gain.gain.exponentialRampToValueAtTime(0.09, t + 0.06);
      gain.gain.exponentialRampToValueAtTime(0.04, t + dur * 0.5);
      gain.gain.exponentialRampToValueAtTime(0.0001, t + dur);

      osc.connect(filter);
      filter.connect(gain);
      gain.connect(this.musicGain);
      osc.start(t);
      osc.stop(t + dur + 0.05);
    }
  }
}