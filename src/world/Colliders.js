import { circleVsAABB, rayVsAABB, segSegT } from '../utils/math.js';

/**
 * 2.5D static collider set (docs/DECISIONS.md ADR-004). Boxes are XZ AABBs with flags:
 *  walk    blocks characters
 *  bullets blocks hitscan projectiles (and receives hits)
 *  los     blocks AI line of sight
 * Portals and props toggle flags as their state changes; the box object identity is stable.
 *
 * Walkability changes are recorded as dirty rectangles so the navigation grid can re-bake only
 * the cells that actually changed. Re-baking the whole grid takes ~67 ms, which is four dropped
 * frames every time a door opens, so `version` alone is not enough: see NavGrid.applyDirty.
 */
const MAX_DIRTY_RECTS = 24;

export class ColliderSet {
  constructor() {
    this.boxes = [];
    this.version = 0; // bumped when walkability changes (nav grid re-bake trigger)
    this._dirty = [];
    this._dirtyFull = false;
  }

  add(box) {
    box.walk = box.walk ?? true;
    box.bullets = box.bullets ?? true;
    box.los = box.los ?? box.bullets;
    box.surface = box.surface || 'wood';
    box.height = box.height ?? 2.8;
    this.boxes.push(box);
    if (box.walk) this.invalidate(box);
    return box;
  }

  remove(box) {
    const i = this.boxes.indexOf(box);
    if (i >= 0) { this.boxes.splice(i, 1); this.invalidate(box); }
  }

  setWalk(box, v) { if (box.walk !== v) { box.walk = v; this.invalidate(box); } }

  /**
   * Record that this box's walkability changed. Bumps `version` and remembers the area so the
   * nav grid can re-bake just that patch. Call this instead of touching `version` directly.
   */
  invalidate(box) {
    this.version++;
    if (this._dirtyFull) return;
    if (this._dirty.length >= MAX_DIRTY_RECTS) { this._dirtyFull = true; this._dirty.length = 0; return; }
    this._dirty.push({ minX: box.minX, maxX: box.maxX, minZ: box.minZ, maxZ: box.maxZ });
  }

  /** Force the next nav bake to cover everything (scene load, snapshot restore). */
  invalidateAll() { this.version++; this._dirtyFull = true; this._dirty.length = 0; }

  /** Consume the pending changes. Returns { full, rects }. */
  takeDirty() {
    const r = { full: this._dirtyFull, rects: this._dirty };
    this._dirty = [];
    this._dirtyFull = false;
    return r;
  }

  /** Resolve a circle against walk boxes. Returns the corrected position. */
  resolveCircle(x, z, r, ignore = null) {
    let px = x, pz = z;
    for (let pass = 0; pass < 3; pass++) {
      let moved = false;
      for (const b of this.boxes) {
        if (!b.walk || b === ignore) continue;
        if (px + r < b.minX || px - r > b.maxX || pz + r < b.minZ || pz - r > b.maxZ) continue;
        const push = circleVsAABB(px, pz, r, b);
        if (push) { px += push.x; pz += push.z; moved = true; }
      }
      if (!moved) break;
    }
    return { x: px, z: pz };
  }

  /** Nearest bullet-blocking box along a ray. Returns {t, box} or null. */
  raycastBullets(ox, oz, dx, dz, maxDist) {
    let best = null;
    for (const b of this.boxes) {
      if (!b.bullets) continue;
      const t = rayVsAABB(ox, oz, dx, dz, b, maxDist);
      if (t !== null && t >= 0 && (best === null || t < best.t)) best = { t, box: b };
    }
    return best;
  }

  /** True if the segment crosses any LOS-blocking box. */
  segmentBlocked(ax, az, bx, bz) {
    const dx = bx - ax, dz = bz - az;
    const len = Math.hypot(dx, dz);
    if (len < 1e-6) return false;
    for (const b of this.boxes) {
      if (!b.los) continue;
      // quick reject
      if (Math.max(ax, bx) < b.minX || Math.min(ax, bx) > b.maxX || Math.max(az, bz) < b.minZ || Math.min(az, bz) > b.maxZ) continue;
      const t = rayVsAABB(ax, az, dx / len, dz / len, b, len);
      if (t !== null && t <= len) return true;
    }
    return false;
  }

  /** True if a circle at (x,z) overlaps any walk box (used for nav baking and spawn checks). */
  circleOverlaps(x, z, r, predicate = null) {
    for (const b of this.boxes) {
      if (!b.walk) continue;
      if (predicate && !predicate(b)) continue;
      if (x + r < b.minX || x - r > b.maxX || z + r < b.minZ || z - r > b.maxZ) continue;
      if (circleVsAABB(x, z, r, b)) return b;
    }
    return null;
  }

  static box(cx, cz, sx, sz, extra = {}) {
    return { minX: cx - sx / 2, maxX: cx + sx / 2, minZ: cz - sz / 2, maxZ: cz + sz / 2, ...extra };
  }
}

export { segSegT };
