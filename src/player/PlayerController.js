import * as THREE from 'three';
import { EV } from '../core/Events.js';
import { AimAssist } from '../combat/AimAssist.js';
import { resolveAssist } from '../data/aim.js';

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
    this.assist = new AimAssist(player.world);
    this.aimTarget = null;
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
      // ---- aim: raw input first, then assist (docs/MOBILE_REQUIREMENTS.md, Aiming)
      let rawX = this.aim.x, rawZ = this.aim.z, hasAimInput = false;
      if (input.aimVector) {
        const len = Math.hypot(input.aimVector.x, input.aimVector.y) || 1;
        rawX = input.aimVector.x / len; rawZ = input.aimVector.y / len;
        hasAimInput = true;
      } else if (input.aimScreen) {
        const g = w.ctx.camera.screenToGround(input.aimScreen.x, input.aimScreen.y, w.ctx.renderer.width, w.ctx.renderer.height, p.y + 1.0, this._ground);
        if (g) {
          const dx = g.x - p.x, dz = g.z - p.z;
          const len = Math.hypot(dx, dz);
          if (len > 0.15) { rawX = dx / len; rawZ = dz / len; hasAimInput = true; }
          this.aimPoint.copy(g);
        }
      }
      const preset = resolveAssist(w.ctx.settings.aimAssist, input.mode);
      if (hasAimInput) {
        const r = this.assist.apply(p.x, p.z, rawX, rawZ, preset);
        this.aim.x = r.x; this.aim.z = r.z;
      } else if (input.mode === 'touch') {
        // no thumb on the aim stick: track the nearest threat, else face where we are walking
        const face = this.assist.autoFace(p.x, p.z, preset);
        if (face) { this.aim.x = face.x; this.aim.z = face.z; }
        else if (Math.hypot(mx, mz) > 0.1) {
          const len = Math.hypot(mx, mz);
          this.aim.x = mx / len; this.aim.z = mz / len;
        }
      }
      this.aimTarget = this.assist.target;
      input.aimHasTarget = !!this.aimTarget;
      if (input.pressed('melee')) p.combat.tryMelee();
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

  /**
   * Context interaction. A tap does the cheap thing (open the door, or the single action on
   * offer); holding does `holdType` when the opening has a second, paid layer available. The
   * door toggle fires on release so that starting a barricade hold does not swing the door open
   * first (docs/PROPERTY_SYSTEM.md, Defenses).
   */
  _updateInteraction(dt, input, locked) {
    const p = this.p, w = p.world;
    const phase = w.waves.phase;
    const it = locked ? null : w.property.interactableNear(p.x, p.z, phase);
    const held = !locked && input.held('interact');
    let text = '';
    if (it) {
      const isToggle = it.type === 'open' || it.type === 'close';
      // what a hold buys here: an explicit holdType, or the interaction itself when it is paid
      const holdIt = it.holdType ? { type: it.holdType, portal: it.portal } : (isToggle ? null : it);
      const cost = holdIt ? w.property.barricades.costFor(holdIt) : 0;
      const LABELS = { open: 'OPEN DOOR', close: 'CLOSE DOOR', repair: 'REPAIR DOOR', board: 'BOARD WINDOW', barricade: 'BARRICADE' };
      text = LABELS[it.type] + (holdIt && holdIt.type === it.type && cost > 0 ? `  $${cost}` : '');
      if (holdIt && holdIt.type !== it.type) text += `   HOLD: ${LABELS[holdIt.type]} $${cost}`;
      const same = this.interaction && this.interaction.portal === it.portal && this.interaction.type === it.type;
      if (!same) { this.interaction = it; this.holdT = 0; this.holdNeeded = holdIt ? w.property.barricades.holdTimeFor(holdIt) : 0; }
      if (held && holdIt) {
        if (w.economy.cash < cost) {
          if (input.pressed('interact')) { w.ctx.audio.play('ui_denied'); w.events.emit(EV.TOAST, { text: 'NOT ENOUGH CASH' }); }
        } else {
          this.holdT += dt;
          if (this.holdT >= this.holdNeeded) {
            if (w.property.barricades.apply(holdIt, w.economy)) { w.ctx.audio.play('ui_buy'); w.ctx.audio.play('board_hit', { x: it.portal.x, z: it.portal.z }); }
            this.holdT = 0;
            this.interaction = null;
          }
        }
      } else {
        // released: a short press on a door is a toggle, a long one was an abandoned hold
        if (isToggle && this._heldLast && this.holdT < 0.3) w.property.doors.toggle(it.portal);
        else if (isToggle && !holdIt && input.pressed('interact')) w.property.doors.toggle(it.portal);
        this.holdT = 0;
      }
    } else { this.interaction = null; this.holdT = 0; }
    this._heldLast = held && !!it;
    const progress = this.holdNeeded > 0 ? this.holdT / this.holdNeeded : 0;
    if (text !== this.promptText || progress > 0 || this._lastProgress > 0) {
      this.promptText = text;
      w.events.emit(EV.INTERACT_PROMPT, { text, progress, hold: !!it && it.type !== 'open' && it.type !== 'close' });
    }
    this._lastProgress = progress;
  }
}
