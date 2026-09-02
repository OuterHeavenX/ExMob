import * as THREE from 'three';
import { EV } from '../core/Events.js';
import { CONFIG } from '../core/Config.js';

/**
 * Lightweight cinematic events: intro, vehicle arrival emphasis, chapter compromised.
 * Sequences are async functions using small helpers; no film editor (docs/GAME_DESIGN.md).
 */
export class CinematicDirector {
  constructor(world) {
    this.world = world;
    this.active = false;
    this._arrivalCooldown = 0;
    this._token = 0;
  }

  get cam() { return this.world.ctx.camera; }
  get ui() { return this.world.ui; }

  wait(s) { return new Promise((r) => setTimeout(r, s * 1000)); }

  _begin() { this.active = true; this.world.cinematicActive = true; this.world.events.emit(EV.CINEMATIC_START, {}); }
  _end() { this.active = false; this.world.cinematicActive = false; this.cam.setOverride(null); this.world.events.emit(EV.CINEMATIC_END, {}); }

  /** Opening: black, wind, phone, headlights. Resolves when gameplay may begin. */
  async intro() {
    const w = this.world;
    if (CONFIG.skipIntro) { this.ui.fade(0, 0.3); return; }
    const token = ++this._token;
    this._begin();
    this.ui.fade(1, 0);
    this.ui.letterbox(true);
    await this.wait(0.8);
    // interior: slow push on Ray at the table
    const p = w.player;
    this.cam.setOverride(new THREE.Vector3(p.x + 2.6, 2.4, p.z - 1.9), new THREE.Vector3(p.x, 1.1, p.z), 0.01);
    this.cam.update(0.05);
    this.ui.fade(0, 2.2);
    this.ui.caption('FOUR MONTHS OUT.', 2.6);
    await this.wait(3.2);
    if (token !== this._token) return;
    this.cam.setOverride(new THREE.Vector3(p.x + 1.8, 2.1, p.z - 1.2), new THREE.Vector3(p.x, 1.1, p.z), 3.5);
    await this.wait(2.2);
    // phone
    const phone = w.builder.storyVisuals.burner_phone;
    const screen = phone && phone.getObjectByName('screen');
    w.ctx.audio.play('phone_buzz');
    if (screen) screen.material.emissiveIntensity = 2.5;
    this.ui.caption('"ray. its teddy. we know where the porch is. sorry."', 3.6);
    await this.wait(3.8);
    if (token !== this._token) return;
    // headlights through the trees
    this.ui.caption('THEY FOUND YOU.', 2.4);
    this.cam.setOverride(new THREE.Vector3(2, 6, 14), new THREE.Vector3(0, 1, 30), 2.0);
    await this.wait(2.4);
    if (token !== this._token) return;
    this.ui.letterbox(false);
    if (screen) screen.material.emissiveIntensity = 0.8;
    this._end();
  }

  /** Brief emphasis on an approaching vehicle (headlights in the trees). */
  vehicleApproaching(v) {
    if (this._arrivalCooldown > 0 || this.active) return;
    this._arrivalCooldown = 12;
    const w = this.world;
    this.cam.zoomTarget = 1.22;
    w.events.emit(EV.TOAST, { text: 'ENGINE APPROACHING' });
    setTimeout(() => { this.cam.zoomTarget = 1; }, 5500);
  }

  vehicleArrived(v) {
    this.cam.shake(0.15);
  }

  /** Chapter end: the cabin is compromised. */
  async compromised() {
    const w = this.world;
    this._begin();
    w.ctx.audio.setMusicState('silence');
    this.ui.letterbox(true);
    await this.wait(1.0);
    const p = w.player;
    this.cam.setOverride(new THREE.Vector3(p.x + 3, 4, p.z - 3), new THREE.Vector3(p.x, 1, p.z), 3);
    this.ui.caption('More engines on the county road.', 3.2);
    await this.wait(3.4);
    this.ui.caption('He takes the coffee can, the book, and the car.', 3.4);
    await this.wait(3.6);
    this.ui.fade(1, 2.0);
    await this.wait(2.2);
    this.ui.letterbox(false);
    this._end();
    this.ui.showChapterComplete();
  }

  update(dt) { if (this._arrivalCooldown > 0) this._arrivalCooldown -= dt; }

  abort() { this._token++; this.ui.letterbox(false); this.ui.fade(0, 0.2); this._end(); }
}
