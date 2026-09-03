/**
 * Close-quarters melee: a weapon-butt strike in an arc in front of the player.
 * Ray has done this before; it is the answer to someone who gets inside your gun.
 *
 * The geometry helpers are pure and node-safe (unit-tested in tests/melee.test.js); the system
 * class applies damage, knockback, VFX and audio through the world. Stats come from each
 * weapon's `melee` block in the weapon registry. See docs/WEAPONS.md (Melee).
 */

/** Cosine of the half-arc for an arc width in degrees. */
export function arcCosine(arcDeg) {
  return Math.cos((arcDeg * Math.PI) / 360);
}

/**
 * Is a circular target inside the strike arc?
 * `range` is measured to the target's surface, not its center, so wide enemies are easier to
 * reach. A target whose body already overlaps the swing origin always counts, so someone
 * pressed against the player can never be missed by a fraction of a degree.
 */
export function inStrikeArc(ox, oz, dirX, dirZ, tx, tz, targetRadius, range, cosHalfArc) {
  const dx = tx - ox, dz = tz - oz;
  const d = Math.hypot(dx, dz);
  if (d - targetRadius > range) return false;
  if (d <= targetRadius + 0.2) return true;
  const dot = (dx / d) * dirX + (dz / d) * dirZ;
  return dot >= cosHalfArc;
}

/**
 * Targets from `candidates` ({ x, z, radius }) that are inside the arc, nearest first,
 * limited to `maxTargets`. `losBlocked(tx, tz)` rejects targets behind cover.
 */
export function selectStrikeTargets(ox, oz, dirX, dirZ, def, candidates, losBlocked = null) {
  const cos = arcCosine(def.arcDeg);
  const out = [];
  for (const c of candidates) {
    const r = c.radius ?? 0.35;
    if (!inStrikeArc(ox, oz, dirX, dirZ, c.x, c.z, r, def.range, cos)) continue;
    if (losBlocked && losBlocked(c.x, c.z)) continue;
    out.push({ target: c, dist: Math.hypot(c.x - ox, c.z - oz) - r });
  }
  out.sort((a, b) => a.dist - b.dist);
  return out.slice(0, def.maxTargets ?? 2).map((e) => e.target);
}

export class MeleeSystem {
  constructor(world) {
    this.world = world;
    this.zoomPulseT = 0;
  }

  /** Candidate list for the HUD hint and for striking. */
  enemyCandidates() {
    return this.world.enemies.alive().map((e) => ({ x: e.x, z: e.z, radius: e.def.radius, enemy: e }));
  }

  /** True if anything meleeable is inside the arc right now (drives the HUD hint). */
  hasTarget(ox, oz, dirX, dirZ, def) {
    const los = (tx, tz) => this.world.colliders.segmentBlocked(ox, oz, tx, tz);
    return selectStrikeTargets(ox, oz, dirX, dirZ, def, this.enemyCandidates(), los).length > 0;
  }

  /**
   * Resolve a swing. Returns { enemyHits, propHits, kills }.
   * Called by PlayerCombat when the windup completes.
   */
  strike(origin, dir, def) {
    const w = this.world;
    const los = (tx, tz) => w.colliders.segmentBlocked(origin.x, origin.z, tx, tz);
    const targets = selectStrikeTargets(origin.x, origin.z, dir.x, dir.z, def, this.enemyCandidates(), los);
    let kills = 0;
    for (const t of targets) {
      const e = t.enemy;
      const dx = e.x - origin.x, dz = e.z - origin.z;
      const d = Math.hypot(dx, dz) || 1;
      const nx = dx / d, nz = dz / d;
      e.takeDamage(def.damage, nx, nz, e.y + 1.1, { stagger: def.stagger }, { isPlayer: true, melee: true, x: origin.x, z: origin.z });
      e.applyKnockback(nx, nz, def.knockback);
      w.vfx.emit('blood', e.x, e.y + 1.1, e.z, nx, 0.4, nz, 1.2);
      w.ctx.audio.play('melee_hit', { x: e.x, z: e.z, pitch: 0.95 + Math.random() * 0.12 });
      w.stats.meleeHits++;
      if (e.dead) { kills++; w.stats.meleeKills++; }
    }

    // props: a swing smashes a lamp or a chair on the way through
    const propTargets = [];
    for (const p of w.property.props.values()) {
      if (p.destroyed || p.maxHp <= 0) continue;
      propTargets.push({ x: p.x, z: p.z, radius: 0.45, prop: p });
    }
    const props = selectStrikeTargets(origin.x, origin.z, dir.x, dir.z, { ...def, maxTargets: 2 }, propTargets, los);
    for (const t of props) {
      w.property.damageProp(t.prop.id, def.damage * (def.propDamageMul ?? 1.5), { x: t.prop.x, y: 0.8, z: t.prop.z });
    }

    if (targets.length) {
      w.ctx.camera.shake(kills ? 0.34 : 0.22);
      if (kills) this._zoomPulse();
    } else if (props.length) {
      w.ctx.camera.shake(0.16);
    } else {
      w.ctx.camera.shake(0.05);
    }
    return { enemyHits: targets.length, propHits: props.length, kills };
  }

  /** Brief punch-in on a melee kill. Restores itself; harmless if a frame is missed. */
  _zoomPulse() {
    this.world.ctx.camera.zoomTarget = 0.93;
    this.zoomPulseT = 0.22;
  }

  update(dt) {
    if (this.zoomPulseT > 0) {
      this.zoomPulseT -= dt;
      if (this.zoomPulseT <= 0) this.world.ctx.camera.zoomTarget = 1;
    }
  }
}
