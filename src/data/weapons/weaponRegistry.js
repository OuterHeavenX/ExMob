/**
 * Weapon registry. See docs/WEAPONS.md.
 * All weapons are hitscan. Damage is per pellet. rpm limits fire cadence.
 * mode: 'semi' (one shot per press), 'auto' (hold), 'pump' (semi with long cycle).
 * Enemy variants reuse the same entry with `enemyProfile` overrides.
 *
 * Entries marked `enemyOnly` are never sold, never carried by the player and are absent from
 * WEAPON_SLOTS. `ranged: false` means the holder has no gun at all (the breacher's sledgehammer,
 * the arsonist's bottles): EnemyCombat will not fire it, and the archetype's behaviour states
 * drive the attack instead.
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

  // ---------------------------------------------------------------- enemy-only equipment
  rifle: Object.freeze({
    id: 'rifle', name: 'HUNTING RIFLE', family: 'rifles', enemyOnly: true,
    damage: 70, pellets: 1, rpm: 40, mode: 'semi',
    magSize: 5, reserveStart: 20, reserveMax: 40,
    spreadDeg: 0.4, precisionSpreadMul: 0.5,
    falloffStart: 60, maxRange: 90, stagger: 0.8,
    reloadTime: 2.6, reloadType: 'mag',
    recoil: { camera: 0.35, kick: 0.24 },
    muzzle: { flashScale: 1.5, lightIntensity: 130, lightColor: 0xffb060 },
    tracerColor: 0xfff0c8,
    melee: { damage: 40, range: 2.1, arcDeg: 100, windup: 0.14, duration: 0.5, cooldown: 0.9, knockback: 5.0, stagger: 0.7, maxTargets: 1, propDamageMul: 1.2, sfx: 'melee_swing' },
    sfx: { fire: 'rifle_fire', reload: 'rifle_bolt', empty: 'dry_fire' },
    price: 0, owned: false,
    model: 'WPN_Rifle01',
    enemyProfile: { damage: 34, spreadDeg: 0.6 },
  }),
  sledge: Object.freeze({
    id: 'sledge', name: 'SLEDGEHAMMER', family: 'tools', enemyOnly: true, ranged: false,
    damage: 0, pellets: 1, rpm: 60, mode: 'semi',
    magSize: 1, reserveStart: 0, reserveMax: 0,
    spreadDeg: 0, precisionSpreadMul: 1,
    falloffStart: 2, maxRange: 2.5, stagger: 1.0,
    reloadTime: 0.5, reloadType: 'mag',
    recoil: { camera: 0, kick: 0.3 },
    muzzle: { flashScale: 0, lightIntensity: 0, lightColor: 0xffffff },
    tracerColor: 0xffffff,
    melee: { damage: 70, range: 2.5, arcDeg: 120, windup: 0.22, duration: 0.66, cooldown: 1.2, knockback: 9.0, stagger: 1.0, maxTargets: 2, propDamageMul: 3.0, sfx: 'melee_swing' },
    sfx: { fire: 'sledge_hit', reload: 'sledge_hit', empty: 'dry_fire' },
    price: 0, owned: false,
    model: 'WPN_Sledge01',
    enemyProfile: { damage: 0 },
  }),
  molotov: Object.freeze({
    id: 'molotov', name: 'MOLOTOV', family: 'thrown', enemyOnly: true, ranged: false, thrown: true,
    damage: 0, pellets: 1, rpm: 20, mode: 'semi',
    magSize: 1, reserveStart: 6, reserveMax: 6,
    spreadDeg: 0, precisionSpreadMul: 1,
    falloffStart: 20, maxRange: 22, stagger: 0.2,
    reloadTime: 1.0, reloadType: 'mag',
    recoil: { camera: 0, kick: 0.1 },
    muzzle: { flashScale: 0, lightIntensity: 0, lightColor: 0xffffff },
    tracerColor: 0xff9a40,
    melee: { damage: 22, range: 1.8, arcDeg: 90, windup: 0.1, duration: 0.36, cooldown: 0.6, knockback: 3.5, stagger: 0.4, maxTargets: 1, propDamageMul: 1.0, sfx: 'melee_swing' },
    sfx: { fire: 'molotov_throw', reload: 'molotov_throw', empty: 'dry_fire' },
    price: 0, owned: false,
    model: 'WPN_Molotov01',
    enemyProfile: { damage: 0 },
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
