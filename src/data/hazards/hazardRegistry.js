/**
 * Environmental hazards. Currently one: the fire a molotov leaves behind (docs/ENEMY_DESIGN.md,
 * Arsonist). Fire is area denial, not a simulation: it burns on the ground for `life` seconds,
 * hurts whoever stands in it, and pushes AI out of it. It does not spread and does not set the
 * cabin alight (docs/DECISIONS.md ADR-013).
 */
export const HAZARDS = Object.freeze({
  fire: Object.freeze({
    id: 'fire',
    radius: 2.4,           // meters of full damage
    edge: 0.8,             // meters of falloff beyond `radius`
    life: 9,               // seconds before it burns out
    fadeIn: 0.35,          // seconds to reach full size
    // 12/s against a 100 hp player: standing in a pool for its whole life is fatal, stepping
    // out of it costs a sliver. Fire is meant to move the player, not delete him.
    playerDamagePerSec: 12,
    enemyDamagePerSec: 10,
    tickInterval: 0.25,    // damage is applied in ticks, not per frame
    repulsion: 4.0,        // m/s push applied to AI standing in it
    light: Object.freeze({ color: 0xff7a2a, intensity: 55, distance: 10 }),
    maxActive: 6,          // oldest is retired past this
  }),
});
