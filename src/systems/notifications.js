'use strict';

class NotificationSystem {
  constructor(audio) {
    this.container = document.getElementById('notifications');
    this.items = [];
    this.audio = audio || null;
  }

  push({ title, text, icon, type, duration }) {
    const el = document.createElement('div');
    el.className = 'notif' + (type ? ' ' + type : '');
    el.innerHTML =
      '<div class="notif-icon">' + (icon || '★') + '</div>' +
      '<div class="notif-body">' +
        '<div class="notif-title">' + title + '</div>' +
        '<div class="notif-text">' + text + '</div>' +
      '</div>';

    this.container.appendChild(el);

    const item = { el, timer: duration || 7.0 };
    this.items.push(item);

    while (this.items.length > 4) {
      const oldest = this.items.shift();
      oldest.el.remove();
    }
  }

  update(dt) {
    for (let i = this.items.length - 1; i >= 0; i--) {
      const it = this.items[i];
      it.timer -= dt;
      if (it.timer <= 0 && !it.el.classList.contains('out')) {
        it.el.classList.add('out');
        it.timer = -0.6;
      } else if (it.timer < -0.5) {
        it.el.remove();
        this.items.splice(i, 1);
      }
    }
  }

  ability(title, text, icon) {
    this.push({ title, text, icon: icon || '✦', type: 'ability', duration: 8.0 });
    if (this.audio) this.audio.notificationAbility();
  }

  info(title, text, icon) {
    this.push({ title, text, icon: icon || '◈', duration: 6.0 });
    if (this.audio) this.audio.notificationInfo();
  }

  danger(title, text, icon) {
    this.push({ title, text, icon: icon || '!', type: 'danger', duration: 8.0 });
    if (this.audio) this.audio.notificationDanger();
  }
}