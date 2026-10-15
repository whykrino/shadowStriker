'use strict';

class HUD {
  constructor(audio) {
    this.audio = audio;

    this.hpFill = document.getElementById('hp-fill');
    this.hpText = document.getElementById('hp-text');
    this.expFill = document.getElementById('exp-fill');
    this.expText = document.getElementById('exp-text');
    this.levelVal = document.getElementById('level-val');
    this.gameover = document.getElementById('gameover');

    this.skillMenu = document.getElementById('skill-menu');
    this.skillPointsEl = document.getElementById('skill-points');
    this.talentTreeEl = document.getElementById('talent-tree');
    this.talentInfoEl = document.getElementById('talent-info');
    this.abilitiesList = document.getElementById('abilities-list');
    this.tabs = document.querySelectorAll('.tab');
    this.tabContents = {
      talents: document.getElementById('tab-talents'),
      abilities: document.getElementById('tab-abilities'),
    };

    this.audioMenu = document.getElementById('audio-menu');
    this.sliderMaster = document.getElementById('slider-master');
    this.sliderMusic = document.getElementById('slider-music');
    this.sliderSfx = document.getElementById('slider-sfx');
    this.valMaster = document.getElementById('val-master');
    this.valMusic = document.getElementById('val-music');
    this.valSfx = document.getElementById('val-sfx');
    this.muteBtn = document.getElementById('mute-btn');

    this.dashIndicator = document.getElementById('dash-indicator');
    this.dashDotsContainer = document.getElementById('dash-dots');
    this.dashCooldownFill = document.getElementById('dash-cooldown-fill');
    this.ctrlDash = document.getElementById('ctrl-dash');
    this.ctrlCharge = document.getElementById('ctrl-charge');
    this._dashDots = [];
    this._lastCharges = -1;
    this._lastMaxCharges = -1;
    this._dashVisible = false;
    this._chargeVisible = false;

    this.onTalentClick = null;

    for (const tab of this.tabs) {
      tab.addEventListener('click', () => this.switchTab(tab.dataset.tab));
    }

    this._initAudioMenu();

    this.dashIndicator.classList.add('hidden');
    this._dashVisible = false;

    if (this.ctrlCharge) this.ctrlCharge.style.display = 'none';
    if (this.ctrlDash) this.ctrlDash.style.display = 'none';

    this._hp = -1;
    this._maxHp = -1;
    this._level = -1;
    this._expText = '';
  }

  _initAudioMenu() {
    const updateMaster = () => {
      const v = this.sliderMaster.value / 100;
      this.audio.setMaster(v);
      this.valMaster.textContent = this.sliderMaster.value + '%';
    };
    const updateMusic = () => {
      const v = this.sliderMusic.value / 100;
      this.audio.setMusic(v);
      this.valMusic.textContent = this.sliderMusic.value + '%';
    };
    const updateSfx = () => {
      const v = this.sliderSfx.value / 100;
      this.audio.setSfx(v);
      this.valSfx.textContent = this.sliderSfx.value + '%';
    };

    this.sliderMaster.addEventListener('input', updateMaster);
    this.sliderMusic.addEventListener('input', updateMusic);
    this.sliderSfx.addEventListener('input', updateSfx);

    this.sliderMaster.value = Math.round(this.audio.masterVolume * 100);
    this.sliderMusic.value = Math.round(this.audio.musicVolume * 100);
    this.sliderSfx.value = Math.round(this.audio.sfxVolume * 100);
    this.valMaster.textContent = this.sliderMaster.value + '%';
    this.valMusic.textContent = this.sliderMusic.value + '%';
    this.valSfx.textContent = this.sliderSfx.value + '%';

    this.muteBtn.addEventListener('click', () => {
      const nowMuted = !this.audio.muted;
      this.audio.setMuted(nowMuted);
      this.muteBtn.classList.toggle('muted', nowMuted);
      this.muteBtn.textContent = nowMuted ? 'ВКЛЮЧИТЬ ЗВУК' : 'ВЫКЛЮЧИТЬ ЗВУК';
    });
  }

  switchTab(name) {
    for (const t of this.tabs) {
      t.classList.toggle('active', t.dataset.tab === name);
    }
    for (const key in this.tabContents) {
      this.tabContents[key].classList.toggle('active', key === name);
    }
  }

  update(hp, maxHp, exp, expNext, level) {
    const hpR = Math.round(hp);
    if (hpR !== this._hp || maxHp !== this._maxHp) {
      const hpPct = Math.max(0, Math.min(100, (hp / maxHp) * 100));
      this.hpFill.style.width = hpPct + '%';
      this.hpText.textContent = hpR + ' / ' + maxHp;
      this._hp = hpR;
      this._maxHp = maxHp;
    }
    const expPct = Math.max(0, Math.min(100, (exp / expNext) * 100));
    this.expFill.style.width = expPct + '%';
    const expStr = exp + ' / ' + expNext;
    if (expStr !== this._expText) {
      this.expText.textContent = expStr;
      this._expText = expStr;
    }
    if (level !== this._level) {
      this.levelVal.textContent = level;
      this._level = level;

      const canCharge = level >= 3;
      if (this.ctrlCharge && canCharge !== this._chargeVisible) {
        this.ctrlCharge.style.display = canCharge ? 'inline-flex' : 'none';
        this._chargeVisible = canCharge;
      }
    }
  }

  updateDash(player, hasDashAbility) {
    if (this.ctrlDash) {
      this.ctrlDash.style.display = hasDashAbility ? 'inline-flex' : 'none';
    }

    if (!hasDashAbility) {
      if (this._dashVisible) {
        this.dashIndicator.classList.add('hidden');
        this._dashVisible = false;
      }
      return;
    }

    if (!this._dashVisible) {
      this.dashIndicator.classList.remove('hidden');
      this._dashVisible = true;
    }

    const maxCharges = player.maxDashCharges;
    const charges = player.dashCharges;

    if (maxCharges !== this._lastMaxCharges) {
      this.dashDotsContainer.innerHTML = '';
      this._dashDots = [];
      for (let i = 0; i < maxCharges; i++) {
        const dot = document.createElement('div');
        dot.className = 'dash-dot empty';
        this.dashDotsContainer.appendChild(dot);
        this._dashDots.push(dot);
      }
      this._lastMaxCharges = maxCharges;
      this._lastCharges = -1;
    }

    if (charges !== this._lastCharges) {
      for (let i = 0; i < this._dashDots.length; i++) {
        const dot = this._dashDots[i];
        dot.classList.remove('full', 'empty');
        if (i < charges) {
          dot.classList.add('full');
        } else {
          dot.classList.add('empty');
        }
      }
      this._lastCharges = charges;
    }

    if (charges < maxCharges) {
      const remaining = Math.max(0, player.dashRechargeTimer);
      const pct = Math.max(0, Math.min(100, (1 - remaining / player.dashRechargeTime) * 100));
      this.dashCooldownFill.style.width = pct + '%';
    } else {
      this.dashCooldownFill.style.width = '100%';
    }
  }

  updateSkillMenu(talents, abilities) {
    this.skillPointsEl.textContent = talents.points;
    this.renderTalentTree(talents);
    if (abilities) this.renderAbilities(abilities);
  }

  renderTalentTree(talents) {
    const nodes = talents.listNodes();
    const nodeMap = {};
    for (const n of nodes) nodeMap[n.id] = n;

    const layout = {
      root:  { col: 2, row: 2 },
      str1: { col: 1, row: 0 },
      str2: { col: 0, row: 0 },
      str3: { col: 2, row: 0 },
      str4: { col: 2, row: -1 },
      str5: { col: 1, row: -1 },
      agi1: { col: 3, row: 1 },
      agi2: { col: 4, row: 1 },
      agi3: { col: 4, row: 2 },
      agi4: { col: 4, row: 0 },
      agi5: { col: 4, row: -1 },
      int1: { col: 2, row: 3 },
      int2: { col: 1, row: 4 },
      int3: { col: 3, row: 4 },
      int4: { col: 3, row: 5 },
      int5: { col: 2, row: 5 },
      vit1: { col: 1, row: 2 },
      vit2: { col: 0, row: 2 },
      vit3: { col: 0, row: 3 },
      vit4: { col: 0, row: 1 },
      vit5: { col: 0, row: 0 },
    };

    const cellW = 110;
    const cellH = 100;
    const offsetX = 20;
    const offsetY = 20;

    let html = '<div class="talent-grid">';

    for (const n of nodes) {
      if (!layout[n.id]) continue;
      const from = layout[n.id];
      for (const req of n.requires) {
        if (!layout[req]) continue;
        const to = layout[req];
        const x1 = offsetX + from.col * cellW + 30;
        const y1 = offsetY + from.row * cellH + 30;
        const x2 = offsetX + to.col * cellW + 30;
        const y2 = offsetY + to.row * cellH + 30;
        const dx = x2 - x1;
        const dy = y2 - y1;
        const len = Math.hypot(dx, dy);
        const angle = Math.atan2(dy, dx) * 180 / Math.PI;
        const state = n.learned ? 'line-active' : 'line-locked';
        html += '<div class="' + state + '" style="left:' + x1 + 'px; top:' + y1 + 'px; width:' + len + 'px; transform: rotate(' + angle + 'deg);"></div>';
      }
    }

    for (const n of nodes) {
      if (!layout[n.id]) continue;
      const pos = layout[n.id];
      const x = offsetX + pos.col * cellW;
      const y = offsetY + pos.row * cellH;

      let cls = 'talent-node';
      if (n.learned) cls += ' learned';
      else if (n.available) cls += ' available';
      else cls += ' locked';

      const statCls = ' stat-' + n.stat;

      html += '<div class="' + cls + statCls + '" style="left:' + x + 'px; top:' + y + 'px;" data-id="' + n.id + '">' +
        '<div class="talent-icon">' + n.icon + '</div>' +
        '<div class="talent-cost">' + (n.cost > 0 ? n.cost : '') + '</div>' +
      '</div>';
    }

    html += '</div>';
    this.talentTreeEl.innerHTML = html;

    const self = this;
    this.talentTreeEl.querySelectorAll('.talent-node').forEach(el => {
      const id = el.dataset.id;
      const n = nodeMap[id];

      el.addEventListener('mouseenter', () => {
        self.showTalentInfo(n);
      });

      el.addEventListener('click', () => {
        self.showTalentInfo(n);
        if (self.onTalentClick) self.onTalentClick(id);
      });
    });
  }

  showTalentInfo(node) {
    if (!this.talentInfoEl || !node) return;

    const nameEl = this.talentInfoEl.querySelector('.talent-info-name');
    const descEl = this.talentInfoEl.querySelector('.talent-info-desc');
    const costEl = this.talentInfoEl.querySelector('.talent-info-cost');

    nameEl.textContent = node.name || '';
    descEl.textContent = node.desc || '';

    let costText = '';
    let costCls = '';

    if (node.learned) {
      costText = 'ИЗУЧЕНО';
      costCls = 'learned';
    } else if (node.cost > 0) {
      costText = 'СТОИМОСТЬ: ' + node.cost;
      if (!node.available) {
        costText += ' · НЕДОСТУПНО';
        costCls = 'locked';
      }
    } else {
      costText = 'СТАРТ';
    }

    costEl.textContent = costText;
    costEl.className = 'talent-info-cost ' + costCls;
  }

  renderAbilities(abilities) {
    const list = abilities.list();
    if (list.length === 0) {
      this.abilitiesList.innerHTML = '<div class="empty-tab">СПОСОБНОСТЕЙ ПОКА НЕТ</div>';
      return;
    }

    let html = '';
    for (const ab of list) {
      const cls = ab.unlocked ? '' : ' ability-locked';
      const status = ab.unlocked ? 'ОТКРЫТО' : 'УР. ' + ab.unlockLevel;
      html +=
        '<div class="ability-row' + cls + '">' +
          '<div class="ability-icon">' + ab.icon + '</div>' +
          '<div class="ability-info">' +
            '<div class="ability-name">' + ab.name + '</div>' +
            '<div class="ability-desc">' + ab.desc + '</div>' +
          '</div>' +
          '<div class="ability-status">' + status + '</div>' +
        '</div>';
    }
    this.abilitiesList.innerHTML = html;
  }

  toggleSkillMenu(show) {
    if (show) this.skillMenu.classList.add('show');
    else this.skillMenu.classList.remove('show');
  }
  isSkillMenuOpen() {
    return this.skillMenu.classList.contains('show');
  }
  toggleAudioMenu(show) {
    if (show) this.audioMenu.classList.add('show');
    else this.audioMenu.classList.remove('show');
  }
  isAudioMenuOpen() {
    return this.audioMenu.classList.contains('show');
  }
  showGameOver() {
    this.gameover.classList.add('show');
  }
}