import { el } from '../utils/dom.js';

/**
 * First-class touch controls: floating dual virtual sticks + context buttons.
 * Left half: move stick. Right half: aim stick; pushing past FIRE_THRESHOLD fires.
 * Buttons track pointer ids so multi-touch is reliable. See docs/MOBILE_REQUIREMENTS.md.
 */
const FIRE_THRESHOLD = 0.55;
const STICK_RADIUS = 60;

export class TouchInput {
  constructor(manager) {
    this.m = manager;
    this.root = el('div', { id: 'touch-layer', class: 'touch-layer' });
    document.body.appendChild(this.root);
    this.moveStick = this._makeStick('move');
    this.aimStick = this._makeStick('aim');
    this.buttons = {};
    this._pointers = new Map(); // pointerId -> {kind, stick}
    this.visible = false;
    this.scale = 1;
    this._buildButtons();
    this._bind();
  }

  setScale(s) { this.scale = s; this.root.style.setProperty('--touch-scale', String(s)); }

  setVisible(v) {
    this.visible = v;
    this.root.classList.toggle('active', v);
    if (!v) this._resetAll();
  }

  setPhase(phase) {
    // between-wave buttons
    this.buttons.shop.hidden = phase !== 'prep';
    this.buttons.ready.hidden = phase !== 'prep';
  }

  _makeStick(id) {
    const base = el('div', { class: 'stick-base', id: `stick-${id}` }, [el('div', { class: 'stick-knob' })]);
    base.style.display = 'none';
    this.root.appendChild(base);
    return { base, knob: base.firstChild, active: false, pointerId: null, ox: 0, oy: 0, x: 0, y: 0, mag: 0 };
  }

  _buildButtons() {
    const defs = [
      ['interact', 'E', 'INTERACT'], ['reload', 'R', 'RELOAD'], ['weaponCycle', 'Q', 'WEAPON'], ['dodge', '⤳', 'DODGE'],
      ['shop', '$', 'SHOP'], ['ready', '▶', 'READY'], ['pause', 'II', 'PAUSE'],
    ];
    const cluster = el('div', { class: 'touch-buttons' });
    for (const [action, glyph, label] of defs) {
      const b = el('button', { class: `touch-btn touch-btn-${action}`, 'data-action': action, 'aria-label': label },
        [el('span', { class: 'glyph', text: glyph }), el('span', { class: 'lbl', text: label })]);
      b.addEventListener('pointerdown', (e) => { e.preventDefault(); e.stopPropagation(); try { b.setPointerCapture(e.pointerId); } catch { /* synthetic pointer */ } b.classList.add('down'); this.m.press(action); });
      const up = (e) => { b.classList.remove('down'); this.m.release(action); };
      b.addEventListener('pointerup', up);
      b.addEventListener('pointercancel', up);
      b.addEventListener('lostpointercapture', up);
      this.buttons[action] = b;
      cluster.appendChild(b);
    }
    this.root.appendChild(cluster);
    this.buttons.shop.hidden = true;
    this.buttons.ready.hidden = true;
  }

  _bind() {
    const r = this.root;
    r.addEventListener('pointerdown', (e) => {
      if (e.target.closest('.touch-btn')) return;
      if (this.m.mode !== 'touch') this.m.setMode('touch');
      const left = e.clientX < window.innerWidth / 2;
      const stick = left ? this.moveStick : this.aimStick;
      if (stick.active) return;
      stick.active = true;
      stick.pointerId = e.pointerId;
      stick.ox = e.clientX; stick.oy = e.clientY;
      stick.x = 0; stick.y = 0; stick.mag = 0;
      stick.base.style.display = 'block';
      stick.base.style.left = `${e.clientX}px`;
      stick.base.style.top = `${e.clientY}px`;
      stick.knob.style.transform = 'translate(-50%,-50%)';
      this._pointers.set(e.pointerId, stick);
      try { r.setPointerCapture(e.pointerId); } catch { /* synthetic pointer */ }
      e.preventDefault();
    });
    r.addEventListener('pointermove', (e) => {
      const stick = this._pointers.get(e.pointerId);
      if (!stick) return;
      const R = STICK_RADIUS * this.scale;
      let dx = e.clientX - stick.ox, dy = e.clientY - stick.oy;
      const len = Math.hypot(dx, dy);
      const mag = Math.min(1, len / R);
      if (len > R) { dx = (dx / len) * R; dy = (dy / len) * R; }
      stick.x = len > 0 ? (dx / R) : 0;
      stick.y = len > 0 ? (dy / R) : 0;
      stick.mag = mag;
      stick.knob.style.transform = `translate(calc(-50% + ${dx}px), calc(-50% + ${dy}px))`;
      e.preventDefault();
    });
    const end = (e) => {
      const stick = this._pointers.get(e.pointerId);
      if (!stick) return;
      this._pointers.delete(e.pointerId);
      this._releaseStick(stick);
    };
    r.addEventListener('pointerup', end);
    r.addEventListener('pointercancel', end);
    window.addEventListener('touchstart', () => { if (this.m.mode !== 'touch') this.m.setMode('touch'); }, { passive: true, once: true });
  }

  _releaseStick(stick) {
    stick.active = false;
    stick.pointerId = null;
    stick.x = 0; stick.y = 0; stick.mag = 0;
    stick.base.style.display = 'none';
  }

  _resetAll() {
    this._releaseStick(this.moveStick);
    this._releaseStick(this.aimStick);
    this._pointers.clear();
  }

  update() {
    const m = this.m;
    // deadzone on move
    const mv = this.moveStick;
    const dz = 0.12;
    if (mv.mag > dz) {
      const k = (mv.mag - dz) / (1 - dz) / (mv.mag || 1);
      m.move.x = mv.x * k; m.move.y = mv.y * k;
    } else { m.move.x = 0; m.move.y = 0; }
    const am = this.aimStick;
    if (am.active && am.mag > 0.2) {
      m.aimVector = { x: am.x, y: am.y };
      m.fire = am.mag >= FIRE_THRESHOLD;
    } else {
      m.aimVector = null;
      m.fire = false;
    }
    m.aimScreen = null;
    m.precision = false;
  }
}
