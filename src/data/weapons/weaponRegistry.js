/**
 * Weapon registry. See docs/WEAPONS.md.
 * All weapons are hitscan. Damage is per pellet. rpm limits fire cadence.
 * mode: 'semi' (one shot per press), 'auto' (hold), 'pump' (semi with long cycle).
 * Enemy variants reuse the same entry with `enemyProfile` overrides.
 *
 * `melee` is the weapon-butt strike every weapon can perform at close quarters
 * (docs/WEAPONS.md, Melee): damage, reach in meters, arc width in degrees, seconds of windup
 * before the hit lands, total swing length, cooldown, knockback speed in m/s, stagger weight,
 * how many enemies one swing can clip, and the multiplier applied to destructible props.
 */
export const WEAPONS = Object.freeze({
  pistol: Object.freeze({
    id: 'pistol', name: 'PISTOL', family: 'pistols', slot: 0,
    damage: 24, pellets: 1, rpm: 300, mode: 'semi',
    magSize: 12, reserveStart: 60, reserveMax: 120,
    spreadDeg: 2.0, precisionSpreadMul: 0.5,
    falloffStart: 30, maxRange: 60, stagger: 0.25,
    reloadTime: 1.4, reloadType: 'mag',
    recoil: { camera: 0.12, kick: 0.06 },
    muzzle: { flashScale: 0.9, lightIntensity: 70, lightColor: 0xffc27a },
    tracerColor: 0xffd9a0,
    melee: { damage: 45, range: 2.0, arcDeg: 110, windup: 0.11, duration: 0.42, cooldown: 0.7, knockback: 5.5, stagger: 0.8, maxTargets: 2, propDamageMul: 1.5, sfx: 'melee_swing' },
    sfx: { fire: 'pistol_fire', reload: 'pistol_reload', empty: 'dry_fire' },
    price: 0, owned: true,
    model: 'WPN_Pistol01',
    enemyProfile: { damage: 8, spreadDeg: 6 },
  }),
  revolver: Object.freeze({
    id: 'revolver', name: 'REVOLVER', family: 'revolvers', slot: 1,
    damage: 60, pellets: 1, rpm: 120, mode: 'semi',
    magSize: 6, reserveStart: 24, reserveMax: 48,
    spreadDeg: 1.2, precisionSpreadMul: 0.5,
    falloffStart: 40, maxRange: 70, stagger: 0.7,
    reloadTime: 2.2, reloadType: 'mag',
    recoil: { camera: 0.32, kick: 0.16 },
    muzzle: { flashScale: 1.3, lightIntensity: 110, lightColor: 0xffb060 },
    tracerColor: 0xffc080,
    melee: { damage: 55, range: 2.0, arcDeg: 105, windup: 0.12, duration: 0.46, cooldown: 0.8, knockback: 6.5, stagger: 0.9, maxTargets: 2, propDamageMul: 1.6, sfx: 'melee_swing' },
    sfx: { fire: 'revolver_fire', reload: 'revolver_reload', empty: 'dry_fire' },
    price: 500, owned: false,
    model: 'WPN_Revolver01',
    enemyProfile: { damage: 18, spreadDeg: 3 },
  }),
  shotgun: Object.freeze({
    id: 'shotgun', name: 'SHOTGUN', family: 'shotguns', slot: 2,
    damage: 14, pellets: 8, rpm: 70, mode: 'pump',
    magSize: 6, reserveStart: 18, reserveMax: 42,
    spreadDeg: 9.0, precisionSpreadMul: 0.7,
    falloffStart: 8, maxRange: 20, stagger: 0.9,
    reloadTime: 0.55, reloadType: 'shell',
    recoil: { camera: 0.4, kick: 0.2 },
    muzzle: { flashScale: 1.6, lightIntensity: 140, lightColor: 0xffa850 },
    tracerColor: 0xffb070,
    melee: { damage: 62, range: 2.3, arcDeg: 130, windup: 0.14, duration: 0.5, cooldown: 0.85, knockback: 7.5, stagger: 0.95, maxTargets: 3, propDamageMul: 1.8, sfx: 'melee_swing' },
    sfx: { fire: 'shotgun_fire', reload: 'shotgun_shell', empty: 'dry_fire', pump: 'shotgun_pump' },
    price: 900, owned: false,
    model: 'WPN_Shotgun01',
    enemyProfile: { damage: 5, pellets: 6, spreadDeg: 10 },
  }),
  smg: Object.freeze({
    id: 'smg', name: 'SMG', family: 'smgs', slot: 3,
    damage: 15, pellets: 1, rpm: 720, mode: 'auto',
    magSize: 30, reserveStart: 120, reserveMax: 240,
    spreadDeg: 4.5, precisionSpreadMul: 0.55,
    falloffStart: 25, maxRange: 50, stagger: 0.15,
    reloadTime: 1.8, reloadType: 'mag',
    recoil: { camera: 0.07, kick: 0.04 },
    muzzle: { flashScale: 0.8, lightIntensity: 60, lightColor: 0xffc27a },
    tracerColor: 0xffe0b0,
    melee: { damage: 36, range: 1.9, arcDeg: 100, windup: 0.09, duration: 0.34, cooldown: 0.55, knockback: 4.5, stagger: 0.6, maxTargets: 2, propDamageMul: 1.3, sfx: 'melee_swing' },
    sfx: { fire: 'smg_fire', reload: 'smg_reload', empty: 'dry_fire' },
    price: 1400, owned: false,
    model: 'WPN_SMG01',
    enemyProfile: { damage: 5, spreadDeg: 7 },
  }),
});

export const WEAPON_SLOTS = Object.freeze(['pistol', 'revolver', 'shotgun', 'smg']);

/** Effective damage after range falloff. Pure function (unit-tested). */
export function damageAtRange(weapon, distance) {
  if (distance <= weapon.falloffStart) return weapon.damage;
  if (distance >= weapon.maxRange) return weapon.damage * 0.35;
  const t = (distance - weapon.falloffStart) / (weapon.maxRange - weapon.falloffStart);
  return weapon.damage * (1 - t * 0.65);
}

/** Seconds between shots for the weapon's rpm. */
export function shotInterval(weapon) {
  return 60 / weapon.rpm;
}
