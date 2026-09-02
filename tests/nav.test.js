import { describe, it, expect } from 'vitest';
import { ColliderSet } from '../src/world/Colliders.js';
import { NavGrid } from '../src/ai/NavGrid.js';
import { circleVsAABB, rayVsAABB, rayVsCircle } from '../src/utils/math.js';

describe('math primitives', () => {
  it('pushes a circle out of a box', () => {
    const box = { minX: 0, maxX: 2, minZ: 0, maxZ: 2 };
    const p = circleVsAABB(-0.2, 1, 0.5, box);
    expect(p.x).toBeLessThan(0);
    expect(circleVsAABB(-2, 1, 0.5, box)).toBeNull();
  });

  it('ray hits a box and a circle', () => {
    expect(rayVsAABB(-5, 1, 1, 0, { minX: 0, maxX: 2, minZ: 0, maxZ: 2 })).toBeCloseTo(5);
    expect(rayVsAABB(-5, 5, 1, 0, { minX: 0, maxX: 2, minZ: 0, maxZ: 2 })).toBeNull();
    expect(rayVsCircle(-5, 0, 1, 0, 0, 0, 1)).toBeCloseTo(4);
    expect(rayVsCircle(5, 0, 1, 0, 0, 0, 1)).toBeNull();
  });
});

describe('NavGrid + AStar', () => {
  function makeWorld() {
    const c = new ColliderSet();
    // a long wall with a door gap
    c.add(ColliderSet.box(-4.75, 0, 8.5, 0.2, { kind: 'wall' }));
    c.add(ColliderSet.box(4.75, 0, 8.5, 0.2, { kind: 'wall' }));
    const door = c.add(ColliderSet.box(0, 0, 1, 0.2, { kind: 'door', walk: true }));
    const portals = new Map([['door', { id: 'door', navBox: door }]]);
    const grid = new NavGrid({ minX: -8, maxX: 8, minZ: -8, maxZ: 8, cell: 0.5 }, c, portals);
    return { c, grid, door };
  }

  it('routes through the door when the portal is allowed', () => {
    const { grid } = makeWorld();
    const path = grid.findPath(0, -5, 0, 5, { portalCost: () => 5 });
    expect(path.length).toBeGreaterThan(1);
    const last = path[path.length - 1];
    expect(Math.hypot(last.x, last.z - 5)).toBeLessThan(1);
    expect(path.some((p) => p.portal === 'door')).toBe(true);
  });

  it('returns a partial path that never crosses an impassable portal', () => {
    const { grid } = makeWorld();
    const path = grid.findPath(0, -5, 0, 5, { portalCost: () => Infinity });
    expect(path.some((p) => p.portal === 'door')).toBe(false);
    for (const p of path) expect(p.z).toBeLessThan(0);
  });

  it('never returns cells inside solid boxes', () => {
    const { grid, c } = makeWorld();
    const path = grid.findPath(-7, -7, 7, 7, { portalCost: () => 0 });
    for (const p of path) expect(c.circleOverlaps(p.x, p.z, 0.2, (b) => b.kind === 'wall')).toBeNull();
  });
});
