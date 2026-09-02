import * as THREE from 'three';
import { EV } from '../core/Events.js';

/**
 * Turns InputManager state into player actions: move, aim (screen unproject or stick vector),
 * fire, reload, weapon select, dodge, and the context interaction with hold progress.
 */
export class PlayerController {
  constructor(player) {
    this.p = player;
    this.aim = { x: 0, z: 1 };
    this.aimPoint = new THREE.Vector3();
    this._ground = new THREE.Vector3();
    this.interaction = null;
    this.holdT = 0;
    this.holdNeeded = 0;
    this.promptText = '';
  }

  update(dt) {
    const p = this.p, w = p.world, input = w.ctx.input;
    const locked = w.cinematicActive || p.health.dead || w.paused;
    let mx = 0, mz = 0, fire = false, precision = false;
    if (!locked) {
      mx = input.move.x; mz = input.move.y;
      fire = input.fire;
      precision = input.precision;
      // aim
      if (input.aimVector) {
        const len = Math.hypot(input.aimVector.x, input.aimVector.y) || 1;
        this.aim.x = input.aimVector.x / len; this.aim.z = input.aimVector.y / len;
      } else if (input.aimScreen) {
        const g = w.ctx.camera.screenToGround(input.aimScreen.x, input.aimScreen.y, w.ctx.renderer.width, w.ctx.renderer.height, p.y + 1.0, this._ground);
        if (g) {
          const dx = g.x - p.x, dz = g.z - p.z;
          const len = Math.hypot(dx, dz);
          if (len > 0.15) { this.aim.x = dx / len; this.aim.z = dz / len; }
          this.aimPoint.copy(g);
        }
      } else if (Math.hypot(mx, mz) > 0.1 && input.mode === 'touch') {
        // touch: no aim stick -> face movement direction
        const len = Math.hypot(mx, mz);
        this.aim.x = mx / len; this.aim.z = mz / len;
      }
      if (input.pressed('dodge')) p.movement.tryDodge(mx, mz);
      if (input.pressed('reload')) p.combat.startReload();
      if (input.pressed('weaponCycle')) p.combat.cycle();
      for (let i = 0; i < 4; i++) if (input.pressed('slot' + i)) { const id = ['pistol', 'revolver', 'shotgun', 'smg'][i]; p.combat.equip(id); }
    }
    p.yaw = Math.atan2(this.aim.x, this.aim.z);
    p.movement.update(dt, mx, mz, precision);
    p.combat.update(dt, fire, precision, this.aim);
    this._updateInteraction(dt, input, locked);
    w.ctx.camera.aimDir.set(this.aim.x, this.aim.z);
  }

  _updateInteraction(dt, input, locked) {
    const p = this.p, w = p.world;
    const phase = w.waves.phase;
    const it = locked ? null : w.property.interactableNear(p.x, p.z, phase);
    let text = '';
    if (it) {
      const cost = w.property.barricades.costFor(it);
      const label = { open: 'OPEN DOOR', close: 'CLOSE DOOR', repair: 'REPAIR DOOR', board: 'BOARD WINDOW' }[it.type];
      text = cost > 0 ? `${label}  $${cost}` : label;
      const same = this.interaction && this.interaction.portal === it.portal && this.interaction.type === it.type;
      if (!same) { this.interaction = it; this.holdT = 0; this.holdNeeded = w.property.barricades.holdTimeFor(it); }
      if (it.type === 'open' || it.type === 'close') {
        if (input.pressed('interact')) w.property.doors.toggle(it.portal);
      } else if (input.held('interact')) {
        if (w.economy.cash < cost) {
          if (input.pressed('interact')) { w.ctx.audio.play('ui_denied'); w.events.emit(EV.TOAST, { text: 'NOT ENOUGH CASH' }); }
        } else {
          this.holdT += dt;
          if (this.holdT >= this.holdNeeded) {
            if (w.property.barricades.apply(it, w.economy)) { w.ctx.audio.play('ui_buy'); w.ctx.audio.play('board_hit', { x: it.portal.x, z: it.portal.z }); }
            this.holdT = 0;
            this.interaction = null;
          }
        }
      } else this.holdT = 0;
    } else { this.interaction = null; this.holdT = 0; }
    const progress = this.holdNeeded > 0 ? this.holdT / this.holdNeeded : 0;
    if (text !== this.promptText || progress > 0 || this._lastProgress > 0) {
      this.promptText = text;
      w.events.emit(EV.INTERACT_PROMPT, { text, progress, hold: !!it && (it.type === 'repair' || it.type === 'board') });
    }
    this._lastProgress = progress;
  }
}
