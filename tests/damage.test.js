import { describe, it, expect } from 'vitest';
import { applyArmor, staggerTime, enemyHitChance, rollCash } from '../src/combat/DamageSystem.js';
import { ENEMIES } from '../src/data/enemies/enemyRegistry.js';

describe('damage', () => {
  it('armor absorbs a fraction until depleted', () => {
    const r = applyArmor(20, 50, 0.6);
    expect(r.healthDamage).toBeCloseTo(8);
    expect(r.armorLeft).toBeCloseTo(38);
    const r2 = applyArmor(100, 10, 0.6);
    expect(r2.absorbed).toBe(10);
    expect(r2.healthDamage).toBe(90);
    expect(r2.armorLeft).toBe(0);
  });

  it('no armor passes damage through', () => {
    expect(applyArmor(15, 0).healthDamage).toBe(15);
  });

  it('stagger is bounded', () => {
    expect(staggerTime(0.9, 1000, 100)).toBeLessThanOrEqual(0.9);
    expect(staggerTime(0.2, 10, 100)).toBeGreaterThan(0);
  });

  it('hit chance drops with range and movement', () => {
    const still = enemyHitChance(0.5, 5, 10, false);
    const moving = enemyHitChance(0.5, 5, 10, true);
    const far = enemyHitChance(0.5, 30, 10, false);
    expect(moving).toBeLessThan(still);
    expect(far).toBeLessThan(still);
    expect(enemyHitChance(1, 1, 10, false, 2)).toBeLessThanOrEqual(0.95);
  });

  it('cash roll stays within the enemy range', () => {
    for (const def of Object.values(ENEMIES)) {
      for (let i = 0; i < 20; i++) {
        const c = rollCash(def);
        expect(c).toBeGreaterThanOrEqual(def.cash.min);
        expect(c).toBeLessThanOrEqual(def.cash.max);
      }
    }
  });
});
