/**
 * Desktop input: WASD move, mouse aim, LMB fire, RMB precision, R reload, E interact,
 * Space dodge, 1-4 weapons, Tab shop, Enter ready, ESC pause, F3 debug.
 */
const KEYMAP = {
  KeyR: 'reload', KeyE: 'interact', Space: 'dodge', Digit1: 'slot0', Digit2: 'slot1', Digit3: 'slot2', Digit4: 'slot3',
  Tab: 'shop', KeyB: 'shop', Enter: 'ready', Escape: 'pause', F3: 'debug', KeyQ: 'weaponCycle', KeyF: 'interact',
};

export class KeyboardMouseInput {
  constructor(manager) {
    this.m = manager;
    this.keys = new Set();
    this.mouse = { x: window.innerWidth / 2, y: window.innerHeight / 2 };
    this.mouseDown = false;
    this.rightDown = false;
    this._bound = false;
    this.bind();
  }

  bind() {
    if (this._bound) return;
    this._bound = true;
    window.addEventListener('keydown', (e) => {
      if (e.repeat) return;
      if (this.m.mode !== 'desktop') this.m.setMode('desktop');
      this.keys.add(e.code);
      const action = KEYMAP[e.code];
      if (action) {
        this.m.press(action);
        if (e.code === 'Tab' || e.code === 'Space') e.preventDefault();
      }
    });
    window.addEventListener('keyup', (e) => {
      this.keys.delete(e.code);
      const action = KEYMAP[e.code];
      if (action) this.m.release(action);
    });
    window.addEventListener('blur', () => { this.keys.clear(); this.mouseDown = false; this.rightDown = false; this.m.flush(); });
    window.addEventListener('mousemove', (e) => {
      this.mouse.x = e.clientX; this.mouse.y = e.clientY;
      if (this.m.mode !== 'desktop' && e.movementX !== 0) this.m.setMode('desktop');
    });
    window.addEventListener('mousedown', (e) => {
      if (e.target && e.target.closest && e.target.closest('.ui-block')) return;
      if (e.button === 0) this.mouseDown = true;
      if (e.button === 2) this.rightDown = true;
    });
    window.addEventListener('mouseup', (e) => {
      if (e.button === 0) this.mouseDown = false;
      if (e.button === 2) this.rightDown = false;
    });
    window.addEventListener('contextmenu', (e) => e.preventDefault());
  }

  update() {
    const k = this.keys;
    let x = 0, y = 0;
    if (k.has('KeyA') || k.has('ArrowLeft')) x -= 1;
    if (k.has('KeyD') || k.has('ArrowRight')) x += 1;
    if (k.has('KeyW') || k.has('ArrowUp')) y -= 1;
    if (k.has('KeyS') || k.has('ArrowDown')) y += 1;
    const len = Math.hypot(x, y);
    if (len > 1) { x /= len; y /= len; }
    this.m.move.x = x; this.m.move.y = y;
    this.m.aimScreen = this.mouse;
    this.m.aimVector = null;
    this.m.fire = this.mouseDown;
    this.m.precision = this.rightDown;
  }
}
