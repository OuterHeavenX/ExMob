import { AStar } from './AStar.js';

/**
 * 0.5 m walkability grid baked from the collider set. Portal cells (doors/windows) carry a
 * portal id; A* consults a cost callback for them so closed portals are planned through and
 * breached (docs/AI_SYSTEM.md, ADR-005).
 */
export class NavGrid {
  constructor(bounds, colliders, portals) {
    this.minX = bounds.minX; this.minZ = bounds.minZ;
    this.cell = bounds.cell;
    this.w = Math.ceil((bounds.maxX - bounds.minX) / this.cell);
    this.h = Math.ceil((bounds.maxZ - bounds.minZ) / this.cell);
    this.colliders = colliders;
    this.portals = portals; // Map id -> portal (with boxes)
    this.walk = new Uint8Array(this.w * this.h);
    this.portalIdx = new Int16Array(this.w * this.h).fill(-1);
    this.portalIds = [];
    this.astar = new AStar(this);
    this.agentRadius = 0.3;
    this.bakedVersion = -1;
    this.bake();
  }

  idx(cx, cz) { return cz * this.w + cx; }
  toCell(x, z) { return [Math.floor((x - this.minX) / this.cell), Math.floor((z - this.minZ) / this.cell)]; }
  toWorld(cx, cz) { return { x: this.minX + (cx + 0.5) * this.cell, z: this.minZ + (cz + 0.5) * this.cell }; }
  inBounds(cx, cz) { return cx >= 0 && cz >= 0 && cx < this.w && cz < this.h; }

  bake() {
    const r = this.agentRadius;
    this.portalIds = Array.from(this.portals.keys());
    const portalIndex = new Map(this.portalIds.map((id, i) => [id, i]));
    for (let cz = 0; cz < this.h; cz++) {
      for (let cx = 0; cx < this.w; cx++) {
        const { x, z } = this.toWorld(cx, cz);
        const i = this.idx(cx, cz);
        // portal cells: inside a portal's walk box (door) or sill box (window), expanded by one cell
        let portalHit = null;
        for (const [id, p] of this.portals) {
          const b = p.navBox;
          if (!b) continue;
          if (x >= b.minX - this.cell && x <= b.maxX + this.cell && z >= b.minZ - this.cell && z <= b.maxZ + this.cell) { portalHit = id; break; }
        }
        const blocker = this.colliders.circleOverlaps(x, z, portalHit ? r * 0.45 : r, (b) => b.kind !== 'door' && b.kind !== 'sill' && b.kind !== 'rail');
        if (portalHit && !blocker) {
          this.walk[i] = 1;
          this.portalIdx[i] = portalIndex.get(portalHit);
        } else if (blocker) {
          this.walk[i] = 0;
        } else {
          // also block cells overlapping door/sill boxes when not tagged portal (shouldn't happen)
          const soft = this.colliders.circleOverlaps(x, z, r * 0.6, (b) => b.kind === 'door' || b.kind === 'sill');
          this.walk[i] = soft ? 0 : 1;
        }
      }
    }
    this.bakedVersion = this.colliders.version;
  }

  isWalkable(cx, cz) { return this.inBounds(cx, cz) && this.walk[this.idx(cx, cz)] === 1; }
  portalAt(cx, cz) { const p = this.portalIdx[this.idx(cx, cz)]; return p >= 0 ? this.portalIds[p] : null; }

  /** Nearest walkable cell to a world position (spiral search). */
  nearestWalkable(x, z, maxRadius = 6) {
    const [cx, cz] = this.toCell(x, z);
    if (this.isWalkable(cx, cz)) return [cx, cz];
    for (let r = 1; r <= maxRadius; r++) {
      for (let dz = -r; dz <= r; dz++) for (let dx = -r; dx <= r; dx++) {
        if (Math.max(Math.abs(dx), Math.abs(dz)) !== r) continue;
        if (this.isWalkable(cx + dx, cz + dz)) return [cx + dx, cz + dz];
      }
    }
    return null;
  }

  /**
   * Find a path of world points. opts.portalCost(id) -> extra cost (Infinity = impassable).
   * Returns [] if none.
   */
  findPath(fromX, fromZ, toX, toZ, opts = {}) {
    const a = this.nearestWalkable(fromX, fromZ, 8);
    const b = this.nearestWalkable(toX, toZ, 8);
    if (!a || !b) return [];
    const cells = this.astar.search(a[0], a[1], b[0], b[1], opts.portalCost || (() => 0), opts.maxIterations || 6000);
    if (!cells.length) return [];
    const pts = cells.map(([cx, cz]) => ({ ...this.toWorld(cx, cz), portal: this.portalAt(cx, cz) }));
    return this.smooth(pts, opts.portalCost);
  }

  /** Remove intermediate waypoints when a straight line stays on walkable, non-portal cells. */
  smooth(pts, portalCost) {
    if (pts.length <= 2) return pts;
    const out = [pts[0]];
    let i = 0;
    while (i < pts.length - 1) {
      let j = pts.length - 1;
      while (j > i + 1) {
        if (this._clear(pts[i], pts[j])) break;
        j--;
      }
      // never skip over portal cells: stop at the first portal between i and j
      for (let k = i + 1; k < j; k++) if (pts[k].portal) { j = k; break; }
      out.push(pts[j]);
      i = j;
    }
    return out;
  }

  _clear(a, b) {
    const d = Math.hypot(b.x - a.x, b.z - a.z);
    const steps = Math.ceil(d / (this.cell * 0.5));
    for (let s = 1; s < steps; s++) {
      const t = s / steps;
      const [cx, cz] = this.toCell(a.x + (b.x - a.x) * t, a.z + (b.z - a.z) * t);
      if (!this.isWalkable(cx, cz)) return false;
      if (this.portalAt(cx, cz)) return false;
    }
    return true;
  }
}
