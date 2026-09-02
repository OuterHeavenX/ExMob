import * as THREE from 'three';
import { getMaterials } from '../world/Materials.js';
import { Pool } from '../utils/Pool.js';
import { ECONOMY } from '../data/economy/economyRegistry.js';
import { EV } from '../core/Events.js';

/** Pooled cash bundles dropped by enemies. Bob, spin, magnet toward the player, collect. */
export class CashPickups {
  constructor(world) {
    this.world = world;
    const M = getMaterials();
    this.pool = new Pool({
      create: () => {
        const g = new THREE.Group();
        const bundle = new THREE.Mesh(new THREE.BoxGeometry(0.22, 0.08, 0.12), M.cash);
        const band = new THREE.Mesh(new THREE.BoxGeometry(0.06, 0.09, 0.13), M.cashBand);
        bundle.castShadow = true;
        g.add(bundle, band);
        g.visible = false;
        world.scene.add(g);
        return { group: g, value: 0, x: 0, z: 0, y: 0, t: 0, life: 0, active: false };
      },
      reset: (p) => { p.group.visible = false; p.active = false; },
      max: 40,
      warm: 8,
    });
  }

  spawn(x, z, value) {
    const p = this.pool.acquire();
    p.x = x + (Math.random() - 0.5) * 0.6;
    p.z = z + (Math.random() - 0.5) * 0.6;
    p.y = this.world.property.groundHeight(p.x, p.z);
    p.value = value;
    p.t = Math.random() * 6;
    p.life = ECONOMY.cashPickupLifetime;
    p.active = true;
    p.group.visible = true;
    p.group.position.set(p.x, p.y + 0.06, p.z);
    p.group.rotation.set(0, Math.random() * 6, 0);
    return p;
  }

  update(dt, player) {
    const px = player.x, pz = player.z;
    for (const p of Array.from(this.pool.active)) {
      if (!p.active) continue;
      p.t += dt;
      p.life -= dt;
      const d = Math.hypot(px - p.x, pz - p.z);
      if (d < ECONOMY.cashPickupMagnetRadius) {
        const k = Math.min(1, dt * 9);
        p.x += (px - p.x) * k;
        p.z += (pz - p.z) * k;
      }
      if (d < 0.45) {
        this.world.economy.addCash(p.value, 'pickup');
        this.world.events.emit(EV.CASH_PICKUP, { value: p.value, x: p.x, z: p.z });
        this.world.ctx.audio.play('cash_pickup', { x: p.x, z: p.z });
        this.pool.release(p);
        continue;
      }
      if (p.life <= 0) { this.pool.release(p); continue; }
      p.group.position.set(p.x, p.y + 0.06 + Math.sin(p.t * 3) * 0.02, p.z);
      p.group.rotation.y += dt * 1.2;
    }
  }

  clear() { this.pool.releaseAll(); }
  get count() { return this.pool.size; }
}
