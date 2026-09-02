/**
 * Limited automatic cover: nodes generated from vehicles, near trees, wall ends, plus
 * hand-placed nodes from property data. Scoring favors nodes within the enemy's preferred
 * range that block the player's line of sight. See docs/AI_SYSTEM.md (Cover).
 */
export class CoverNodes {
  constructor(colliders) {
    this.colliders = colliders;
    this.nodes = [];
    this.claimed = new Map(); // node -> enemy
  }

  addNode(x, z, tag = 'static') { const n = { x, z, tag }; this.nodes.push(n); return n; }

  addFromBox(box, pad = 0.7, tag = 'box') {
    const cx = (box.minX + box.maxX) / 2, cz = (box.minZ + box.maxZ) / 2;
    const hx = (box.maxX - box.minX) / 2 + pad, hz = (box.maxZ - box.minZ) / 2 + pad;
    const out = [];
    for (const [dx, dz] of [[hx, 0], [-hx, 0], [0, hz], [0, -hz]]) out.push(this.addNode(cx + dx, cz + dz, tag));
    return out;
  }

  addFromTrees(trees, maxRadius = 20) {
    for (const t of trees) {
      const r = Math.hypot(t.x, t.z);
      if (r > maxRadius) continue;
      // node on the side away from the cabin
      const nx = t.x / r, nz = t.z / r;
      this.addNode(t.x + nx * 0.9, t.z + nz * 0.9, 'tree');
    }
  }

  removeTag(tag) { this.nodes = this.nodes.filter((n) => n.tag !== tag); }

  release(enemy) { for (const [n, e] of this.claimed) if (e === enemy) this.claimed.delete(n); }

  /**
   * Best node for `enemy` (with x,z) against a threat at (tx,tz), preferring distance to the
   * threat within [minR,maxR]. Returns node or null.
   */
  best(enemy, tx, tz, minR, maxR, maxTravel = 10) {
    let best = null, bestScore = -Infinity;
    for (const n of this.nodes) {
      const owner = this.claimed.get(n);
      if (owner && owner !== enemy && !owner.dead) continue;
      const travel = Math.hypot(n.x - enemy.x, n.z - enemy.z);
      if (travel > maxTravel) continue;
      const dT = Math.hypot(n.x - tx, n.z - tz);
      if (dT < minR * 0.7) continue;
      const rangeScore = dT >= minR && dT <= maxR ? 1 : dT < minR ? 0.4 : Math.max(0, 1 - (dT - maxR) / 10);
      const blocks = this.colliders.segmentBlocked(n.x, n.z, tx, tz) ? 1 : 0;
      const score = rangeScore * 2 + blocks * 3 - travel * 0.12;
      if (score > bestScore) { bestScore = score; best = n; }
    }
    if (best) { this.release(enemy); this.claimed.set(best, enemy); }
    return best;
  }
}
