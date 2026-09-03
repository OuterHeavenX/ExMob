import { Enemy } from './Enemy.js';
import { ENEMIES } from '../data/enemies/enemyRegistry.js';
import { pointInBox } from '../utils/math.js';

/** Owns all enemies: spawn, update, body retention cap, queries. */
export class EnemyManager {
  constructor(world) {
    this.world = world;
    this.list = [];
    this.bodyFade = 14;
    /** model name -> spare CharacterRigs recovered from removed bodies (see Enemy spawn cost). */
    this.rigPool = new Map();
    this.maxPooledPerModel = 4;
  }

  _takeRig(def) {
    const pool = this.rigPool.get(def.model);
    return pool && pool.length ? pool.pop() : null;
  }

  _recycleRig(enemy) {
    const model = enemy.def.model;
    const pool = this.rigPool.get(model) || [];
    if (pool.length >= this.maxPooledPerModel) return false;
    enemy.rig.root.removeFromParent();
    pool.push(enemy.rig);
    this.rigPool.set(model, pool);
    return true;
  }

  spawn(type, x, z, opts = {}) {
    const def = ENEMIES[type];
    if (!def) throw new Error('unknown enemy ' + type);
    // nudge off colliders
    const r = this.world.colliders.resolveCircle(x, z, def.radius);
    const e = new Enemy(this.world, def, r.x, r.z, { ...opts, rig: opts.rig || this._takeRig(def) });
    this.list.push(e);
    return e;
  }

  alive() { return this.list.filter((e) => !e.dead); }
  get activeCount() { let n = 0; for (const e of this.list) if (!e.dead) n++; return n; }

  charactersOverlapping(box) {
    const pad = 0.4;
    for (const e of this.list) if (!e.dead && pointInBox(e.x, e.z, box, pad)) return true;
    const p = this.world.player;
    return pointInBox(p.x, p.z, box, pad);
  }

  update(dt) {
    const maxBodies = this.world.ctx.quality.preset.maxBodies;
    let bodies = 0;
    for (let i = this.list.length - 1; i >= 0; i--) {
      const e = this.list[i];
      e.update(dt);
      if (e.dead) {
        bodies++;
        if (e.deadT > this.bodyFade || bodies > maxBodies) {
          if (!this._recycleRig(e)) e.dispose();
          else this.world.cover.release(e);
          this.list.splice(i, 1);
        }
      }
    }
  }

  killAll() { for (const e of this.list) if (!e.dead) e.die(); }

  clear() {
    for (const e of this.list) e.dispose();
    this.list.length = 0;
    this.rigPool.clear();
  }
}
