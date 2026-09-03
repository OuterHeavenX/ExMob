import { describe, it, expect } from 'vitest';
import { angleDelta, pickAimTarget, assistAim, nearestTarget } from '../src/combat/AimAssist.js';
import { AIM_ASSIST, TOUCH_AIM, resolveAssist } from '../src/data/aim.js';

const STRONG = AIM_ASSIST.strong;
const dirFromDeg = (deg) => ({ x: Math.sin((deg * Math.PI) / 180), z: Math.cos((deg * Math.PI) / 180) });
const degOf = (x, z) => (Math.atan2(x, z) * 180) / Math.PI;

describe('angleDelta', () => {
  it('returns the shortest signed difference', () => {
    expect(angleDelta(0, Math.PI / 2)).toBeCloseTo(Math.PI / 2);
    expect(angleDelta(0, -Math.PI / 2)).toBeCloseTo(-Math.PI / 2);
    // wrapping the long way round is never chosen
    expect(Math.abs(angleDelta(3.0, -3.0))).toBeLessThan(Math.PI);
  });
});

describe('target picking', () => {
  const enemy = (x, z) => ({ x, z, radius: 0.35 });

  it('picks a target inside the cone', () => {
    const d = dirFromDeg(0);
    const hit = pickAimTarget(0, 0, d.x, d.z, [enemy(1.5, 8)], STRONG);
    expect(hit).not.toBeNull();
  });

  it('ignores targets outside the cone', () => {
    const d = dirFromDeg(0);
    // ~50 degrees off axis, well beyond the 26 degree cone
    expect(pickAimTarget(0, 0, d.x, d.z, [enemy(9, 8)], STRONG)).toBeNull();
  });

  it('ignores targets beyond max range', () => {
    const d = dirFromDeg(0);
    expect(pickAimTarget(0, 0, d.x, d.z, [enemy(0, STRONG.maxRange + 5)], STRONG)).toBeNull();
  });

  it('ignores targets behind cover', () => {
    const d = dirFromDeg(0);
    const blocked = () => true;
    expect(pickAimTarget(0, 0, d.x, d.z, [enemy(0, 6)], { ...STRONG, losBlocked: blocked })).toBeNull();
  });

  it('prefers the nearer of two similar targets', () => {
    const d = dirFromDeg(0);
    const near = enemy(0.4, 4), far = enemy(0.2, 20);
    const hit = pickAimTarget(0, 0, d.x, d.z, [far, near], STRONG);
    expect(hit.target).toBe(near);
  });

  it('returns nothing when assist is off', () => {
    const d = dirFromDeg(0);
    expect(pickAimTarget(0, 0, d.x, d.z, [enemy(0, 5)], AIM_ASSIST.off)).toBeNull();
  });
});

describe('assistAim', () => {
  const enemy = (x, z) => ({ x, z, radius: 0.35 });

  it('leaves the aim untouched when there is no target', () => {
    const d = dirFromDeg(30);
    const r = assistAim(0, 0, d.x, d.z, [], STRONG);
    expect(r.target).toBeNull();
    expect(degOf(r.x, r.z)).toBeCloseTo(30, 5);
  });

  it('snaps exactly onto a target inside the snap angle', () => {
    const target = enemy(0.5, 10);            // ~2.9 degrees off axis
    const d = dirFromDeg(0);
    const r = assistAim(0, 0, d.x, d.z, [target], STRONG);
    expect(r.target).toBe(target);
    expect(degOf(r.x, r.z)).toBeCloseTo(degOf(target.x, target.z), 4);
  });

  it('pulls partway toward a target beyond the snap angle', () => {
    const target = enemy(0, 10);
    const d = dirFromDeg(18);                 // inside the 26 degree cone, outside the 8 degree snap
    const r = assistAim(0, 0, d.x, d.z, [target], { ...STRONG, snapDeg: 2, pull: 0.5 });
    const after = degOf(r.x, r.z);
    expect(after).toBeLessThan(18);           // moved toward the target
    expect(after).toBeGreaterThan(0);         // but did not snap all the way
  });

  it('never aims outside the cone the player pointed in', () => {
    const behind = enemy(0, -6);
    const d = dirFromDeg(0);
    const r = assistAim(0, 0, d.x, d.z, [behind], STRONG);
    expect(r.target).toBeNull();
    expect(degOf(r.x, r.z)).toBeCloseTo(0, 5);
  });

  it('off preset is a pass-through', () => {
    const d = dirFromDeg(12);
    const r = assistAim(0, 0, d.x, d.z, [enemy(0, 5)], AIM_ASSIST.off);
    expect(r.target).toBeNull();
    expect(degOf(r.x, r.z)).toBeCloseTo(12, 5);
  });
});

describe('nearestTarget', () => {
  it('finds the closest visible candidate in range', () => {
    const a = { x: 0, z: 3 }, b = { x: 0, z: 9 };
    expect(nearestTarget(0, 0, [b, a], 14)).toBe(a);
    expect(nearestTarget(0, 0, [b], 5)).toBeNull();
    expect(nearestTarget(0, 0, [a], 14, () => true)).toBeNull();
  });

  it('is disabled with a zero radius', () => {
    expect(nearestTarget(0, 0, [{ x: 0, z: 1 }], 0)).toBeNull();
  });
});

describe('presets', () => {
  it('auto turns assist on for touch and off for a mouse', () => {
    expect(resolveAssist('auto', 'touch').id).toBe('strong');
    expect(resolveAssist('auto', 'desktop').id).toBe('off');
    expect(resolveAssist('light', 'desktop').id).toBe('light');
  });

  it('touch fires below full stick deflection', () => {
    expect(TOUCH_AIM.fireThreshold).toBeLessThan(0.5);
    expect(TOUCH_AIM.fireThreshold).toBeGreaterThan(TOUCH_AIM.aimDeadZone);
  });
});
