import * as THREE from 'three';
import { ParticlePool } from './ParticlePool.js';
import { Tracers } from './Tracers.js';
import { Decals } from './Decals.js';
import { Debris } from './Debris.js';
import { MuzzleFlash } from './MuzzleFlash.js';
import { VFX, SURFACE_VFX } from '../data/vfx/vfxRegistry.js';
import { randRange } from '../utils/math.js';

/**
 * Front door for all effects: particles by family, tracers, decals, debris, muzzle flashes.
 * Everything pooled and capped by the quality preset (docs/PERFORMANCE_BUDGET.md).
 */
export class VFXManager {
  constructor(scene, quality, lighting) {
    this.scene = scene;
    this.quality = quality;
    this.lighting = lighting;
    const p = quality.preset;
    const cap = (n) => Math.max(64, Math.floor(n * p.particleDensity));
    this.pools = {
      sparks: new ParticlePool(scene, { capacity: cap(600), color: 0xffcc66, additive: true, soft: 0.7 }),
      chips: new ParticlePool(scene, { capacity: cap(900), color: 0x8a6a45, soft: 0.3 }),
      smoke: new ParticlePool(scene, { capacity: cap(400), color: 0x8a8a90, soft: 0.95 }),
      glass: new ParticlePool(scene, { capacity: cap(700), color: 0xcfe6ff, additive: true, soft: 0.4 }),
      blood: new ParticlePool(scene, { capacity: cap(600), color: 0x5a0d0d, soft: 0.5 }),
    };
    this.tracers = new Tracers(scene, p.maxTracers);
    this.decals = new Decals(scene, p.maxDecals);
    this.debrisSys = new Debris(scene, p.maxDebris, p.debrisLifetime);
    this.muzzle = new MuzzleFlash(scene, lighting);
    this._v = new THREE.Vector3();
  }

  get density() { return this.quality.preset.particleDensity; }

  /** Emit a family at (x,y,z) biased along direction (dx,dy,dz). */
  emit(family, x, y, z, dx = 0, dy = 1, dz = 0, scale = 1) {
    const def = VFX[family];
    if (!def) return;
    const pool = this.pools[def.pool];
    if (!pool) return;
    const count = Math.max(1, Math.round(def.count * this.density * scale));
    const len = Math.hypot(dx, dy, dz) || 1;
    dx /= len; dy /= len; dz /= len;
    for (let i = 0; i < count; i++) {
      const sp = randRange(def.speed[0], def.speed[1]);
      const spread = 0.65;
      const vx = (dx + (Math.random() - 0.5) * 2 * spread) * sp;
      const vy = (dy + (Math.random() - 0.5) * 2 * spread * 0.7 + 0.3) * sp;
      const vz = (dz + (Math.random() - 0.5) * 2 * spread) * sp;
      pool.emit(x, y, z, vx, vy, vz, randRange(def.life[0], def.life[1]), def.size * (0.7 + Math.random() * 0.6), def.gravity, def.pool === 'smoke' ? 0.8 : 1.6);
    }
  }

  /** Surface-aware impact: particles + decal + returns sfx id. */
  impact(surface, x, y, z, nx, nz, decalScale = 1) {
    const s = SURFACE_VFX[surface] || SURFACE_VFX.wood;
    this.emit(s.vfx, x, y, z, nx, 0.5, nz);
    if (s.decal) this.decals.add(x, y, z, nx, nz, s.decal, decalScale);
    if (surface === 'wood' || surface === 'dirt') this.emit('dust', x, y, z, nx, 0.4, nz, 0.5);
    return s.sfx;
  }

  tracer(x0, y0, z0, x1, y1, z1, color) { this.tracers.add(x0, y0, z0, x1, y1, z1, color); }

  debris(x, y, z, kind, count, vx = 0, vz = 0) { this.debrisSys.spawn(x, y, z, kind, Math.round(count * this.density), vx, vz); }

  muzzleFlash(x, y, z, dx, dz, weapon) { this.muzzle.flash(x, y, z, dx, dz, weapon); this.emit('muzzle', x, y, z, dx, 0.1, dz, weapon.muzzle.flashScale); }

  update(dt) {
    for (const p of Object.values(this.pools)) p.update(dt);
    this.tracers.update(dt);
    this.debrisSys.update(dt);
    this.muzzle.update(dt);
  }

  clear() {
    for (const p of Object.values(this.pools)) p.clear();
    this.decals.clear();
    this.debrisSys.clear();
    this.tracers.clear();
  }

  get particleCount() { return Object.values(this.pools).reduce((n, p) => n + p.alive, 0); }
}
