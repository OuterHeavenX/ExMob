/**
 * Pure damage math (unit-tested, node-safe).
 */

/** Apply armor absorption. Returns { healthDamage, armorLeft, absorbed }. */
export function applyArmor(damage, armor, absorb = 0.6) {
  if (armor <= 0 || damage <= 0) return { healthDamage: Math.max(0, damage), armorLeft: Math.max(0, armor), absorbed: 0 };
  const wanted = damage * absorb;
  const absorbed = Math.min(armor, wanted);
  return { healthDamage: damage - absorbed, armorLeft: armor - absorbed, absorbed };
}

/** Stagger seconds from a weapon's stagger value and the damage fraction of max hp. */
export function staggerTime(weaponStagger, damage, maxHp) {
  const frac = Math.min(1, damage / Math.max(1, maxHp));
  return Math.min(0.9, weaponStagger * 0.6 + frac * 0.5);
}

/** Enemy hit chance model: base accuracy scaled by range and target movement. */
export function enemyHitChance(accuracy, distance, preferredMax, targetMoving, difficultyMul = 1) {
  const rangeFactor = distance <= preferredMax ? 1 : Math.max(0.25, 1 - (distance - preferredMax) / (preferredMax * 1.5));
  const moveFactor = targetMoving ? 0.78 : 1;
  return Math.min(0.95, accuracy * rangeFactor * moveFactor * difficultyMul);
}

/** Cash drop for an enemy definition (random within its range). */
export function rollCash(def, rnd = Math.random) {
  const { min, max } = def.cash;
  return Math.round(min + rnd() * (max - min));
}
