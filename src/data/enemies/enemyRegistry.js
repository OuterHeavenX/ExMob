/**
 * Enemy registry. See docs/ENEMY_DESIGN.md and docs/AI_SYSTEM.md.
 * `profile` drives EnemyController / EnemyCombat. `look` drives the fallback
 * procedural model and the GLB tint. `cash` is the drop range.
 *
 * Optional specialist blocks on `profile`, each read by exactly one behaviour state:
 *   melee   { damage, range, windup, cooldown, knockback, stagger }  -> BEHAVIORS.MELEE
 *   sniper  { setupTime, chargeTime, minRange, holdTime }            -> BEHAVIORS.SNIPE
 *   throw   { interval, minRange, maxRange, windup, flightTime }     -> BEHAVIORS.THROW
 * `breachSpecialist` keeps an enemy hammering instead of being distracted by a visible player;
 * `prefersDefended` makes boards and barricades attract him instead of deterring him.
 */
export const ENEMIES = Object.freeze({
  goon: Object.freeze({
    id: 'goon', name: 'STREET GOON', tier: 1, weapon: 'pistol',
    hp: 45, speed: 2.6, sprintMul: 1.35, radius: 0.35, height: 1.8,
    cash: { min: 40, max: 80 }, model: 'CHR_Goon01',
    look: { body: 0x1c1c22, accent: 0x7a1f2e, skin: 0xc79b7a, hat: null, coatLength: 0.55, width: 1.0 },
    profile: {
      accuracy: 0.32, reactionTime: 0.9, burst: { count: 2, interval: 0.32 }, fireCooldown: 1.4,
      preferredRange: { min: 5, max: 11 }, aggression: 0.55, usesCover: false, coverSeekOnHit: false,
      breachDamage: 8, breachInterval: 0.9, canEnterWindows: true, canBreachDoors: true,
      retreatHealth: 0, strafe: 0.5, awarenessDecay: 6, keepRange: true,
    },
    barks: ['He\'s inside!', 'Easy money, they said.', 'Go around!'],
  }),
  enforcer: Object.freeze({
    id: 'enforcer', name: 'ENFORCER', tier: 1, weapon: 'shotgun',
    hp: 80, speed: 2.4, sprintMul: 1.5, radius: 0.42, height: 1.9,
    cash: { min: 60, max: 120 }, model: 'CHR_Enforcer01',
    look: { body: 0x111114, accent: 0x2a2a30, skin: 0xb98c6c, hat: null, coatLength: 0.7, width: 1.25 },
    profile: {
      accuracy: 0.5, reactionTime: 0.6, burst: { count: 1, interval: 0.6 }, fireCooldown: 1.1,
      preferredRange: { min: 1.5, max: 6 }, aggression: 0.95, usesCover: false, coverSeekOnHit: false,
      breachDamage: 34, breachInterval: 0.7, canEnterWindows: false, canBreachDoors: true,
      retreatHealth: 0, strafe: 0.2, awarenessDecay: 8,
    },
    barks: ['Kick it in!', 'Get out of my way.', 'He\'s in the back!'],
  }),
  soldier: Object.freeze({
    id: 'soldier', name: 'MOB SOLDIER', tier: 1, weapon: 'smg',
    hp: 65, speed: 2.8, sprintMul: 1.4, radius: 0.36, height: 1.82,
    cash: { min: 80, max: 140 }, model: 'CHR_Soldier01',
    look: { body: 0x3a3d44, accent: 0x20232a, skin: 0xc4a184, hat: null, coatLength: 0.45, width: 1.05 },
    profile: {
      accuracy: 0.42, reactionTime: 0.7, burst: { count: 4, interval: 0.09 }, fireCooldown: 1.6,
      preferredRange: { min: 6, max: 14 }, aggression: 0.45, usesCover: true, coverSeekOnHit: true,
      breachDamage: 14, breachInterval: 0.8, canEnterWindows: true, canBreachDoors: true,
      retreatHealth: 0, strafe: 0.8, awarenessDecay: 7,
    },
    barks: ['Cover me.', 'Moving up.', 'Window! Window!'],
  }),
  hitman: Object.freeze({
    id: 'hitman', name: 'HITMAN', tier: 1, elite: true, weapon: 'revolver',
    hp: 120, speed: 3.2, sprintMul: 1.45, radius: 0.34, height: 1.85,
    cash: { min: 400, max: 600 }, model: 'CHR_Hitman01',
    look: { body: 0x0c0c10, accent: 0x0c0c10, skin: 0xd8c0aa, hat: 0x0a0a0d, coatLength: 0.85, width: 0.88 },
    profile: {
      accuracy: 0.75, reactionTime: 0.35, burst: { count: 2, interval: 0.22 }, fireCooldown: 1.0,
      preferredRange: { min: 6, max: 16 }, aggression: 0.35, usesCover: true, coverSeekOnHit: true,
      breachDamage: 20, breachInterval: 0.6, canEnterWindows: true, canBreachDoors: true,
      retreatHealth: 0.35, strafe: 1.0, awarenessDecay: 12, flank: true,
    },
    barks: ['Teddy sends his regards.', 'Nothing personal, Ray.'],
  }),
  breacher: Object.freeze({
    id: 'breacher', name: 'BREACHER', tier: 1, weapon: 'sledge',
    hp: 110, speed: 2.5, sprintMul: 1.4, radius: 0.44, height: 1.92,
    cash: { min: 150, max: 220 }, model: 'CHR_Breacher01',
    look: { body: 0x24282c, accent: 0xc2591f, skin: 0xb08869, hat: null, coatLength: 0.5, width: 1.3 },
    profile: {
      accuracy: 0, reactionTime: 0.5, burst: { count: 1, interval: 0.5 }, fireCooldown: 2,
      preferredRange: { min: 0, max: 2.4 }, aggression: 1, usesCover: false, coverSeekOnHit: false,
      breachDamage: 62, breachInterval: 0.6, canEnterWindows: false, canBreachDoors: true,
      retreatHealth: 0, strafe: 0, awarenessDecay: 10,
      breachSpecialist: true, prefersDefended: true,
      melee: { damage: 26, range: 2.5, windup: 0.34, cooldown: 1.5, knockback: 6.5, stagger: 0.9 },
    },
    barks: ['Boards? Cute.', 'Stand back.', 'Coming through the wall if I have to.'],
  }),
  sniper: Object.freeze({
    id: 'sniper', name: 'SNIPER', tier: 1, weapon: 'rifle',
    hp: 60, speed: 2.5, sprintMul: 1.3, radius: 0.34, height: 1.88,
    cash: { min: 260, max: 360 }, model: 'CHR_Sniper01',
    look: { body: 0x2e3328, accent: 0x191c14, skin: 0xc9a583, hat: null, coatLength: 0.78, width: 0.86 },
    profile: {
      accuracy: 0.92, reactionTime: 1.4, burst: { count: 1, interval: 0.5 }, fireCooldown: 3.2,
      preferredRange: { min: 16, max: 34 }, aggression: 0.05, usesCover: true, coverSeekOnHit: true,
      breachDamage: 6, breachInterval: 1.2, canEnterWindows: false, canBreachDoors: false,
      retreatHealth: 0.5, strafe: 0, awarenessDecay: 16,
      sniper: { setupTime: 0.9, chargeTime: 1.5, minRange: 13, holdTime: 11 },
    },
    barks: ['Hold still.', 'I have the window.'],
  }),
  arsonist: Object.freeze({
    id: 'arsonist', name: 'ARSONIST', tier: 1, weapon: 'molotov',
    hp: 60, speed: 3.0, sprintMul: 1.5, radius: 0.34, height: 1.78,
    cash: { min: 180, max: 260 }, model: 'CHR_Arsonist01',
    look: { body: 0x3b2f22, accent: 0x8a6a1f, skin: 0xbf9670, hat: null, coatLength: 0.4, width: 0.98 },
    profile: {
      accuracy: 0.5, reactionTime: 0.8, burst: { count: 1, interval: 0.4 }, fireCooldown: 4.5,
      preferredRange: { min: 9, max: 17 }, aggression: 0.15, usesCover: true, coverSeekOnHit: true,
      breachDamage: 6, breachInterval: 1.2, canEnterWindows: false, canBreachDoors: false,
      retreatHealth: 0.45, strafe: 0.7, awarenessDecay: 9,
      throw: { interval: 5.0, minRange: 6, maxRange: 20, windup: 0.5, flightTime: 0.9 },
    },
    barks: ['Smoke him out.', 'Burn it down.'],
  }),
  // ---- Future archetypes: data only, not spawned in the Cabin. See docs/ENEMY_DESIGN.md.
  shooter: Object.freeze({
    id: 'shooter', name: 'SHOOTER', tier: 2, weapon: 'smg', future: true,
    hp: 70, speed: 2.7, sprintMul: 1.3, radius: 0.36, height: 1.82,
    cash: { min: 100, max: 160 }, model: 'CHR_Shooter01',
    look: { body: 0x2c2f36, accent: 0x4a4e57, skin: 0xc4a184, hat: null, coatLength: 0.4, width: 1.05 },
    profile: {
      accuracy: 0.55, reactionTime: 0.6, burst: { count: 3, interval: 0.12 }, fireCooldown: 1.2,
      preferredRange: { min: 10, max: 22 }, aggression: 0.3, usesCover: true, coverSeekOnHit: true,
      breachDamage: 10, breachInterval: 1.0, canEnterWindows: false, canBreachDoors: true,
      retreatHealth: 0.2, strafe: 0.6, awarenessDecay: 9,
    },
    barks: [],
  }),
});

export const CABIN_ENEMY_IDS = Object.freeze(['goon', 'enforcer', 'soldier', 'hitman', 'breacher', 'sniper', 'arsonist']);
