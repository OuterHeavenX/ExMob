import { BEHAVIORS } from './behaviors/index.js';

/**
 * Modular finite state machine. States live in ./behaviors and return the next state id (or
 * null to stay). See docs/AI_SYSTEM.md.
 */
export class EnemyController {
  constructor(enemy, initial = 'SPAWN') {
    this.e = enemy;
    this.state = null;
    this.stateT = 0;
    this.history = [];
    this.set(initial);
  }

  set(id) {
    if (this.state === id) return;
    const prev = this.state;
    if (prev && BEHAVIORS[prev]?.exit) BEHAVIORS[prev].exit(this.e);
    this.state = id;
    this.stateT = 0;
    this.history.push(id);
    if (this.history.length > 12) this.history.shift();
    const b = BEHAVIORS[id];
    if (!b) { console.warn('[AI] unknown state', id); return; }
    if (b.enter) b.enter(this.e);
  }

  onHit() {
    const b = BEHAVIORS[this.state];
    if (b?.onHit) { const next = b.onHit(this.e); if (next) this.set(next); }
  }

  update(dt) {
    this.stateT += dt;
    const b = BEHAVIORS[this.state];
    if (!b) return;
    const next = b.update(this.e, dt, this.stateT);
    if (next && next !== this.state) this.set(next);
  }
}
