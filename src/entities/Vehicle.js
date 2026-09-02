import * as THREE from 'three';
import { getMaterials } from '../world/Materials.js';
import { ColliderSet } from '../world/Colliders.js';
import { EV } from '../core/Events.js';
import { batchGroup } from '../world/Batch.js';
import { angleDamp, damp } from '../utils/math.js';

/**
 * Sedan used for enemy arrival and as the player's parked car. Drives a path, parks in a slot,
 * carries two headlight spots, becomes cover (collider + cover nodes). Not player-drivable.
 * See docs/GAME_DESIGN.md (Vehicles) and docs/FUTURE_FEATURES.md.
 */
export class Vehicle {
  constructor(world, { asset = 'VEH_Sedan_A', player = false } = {}) {
    this.world = world;
    this.player = player;
    this.group = new THREE.Group();
    this.x = 0; this.z = 0; this.yaw = 0;
    this.speed = 0;
    this.path = null;
    this.pathIndex = 0;
    this.slot = null;
    this.state = 'idle'; // idle | driving | parked
    this.headlightsOn = false;
    this.box = null;
    this.size = { x: 2.0, z: 4.6 };
    this.dustT = 0;
    const inst = world.assets.instance(asset);
    if (inst) { this.mesh = batchGroup(inst); this.group.add(this.mesh); }
    else this._buildProcedural();
    this._buildLights();
    world.scene.add(this.group);
  }

  _buildProcedural() {
    const M = getMaterials();
    const paint = this.player ? M.carPaintPlayer : M.carPaint;
    const tmp = new THREE.Group();
    const mk = (geo, mat, x, y, z) => { const m = new THREE.Mesh(geo, mat); m.position.set(x, y, z); m.castShadow = true; m.receiveShadow = true; tmp.add(m); return m; };
    mk(new THREE.BoxGeometry(1.9, 0.55, 4.5), paint, 0, 0.55, 0);              // lower body
    mk(new THREE.BoxGeometry(1.7, 0.5, 2.3), paint, 0, 1.05, -0.2);             // cabin
    mk(new THREE.BoxGeometry(1.62, 0.42, 2.1), M.carGlass, 0, 1.08, -0.2);      // glass
    mk(new THREE.BoxGeometry(1.95, 0.18, 0.5), M.metalDark, 0, 0.32, 2.3);      // bumper
    mk(new THREE.BoxGeometry(1.95, 0.18, 0.5), M.metalDark, 0, 0.32, -2.3);
    for (const [x, z] of [[-0.85, 1.5], [0.85, 1.5], [-0.85, -1.5], [0.85, -1.5]]) {
      const w = mk(new THREE.CylinderGeometry(0.34, 0.34, 0.24, 14), M.tire, x, 0.34, z);
      w.rotation.z = Math.PI / 2;
    }
    for (const s of [-1, 1]) {
      mk(new THREE.BoxGeometry(0.34, 0.16, 0.06), M.headlight, s * 0.65, 0.65, 2.26).name = 'headlight';
      mk(new THREE.BoxGeometry(0.34, 0.12, 0.06), M.taillight, s * 0.65, 0.65, -2.26);
    }
    if (this.player) { // dent of history: a small rust patch
      mk(new THREE.BoxGeometry(0.4, 0.2, 0.02), M.stone, -0.96, 0.6, 0.4);
    }
    this.mesh = batchGroup(tmp);
    this.group.add(this.mesh);
  }

  _buildLights() {
    this.lights = [];
    for (const s of [-1, 1]) {
      const spot = new THREE.SpotLight(0xfff0d0, 0, 34, Math.PI / 6.5, 0.6, 1.2);
      spot.position.set(s * 0.65, 0.7, 2.2);
      spot.target.position.set(s * 0.9, 0.2, 18);
      spot.castShadow = false;
      this.group.add(spot, spot.target);
      this.lights.push(spot);
    }
    this.lightsIntensity = 0;
  }

  setHeadlights(on) { this.headlightsOn = on; }

  place(x, z, yaw) {
    this.x = x; this.z = z; this.yaw = yaw;
    this.group.position.set(x, 0, z);
    this.group.rotation.y = yaw;
  }

  /** Register as cover/collider (called when parked). */
  makeSolid() {
    if (this.box) return;
    const c = Math.abs(Math.cos(this.yaw)), s = Math.abs(Math.sin(this.yaw));
    const sx = this.size.x * c + this.size.z * s, sz = this.size.x * s + this.size.z * c;
    this.box = this.world.colliders.add(ColliderSet.box(this.x, this.z, sx, sz, { kind: 'vehicle', surface: 'metal', height: 1.3, bullets: true, los: true }));
    this.coverNodes = this.world.cover.addFromBox(this.box, 0.8, 'vehicle');
    this.world.navDirty = true;
  }

  /** Drive path (array of {x,z}) then park at slot {x,z,rot}. */
  drive(path, slot) {
    this.path = path.concat([{ x: slot.x, z: slot.z }]);
    this.slot = slot;
    this.pathIndex = 0;
    this.state = 'driving';
    this.place(path[0].x, path[0].z, Math.atan2(path[1].x - path[0].x, path[1].z - path[0].z));
    this.speed = 7.5;
    this.setHeadlights(true);
    this.world.events.emit(EV.VEHICLE_ARRIVING, { vehicle: this });
    this.world.ctx.audio.play('engine_arrive', { x: this.x, z: this.z });
  }

  update(dt) {
    // headlights fade
    const target = this.headlightsOn ? 260 : 0;
    this.lightsIntensity = damp(this.lightsIntensity, target, 6, dt);
    for (const l of this.lights) l.intensity = this.lightsIntensity;
    if (this.state !== 'driving') return;
    const tgt = this.path[this.pathIndex];
    const dx = tgt.x - this.x, dz = tgt.z - this.z;
    const d = Math.hypot(dx, dz);
    const last = this.pathIndex === this.path.length - 1;
    const desiredSpeed = last ? Math.min(7.5, Math.max(1.2, d * 1.6)) : 7.5;
    this.speed = damp(this.speed, desiredSpeed, 3, dt);
    const targetYaw = Math.atan2(dx, dz);
    this.yaw = angleDamp(this.yaw, targetYaw, 4, dt);
    const step = Math.min(d, this.speed * dt);
    this.x += Math.sin(this.yaw) * step;
    this.z += Math.cos(this.yaw) * step;
    this.group.position.set(this.x, 0, this.z);
    this.group.rotation.y = this.yaw;
    this.dustT -= dt;
    if (this.dustT <= 0) { this.dustT = 0.12; this.world.vfx.emit('vehicleDust', this.x - Math.sin(this.yaw) * 2, 0.2, this.z - Math.cos(this.yaw) * 2, 0, 0.5, 0); }
    if (d < 0.25) {
      this.pathIndex++;
      if (this.pathIndex >= this.path.length) this._park();
    }
  }

  _park() {
    this.state = 'parked';
    this.speed = 0;
    this.yaw = this.slot.rot ?? this.yaw;
    this.group.rotation.y = this.yaw;
    this.makeSolid();
    this.world.ctx.audio.play('car_door', { x: this.x, z: this.z });
    setTimeout(() => this.world.ctx.audio.play('car_door', { x: this.x, z: this.z, pitch: 1.1 }), 350);
    this.world.events.emit(EV.VEHICLE_PARKED, { vehicle: this });
  }

  /** Spawn positions beside the doors. */
  doorPositions(count) {
    const out = [];
    for (let i = 0; i < count; i++) {
      const side = i % 2 === 0 ? 1 : -1;
      const along = 0.9 - Math.floor(i / 2) * 1.6;
      const lx = side * 1.6, lz = along;
      out.push({ x: this.x + Math.cos(this.yaw) * lx + Math.sin(this.yaw) * lz, z: this.z - Math.sin(this.yaw) * lx + Math.cos(this.yaw) * lz });
    }
    return out;
  }

  dispose() {
    this.world.scene.remove(this.group);
    if (this.box) { this.world.colliders.remove(this.box); this.box = null; }
    if (this.coverNodes) this.world.cover.nodes = this.world.cover.nodes.filter((n) => !this.coverNodes.includes(n));
  }
}
