import { WEAPONS, shotInterval } from '../data/weapons/weaponRegistry.js';

/**
 * Per-weapon runtime state and firing rules (node-safe, unit-tested).
 */
export class WeaponState {
  constructor(id, { mag = null, reserve = null, owned = false } = {}) {
    this.id = id;
    this.def = WEAPONS[id];
    this.owned = owned;
    this.mag = mag ?? this.def.magSize;
    this.reserve = reserve ?? this.def.reserveStart;
    this.lastShot = -Infinity;
    this.triggerWasDown = false;
    this.reloading = false;
    this.reloadT = 0;
  }

  get interval() { return shotInterval(this.def); }

  /**
   * Whether a shot may fire now. `trigger` is the held state; semi/pump weapons need an edge.
   */
  canFire(now, trigger) {
    if (this.reloading && this.def.reloadType !== 'shell') return false;
    if (!trigger) return false;
    if (now - this.lastShot < this.interval) return false;
    if (this.def.mode !== 'auto' && this.triggerWasDown) return false;
    return this.mag > 0;
  }

  consume(now) {
    this.mag--;
    this.lastShot = now;
    if (this.reloading && this.def.reloadType === 'shell') { this.reloading = false; this.reloadT = 0; }
  }

  needsReload() { return this.mag < this.def.magSize && this.reserve > 0; }

  fillFromReserve(rounds = Infinity) {
    const want = Math.min(rounds, this.def.magSize - this.mag, this.reserve);
    this.mag += want;
    this.reserve -= want;
    return want;
  }

  refill() { this.reserve = this.def.reserveMax; }

  toJSON() { return { owned: this.owned, mag: this.mag, reserve: this.reserve }; }
}

/** Spread in radians for a weapon given precision aim. */
export function spreadRadians(def, precision = false) {
  const deg = def.spreadDeg * (precision ? def.precisionSpreadMul : 1);
  return (deg * Math.PI) / 180;
}
