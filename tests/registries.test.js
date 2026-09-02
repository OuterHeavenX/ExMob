import { describe, it, expect } from 'vitest';
import { validateRegistries, CABIN_WAVES, ENEMIES, WEAPONS } from '../src/data/index.js';
import { wavePopulation } from '../src/data/waves/cabinWaves.js';

describe('registries', () => {
  it('validate with no errors', () => {
    expect(validateRegistries()).toEqual([]);
  });

  it('cabin has five waves with rising payouts', () => {
    expect(CABIN_WAVES.length).toBe(5);
    for (let i = 1; i < CABIN_WAVES.length; i++) expect(CABIN_WAVES[i].payout).toBeGreaterThan(CABIN_WAVES[i - 1].payout);
  });

  it('wave populations never exceed cap by less than one group (cap enforced by director, not data)', () => {
    for (const w of CABIN_WAVES) expect(wavePopulation(w)).toBeGreaterThanOrEqual(w.activeCap);
  });

  it('every cabin enemy references an owned-capable weapon', () => {
    for (const e of Object.values(ENEMIES)) expect(WEAPONS[e.weapon]).toBeDefined();
  });
});
