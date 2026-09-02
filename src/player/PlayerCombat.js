import * as THREE from 'three';
import { WeaponState } from '../combat/WeaponSystem.js';
import { ReloadSystem } from '../combat/ReloadSystem.js';
import { WEAPONS, WEAPON_SLOTS } from '../data/weapons/weaponRegistry.js';
import { EV } from '../core/Events.js';

/** Player weapons: inventory of WeaponState, equip, fire, reload, ammo purchases. */
export class PlayerCombat {
  constructor(player) {
    this.p = player;
    this.weapons = {};
    for (const id of WEAPON_SLOTS) this.weapons[id] = new WeaponState(id, { owned: WEAPONS[id].owned });
    this.equipped = 'pistol';
    this.reload = new ReloadSystem(player.world.ctx.audio, player.world.events);
    this.now = 0;
    this._muzzle = new THREE.Vector3();
    this.swapT = 0;
  }

  get current() { return this.weapons[this.equipped]; }
  get events() { return this.p.world.events; }

  ownedIds() { return WEAPON_SLOTS.filter((id) => this.weapons[id].owned); }

  equip(id, silent = false) {
    if (!this.weapons[id] || !this.weapons[id].owned || id === this.equipped) return false;
    this.reload.cancel(this.current);
    this.equipped = id;
    this.swapT = 0.25;
    this.p.rig.setWeapon(id);
    if (!silent) this.p.world.ctx.audio.play('ui_click');
    this.events.emit(EV.PLAYER_WEAPON, { id, weapon: this.current });
    this.emitAmmo();
    return true;
  }

  cycle() {
    const ids = this.ownedIds();
    const i = ids.indexOf(this.equipped);
    this.equip(ids[(i + 1) % ids.length]);
  }

  unlock(id) {
    const w = this.weapons[id];
    if (!w || w.owned) return false;
    w.owned = true;
    w.mag = w.def.magSize;
    w.reserve = w.def.reserveStart;
    this.events.emit(EV.PLAYER_WEAPON, { id: this.equipped, weapon: this.current, unlocked: id });
    return true;
  }

  refill(scope = 'current') {
    if (scope === 'current') this.current.refill();
    else for (const w of Object.values(this.weapons)) if (w.owned) w.refill();
    this.emitAmmo();
  }

  emitAmmo() {
    const w = this.current;
    this.events.emit(EV.PLAYER_AMMO, { id: w.id, mag: w.mag, magSize: w.def.magSize, reserve: w.reserve, reloading: w.reloading });
  }

  startReload() {
    const w = this.current;
    if (this.reload.start(w, { x: this.p.x, z: this.p.z })) { this.p.rig.reload?.(); this.events.emit(EV.PLAYER_RELOAD, { id: w.id, time: w.def.reloadTime }); this.emitAmmo(); }
  }

  /** trigger: held state; precision: bool; aim dir {x,z}. */
  update(dt, trigger, precision, aim) {
    this.now += dt;
    if (this.swapT > 0) this.swapT -= dt;
    const w = this.current;
    if (this.reload.update(w, dt, { x: this.p.x, z: this.p.z })) this.emitAmmo();
    const canFire = !this.p.health.dead && this.swapT <= 0 && !this.p.world.cinematicActive && !this.p.movement.dodging;
    if (canFire && w.canFire(this.now, trigger)) {
      this._fire(w, precision, aim);
    } else if (trigger && !w.triggerWasDown && w.mag === 0 && !w.reloading && canFire) {
      this.p.world.ctx.audio.play(w.def.sfx.empty);
      if (w.reserve > 0) this.startReload();
    }
    w.triggerWasDown = trigger;
  }

  _fire(w, precision, aim) {
    const p = this.p;
    w.consume(this.now);
    const m = p.rig.muzzleWorld(this._muzzle);
    const origin = { x: p.x + aim.x * 0.55, y: p.y + 1.25, z: p.z + aim.z * 0.55 };
    p.world.projectiles.fire({ isPlayer: true, x: p.x, z: p.z, id: 'player' }, origin, aim, w.def, { precision });
    p.world.vfx.muzzleFlash(origin.x, origin.y, origin.z, aim.x, aim.z, w.def);
    p.world.ctx.audio.play(w.def.sfx.fire, { pitch: 0.95 + Math.random() * 0.1 });
    p.world.ctx.camera.shake(w.def.recoil.camera);
    p.rig.kick(w.def.recoil.kick * 4);
    p.world.stats.shotsFired++;
    this.events.emit(EV.PLAYER_FIRE, { id: w.id, x: origin.x, z: origin.z });
    this.emitAmmo();
    if (w.mag === 0 && w.reserve > 0 && w.def.mode !== 'pump') setTimeout(() => { if (this.current === w && w.mag === 0) this.startReload(); }, 250);
    else if (w.def.mode === 'pump' && w.mag > 0 && w.def.sfx.pump) setTimeout(() => p.world.ctx.audio.play(w.def.sfx.pump), 220);
  }

  toSave() {
    const out = {};
    for (const [id, w] of Object.entries(this.weapons)) if (w.owned) out[id] = w.toJSON();
    return out;
  }

  fromSave(weapons, equipped) {
    for (const [id, w] of Object.entries(this.weapons)) {
      const s = weapons[id];
      if (s) { w.owned = true; w.mag = s.mag; w.reserve = s.reserve; } else { w.owned = WEAPONS[id].owned; }
    }
    this.equipped = this.weapons[equipped]?.owned ? equipped : 'pistol';
    this.p.rig.setWeapon(this.equipped);
    this.emitAmmo();
    this.events.emit(EV.PLAYER_WEAPON, { id: this.equipped, weapon: this.current });
  }
}
