/**
 * Chapter 1 - The Cabin. Five waves. See docs/WAVE_SYSTEM.md.
 * Archetypes are introduced one at a time so each can be learned on its own: the breacher in
 * wave 3, the sniper in wave 4, the arsonist in wave 5.
 * arrival.type: 'vehicle' (drives the driveway route and parks in `slot`) or 'foot' (treeline route).
 * `delay` is seconds after the wave goes ACTIVE.
 */
export const CABIN_WAVES = Object.freeze([
  {
    id: 'cabin_w1', index: 0, title: 'WAVE 1', subtitle: 'THEY FOUND YOU', banner: 'THEY FOUND YOU',
    prepTime: 0, warningTime: 4, activeCap: 4, payout: 250, bountyAfter: 25000,
    music: 'combat_low',
    groups: [
      { delay: 0, arrival: { type: 'vehicle', route: 'driveway', slot: 'A', vehicle: 'VEH_Sedan_A' },
        enemies: [{ type: 'goon', count: 4 }] },
    ],
  },
  {
    id: 'cabin_w2', index: 1, title: 'WAVE 2', subtitle: 'SECOND CAR', banner: 'SECOND CAR',
    prepTime: 35, warningTime: 4, activeCap: 6, payout: 400, bountyAfter: 25000,
    music: 'combat_low',
    groups: [
      { delay: 0, arrival: { type: 'vehicle', route: 'driveway', slot: 'B', vehicle: 'VEH_Sedan_A' },
        enemies: [{ type: 'goon', count: 4 }] },
      { delay: 14, arrival: { type: 'foot', route: 'west_trees' },
        enemies: [{ type: 'goon', count: 3 }] },
    ],
  },
  {
    id: 'cabin_w3', index: 2, title: 'WAVE 3', subtitle: 'BREAK IN', banner: 'BREAK IN',
    prepTime: 40, warningTime: 4, activeCap: 6, payout: 600, bountyAfter: 35000,
    music: 'combat_mid',
    groups: [
      // the breacher arrives with the first car: boards and barricades stop mattering if you ignore him
      { delay: 0, arrival: { type: 'vehicle', route: 'driveway', slot: 'A', vehicle: 'VEH_Sedan_A' },
        enemies: [{ type: 'goon', count: 2 }, { type: 'breacher', count: 1 }, { type: 'enforcer', count: 1 }] },
      { delay: 12, arrival: { type: 'foot', route: 'east_trees' },
        enemies: [{ type: 'goon', count: 3 }, { type: 'enforcer', count: 1 }] },
    ],
  },
  {
    id: 'cabin_w4', index: 3, title: 'WAVE 4', subtitle: 'SURROUNDED', banner: 'SURROUNDED',
    prepTime: 45, warningTime: 5, activeCap: 8, payout: 1050, bountyAfter: 35000,
    music: 'combat_mid',
    groups: [
      { delay: 0, arrival: { type: 'vehicle', route: 'driveway', slot: 'B', vehicle: 'VEH_Sedan_A' },
        enemies: [{ type: 'goon', count: 3 }, { type: 'soldier', count: 1 }] },
      { delay: 6, arrival: { type: 'foot', route: 'west_trees' },
        enemies: [{ type: 'goon', count: 2 }, { type: 'enforcer', count: 1 }] },
      // the sniper sets up in the east treeline and never comes closer: break line of sight or go get him
      { delay: 8, arrival: { type: 'foot', route: 'east_trees' },
        enemies: [{ type: 'sniper', count: 1 }] },
      { delay: 12, arrival: { type: 'foot', route: 'east_trees' },
        enemies: [{ type: 'goon', count: 2 }, { type: 'soldier', count: 1 }] },
      { delay: 18, arrival: { type: 'foot', route: 'rear_trees' },
        enemies: [{ type: 'enforcer', count: 1 }, { type: 'soldier', count: 1 }] },
    ],
  },
  {
    id: 'cabin_w5', index: 4, title: 'WAVE 5', subtitle: 'HIT SQUAD', banner: 'HIT SQUAD INBOUND',
    prepTime: 45, warningTime: 5, activeCap: 8, payout: 1800, bountyAfter: 50000,
    music: 'combat_high', elite: 'hitman',
    groups: [
      { delay: 0, arrival: { type: 'vehicle', route: 'driveway', slot: 'A', vehicle: 'VEH_Sedan_A' },
        enemies: [{ type: 'soldier', count: 2 }, { type: 'enforcer', count: 1 }, { type: 'goon', count: 1 }] },
      // everything the property has taught you, at once: fire on the ground, a rifle on the treeline,
      // a sledgehammer on the door and the hitman coming round the back while you deal with it
      { delay: 4, arrival: { type: 'vehicle', route: 'driveway', slot: 'C', vehicle: 'VEH_Sedan_A' },
        enemies: [{ type: 'goon', count: 2 }, { type: 'arsonist', count: 1 }, { type: 'enforcer', count: 1 }] },
      { delay: 8, arrival: { type: 'foot', route: 'east_trees' },
        enemies: [{ type: 'sniper', count: 1 }] },
      { delay: 12, arrival: { type: 'foot', route: 'rear_trees' },
        enemies: [{ type: 'hitman', count: 1 }, { type: 'soldier', count: 1 }] },
      { delay: 20, arrival: { type: 'foot', route: 'west_trees' },
        enemies: [{ type: 'soldier', count: 1 }, { type: 'breacher', count: 1 }] },
    ],
  },
]);

/** Total population of a wave. Pure (unit-tested). */
export function wavePopulation(wave) {
  return wave.groups.reduce((n, g) => n + g.enemies.reduce((m, e) => m + e.count, 0), 0);
}
