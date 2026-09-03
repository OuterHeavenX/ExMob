/**
 * Aim assist: rotates a raw aim direction toward the best target inside a cone.
 * Pure geometry helpers are node-safe and unit-tested (tests/aim.test.js); the class wraps them
 * with world queries (living enemies, line of sight). See src/data/aim.js and
 * docs/MOBILE_REQUIREMENTS.md (Aiming).
 */

const TAU = Math.PI * 2;

/** Shortest signed angular difference from a to b, in radians. */
export function angleDelta(a, b) {
  let d = (b - a) % TAU;
  if (d > Math.PI) d -= TAU;
  if (d < -Math.PI) d += TAU;
  return d;
}

/**
 * Best target for a raw aim direction, or null.
 * Candidates are { x, z, radius }. Scoring prefers a small angular error and, all else equal,
 * a nearer target: an enemy at arm's length wins over one at the back of the room.
 */
export function pickAimTarget(ox, oz, dirX, dirZ, candidates, opts) {
  const { coneDeg = 0, maxRange = 0 } = opts || {};
  if (coneDeg <= 0 || maxRange <= 0 || !candidates.length) return null;
  const losBlocked = opts.losBlocked;
  const rawAngle = Math.atan2(dirX, dirZ);
  const coneRad = (coneDeg * Math.PI) / 180;
  let best = null;
  let bestScore = Infinity;
  for (const c of candidates) {
    const dx = c.x - ox, dz = c.z - oz;
    const dist = Math.hypot(dx, dz);
    if (dist > maxRange || dist < 1e-4) continue;
    // widen the cone for close targets: at 2 m a body covers many degrees
    const radius = c.radius ?? 0.35;
    const halfWidth = Math.atan2(radius, Math.max(radius, dist));
    const err = Math.abs(angleDelta(rawAngle, Math.atan2(dx, dz)));
    const effective = Math.max(0, err - halfWidth);
    if (effective > coneRad) continue;
    if (losBlocked && losBlocked(c.x, c.z)) continue;
    const score = (effective * 180) / Math.PI + dist * 0.35;
    if (score < bestScore) { bestScore = score; best = { target: c, angleErr: effective, dist }; }
  }
  return best;
}

/**
 * Apply assist to a raw direction. Returns { x, z, target }.
 * Aim is unchanged when there is no target, so shooting at nothing still points where the
 * player pointed.
 */
export function assistAim(ox, oz, dirX, dirZ, candidates, opts) {
  const hit = pickAimTarget(ox, oz, dirX, dirZ, candidates, opts);
  if (!hit) return { x: dirX, z: dirZ, target: null };
  const { snapDeg = 0, pull = 0 } = opts;
  const rawAngle = Math.atan2(dirX, dirZ);
  const targetAngle = Math.atan2(hit.target.x - ox, hit.target.z - oz);
  const snapRad = (snapDeg * Math.PI) / 180;
  let angle;
  if (hit.angleErr <= snapRad || pull >= 1) angle = targetAngle;
  else angle = rawAngle + angleDelta(rawAngle, targetAngle) * pull;
  return { x: Math.sin(angle), z: Math.cos(angle), target: hit.target };
}

/** Nearest visible candidate within `range`, or null. Used when there is no aim input at all. */
export function nearestTarget(ox, oz, candidates, range, losBlocked = null) {
  if (!(range > 0)) return null;
  let best = null, bestDist = Infinity;
  for (const c of candidates) {
    const d = Math.hypot(c.x - ox, c.z - oz);
    if (d > range || d >= bestDist) continue;
    if (losBlocked && losBlocked(c.x, c.z)) continue;
    bestDist = d;
    best = c;
  }
  return best;
}

export class AimAssist {
  constructor(world) {
    this.world = world;
    this.target = null;
  }

  candidates() {
    return this.world.enemies.alive().map((e) => ({ x: e.x, z: e.z, radius: e.def.radius, enemy: e }));
  }

  _los() {
    const c = this.world.colliders;
    return (ox, oz) => (tx, tz) => c.segmentBlocked(ox, oz, tx, tz);
  }

  /** Assisted direction for a raw aim. `preset` comes from src/data/aim.js. */
  apply(ox, oz, dirX, dirZ, preset) {
    if (!preset || preset.coneDeg <= 0) { this.target = null; return { x: dirX, z: dirZ, target: null }; }
    const losBlocked = (tx, tz) => this.world.colliders.segmentBlocked(ox, oz, tx, tz);
    const r = assistAim(ox, oz, dirX, dirZ, this.candidates(), { ...preset, losBlocked });
    this.target = r.target ? r.target.enemy : null;
    return r;
  }

  /** Facing for a player who is not touching the aim stick. Returns a direction or null. */
  autoFace(ox, oz, preset) {
    if (!preset || !(preset.autoTargetRange > 0)) return null;
    const losBlocked = (tx, tz) => this.world.colliders.segmentBlocked(ox, oz, tx, tz);
    const t = nearestTarget(ox, oz, this.candidates(), preset.autoTargetRange, losBlocked);
    if (!t) { this.target = null; return null; }
    const dx = t.x - ox, dz = t.z - oz;
    const d = Math.hypot(dx, dz) || 1;
    this.target = t.enemy;
    return { x: dx / d, z: dz / d, target: t };
  }
}
