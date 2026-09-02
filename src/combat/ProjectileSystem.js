import { spreadRadians } from './WeaponSystem.js';
import { damageAtRange } from '../data/weapons/weaponRegistry.js';
import { rayVsCircle } from '../utils/math.js';

/**
 * Hitscan projectiles. For each pellet: apply spread, ray against characters (enemies for the
 * player, the player for enemies) and bullet-blocking colliders, take the nearest hit, hand it to
 * HitSystem, draw a tracer. Player and enemy shots share VFX/audio so threats read by sound.
 */
export class ProjectileSystem {
  constructor(world) {
    this.world = world;
    this.shotsThisFrame = 0;
    this.totalShots = 0;
  }

  /**
   * shooter: { isPlayer, x, z, id }, origin {x,y,z}, dir {x,z} normalized, def = weapon def,
   * opts: { precision, enemyProfile, extraSpread }
   */
  fire(shooter, origin, dir, def, opts = {}) {
    const pellets = opts.pellets ?? def.pellets;
    const spread = spreadRadians(def, opts.precision) + (opts.extraSpread || 0);
    const baseAngle = Math.atan2(dir.x, dir.z);
    const maxRange = def.maxRange;
    const dmgBase = opts.damage ?? def.damage;
    for (let i = 0; i < pellets; i++) {
      const a = baseAngle + (Math.random() - 0.5) * 2 * spread;
      const dx = Math.sin(a), dz = Math.cos(a);
      this._trace(shooter, origin, dx, dz, def, maxRange, dmgBase, opts);
    }
    this.shotsThisFrame += 1;
    this.totalShots += 1;
  }

  _trace(shooter, origin, dx, dz, def, maxRange, dmgBase, opts) {
    const w = this.world;
    let best = null; // { t, kind, target, box }
    // characters
    if (shooter.isPlayer) {
      for (const e of w.enemies.alive()) {
        const t = rayVsCircle(origin.x, origin.z, dx, dz, e.x, e.z, e.def.radius);
        if (t !== null && t <= maxRange && t > 0.2 && (best === null || t < best.t)) best = { t, kind: 'enemy', target: e };
      }
    } else {
      const p = w.player;
      if (!p.health.dead) {
        const t = rayVsCircle(origin.x, origin.z, dx, dz, p.x, p.z, p.radius);
        if (t !== null && t <= maxRange && t > 0.2) best = { t, kind: 'player', target: p };
      }
    }
    // colliders
    const hit = w.colliders.raycastBullets(origin.x, origin.z, dx, dz, best ? best.t : maxRange);
    if (hit && (best === null || hit.t < best.t)) {
      // low props are passed over by bullets at chest height unless the shooter is close
      best = { t: hit.t, kind: 'box', box: hit.box };
    }
    const t = best ? best.t : maxRange;
    const ex = origin.x + dx * t, ez = origin.z + dz * t;
    const ey = best ? (best.kind === 'box' ? Math.min(origin.y, best.box.height - 0.05) : 1.05) : origin.y - 0.4 * (t / maxRange);
    w.vfx.tracer(origin.x, origin.y, origin.z, ex, ey, ez, def.tracerColor);
    if (!best) return;
    const dmg = damageAtRange({ ...def, damage: dmgBase }, t);
    w.hits.apply({ shooter, kind: best.kind, target: best.target, box: best.box, x: ex, y: ey, z: ez, dx, dz, damage: dmg, def, t });
  }

  endFrame() { this.shotsThisFrame = 0; }
}
