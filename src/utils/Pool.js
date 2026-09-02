/**
 * Generic object pool. `create()` builds a new item, `reset(item)` prepares it for reuse.
 * Items carry `_pooled` bookkeeping. Never allocates in acquire once warm.
 */
export class Pool {
  constructor({ create, reset = null, max = 64, warm = 0 }) {
    this._create = create;
    this._reset = reset;
    this.max = max;
    this._free = [];
    this.active = new Set();
    for (let i = 0; i < warm; i++) this._free.push(this._create());
  }

  acquire() {
    let item;
    if (this._free.length) item = this._free.pop();
    else if (this.active.size < this.max) item = this._create();
    else {
      // steal the oldest active item
      item = this.active.values().next().value;
      this.active.delete(item);
      if (this._reset) this._reset(item);
    }
    this.active.add(item);
    return item;
  }

  release(item) {
    if (!this.active.has(item)) return;
    this.active.delete(item);
    if (this._reset) this._reset(item);
    this._free.push(item);
  }

  releaseAll() {
    for (const item of Array.from(this.active)) this.release(item);
  }

  get size() { return this.active.size; }
}
