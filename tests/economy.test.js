import { describe, it, expect } from 'vitest';
import { EventBus } from '../src/core/EventBus.js';
import { EV } from '../src/core/Events.js';
import { EconomyManager } from '../src/economy/EconomyManager.js';
import { BountyManager } from '../src/progression/BountyManager.js';
import { formatCash, formatBounty, ECONOMY } from '../src/data/economy/economyRegistry.js';
import { ENEMIES } from '../src/data/enemies/enemyRegistry.js';

describe('economy', () => {
  it('formats cash', () => {
    expect(formatCash(0)).toBe('$0');
    expect(formatCash(1234567)).toBe('$1,234,567');
    expect(formatBounty(Infinity)).toBe(ECONOMY.bountyOpenContractLabel);
  });

  it('adds, spends, refuses overspend', () => {
    const bus = new EventBus();
    const e = new EconomyManager(bus, { startingCash: 100 });
    const seen = [];
    bus.on(EV.CASH_CHANGED, (x) => seen.push(x.delta));
    e.addCash(50, 'test');
    expect(e.cash).toBe(150);
    expect(e.spend(200)).toBe(false);
    expect(e.spend(150)).toBe(true);
    expect(e.cash).toBe(0);
    expect(seen).toEqual([50, -150]);
    expect(e.stats.cashEarned).toBe(50);
    expect(e.stats.cashSpent).toBe(150);
  });

  it('pays out on wave cleared and drops cash on enemy death (no pickups -> direct)', () => {
    const bus = new EventBus();
    const e = new EconomyManager(bus, { startingCash: 0 });
    bus.emit(EV.WAVE_CLEARED, { payout: 250, index: 0 });
    expect(e.cash).toBe(250);
    bus.emit(EV.ENEMY_DEATH, { def: ENEMIES.goon, x: 0, z: 0 });
    expect(e.cash).toBeGreaterThanOrEqual(250 + ENEMIES.goon.cash.min);
  });

  it('bounty rises on wave cleared', () => {
    const bus = new EventBus();
    const b = new BountyManager(bus, 25000);
    let announced = null;
    bus.on(EV.BOUNTY_CHANGED, (x) => { announced = x; });
    bus.emit(EV.WAVE_CLEARED, { payout: 0, bountyAfter: 35000 });
    expect(b.bounty).toBe(35000);
    expect(announced.announce).toBe(true);
    expect(b.stage).toBe(1);
  });
});
