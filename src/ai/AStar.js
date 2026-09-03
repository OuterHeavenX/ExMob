/**
 * A* on the NavGrid with 8-connectivity (no corner cutting through blocked cells).
 * The open set is a binary heap over parallel typed arrays: the previous version allocated a
 * small object per push, which showed up as GC pressure with several enemies re-planning at once.
 */
class MinHeap {
  constructor(capacity = 2048) {
    this.idx = new Int32Array(capacity);
    this.f = new Float32Array(capacity);
    this.size = 0;
  }

  _grow() {
    const idx = new Int32Array(this.idx.length * 2);
    const f = new Float32Array(this.f.length * 2);
    idx.set(this.idx); f.set(this.f);
    this.idx = idx; this.f = f;
  }

  clear() { this.size = 0; }

  push(index, f) {
    if (this.size === this.idx.length) this._grow();
    let i = this.size++;
    this.idx[i] = index; this.f[i] = f;
    while (i > 0) {
      const p = (i - 1) >> 1;
      if (this.f[p] <= this.f[i]) break;
      const ti = this.idx[p], tf = this.f[p];
      this.idx[p] = this.idx[i]; this.f[p] = this.f[i];
      this.idx[i] = ti; this.f[i] = tf;
      i = p;
    }
  }

  /** Returns the cell index with the lowest f, or -1 when empty. */
  pop() {
    if (this.size === 0) return -1;
    const top = this.idx[0];
    this.size--;
    if (this.size > 0) {
      this.idx[0] = this.idx[this.size];
      this.f[0] = this.f[this.size];
      let i = 0;
      for (;;) {
        const l = 2 * i + 1, r = l + 1;
        let m = i;
        if (l < this.size && this.f[l] < this.f[m]) m = l;
        if (r < this.size && this.f[r] < this.f[m]) m = r;
        if (m === i) break;
        const ti = this.idx[m], tf = this.f[m];
        this.idx[m] = this.idx[i]; this.f[m] = this.f[i];
        this.idx[i] = ti; this.f[i] = tf;
        i = m;
      }
    }
    return top;
  }
}

const DIRS = [[1, 0, 1], [-1, 0, 1], [0, 1, 1], [0, -1, 1], [1, 1, 1.4142], [1, -1, 1.4142], [-1, 1, 1.4142], [-1, -1, 1.4142]];

export class AStar {
  constructor(grid) {
    this.grid = grid;
    const n = grid.w * grid.h;
    this.g = new Float32Array(n);
    this.parent = new Int32Array(n);
    this.closed = new Uint32Array(n);
    this.stamp = new Uint32Array(n);
    this.run = 0;
    this.heap = new MinHeap();
  }

  /**
   * `weight` above 1 would make the heuristic greedy. Measured and left at 1 on purpose: a greedy
   * search drives straight into the cabin wall and then explores badly looking for a door, which
   * made the common driveway-to-bedroom route twice as slow (2.6 ms vs 1.3 ms). With the typed
   * heap below, an exact search costs 0.4-1.3 ms and eight enemies re-planning at once cost 3.8 ms
   * in total, so there is nothing to buy here.
   */
  search(sx, sz, tx, tz, portalCost, maxIterations = 6000, weight = 1) {
    const grid = this.grid;
    this.run++;
    const run = this.run;
    const W = grid.w;
    const start = sz * W + sx, goal = tz * W + tx;
    const heap = this.heap;
    heap.clear();
    const h = (cx, cz) => { const dx = Math.abs(cx - tx), dz = Math.abs(cz - tz); return (Math.max(dx, dz) + 0.4142 * Math.min(dx, dz)) * weight; };
    this.g[start] = 0; this.parent[start] = -1; this.stamp[start] = run;
    heap.push(start, h(sx, sz));
    let iterations = 0;
    let bestI = start, bestH = h(sx, sz);
    this.lastIterations = 0;
    while (heap.size && iterations++ < maxIterations) {
      const ci = heap.pop();
      if (this.closed[ci] === run) continue;
      this.closed[ci] = run;
      if (ci === goal) { this.lastIterations = iterations; return this._reconstruct(ci, W); }
      const cx = ci % W, cz = (ci / W) | 0;
      const hh = h(cx, cz);
      if (hh < bestH) { bestH = hh; bestI = ci; }
      for (let d = 0; d < 8; d++) {
        const dx = DIRS[d][0], dz = DIRS[d][1], cost = DIRS[d][2];
        const nx = cx + dx, nz = cz + dz;
        if (!grid.isWalkable(nx, nz)) continue;
        if (dx && dz && (!grid.isWalkable(cx + dx, cz) || !grid.isWalkable(cx, cz + dz))) continue; // no corner cut
        const ni = nz * W + nx;
        if (this.closed[ni] === run) continue;
        let extra = 0;
        const pid = grid.portalAt(nx, nz);
        if (pid) {
          extra = portalCost(pid);
          if (extra === Infinity) continue;
          // diagonal moves through portals are awkward: forbid
          if (dx && dz) continue;
        }
        const ng = this.g[ci] + cost + extra;
        if (this.stamp[ni] !== run || ng < this.g[ni]) {
          this.stamp[ni] = run;
          this.g[ni] = ng;
          this.parent[ni] = ci;
          heap.push(ni, ng + h(nx, nz));
        }
      }
    }
    // no full path: return the partial path to the closest cell (keeps enemies moving)
    this.lastIterations = iterations;
    return bestI !== start ? this._reconstruct(bestI, W) : [];
  }

  _reconstruct(i, W) {
    const out = [];
    while (i >= 0) { out.push([i % W, (i / W) | 0]); i = this.parent[i]; }
    out.reverse();
    return out;
  }
}
