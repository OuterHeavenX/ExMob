import { AStar } from './AStar.js';

/**
 * 0.5 m walkability grid baked from the collider set. Portal cells (doors/windows) carry a
 * portal id; A* consults a cost callback for them so closed portals are planned through and
 * breached (docs/AI_SYSTEM.md, ADR-005).
 *
 * A full bake of the Cabin grid (96 x 148 cells) costs ~67 ms, so it only happens once at load.
 * Afterwards `applyDirty` re-bakes just the cells around whatever changed: opening a door touches
 * a handful of cells instead of fourteen thousand.
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
    this.lastBakedCells = 0;
    this.bake();
  }

  idx(cx, cz) { return cz * this.w + cx; }
  toCell(x, z) { return [Math.floor((x - this.minX) / this.cell), Math.floor((z - this.minZ) / this.cell)]; }
  toWorld(cx, cz) { return { x: this.minX + (cx + 0.5) * this.cell, z: this.minZ + (cz + 0.5) * this.cell }; }
  inBounds(cx, cz) { return cx >= 0 && cz >= 0 && cx < this.w && cz < this.h; }

  /** Re-index portal ids. Cheap; call before any bake. */
  _refreshPortalIds() {
    this.portalIds = Array.from(this.portals.keys());
    this._portalIndex = new Map(this.portalIds.map((id, i) => [id, i]));
  }

  /** Bake one cell. Shared by the full and incremental paths. */
  _bakeCell(cx, cz) {
    const { x, z } = this.toWorld(cx, cz);
    const i = this.idx(cx, cz);
    const r = this.agentRadius;
    // portal cells: inside a portal's walk box (door) or sill box (window), expanded by one cell
    let portalHit = null;
    for (const [id, p] of this.portals) {
      const b = p.navBox;
      if (!b) continue;
      if (x >= b.minX - this.cell && x <= b.maxX + this.cell && z >= b.minZ - this.cell && z <= b.maxZ + this.cell) { portalHit = id; break; }
    }
    // a barricade is treated like a closed door: the cell stays a portal cell so A* can plan
    // through it and price it, and the collider still stops anyone physically walking in
    const blocker = this.colliders.circleOverlaps(x, z, portalHit ? r * 0.45 : r, (b) => b.kind !== 'door' && b.kind !== 'sill' && b.kind !== 'rail' && b.kind !== 'barricade');
    if (portalHit && !blocker) {
      this.walk[i] = 1;
      this.portalIdx[i] = this._portalIndex.get(portalHit);
    } else if (blocker) {
      this.walk[i] = 0;
      this.portalIdx[i] = -1;
    } else {
      const soft = this.colliders.circleOverlaps(x, z, r * 0.6, (b) => b.kind === 'door' || b.kind === 'sill');
      this.walk[i] = soft ? 0 : 1;
      this.portalIdx[i] = -1;
    }
  }

  bake() {
    this._refreshPortalIds();
    for (let cz = 0; cz < this.h; cz++) for (let cx = 0; cx < this.w; cx++) this._bakeCell(cx, cz);
    // a full bake covers everything, so drop whatever was pending (scene construction queues a
    // rect per collider, which would otherwise force a second full bake on the first change)
    if (this.colliders.takeDirty) this.colliders.takeDirty();
    this.bakedVersion = this.colliders.version;
    this.lastBakedCells = this.walk.length;
    return this.lastBakedCells;
  }

  /** Re-bake the cells covering a world rectangle, padded for the agent radius. */
  bakeRegion(rect) {
    const pad = this.cell * 2 + this.agentRadius;
    const [x0, z0] = this.toCell(rect.minX - pad, rect.minZ - pad);
    const [x1, z1] = this.toCell(rect.maxX + pad, rect.maxZ + pad);
    let n = 0;
    for (let cz = Math.max(0, z0); cz <= Math.min(this.h - 1, z1); cz++) {
      for (let cx = Math.max(0, x0); cx <= Math.min(this.w - 1, x1); cx++) { this._bakeCell(cx, cz); n++; }
    }
    return n;
  }

  /**
   * Apply pending collider changes. Re-bakes only the affected patches unless the collider set
   * asked for a full rebuild. Returns the number of cells touched (0 when nothing changed).
   */
  applyDirty(colliders = this.colliders) {
    if (this.bakedVersion === colliders.version) { this.lastBakedCells = 0; return 0; }
    const { full, rects } = colliders.takeDirty();
    this._refreshPortalIds();
    let cells = 0;
    if (full || !rects.length) cells = this.bake();
    else { for (const r of rects) cells += this.bakeRegion(r); }
    this.bakedVersion = colliders.version;
    this.lastBakedCells = cells;
    return cells;
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
    return this.smooth(pts);
  }

  /**
   * Remove intermediate waypoints when a straight line stays on walkable, non-portal cells.
   * The look-ahead is windowed: scanning to the end of a long path is quadratic and was a
   * measurable slice of every path request.
   */
  smooth(pts) {
    if (pts.length <= 2) return pts;
    const WINDOW = 12;
    const out = [pts[0]];
    let i = 0;
    while (i < pts.length - 1) {
      let j = Math.min(pts.length - 1, i + WINDOW);
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
