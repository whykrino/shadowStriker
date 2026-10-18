'use strict';

class CheatMenu {
  constructor(game) {
    this.game = game;
    this.visible = false;
    this.el = null;
    this.godmode = false;
    this.infiniteDash = false;
    this.speedBoost = false;
    this.buildUI();

    window.addEventListener('keydown', (e) => {
      if (e.code === 'Backquote' || e.code === 'F10') {
        e.preventDefault();
        this.toggle();
      }
    });
  }

  buildUI() {
    const el = document.createElement('div');
    el.id = 'cheat-menu';
    el.style.cssText = `
      position: fixed;
      top: 80px; right: 28px;
      width: 320px;
      background: rgba(10, 15, 25, 0.96);
      border: 1px solid #ff5577;
      box-shadow: 0 0 30px rgba(255, 85, 119, 0.4);
      padding: 16px;
      z-index: 100;
      display: none;
      font-family: 'SF Mono', monospace;
      font-size: 11px;
      color: #e8eef5;
      max-height: 80vh;
      overflow-y: auto;
    `;

    let html = '<div style="color:#ff5577;font-weight:700;letter-spacing:3px;margin-bottom:12px;border-bottom:1px solid #ff5577;padding-bottom:6px;">';
    html += 'ЧИТ-МЕНЮ (DEV)';
    html += '</div>';

    html += this.section('ИГРОК');
    html += this.button('+1000 EXP', 'addExp');
    html += this.button('+1 Уровень', 'addLevel');
    html += this.button('+10 Очков талантов', 'addPoints');
    html += this.button('Восстановить HP', 'fullHeal');
    html += this.button('Убить игрока', 'killPlayer');

    html += this.section('ОРУЖИЕ');
    html += this.button('+100 к урону', 'addDamage');
    html += this.button('Сбросить урон', 'resetDamage');

    html += this.section('МОБЫ');
    html += this.button('Убить всех мобов', 'killAllMonsters');
    html += this.button('Убить всех боссов', 'killBoss');
    html += this.button('Заспавнить босса рядом', 'spawnBoss');
    html += this.button('Заспавнить 20 мобов', 'spawnMonsters');

    html += this.section('СПОСОБНОСТИ');
    html += this.button('Открыть все способности', 'unlockAllAbilities');
    html += this.button('Открыть все таланты', 'unlockAllTalents');
    html += this.button('Сбросить таланты', 'resetTalents');

    html += this.section('УТИЛИТЫ');
    html += this.button('Бессмертие (вкл/выкл)', 'toggleGodmode');
    html += this.button('Бесконечный рывок (вкл/выкл)', 'toggleInfiniteDash');
    html += this.button('Скорость x2 (вкл/выкл)', 'toggleSpeedBoost');
    html += this.button('Убить всё и всех', 'nuke');

    html += '<div style="margin-top:14px;font-size:9px;color:#666;text-align:center;letter-spacing:2px;">';
    html += '~ или F10 ЗАКРЫТЬ';
    html += '</div>';

    el.innerHTML = html;
    document.body.appendChild(el);
    this.el = el;

    el.querySelectorAll('button[data-action]').forEach(btn => {
      btn.addEventListener('click', () => this.action(btn.dataset.action));
    });
  }

  section(title) {
    return '<div style="color:#8fc9ff;font-weight:700;letter-spacing:2px;margin-top:12px;margin-bottom:6px;font-size:10px;">' + title + '</div>';
  }

  button(label, action) {
    return '<button data-action="' + action + '" style="display:block;width:100%;margin:3px 0;padding:8px 10px;background:rgba(74,158,255,0.1);border:1px solid rgba(74,158,255,0.4);color:#8fc9ff;font-family:inherit;font-size:11px;letter-spacing:1px;cursor:pointer;text-align:left;">' + label + '</button>';
  }

  toggle() {
    this.visible = !this.visible;
    this.el.style.display = this.visible ? 'block' : 'none';
  }

  action(name) {
    const g = this.game;
    const p = g.player;

    switch (name) {
      case 'addExp':
        g.stats.addExp(1000);
        break;

      case 'addLevel':
        g.stats.level++;
        g.stats.skillPoints += 3;
        g.stats.expToNext = g.stats.expForLevel(g.stats.level);
        p.onLevelUp();
        g.zones.onPlayerLevel(g.stats.level);
        g.talents.addPoints(3);
        g.abilities.checkUnlocks(g.stats.level, g.notifications);
        break;

      case 'addPoints':
        g.talents.addPoints(10);
        break;

      case 'fullHeal':
        p.hp = g.stats.maxHp;
        break;

      case 'killPlayer':
        p.hp = 0;
        p.alive = false;
        break;

      case 'addDamage':
        p._cachedDamage += 100;
        break;

      case 'resetDamage':
        p.recompute();
        break;

      case 'killAllMonsters':
        for (const m of g.zones.monsters) {
          m.hp = 0;
          m.alive = false;
        }
        break;

      case 'killBoss':
        for (const m of g.zones.monsters) {
          if (m.archetypeId === 'boss') {
            m.hp = 0;
            m.alive = false;
          }
        }
        break;

      case 'spawnBoss': {
        const zone = g.zones.zones.find(z => z.danger === 'hard');
        if (zone) {
          g.zones.spawnInZone(zone, 'boss', p.x + 200, p.y);
        }
        break;
      }

      case 'spawnMonsters': {
        for (let i = 0; i < 20; i++) {
          const zone = g.zones.zones[Math.floor(Math.random() * g.zones.zones.length)];
          g.zones.spawnInZone(zone, null, p.x + (Math.random() - 0.5) * 600, p.y + (Math.random() - 0.5) * 600);
        }
        break;
      }

      case 'unlockAllAbilities': {
        for (const id in ABILITIES) {
          g.abilities.unlocked.add(id);
        }
        break;
      }

      case 'unlockAllTalents': {
        for (const id in TALENT_TREE) {
          g.talents.learned.add(id);
        }
        g.talents.effects = g.talents.recompute();
        p.refreshStats();
        break;
      }

      case 'resetTalents': {
        g.talents.learned = new Set(['root']);
        g.talents.effects = g.talents.recompute();
        g.talents.points = 30;
        p.refreshStats();
        break;
      }

      case 'toggleGodmode':
        this.godmode = !this.godmode;
        if (this.godmode) {
          const orig = p.takeDamage.bind(p);
          p._origTakeDamage = orig;
          p.takeDamage = () => {};
        } else if (p._origTakeDamage) {
          p.takeDamage = p._origTakeDamage;
        }
        break;

      case 'toggleInfiniteDash':
        this.infiniteDash = !this.infiniteDash;
        if (this.infiniteDash) {
          p._origMaxDash = p.maxDashCharges;
          p._origDashCharges = p.dashCharges;
          p._origDashTime = p.dashRechargeTime;
          p.maxDashCharges = 99;
          p.dashCharges = 99;
          p.dashRechargeTime = 0.01;
        } else {
          if (p._origMaxDash !== undefined) p.maxDashCharges = p._origMaxDash;
          if (p._origDashCharges !== undefined) p.dashCharges = p._origDashCharges;
          if (p._origDashTime !== undefined) p.dashRechargeTime = p._origDashTime;
        }
        break;

      case 'toggleSpeedBoost':
        this.speedBoost = !this.speedBoost;
        if (this.speedBoost) {
          p._origSpeed = p._cachedSpeed;
          p._cachedSpeed *= 2;
        } else if (p._origSpeed !== undefined) {
          p._cachedSpeed = p._origSpeed;
        }
        break;

      case 'nuke':
        for (const m of g.zones.monsters) {
          m.hp = 0;
          m.alive = false;
        }
        break;
    }
  }
}