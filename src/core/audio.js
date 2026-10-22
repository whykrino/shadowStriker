'use strict';

class AudioSystem {
  constructor() {
    this.ctx = null;
    this.masterGain = null;
    this.musicGain = null;
    this.sfxGain = null;
    this.reverbBus = null;
    this.delayBus = null;

    this.masterVolume = 0.6;
    this.musicVolume = 0.75;
    this.sfxVolume = 0.7;
    this.muted = false;

    this.musicPlaying = false;
    this.musicBuffer = null;
    this._musicSource = null;

    this._baseGains = {
      master: 0.6,
      music: 0.42,
      sfx: 0.7,
    };

    this.samples = {};

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

      this.reverbBus = this.ctx.createConvolver();
      this.reverbBus.buffer = this._buildImpulse(2.4, 2.2);
      const reverbGain = this.ctx.createGain();
      reverbGain.gain.value = 0.35;
      this.reverbBus.connect(reverbGain);
      reverbGain.connect(this.masterGain);

      this.delayBus = this.ctx.createDelay(1.0);
      this.delayBus.delayTime.value = 0.32;
      const delayFeedback = this.ctx.createGain();
      delayFeedback.gain.value = 0.32;
      const delayFilter = this.ctx.createBiquadFilter();
      delayFilter.type = 'lowpass';
      delayFilter.frequency.value = 2400;
      this.delayBus.connect(delayFilter);
      delayFilter.connect(delayFeedback);
      delayFeedback.connect(this.delayBus);
      const delayOut = this.ctx.createGain();
      delayOut.gain.value = 0.28;
      delayFilter.connect(delayOut);
      delayOut.connect(this.masterGain);

      await this._buildSamples();
      this.startMusic();
    } catch (e) {
      console.warn('Audio init failed', e);
    }
  }

  _buildImpulse(duration, decay) {
    const sr = this.ctx.sampleRate;
    const len = Math.floor(sr * duration);
    const impulse = this.ctx.createBuffer(2, len, sr);
    for (let ch = 0; ch < 2; ch++) {
      const data = impulse.getChannelData(ch);
      for (let i = 0; i < len; i++) {
        const t = i / len;
        const env = Math.pow(1 - t, decay);
        data[i] = (Math.random() * 2 - 1) * env * 0.6;
      }
    }
    return impulse;
  }

  async _buildSamples() {
    this.samples.sword = await this._renderSwordSwing();
    this.samples.hitSoft = await this._renderSoftHit();
    this.samples.enemyHurt = await this._renderEnemyHurt();
    this.samples.playerHurt = await this._renderPlayerHurt();
    this.samples.dash = await this._renderDash();
    this.samples.jump = await this._renderJump();
    this.samples.kill = await this._renderKill();
    this.samples.levelUp = await this._renderLevelUp();
    this.samples.pickup = await this._renderPickup();
    this.samples.notifyInfo = await this._renderNotify(660, 880, 'sine');
    this.samples.notifyAbility = await this._renderNotify(523, 784, 'triangle');
    this.samples.notifyDanger = await this._renderNotify(220, 180, 'sawtooth');
    this.samples.blockHit = await this._renderBlockHit();
    this.samples.blockBreak = await this._renderBlockBreak();
  }

  async _render(durationSec, buildFn) {
    const sr = this.ctx.sampleRate;
    const ctx = new OfflineAudioContext(2, Math.floor(sr * durationSec), sr);
    buildFn(ctx);
    return await ctx.startRendering();
  }

  _renderSwordSwing() {
    return this._render(0.35, (ctx) => {
      const noise = ctx.createBufferSource();
      const buf = ctx.createBuffer(1, ctx.sampleRate * 0.35, ctx.sampleRate);
      const d = buf.getChannelData(0);
      for (let i = 0; i < d.length; i++) {
        const t = i / d.length;
        d[i] = (Math.random() * 2 - 1) * Math.pow(1 - t, 3) * Math.sin(t * Math.PI);
      }
      noise.buffer = buf;

      const bp = ctx.createBiquadFilter();
      bp.type = 'bandpass';
      bp.frequency.setValueAtTime(1200, 0);
      bp.frequency.exponentialRampToValueAtTime(3000, 0.15);
      bp.frequency.exponentialRampToValueAtTime(800, 0.35);
      bp.Q.value = 1.2;

      const gain = ctx.createGain();
      gain.gain.setValueAtTime(0.0001, 0);
      gain.gain.exponentialRampToValueAtTime(0.4, 0.05);
      gain.gain.exponentialRampToValueAtTime(0.1, 0.2);
      gain.gain.exponentialRampToValueAtTime(0.0001, 0.35);

      noise.connect(bp);
      bp.connect(gain);
      gain.connect(ctx.destination);
      noise.start(0);
    });
  }

  _renderSoftHit() {
    return this._render(0.32, (ctx) => {
      const osc = ctx.createOscillator();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(220, 0);
      osc.frequency.exponentialRampToValueAtTime(90, 0.28);

      const osc2 = ctx.createOscillator();
      osc2.type = 'triangle';
      osc2.frequency.setValueAtTime(340, 0);
      osc2.frequency.exponentialRampToValueAtTime(140, 0.24);

      const gain = ctx.createGain();
      gain.gain.setValueAtTime(0.0001, 0);
      gain.gain.exponentialRampToValueAtTime(0.5, 0.015);
      gain.gain.exponentialRampToValueAtTime(0.2, 0.1);
      gain.gain.exponentialRampToValueAtTime(0.0001, 0.32);

      const lp = ctx.createBiquadFilter();
      lp.type = 'lowpass';
      lp.frequency.setValueAtTime(1800, 0);
      lp.frequency.exponentialRampToValueAtTime(500, 0.3);
      lp.Q.value = 0.8;

      osc.connect(lp);
      osc2.connect(lp);
      lp.connect(gain);
      gain.connect(ctx.destination);
      osc.start(0); osc.stop(0.32);
      osc2.start(0); osc2.stop(0.32);

      const thump = ctx.createOscillator();
      thump.type = 'sine';
      thump.frequency.setValueAtTime(90, 0);
      thump.frequency.exponentialRampToValueAtTime(45, 0.18);
      const tg = ctx.createGain();
      tg.gain.setValueAtTime(0.0001, 0);
      tg.gain.exponentialRampToValueAtTime(0.35, 0.01);
      tg.gain.exponentialRampToValueAtTime(0.0001, 0.2);
      thump.connect(tg);
      tg.connect(ctx.destination);
      thump.start(0); thump.stop(0.22);
    });
  }

  _renderEnemyHurt() {
    return this._render(0.28, (ctx) => {
      const osc = ctx.createOscillator();
      osc.type = 'triangle';
      osc.frequency.setValueAtTime(260, 0);
      osc.frequency.exponentialRampToValueAtTime(110, 0.26);

      const osc2 = ctx.createOscillator();
      osc2.type = 'sine';
      osc2.frequency.setValueAtTime(180, 0);
      osc2.frequency.exponentialRampToValueAtTime(80, 0.24);

      const gain = ctx.createGain();
      gain.gain.setValueAtTime(0.0001, 0);
      gain.gain.exponentialRampToValueAtTime(0.28, 0.02);
      gain.gain.exponentialRampToValueAtTime(0.0001, 0.28);

      const lp = ctx.createBiquadFilter();
      lp.type = 'lowpass';
      lp.frequency.value = 1200;
      lp.Q.value = 0.7;

      osc.connect(lp);
      osc2.connect(lp);
      lp.connect(gain);
      gain.connect(ctx.destination);
      osc.start(0); osc.stop(0.28);
      osc2.start(0); osc2.stop(0.28);
    });
  }

  _renderPlayerHurt() {
    return this._render(0.5, (ctx) => {
      const osc = ctx.createOscillator();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(150, 0);
      osc.frequency.exponentialRampToValueAtTime(58, 0.44);

      const osc2 = ctx.createOscillator();
      osc2.type = 'triangle';
      osc2.frequency.setValueAtTime(95, 0);
      osc2.frequency.exponentialRampToValueAtTime(48, 0.44);

      const gain = ctx.createGain();
      gain.gain.setValueAtTime(0.0001, 0);
      gain.gain.exponentialRampToValueAtTime(0.55, 0.02);
      gain.gain.exponentialRampToValueAtTime(0.28, 0.15);
      gain.gain.exponentialRampToValueAtTime(0.0001, 0.5);

      const lp = ctx.createBiquadFilter();
      lp.type = 'lowpass';
      lp.frequency.setValueAtTime(700, 0);
      lp.frequency.exponentialRampToValueAtTime(300, 0.5);
      lp.Q.value = 0.9;

      osc.connect(lp);
      osc2.connect(lp);
      lp.connect(gain);
      gain.connect(ctx.destination);
      osc.start(0); osc.stop(0.5);
      osc2.start(0); osc2.stop(0.5);
    });
  }

  _renderDash() {
    return this._render(0.36, (ctx) => {
      const noise = ctx.createBufferSource();
      const buf = ctx.createBuffer(2, ctx.sampleRate * 0.36, ctx.sampleRate);
      for (let ch = 0; ch < 2; ch++) {
        const d = buf.getChannelData(ch);
        for (let i = 0; i < d.length; i++) {
          const t = i / d.length;
          d[i] = (Math.random() * 2 - 1) * Math.pow(1 - t, 2);
        }
      }
      noise.buffer = buf;

      const bp = ctx.createBiquadFilter();
      bp.type = 'bandpass';
      bp.frequency.setValueAtTime(1800, 0);
      bp.frequency.exponentialRampToValueAtTime(600, 0.36);
      bp.Q.value = 0.8;

      const gain = ctx.createGain();
      gain.gain.setValueAtTime(0.0001, 0);
      gain.gain.exponentialRampToValueAtTime(0.32, 0.04);
      gain.gain.exponentialRampToValueAtTime(0.0001, 0.36);

      noise.connect(bp);
      bp.connect(gain);
      gain.connect(ctx.destination);
      noise.start(0);

      const whoosh = ctx.createOscillator();
      whoosh.type = 'sine';
      whoosh.frequency.setValueAtTime(420, 0);
      whoosh.frequency.exponentialRampToValueAtTime(180, 0.32);
      const wg = ctx.createGain();
      wg.gain.setValueAtTime(0.0001, 0);
      wg.gain.exponentialRampToValueAtTime(0.08, 0.05);
      wg.gain.exponentialRampToValueAtTime(0.0001, 0.32);
      whoosh.connect(wg);
      wg.connect(ctx.destination);
      whoosh.start(0);
      whoosh.stop(0.36);
    });
  }

  _renderJump() {
    return this._render(0.22, (ctx) => {
      const noise = ctx.createBufferSource();
      const buf = ctx.createBuffer(1, ctx.sampleRate * 0.22, ctx.sampleRate);
      const d = buf.getChannelData(0);
      for (let i = 0; i < d.length; i++) {
        const t = i / d.length;
        d[i] = (Math.random() * 2 - 1) * Math.pow(1 - t, 2);
      }
      noise.buffer = buf;

      const bp = ctx.createBiquadFilter();
      bp.type = 'bandpass';
      bp.frequency.setValueAtTime(900, 0);
      bp.frequency.exponentialRampToValueAtTime(2400, 0.18);
      bp.Q.value = 1.5;

      const gain = ctx.createGain();
      gain.gain.setValueAtTime(0.0001, 0);
      gain.gain.exponentialRampToValueAtTime(0.18, 0.03);
      gain.gain.exponentialRampToValueAtTime(0.0001, 0.22);

      noise.connect(bp);
      bp.connect(gain);
      gain.connect(ctx.destination);
      noise.start(0);
    });
  }

  _renderKill() {
    return this._render(0.6, (ctx) => {
      const osc = ctx.createOscillator();
      osc.type = 'triangle';
      osc.frequency.setValueAtTime(180, 0);
      osc.frequency.exponentialRampToValueAtTime(58, 0.55);

      const osc2 = ctx.createOscillator();
      osc2.type = 'sine';
      osc2.frequency.setValueAtTime(110, 0);
      osc2.frequency.exponentialRampToValueAtTime(40, 0.55);

      const gain = ctx.createGain();
      gain.gain.setValueAtTime(0.0001, 0);
      gain.gain.exponentialRampToValueAtTime(0.42, 0.02);
      gain.gain.exponentialRampToValueAtTime(0.2, 0.2);
      gain.gain.exponentialRampToValueAtTime(0.0001, 0.6);

      const lp = ctx.createBiquadFilter();
      lp.type = 'lowpass';
      lp.frequency.setValueAtTime(1000, 0);
      lp.frequency.exponentialRampToValueAtTime(280, 0.55);

      osc.connect(lp);
      osc2.connect(lp);
      lp.connect(gain);
      gain.connect(ctx.destination);
      osc.start(0); osc.stop(0.6);
      osc2.start(0); osc2.stop(0.6);
    });
  }

  _renderLevelUp() {
    return this._render(1.6, (ctx) => {
      const notes = [523.25, 659.25, 783.99, 1046.5];
      const step = 0.14;
      for (let i = 0; i < notes.length; i++) {
        const t = i * step;
        const osc = ctx.createOscillator();
        osc.type = 'sine';
        osc.frequency.value = notes[i];
        osc.detune.value = -4 + Math.random() * 8;

        const osc2 = ctx.createOscillator();
        osc2.type = 'triangle';
        osc2.frequency.value = notes[i] * 2;
        osc2.detune.value = -8 + Math.random() * 16;

        const gain = ctx.createGain();
        gain.gain.setValueAtTime(0.0001, t);
        gain.gain.exponentialRampToValueAtTime(0.24, t + 0.04);
        gain.gain.exponentialRampToValueAtTime(0.1, t + 0.3);
        gain.gain.exponentialRampToValueAtTime(0.0001, t + 0.9);

        const g2 = ctx.createGain();
        g2.gain.setValueAtTime(0.0001, t);
        g2.gain.exponentialRampToValueAtTime(0.06, t + 0.03);
        g2.gain.exponentialRampToValueAtTime(0.0001, t + 0.6);

        const lp = ctx.createBiquadFilter();
        lp.type = 'lowpass';
        lp.frequency.value = 3200;
        lp.Q.value = 0.6;

        osc.connect(gain);
        osc2.connect(g2);
        gain.connect(lp);
        g2.connect(lp);
        lp.connect(ctx.destination);
        osc.start(t); osc.stop(t + 1.0);
        osc2.start(t); osc2.stop(t + 0.7);
      }
    });
  }

  _renderPickup() {
    return this._render(0.28, (ctx) => {
      const osc = ctx.createOscillator();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(880, 0);
      osc.frequency.exponentialRampToValueAtTime(1320, 0.2);

      const osc2 = ctx.createOscillator();
      osc2.type = 'triangle';
      osc2.frequency.setValueAtTime(1760, 0);
      osc2.frequency.exponentialRampToValueAtTime(2640, 0.2);

      const gain = ctx.createGain();
      gain.gain.setValueAtTime(0.0001, 0);
      gain.gain.exponentialRampToValueAtTime(0.2, 0.02);
      gain.gain.exponentialRampToValueAtTime(0.08, 0.12);
      gain.gain.exponentialRampToValueAtTime(0.0001, 0.28);

      const g2 = ctx.createGain();
      g2.gain.setValueAtTime(0.0001, 0);
      g2.gain.exponentialRampToValueAtTime(0.06, 0.02);
      g2.gain.exponentialRampToValueAtTime(0.0001, 0.22);

      osc.connect(gain);
      osc2.connect(g2);
      gain.connect(ctx.destination);
      g2.connect(ctx.destination);
      osc.start(0); osc.stop(0.28);
      osc2.start(0); osc2.stop(0.24);
    });
  }

  _renderNotify(f1, f2, wave) {
    return this._render(0.5, (ctx) => {
      const osc = ctx.createOscillator();
      osc.type = wave || 'sine';
      osc.frequency.setValueAtTime(f1, 0);
      osc.frequency.setValueAtTime(f2, 0.14);

      const gain = ctx.createGain();
      gain.gain.setValueAtTime(0.0001, 0);
      gain.gain.exponentialRampToValueAtTime(0.16, 0.03);
      gain.gain.exponentialRampToValueAtTime(0.1, 0.16);
      gain.gain.exponentialRampToValueAtTime(0.0001, 0.5);

      const lp = ctx.createBiquadFilter();
      lp.type = 'lowpass';
      lp.frequency.value = 3600;
      lp.Q.value = 0.6;

      osc.connect(lp);
      lp.connect(gain);
      gain.connect(ctx.destination);
      osc.start(0);
      osc.stop(0.5);
    });
  }

  _renderBlockHit() {
    return this._render(0.25, (ctx) => {
      const osc = ctx.createOscillator();
      osc.type = 'square';
      osc.frequency.setValueAtTime(900, 0);
      osc.frequency.exponentialRampToValueAtTime(1500, 0.05);

      const gain = ctx.createGain();
      gain.gain.setValueAtTime(0.0001, 0);
      gain.gain.exponentialRampToValueAtTime(0.18, 0.005);
      gain.gain.exponentialRampToValueAtTime(0.0001, 0.2);

      const bp = ctx.createBiquadFilter();
      bp.type = 'bandpass';
      bp.frequency.value = 2000;
      bp.Q.value = 2;

      osc.connect(bp);
      bp.connect(gain);
      gain.connect(ctx.destination);
      osc.start(0);
      osc.stop(0.25);
    });
  }

  _renderBlockBreak() {
    return this._render(0.4, (ctx) => {
      const osc = ctx.createOscillator();
      osc.type = 'sawtooth';
      osc.frequency.setValueAtTime(400, 0);
      osc.frequency.exponentialRampToValueAtTime(90, 0.35);

      const gain = ctx.createGain();
      gain.gain.setValueAtTime(0.0001, 0);
      gain.gain.exponentialRampToValueAtTime(0.28, 0.01);
      gain.gain.exponentialRampToValueAtTime(0.0001, 0.4);

      const lp = ctx.createBiquadFilter();
      lp.type = 'lowpass';
      lp.frequency.setValueAtTime(2000, 0);
      lp.frequency.exponentialRampToValueAtTime(400, 0.4);

      osc.connect(lp);
      lp.connect(gain);
      gain.connect(ctx.destination);
      osc.start(0);
      osc.stop(0.4);
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
    if (this.reverbBus) {
      const send = this.ctx.createGain();
      send.gain.value = 0.18;
      gain.connect(send);
      send.connect(this.reverbBus);
    }
    src.start(0);
  }

  swordSwing() { this._playSample(this.samples.sword, 0.5); }
  hitEnemy()   { this._playSample(this.samples.hitSoft, 0.62); }
  enemyHurt()  { this._playSample(this.samples.enemyHurt, 0.4); }
  playerHurt() { this._playSample(this.samples.playerHurt, 0.72); }
  dash()       { this._playSample(this.samples.dash, 0.5); }
  jump()       { this._playSample(this.samples.jump, 0.42); }
  killEnemy()  { this._playSample(this.samples.kill, 0.5); }
  levelUp()    { this._playSample(this.samples.levelUp, 0.58); }
  pickup()     { this._playSample(this.samples.pickup, 0.42); }
  notificationInfo()    { this._playSample(this.samples.notifyInfo, 0.36); }
  notificationAbility() { this._playSample(this.samples.notifyAbility, 0.42); }
  notificationDanger()  { this._playSample(this.samples.notifyDanger, 0.5); }
  enemyShoot() { this._playSample(this.samples.hitSoft, 0.28); }
  blockHit()   { this._playSample(this.samples.blockHit, 0.55); }
  blockBreak() { this._playSample(this.samples.blockBreak, 0.6); }

  updateListener() {}
  updatePlayer() {}
  enemyRoar() {}

  startMusic() {
    if (!this.ctx || this.musicPlaying) return;
    this.musicPlaying = true;

    this._buildMusicSample().then(buffer => {
      if (!this.ctx || !buffer) return;
      this.musicBuffer = buffer;
      this._playMusicLoop();
    });
  }

  _playMusicLoop() {
    if (!this.ctx || !this.musicBuffer) return;
    const src = this.ctx.createBufferSource();
    src.buffer = this.musicBuffer;
    src.loop = true;
    src.connect(this.musicGain);
    src.start(0);
    this._musicSource = src;
  }

  async _buildMusicSample() {
    const sr = this.ctx.sampleRate;
    const duration = 32.0;
    const ctx = new OfflineAudioContext(2, Math.floor(sr * duration), sr);

    const master = ctx.createGain();
    master.gain.value = 0.8;
    master.connect(ctx.destination);

    const reverb = ctx.createConvolver();
    reverb.buffer = this._buildImpulseFor(ctx, 2.6, 2.0);
    const reverbGain = ctx.createGain();
    reverbGain.gain.value = 0.4;
    reverb.connect(reverbGain);
    reverbGain.connect(master);

    const d = 2;
    const mid = 293.66;
    const low = 146.83;
    const high = 587.33;

    const pluck = (t, freq, vol, decay) => {
      const osc = ctx.createOscillator();
      osc.type = 'triangle';
      osc.frequency.value = freq;

      const osc2 = ctx.createOscillator();
      osc2.type = 'sine';
      osc2.frequency.value = freq * 2.005;

      const g = ctx.createGain();
      g.gain.setValueAtTime(0.0001, t);
      g.gain.exponentialRampToValueAtTime(vol, t + 0.008);
      g.gain.exponentialRampToValueAtTime(vol * 0.35, t + decay * 0.4);
      g.gain.exponentialRampToValueAtTime(0.0001, t + decay);

      const g2 = ctx.createGain();
      g2.gain.setValueAtTime(0.0001, t);
      g2.gain.exponentialRampToValueAtTime(vol * 0.18, t + 0.01);
      g2.gain.exponentialRampToValueAtTime(0.0001, t + decay * 0.6);

      const lp = ctx.createBiquadFilter();
      lp.type = 'lowpass';
      lp.frequency.setValueAtTime(4200, t);
      lp.frequency.exponentialRampToValueAtTime(900, t + decay);
      lp.Q.value = 0.6;

      osc.connect(g);
      osc2.connect(g2);
      g.connect(lp);
      g2.connect(lp);
      lp.connect(master);
      lp.connect(reverb);

      osc.start(t); osc.stop(t + decay + 0.1);
      osc2.start(t); osc2.stop(t + decay * 0.7);
    };

    const bass = (t, freq, vol, dur) => {
      const osc = ctx.createOscillator();
      osc.type = 'sine';
      osc.frequency.value = freq;

      const osc2 = ctx.createOscillator();
      osc2.type = 'triangle';
      osc2.frequency.value = freq * 2;

      const g = ctx.createGain();
      g.gain.setValueAtTime(0.0001, t);
      g.gain.exponentialRampToValueAtTime(vol, t + 0.02);
      g.gain.exponentialRampToValueAtTime(vol * 0.5, t + dur * 0.5);
      g.gain.exponentialRampToValueAtTime(0.0001, t + dur);

      const g2 = ctx.createGain();
      g2.gain.setValueAtTime(0.0001, t);
      g2.gain.exponentialRampToValueAtTime(vol * 0.3, t + 0.02);
      g2.gain.exponentialRampToValueAtTime(0.0001, t + dur * 0.6);

      const lp = ctx.createBiquadFilter();
      lp.type = 'lowpass';
      lp.frequency.value = 600;

      osc.connect(g);
      osc2.connect(g2);
      g.connect(lp);
      g2.connect(lp);
      lp.connect(master);
      osc.start(t); osc.stop(t + dur + 0.05);
      osc2.start(t); osc2.stop(t + dur * 0.7);
    };

    const bell = (t, freq, vol) => {
      const osc = ctx.createOscillator();
      osc.type = 'sine';
      osc.frequency.value = freq;

      const osc2 = ctx.createOscillator();
      osc2.type = 'sine';
      osc2.frequency.value = freq * 2.76;

      const g = ctx.createGain();
      g.gain.setValueAtTime(0.0001, t);
      g.gain.exponentialRampToValueAtTime(vol, t + 0.005);
      g.gain.exponentialRampToValueAtTime(0.0001, t + 1.8);

      const g2 = ctx.createGain();
      g2.gain.setValueAtTime(0.0001, t);
      g2.gain.exponentialRampToValueAtTime(vol * 0.4, t + 0.004);
      g2.gain.exponentialRampToValueAtTime(0.0001, t + 0.9);

      osc.connect(g);
      osc2.connect(g2);
      g.connect(master);
      g.connect(reverb);
      g2.connect(reverb);
      osc.start(t); osc.stop(t + 1.9);
      osc2.start(t); osc2.stop(t + 1.0);
    };

    const phrase1 = [
      [0.0, d], [0.5, mid], [0.75, high], [1.0, mid], [1.5, low], [1.75, d], [2.0, mid],
      [2.5, low], [3.0, d], [3.5, mid], [3.75, high], [4.0, mid], [4.5, low], [5.0, d],
    ];
    const phrase2 = [
      [6.0, low], [6.5, d], [7.0, mid], [7.5, high], [7.75, mid], [8.0, d], [8.5, mid],
      [9.0, low], [9.5, d], [10.0, mid], [10.5, high], [11.0, mid], [11.5, low],
    ];

    const playPhrase = (base, arr, transpose, vol) => {
      for (let i = 0; i < arr.length; i++) {
        const t = base + arr[i][0];
        const f = arr[i][1] * transpose;
        pluck(t, f, vol, 1.1);
      }
    };

    playPhrase(0, phrase1, 1, 0.22);
    playPhrase(12, phrase1, 1, 0.22);
    playPhrase(6, phrase2, 0.5, 0.26);
    playPhrase(18, phrase2, 0.5, 0.26);

    playPhrase(24, phrase1, 2, 0.16);
    playPhrase(24, phrase2, 1, 0.14);

    bass(0, low, 0.14, 1.6);
    bass(1.6, low, 0.1, 1.0);
    bass(3.0, low, 0.13, 1.5);
    bass(6.0, low, 0.14, 1.8);
    bass(8.5, low, 0.1, 1.4);
    bass(12, low, 0.14, 1.6);
    bass(13.6, low, 0.1, 1.0);
    bass(15, low, 0.13, 1.5);
    bass(18, low, 0.14, 1.8);
    bass(20.5, low, 0.1, 1.4);
    bass(24, low, 0.14, 1.6);
    bass(25.6, low, 0.1, 1.0);
    bass(27, low, 0.13, 1.5);
    bass(30, low, 0.14, 1.8);

    bell(2.0, high, 0.14);
    bell(8.0, high, 0.12);
    bell(14.0, high, 0.14);
    bell(20.0, high, 0.12);
    bell(26.0, high, 0.14);
    bell(31.0, high, 0.12);

    const shimmer = ctx.createOscillator();
    shimmer.type = 'sine';
    shimmer.frequency.value = 293.66;
    const shimGain = ctx.createGain();
    shimGain.gain.setValueAtTime(0.0001, 0);
    shimGain.gain.linearRampToValueAtTime(0.015, 2);
    shimGain.gain.linearRampToValueAtTime(0.015, 14);
    shimGain.gain.linearRampToValueAtTime(0.0001, 16);
    shimGain.gain.linearRampToValueAtTime(0.015, 18);
    shimGain.gain.linearRampToValueAtTime(0.015, 30);
    shimGain.gain.linearRampToValueAtTime(0.0001, 32);
    shimmer.connect(shimGain);
    shimGain.connect(reverb);
    shimmer.start(0);
    shimmer.stop(32);

    return await ctx.startRendering();
  }

  _buildImpulseFor(ctx, duration, decay) {
    const sr = ctx.sampleRate;
    const len = Math.floor(sr * duration);
    const impulse = ctx.createBuffer(2, len, sr);
    for (let ch = 0; ch < 2; ch++) {
      const data = impulse.getChannelData(ch);
      for (let i = 0; i < len; i++) {
        const t = i / len;
        const env = Math.pow(1 - t, decay);
        data[i] = (Math.random() * 2 - 1) * env * 0.5;
      }
    }
    return impulse;
  }
}