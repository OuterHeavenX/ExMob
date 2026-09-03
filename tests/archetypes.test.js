import { describe, it, expect } from 'vitest';
import { ENEMIES, CABIN_ENEMY_IDS } from '../src/data/enemies/enemyRegistry.js';
import { WEAPONS } from '../src/data/weapons/weaponRegistry.js';
import { CABIN_WAVES, wavePopulation } from '../src/data/waves/cabinWaves.js';
import { BEHAVIORS } from '../src/enemies/behaviors/index.js';

const NEW = ['breacher', 'sniper', 'arsonist'];

describe('new Chapter 1 archetypes', () => {
  it('are spawnable Cabin enemies with their own models', () => {
    for (const id of NEW) {
      const e = ENEMIES[id];
      expect(CABIN_ENEMY_IDS).toContain(id);
      expect(e.future).toBeUndefined();
      expect(e.model).toMatch(/^CHR_/);
    }
    // every archetype has a distinct model, so nobody is a recoloured stand-in
    const models = CABIN_ENEMY_IDS.map((id) => ENEMIES[id].model);
    expect(new Set(models).size).toBe(models.length);
  });

  it('carry equipment the player can never buy', () => {
    for (const id of NEW) {
      const w = WEAPONS[ENEMIES[id].weapon];
      expect(w.enemyOnly).toBe(true);
      expect(w.price).toBe(0);
      expect(w.owned).toBe(false);
    }
  });

  it('gives the breacher a sledgehammer and no gun', () => {
    const b = ENEMIES.breacher;
    expect(WEAPONS[b.weapon].ranged).toBe(false);
    expect(b.profile.melee.damage).toBeGreaterThan(0);
    expect(b.profile.breachSpecialist).toBe(true);
    expect(b.profile.prefersDefended).toBe(true);
    // he has to out-damage every other breacher or the specialism means nothing
    for (const id of CABIN_ENEMY_IDS) {
      if (id === 'breacher') continue;
      expect(b.profile.breachDamage).toBeGreaterThan(ENEMIES[id].profile.breachDamage);
    }
  });

  it('keeps the sniper out of the fight he cannot win', () => {
    const s = ENEMIES.sniper.profile;
    expect(s.sniper.minRange).toBeGreaterThan(ENEMIES.enforcer.profile.preferredRange.max);
    expect(s.canBreachDoors).toBe(false); // he never gets inside on his own
    expect(s.canEnterWindows).toBe(false);
    // the shot has to be telegraphed for longer than a player needs to react
    expect(s.sniper.chargeTime).toBeGreaterThan(1.0);
    expect(ENEMIES.sniper.hp).toBeLessThan(ENEMIES.enforcer.hp); // fragile if you reach him
  });

  it('keeps the arsonist at throwing distance', () => {
    const a = ENEMIES.arsonist.profile;
    expect(a.throw.minRange).toBeGreaterThan(0);
    expect(a.throw.maxRange).toBeGreaterThan(a.throw.minRange);
    expect(a.throw.maxRange).toBeLessThanOrEqual(WEAPONS.molotov.maxRange);
    expect(a.aggression).toBeLessThan(0.5);
    expect(WEAPONS.molotov.thrown).toBe(true);
  });

  it('has a behaviour state for every specialist block, and vice versa', () => {
    expect(BEHAVIORS.MELEE).toBeTruthy();
    expect(BEHAVIORS.SNIPE).toBeTruthy();
    expect(BEHAVIORS.REPOSITION).toBeTruthy();
    expect(BEHAVIORS.THROW).toBeTruthy();
    const withMelee = Object.values(ENEMIES).filter((e) => e.profile.melee);
    const withSniper = Object.values(ENEMIES).filter((e) => e.profile.sniper);
    const withThrow = Object.values(ENEMIES).filter((e) => e.profile.throw);
    expect(withMelee.map((e) => e.id)).toEqual(['breacher']);
    expect(withSniper.map((e) => e.id)).toEqual(['sniper']);
    expect(withThrow.map((e) => e.id)).toEqual(['arsonist']);
  });
});

describe('wave introduction order', () => {
  const firstWaveWith = (type) => CABIN_WAVES.findIndex((w) => w.groups.some((g) => g.enemies.some((e) => e.type === type)));

  it('introduces one new archetype at a time', () => {
    expect(firstWaveWith('breacher')).toBe(2);   // wave 3
    expect(firstWaveWith('sniper')).toBe(3);     // wave 4
    expect(firstWaveWith('arsonist')).toBe(4);   // wave 5
  });

  it('never opens with a specialist', () => {
    for (const g of CABIN_WAVES[0].groups) {
      for (const e of g.enemies) expect(NEW).not.toContain(e.type);
    }
  });

  it('keeps the population climbing and pays more for the harder waves', () => {
    for (let i = 1; i < CABIN_WAVES.length; i++) {
      expect(wavePopulation(CABIN_WAVES[i])).toBeGreaterThanOrEqual(wavePopulation(CABIN_WAVES[i - 1]));
      expect(CABIN_WAVES[i].payout).toBeGreaterThan(CABIN_WAVES[i - 1].payout);
    }
  });

  it('sends the sniper on foot to a treeline, never in a car', () => {
    for (const w of CABIN_WAVES) {
      for (const g of w.groups) {
        if (g.enemies.some((e) => e.type === 'sniper')) expect(g.arrival.type).toBe('foot');
      }
    }
  });
});
