import { describe, it, expect } from 'vitest';
import { arcCosine, inStrikeArc, selectStrikeTargets } from '../src/combat/MeleeSystem.js';
import { WEAPONS } from '../src/data/weapons/weaponRegistry.js';
import { ENEMIES } from '../src/data/enemies/enemyRegistry.js';

const DEF = WEAPONS.pistol.melee;

describe('melee geometry', () => {
  const cos = arcCosine(DEF.arcDeg);

  it('hits a target straight ahead inside range', () => {
    expect(inStrikeArc(0, 0, 0, 1, 0, 1.5, 0.35, DEF.range, cos)).toBe(true);
  });

  it('misses a target beyond range (measured to its surface)', () => {
    expect(inStrikeArc(0, 0, 0, 1, 0, DEF.range + 1, 0.35, DEF.range, cos)).toBe(false);
    // a wide target at the same center distance is reachable because range hits its surface
    expect(inStrikeArc(0, 0, 0, 1, 0, DEF.range + 0.3, 0.5, DEF.range, cos)).toBe(true);
  });

  it('misses a target behind the player', () => {
    expect(inStrikeArc(0, 0, 0, 1, 0, -1.5, 0.35, DEF.range, cos)).toBe(false);
  });

  it('always hits a target pressed against the player, whatever the angle', () => {
    for (const [x, z] of [[0.3, 0.1], [-0.3, -0.1], [0, -0.4], [0.4, 0]]) {
      expect(inStrikeArc(0, 0, 0, 1, x, z, 0.35, DEF.range, cos)).toBe(true);
    }
  });

  it('respects the arc width at the edges', () => {
    const half = DEF.arcDeg / 2;
    const inside = (deg, dist = 1.6) => inStrikeArc(0, 0, 0, 1, Math.sin(deg * Math.PI / 180) * dist, Math.cos(deg * Math.PI / 180) * dist, 0.2, DEF.range, cos);
    expect(inside(half - 6)).toBe(true);
    expect(inside(half + 12)).toBe(false);
  });
});

describe('target selection', () => {
  const cands = [
    { x: 0, z: 1.2, radius: 0.35, id: 'near' },
    { x: 0.4, z: 1.9, radius: 0.35, id: 'far' },
    { x: 0, z: -1.5, radius: 0.35, id: 'behind' },
    { x: 8, z: 1, radius: 0.35, id: 'away' },
  ];

  it('returns arc targets nearest first, capped by maxTargets', () => {
    const got = selectStrikeTargets(0, 0, 0, 1, DEF, cands).map((c) => c.id);
    expect(got).toEqual(['near', 'far']);
  });

  it('honours maxTargets', () => {
    const got = selectStrikeTargets(0, 0, 0, 1, { ...DEF, maxTargets: 1 }, cands).map((c) => c.id);
    expect(got).toEqual(['near']);
  });

  it('drops targets behind cover', () => {
    const blocked = (x, z) => z > 1.5;
    const got = selectStrikeTargets(0, 0, 0, 1, DEF, cands, blocked).map((c) => c.id);
    expect(got).toEqual(['near']);
  });

  it('returns nothing when the arc is empty', () => {
    expect(selectStrikeTargets(0, 0, 0, 1, DEF, [cands[2], cands[3]])).toEqual([]);
  });
});

describe('melee balance intent', () => {
  it('every weapon defines a melee block with sane values', () => {
    for (const w of Object.values(WEAPONS)) {
      expect(w.melee).toBeDefined();
      expect(w.melee.damage).toBeGreaterThan(0);
      expect(w.melee.range).toBeGreaterThan(1);
      expect(w.melee.range).toBeLessThan(3);
      expect(w.melee.windup).toBeLessThan(w.melee.duration);
      expect(w.melee.cooldown).toBeGreaterThanOrEqual(w.melee.duration);
    }
  });

  it('a pistol whip drops a Street Goon in one hit but not an Enforcer', () => {
    expect(WEAPONS.pistol.melee.damage).toBeGreaterThanOrEqual(ENEMIES.goon.hp);
    expect(WEAPONS.pistol.melee.damage).toBeLessThan(ENEMIES.enforcer.hp);
  });

  it('heavier weapons hit harder in melee than the SMG', () => {
    expect(WEAPONS.shotgun.melee.damage).toBeGreaterThan(WEAPONS.smg.melee.damage);
    expect(WEAPONS.revolver.melee.damage).toBeGreaterThan(WEAPONS.smg.melee.damage);
  });
});
