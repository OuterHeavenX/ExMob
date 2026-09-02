import { KeyboardMouseInput } from './KeyboardMouseInput.js';
import { TouchInput } from './TouchInput.js';
import { EV } from '../core/Events.js';

/**
 * Unified input state consumed by PlayerController and UI.
 * move: {x, y} in [-1,1] (x east, y south)
 * aimScreen: {x, y} pixels (desktop) or null; aimVector: {x, y} world XZ direction (touch) or null
 * Edge-triggered actions via pressed(name); level via held(name).
 */
export class InputManager {
  constructor(events, { forceTouch = false, device } = {}) {
    this.events = events;
    this.move = { x: 0, y: 0 };
    this.aimScreen = null;
    this.aimVector = null;
    this.fire = false;
    this.precision = false;
    this._held = new Set();
    this._pressed = new Set();
    this.mode = forceTouch || (device && device.isMobile) ? 'touch' : 'desktop';
    this.kbm = new KeyboardMouseInput(this);
    this.touch = new TouchInput(this);
    this.touch.setVisible(this.mode === 'touch');
    this.enabled = true;
  }

  setMode(mode) {
    if (this.mode === mode) return;
    this.mode = mode;
    this.touch.setVisible(mode === 'touch');
    this.events.emit(EV.INPUT_MODE, { mode });
  }

  /** Called by input sources. */
  press(name) { if (!this._held.has(name)) this._pressed.add(name); this._held.add(name); }
  release(name) { this._held.delete(name); }
  tap(name) { this._pressed.add(name); }

  pressed(name) { return this._pressed.has(name); }
  held(name) { return this._held.has(name); }

  /** Clear edge state at the end of the simulation frame. */
  endFrame() { this._pressed.clear(); }

  /** Drop all held state (e.g. when a menu opens). */
  flush() { this._held.clear(); this._pressed.clear(); this.fire = false; this.move.x = 0; this.move.y = 0; }

  update() {
    if (this.mode === 'touch') this.touch.update(); else this.kbm.update();
  }
}
