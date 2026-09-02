/**
 * Difficulty registry. Only NORMAL is balanced for the Cabin. See docs/GAME_DESIGN.md.
 * Multipliers are applied by WaveDirector / EnemyCombat. HP is deliberately NOT multiplied heavily.
 */
export const DIFFICULTY = Object.freeze({
  normal: Object.freeze({ id: 'normal', label: 'NORMAL', aggression: 1.0, accuracy: 1.0, groupSize: 1.0, reinforcementInterval: 1.0, specialChance: 1.0, enemyDamage: 1.0, enemyHp: 1.0, balanced: true }),
  hard: Object.freeze({ id: 'hard', label: 'HARD', aggression: 1.2, accuracy: 1.2, groupSize: 1.2, reinforcementInterval: 0.8, specialChance: 1.4, enemyDamage: 1.25, enemyHp: 1.1, balanced: false }),
  veryhard: Object.freeze({ id: 'veryhard', label: 'VERY HARD', aggression: 1.4, accuracy: 1.4, groupSize: 1.4, reinforcementInterval: 0.65, specialChance: 1.8, enemyDamage: 1.5, enemyHp: 1.2, balanced: false }),
});
