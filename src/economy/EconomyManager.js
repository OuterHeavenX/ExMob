import { EV } from '../core/Events.js';
import { rollCash } from '../combat/DamageSystem.js';

/** Cash ledger. Listens for enemy deaths (drops) and wave clears (payouts). Node-safe core. */
export class EconomyManager {
  constructor(events, { startingCash = 0, pickups = null, stats = null } = {}) {
    this.events = events;
    this.cash = startingCash;
    this.pickups = pickups;
    this.stats = stats || { cashEarned: 0, cashSpent: 0 };
    this._offs = [
      events.on(EV.ENEMY_DEATH, (e) => this.onEnemyDeath(e)),
      events.on(EV.WAVE_CLEARED, (e) => { if (!e.skipped || true) this.addCash(e.payout, 'payout'); }),
    ];
  }

  onEnemyDeath(e) {
    const value = rollCash(e.def);
    if (this.pickups) this.pickups.spawn(e.x, e.z, value);
    else this.addCash(value, 'drop');
  }

  addCash(amount, reason = 'misc') {
    if (amount <= 0) return;
    this.cash += amount;
    this.stats.cashEarned += amount;
    this.events.emit(EV.CASH_CHANGED, { cash: this.cash, delta: amount, reason });
  }

  canAfford(amount) { return this.cash >= amount; }

  spend(amount, reason = 'purchase') {
    if (amount < 0 || this.cash < amount) return false;
    this.cash -= amount;
    this.stats.cashSpent += amount;
    this.events.emit(EV.CASH_CHANGED, { cash: this.cash, delta: -amount, reason });
    return true;
  }

  set(amount) { this.cash = amount; this.events.emit(EV.CASH_CHANGED, { cash: this.cash, delta: 0, reason: 'set' }); }

  dispose() { for (const off of this._offs) off(); }
}
