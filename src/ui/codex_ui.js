'use strict';

class CodexUI {
  constructor() {
    this.menu = document.getElementById('codex-menu');
    this.tabs = document.querySelectorAll('.codex-tab');
    this.tabMonsters = document.getElementById('codex-monsters');
    this.tabAbilities = document.getElementById('codex-abilities');
    this.tabZones = document.getElementById('codex-zones');

    for (const tab of this.tabs) {
      tab.addEventListener('click', () => this.switchTab(tab.dataset.tab));
    }

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
      html +=
        '<div class="codex-card">' +
          '<div class="codex-card-icon">' + m.icon + '</div>' +
          '<div class="codex-card-body">' +
            '<div class="codex-card-name">' + m.name + '</div>' +
            '<div class="codex-card-stats">' +
              'HP: <b>' + m.hp + '</b> · ' +
              'DMG: <b>' + m.damage + '</b> · ' +
              'SPD: <b>' + m.speed + '</b> · ' +
              'EXP: <b>' + m.exp + '</b>' +
            '</div>' +
            '<div class="codex-card-desc">' + m.behavior + '</div>' +
            '<div class="codex-card-hint">' + m.weakness + '</div>' +
            '<div class="codex-card-zone">' + m.zone + '</div>' +
          '</div>' +
        '</div>';
    }
    this.tabMonsters.innerHTML = html;

    html = '';
    for (const a of CODEX_DATA.abilities) {
      html +=
        '<div class="codex-card">' +
          '<div class="codex-card-icon">' + a.icon + '</div>' +
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
          '<div class="codex-card-icon" style="color: ' + z.color + '">◈</div>' +
          '<div class="codex-card-body">' +
            '<div class="codex-card-name" style="color: ' + z.color + '">' + z.name + '</div>' +
            '<div class="codex-card-desc">' + z.desc + '</div>' +
          '</div>' +
        '</div>';
    }
    this.tabZones.innerHTML = html;
  }

  toggle(show) {
    if (show) this.menu.classList.add('show');
    else this.menu.classList.remove('show');
  }

  isOpen() {
    return this.menu.classList.contains('show');
  }
}