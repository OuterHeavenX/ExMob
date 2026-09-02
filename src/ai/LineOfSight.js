/** Line of sight helper: wraps ColliderSet.segmentBlocked with a per-frame memo. */
export class LineOfSight {
  constructor(colliders) {
    this.colliders = colliders;
    this._memo = new Map();
    this._frame = 0;
  }

  beginFrame() { this._frame++; if (this._memo.size > 512) this._memo.clear(); }

  /** True if (ax,az) can see (bx,bz). Memoized per frame on a coarse key. */
  canSee(ax, az, bx, bz) {
    const key = `${this._frame}:${(ax * 2) | 0},${(az * 2) | 0}:${(bx * 2) | 0},${(bz * 2) | 0}`;
    const cached = this._memo.get(key);
    if (cached !== undefined) return cached;
    const v = !this.colliders.segmentBlocked(ax, az, bx, bz);
    this._memo.set(key, v);
    return v;
  }
}
