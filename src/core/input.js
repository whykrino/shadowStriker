'use strict';

class Input {
  constructor() {
    this.keys = new Set();
    this.pressed = new Set();
    this.mouseScreenX = 0;
    this.mouseScreenY = 0;
    this.mouseDown = false;
    this.mouseRightDown = false;
    this.clickBuffered = false;
    this.bufferTime = 0;
    this.rightClickBuffered = false;
    this.rightBufferTime = 0;

    this._dashConsumed = false;

    window.addEventListener('keydown', (e) => {
      if (!this.keys.has(e.code)) this.pressed.add(e.code);
      if ((e.code === 'Space' || e.code === 'KeyJ') && !this.keys.has(e.code)) {
        this.clickBuffered = true;
        this.bufferTime = 0.22;
      }
      if ((e.code === 'ShiftLeft' || e.code === 'ShiftRight') && !this.keys.has(e.code)) {
        this._dashConsumed = false;
      }
      this.keys.add(e.code);
      if (e.code === 'Space' || e.code === 'KeyU' || e.code === 'KeyI' || e.code === 'KeyK') e.preventDefault();
    });
    window.addEventListener('keyup', (e) => this.keys.delete(e.code));
    window.addEventListener('blur', () => {
      this.keys.clear();
      this.mouseDown = false;
      this.mouseRightDown = false;
    });

    window.addEventListener('mousemove', (e) => {
      this.mouseScreenX = e.clientX;
      this.mouseScreenY = e.clientY;
    });
    window.addEventListener('mousedown', (e) => {
      if (e.button === 0) {
        this.mouseDown = true;
        this.clickBuffered = true;
        this.bufferTime = 0.22;
      } else if (e.button === 2) {
        this.mouseRightDown = true;
        this.rightClickBuffered = true;
        this.rightBufferTime = 0.22;
      }
    });
    window.addEventListener('mouseup', (e) => {
      if (e.button === 0) this.mouseDown = false;
      else if (e.button === 2) this.mouseRightDown = false;
    });
    window.addEventListener('contextmenu', (e) => e.preventDefault());
  }

  isDown(code) { return this.keys.has(code); }

  wasPressed(code) {
    if (this.pressed.has(code)) {
      this.pressed.delete(code);
      return true;
    }
    return false;
  }

  endFrame() { this.pressed.clear(); }

  get moveVector() {
    let x = 0, y = 0;
    if (this.isDown('KeyW') || this.isDown('ArrowUp'))    y -= 1;
    if (this.isDown('KeyS') || this.isDown('ArrowDown'))  y += 1;
    if (this.isDown('KeyA') || this.isDown('ArrowLeft'))  x -= 1;
    if (this.isDown('KeyD') || this.isDown('ArrowRight')) x += 1;
    return { x, y };
  }

  get attacking() {
    return this.mouseDown || this.isDown('Space') || this.isDown('KeyJ');
  }

  consumeClick(dt) {
    if (this.bufferTime > 0) this.bufferTime -= dt;
    if (this.clickBuffered && this.bufferTime > 0) {
      this.clickBuffered = false;
      this.bufferTime = 0;
      return true;
    }
    this.clickBuffered = false;
    return false;
  }

  consumeRightClick(dt) {
    if (this.rightBufferTime > 0) this.rightBufferTime -= dt;
    if (this.rightClickBuffered && this.rightBufferTime > 0) {
      this.rightClickBuffered = false;
      this.rightBufferTime = 0;
      return true;
    }
    this.rightClickBuffered = false;
    return false;
  }

  get dashing() {
    return this.isDown('ShiftLeft') || this.isDown('ShiftRight');
  }

  consumeDash() {
    if (this._dashConsumed) return false;
    if (this.isDown('ShiftLeft') || this.isDown('ShiftRight')) {
      this._dashConsumed = true;
      return true;
    }
    return false;
  }
}