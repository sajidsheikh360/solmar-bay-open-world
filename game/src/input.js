// Keyboard and mouse input for Solmar Bay.
// WASD move / drive, Shift run, E enter or steal a car, F punch, Space brake,
// P or Escape pause, Enter confirm, mouse drag to look around, click to shoot.
export class Input {
  constructor(canvas) {
    this.keys = new Set();
    this.pressed = new Set();
    this.mouseDown = false;
    this.clicked = false;
    this.lookDelta = 0;
    this._lastX = 0;
    this._dragging = false;
    window.addEventListener('keydown', (event) => {
      if (event.repeat) return;
      this.keys.add(event.code);
      this.pressed.add(event.code);
      if (['Space', 'ArrowUp', 'ArrowDown'].includes(event.code)) event.preventDefault();
    });
    window.addEventListener('keyup', (event) => this.keys.delete(event.code));
    canvas.addEventListener('mousedown', (event) => {
      this.mouseDown = true;
      this.clicked = true;
      this._dragging = true;
      this._lastX = event.clientX;
    });
    window.addEventListener('mouseup', () => {
      this.mouseDown = false;
      this._dragging = false;
    });
    window.addEventListener('mousemove', (event) => {
      if (!this._dragging) return;
      this.lookDelta += event.clientX - this._lastX;
      this._lastX = event.clientX;
    });
    window.addEventListener('blur', () => this.keys.clear());
  }

  down(code) {
    return this.keys.has(code);
  }

  // True once, on the frame the key went down.
  take(code) {
    if (!this.pressed.has(code)) return false;
    this.pressed.delete(code);
    return true;
  }

  takeClick() {
    const was = this.clicked;
    this.clicked = false;
    return was;
  }

  takeLook() {
    const delta = this.lookDelta;
    this.lookDelta = 0;
    return delta;
  }

  // -1 / 0 / +1 steering and throttle from WASD or arrows.
  steer() {
    const left = this.down('KeyA') || this.down('ArrowLeft') ? 1 : 0;
    const right = this.down('KeyD') || this.down('ArrowRight') ? 1 : 0;
    return left - right;
  }

  throttle() {
    const up = this.down('KeyW') || this.down('ArrowUp') ? 1 : 0;
    const down = this.down('KeyS') || this.down('ArrowDown') ? 1 : 0;
    return up - down;
  }

  endFrame() {
    this.pressed.clear();
  }
}
