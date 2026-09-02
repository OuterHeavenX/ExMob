/**
 * Path following on the NavGrid with portal awareness, replanning, and stuck recovery.
 * follow(dt) returns: 'moving' | 'arrived' | { portal, action: 'breach'|'climb' } | 'noPath'
 */
export class EnemyNavigation {
  constructor(enemy) {
    this.e = enemy;
    this.path = [];
    this.index = 0;
    this.dest = null;
    this.replanT = 0;
    this.stuckT = 0;
    this.lastX = enemy.x; this.lastZ = enemy.z;
    this.stuckCount = 0;
    this.skipPortal = null;
    this.flank = false;
  }

  get world() { return this.e.world; }

  setDestination(x, z, force = false) {
    if (!force && this.dest && Math.hypot(this.dest.x - x, this.dest.z - z) < 1.2 && this.path.length) return;
    this.dest = { x, z };
    this.replanT = 0;
    this._plan();
  }

  _portalCost() {
    const pm = this.world.property;
    const prof = this.e.profile;
    const p = this.world.player;
    return (id) => {
      let c = pm.portalCost(id, prof);
      if (c === Infinity) return c;
      if (this.skipPortal === id) c += 8;
      if (this.flank) {
        const portal = pm.portals.get(id);
        const d = Math.hypot(portal.x - p.x, portal.z - p.z);
        if (d < 6) c += 40;
      }
      return c;
    };
  }

  _plan() {
    if (!this.dest) return false;
    if (this.world.pathBudget <= 0) { this.replanT = 0.05; return false; }
    this.world.pathBudget--;
    const path = this.world.nav.findPath(this.e.x, this.e.z, this.dest.x, this.dest.z, { portalCost: this._portalCost() });
    this.path = path;
    this.index = path.length > 1 ? 1 : 0;
    this.replanT = 1.0 + Math.random() * 0.5;
    return path.length > 0;
  }

  replan() { this._plan(); }

  /** Steer directly toward a point ignoring the grid (short distances). Returns distance left. */
  steerTo(x, z, dt, speedMul = 1) {
    const e = this.e;
    const dx = x - e.x, dz = z - e.z;
    const d = Math.hypot(dx, dz);
    if (d < 0.05) { e.speedNorm = 0; return 0; }
    const sp = e.def.speed * speedMul * (e.staggerT > 0 ? 0.3 : 1);
    const step = Math.min(d, sp * dt);
    e.moveBy((dx / d) * step, (dz / d) * step);
    e.speedNorm = Math.min(1, sp / 4.2);
    return d - step;
  }

  follow(dt, speedMul = 1) {
    const e = this.e;
    this.replanT -= dt;
    if (this.replanT <= 0 && this.dest) this._plan();
    if (!this.path.length) { e.speedNorm = 0; return this.dest ? 'noPath' : 'arrived'; }
    if (this.index >= this.path.length) { e.speedNorm = 0; return 'arrived'; }
    const wp = this.path[this.index];
    // portal handling
    if (wp.portal && wp.portal !== this.skipPortal) {
      const d = Math.hypot(wp.x - e.x, wp.z - e.z);
      if (d < 1.1) {
        const pm = this.world.property;
        const portal = pm.portals.get(wp.portal);
        const passable = this.world.property.breach.isPassable(wp.portal);
        if (!passable) return { portal: wp.portal, action: 'breach' };
        if (portal.kind === 'window') return { portal: wp.portal, action: 'climb' };
      }
    }
    const left = this.steerTo(wp.x, wp.z, dt, speedMul);
    if (left < 0.25) this.index++;
    // stuck detection
    this.stuckT += dt;
    if (this.stuckT > 1.2) {
      const moved = Math.hypot(e.x - this.lastX, e.z - this.lastZ);
      this.lastX = e.x; this.lastZ = e.z;
      this.stuckT = 0;
      if (moved < 0.25) {
        this.stuckCount++;
        if (this.stuckCount >= 2) { this._unstick(); this.stuckCount = 0; } else this._plan();
      } else this.stuckCount = 0;
    }
    return this.index >= this.path.length ? 'arrived' : 'moving';
  }

  _unstick() {
    const e = this.e;
    const nav = this.world.nav;
    for (let i = 0; i < 12; i++) {
      const a = Math.random() * Math.PI * 2, r = 1 + Math.random() * 2;
      const x = e.x + Math.cos(a) * r, z = e.z + Math.sin(a) * r;
      const c = nav.toCell(x, z);
      if (nav.isWalkable(c[0], c[1])) { e.x = x; e.z = z; break; }
    }
    this._plan();
  }

  /** After crossing a portal, drop waypoints inside it and replan. */
  passedPortal(id) {
    this.skipPortal = id;
    while (this.index < this.path.length && this.path[this.index].portal === id) this.index++;
    this._plan();
    setTimeout(() => { if (this.skipPortal === id) this.skipPortal = null; }, 4000);
  }
}
