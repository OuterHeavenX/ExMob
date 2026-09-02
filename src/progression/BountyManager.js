import { EV } from '../core/Events.js';
import { ECONOMY } from '../data/economy/economyRegistry.js';

/** The price on Ray's head. Rises after waves per the wave registry (docs/ECONOMY.md). */
export class BountyManager {
  constructor(events, initial = ECONOMY.bountyStart) {
    this.events = events;
    this.bounty = initial;
    this._off = events.on(EV.WAVE_CLEARED, (e) => { if (e.bountyAfter && e.bountyAfter !== this.bounty) this.set(e.bountyAfter, true); });
  }

  set(value, announce = false) {
    const prev = this.bounty;
    this.bounty = value;
    this.events.emit(EV.BOUNTY_CHANGED, { bounty: value, prev, announce });
  }

  /** Stage index in the economy table (for future difficulty lookups). */
  get stage() {
    const stages = ECONOMY.bountyStages;
    let s = 0;
    for (let i = 0; i < stages.length; i++) if (this.bounty >= stages[i]) s = i;
    return s;
  }

  dispose() { this._off(); }
}
