/**
 * A* on the NavGrid with 8-connectivity (no corner cutting through blocked cells).
 * Uses a binary heap and typed arrays; allocation-light for repeated queries.
 */
class MinHeap {
  constructor() { this.a = []; }
  push(node) {
    const a = this.a;
    a.push(node);
    let i = a.length - 1;
    while (i > 0) {
      const p = (i - 1) >> 1;
      if (a[p].f <= a[i].f) break;
      [a[p], a[i]] = [a[i], a[p]];
      i = p;
    }
  }
  pop() {
    const a = this.a;
    const top = a[0];
    const last = a.pop();
    if (a.length) {
      a[0] = last;
      let i = 0;
      for (;;) {
        const l = 2 * i + 1, r = l + 1;
        let m = i;
        if (l < a.length && a[l].f < a[m].f) m = l;
        if (r < a.length && a[r].f < a[m].f) m = r;
        if (m === i) break;
        [a[m], a[i]] = [a[i], a[m]];
        i = m;
      }
    }
    return top;
  }
  get size() { return this.a.length; }
}

const DIRS = [[1, 0, 1], [-1, 0, 1], [0, 1, 1], [0, -1, 1], [1, 1, 1.4142], [1, -1, 1.4142], [-1, 1, 1.4142], [-1, -1, 1.4142]];

export class AStar {
  constructor(grid) {
    this.grid = grid;
    this.g = new Float32Array(grid.w * grid.h);
    this.parent = new Int32Array(grid.w * grid.h);
    this.closed = new Uint8Array(grid.w * grid.h);
    this.stamp = new Uint32Array(grid.w * grid.h);
    this.run = 0;
  }

  search(sx, sz, tx, tz, portalCost, maxIterations = 6000) {
    const grid = this.grid;
    this.run++;
    const run = this.run;
    const W = grid.w;
    const start = sz * W + sx, goal = tz * W + tx;
    const heap = new MinHeap();
    const h = (cx, cz) => { const dx = Math.abs(cx - tx), dz = Math.abs(cz - tz); return Math.max(dx, dz) + 0.4142 * Math.min(dx, dz); };
    this.g[start] = 0; this.parent[start] = -1; this.stamp[start] = run; this.closed[start] = 0;
    heap.push({ i: start, f: h(sx, sz) });
    let iterations = 0;
    let bestI = start, bestH = h(sx, sz);
    while (heap.size && iterations++ < maxIterations) {
      const cur = heap.pop();
      const ci = cur.i;
      if (this.closed[ci] === run) continue;
      this.closed[ci] = run;
      if (ci === goal) return this._reconstruct(ci, W);
      const cx = ci % W, cz = (ci / W) | 0;
      const hh = h(cx, cz);
      if (hh < bestH) { bestH = hh; bestI = ci; }
      for (const [dx, dz, cost] of DIRS) {
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
          heap.push({ i: ni, f: ng + h(nx, nz) });
        }
      }
    }
    // no full path: return the partial path to the closest cell (keeps enemies moving)
    return bestI !== start ? this._reconstruct(bestI, W) : [];
  }

  _reconstruct(i, W) {
    const out = [];
    while (i >= 0) { out.push([i % W, (i / W) | 0]); i = this.parent[i]; }
    out.reverse();
    return out;
  }
}
