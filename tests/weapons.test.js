import { describe, it, expect } from 'vitest';
import { WEAPONS, damageAtRange, shotInterval } from '../src/data/weapons/weaponRegistry.js';
import { WeaponState, spreadRadians } from '../src/combat/WeaponSystem.js';
import { ReloadSystem } from '../src/combat/ReloadSystem.js';

describe('weapon math', () => {
  it('full damage inside falloff, reduced beyond', () => {
    const p = WEAPONS.pistol;
    expect(damageAtRange(p, 5)).toBe(p.damage);
    expect(damageAtRange(p, p.falloffStart)).toBe(p.damage);
    expect(damageAtRange(p, (p.falloffStart + p.maxRange) / 2)).toBeLessThan(p.damage);
    expect(damageAtRange(p, 999)).toBeCloseTo(p.damage * 0.35);
  });

  it('shot interval follows rpm', () => {
    expect(shotInterval(WEAPONS.smg)).toBeCloseTo(60 / 720);
  });

  it('precision halves pistol spread', () => {
    expect(spreadRadians(WEAPONS.pistol, true)).toBeCloseTo(spreadRadians(WEAPONS.pistol, false) * 0.5);
  });
});

describe('WeaponState', () => {
  it('semi-auto needs a trigger edge', () => {
    const w = new WeaponState('pistol', { owned: true });
    expect(w.canFire(0, true)).toBe(true);
    w.consume(0);
    w.triggerWasDown = true;
    expect(w.canFire(1, true)).toBe(false);
    w.triggerWasDown = false;
    expect(w.canFire(1, true)).toBe(true);
  });

  it('auto fires while held at rpm cadence', () => {
    const w = new WeaponState('smg', { owned: true });
    w.consume(0);
    w.triggerWasDown = true;
    expect(w.canFire(0.01, true)).toBe(false);
    expect(w.canFire(0.1, true)).toBe(true);
  });

  it('cannot fire empty', () => {
    const w = new WeaponState('pistol', { owned: true, mag: 0 });
    expect(w.canFire(5, true)).toBe(false);
  });

  it('fill from reserve respects reserve', () => {
    const w = new WeaponState('pistol', { owned: true, mag: 0, reserve: 5 });
    expect(w.fillFromReserve()).toBe(5);
    expect(w.reserve).toBe(0);
    expect(w.mag).toBe(5);
  });
});

describe('ReloadSystem', () => {
  it('magazine reload completes after reloadTime', () => {
    const r = new ReloadSystem(null, null);
    const w = new WeaponState('pistol', { owned: true, mag: 2, reserve: 20 });
    expect(r.start(w)).toBe(true);
    expect(r.update(w, w.def.reloadTime / 2)).toBe(false);
    expect(r.update(w, w.def.reloadTime)).toBe(true);
    expect(w.mag).toBe(w.def.magSize);
    expect(w.reserve).toBe(10);
  });

  it('shell reload inserts one shell per step and can be interrupted by firing', () => {
    const r = new ReloadSystem(null, null);
    const w = new WeaponState('shotgun', { owned: true, mag: 1, reserve: 10 });
    r.start(w);
    r.update(w, w.def.reloadTime + 0.01);
    expect(w.mag).toBe(2);
    expect(w.reloading).toBe(true);
    expect(w.canFire(10, true)).toBe(true); // shell weapons may fire mid-reload
    w.consume(10);
    expect(w.reloading).toBe(false);
  });
});
