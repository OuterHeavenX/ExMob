# EXMOB - WEAPONS

All weapons are defined in `src/data/weapons/weaponRegistry.js`.

## Families

| Family | Role | Cabin members |
| --- | --- | --- |
| Pistols | Reliable, accurate, always available | Pistol (starting) |
| Revolvers | Heavy hits, slow cadence, high stagger | Revolver |
| Shotguns | Close-range dominance, chokepoint control | Pump shotgun |
| SMGs | Volume of fire, crowd suppression | Compact SMG |
| Rifles | Medium-range precision (later chapters) | none |
| Melee | Emergency (later) | none |

## Stats philosophy

Weapons are hitscan with per-shot spread. Damage is per pellet/bullet. Stats are chosen for
feel first, balance second, and every weapon should feel good on the first pull.

| Weapon | Damage | Pellets | RPM | Mag | Reserve start | Spread (deg) | Range falloff | Stagger |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| Pistol | 24 | 1 | 300 (semi) | 12 | 60 | 2.0 | 30 m | low |
| Revolver | 60 | 1 | 120 (semi) | 6 | 24 | 1.2 | 40 m | high |
| Shotgun | 14 | 8 | 70 (pump) | 6 | 18 | 9.0 | 14 m | high |
| SMG | 15 | 1 | 720 (auto) | 30 | 120 | 4.5 | 25 m | low |

Precision aim (hold RMB) halves spread and slows movement to 65%.

Recoil: camera kick per shot and a visual weapon kick. Muzzle flash spawns a short-lived point
light (pooled, capped by quality tier).

## Melee

Every weapon can be swung at close range. There is no separate melee weapon and no melee
ammo: the strike is the weapon butt, so it is always available, including with an empty
magazine and mid-reload.

| Weapon | Damage | Reach | Arc | Windup | Swing | Cooldown | Knockback | Targets |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| Pistol | 45 | 2.0 m | 110 deg | 0.11 s | 0.42 s | 0.70 s | 5.5 m/s | 2 |
| Revolver | 55 | 2.0 m | 105 deg | 0.12 s | 0.46 s | 0.80 s | 6.5 m/s | 2 |
| Shotgun | 62 | 2.3 m | 130 deg | 0.14 s | 0.50 s | 0.85 s | 7.5 m/s | 3 |
| SMG | 36 | 1.9 m | 100 deg | 0.09 s | 0.34 s | 0.55 s | 4.5 m/s | 2 |

Rules:

- The hit lands after the windup, in the aim direction at that moment, so the swing tracks a
  moving target.
- Reach is measured to the target's surface, not its center, so wide enemies are easier to hit.
  Anyone whose body overlaps Ray is hit regardless of angle.
- Walls block a swing: melee cannot reach through a closed door.
- Targets are hit nearest first, capped per weapon. A shotgun buttstroke can clip three.
- Hits knock the target back and stagger them, which interrupts a breach in progress.
- Destructible props in the arc take the damage multiplied by `propDamageMul` (lamps and
  chairs go down in one swing).
- The swing blocks firing, cancels a reload, and halves movement speed until it finishes.

Balance intent: melee is an emergency tool with a real cost, strong enough to reward the player
who holds their nerve when an Enforcer reaches the doorway. Damage numbers are chosen against
enemy HP: a pistol whip kills a Street Goon (45 HP) in one, an Enforcer (80 HP) in two.

## Ammo

Ammo is per weapon (magazine + reserve). Reload is a timed action that can be cancelled by
swapping weapons. Reserve ammo is bought in the shop. Shotgun reloads shell-by-shell and can be
interrupted.

## Upgrade structure (future)

Each weapon reserves `upgrades: { damage, magazine, reload, spread }` levels in the registry
with costs in the economy registry. Not implemented in the Cabin beyond unlocking the weapon.

## Enemy weapons

Enemy weapons reuse the same registry entries with an `enemyProfile` override (lower accuracy,
lower damage vs the player). This keeps the sound and VFX identical between friend and foe and
lets the player read a threat by its sound.

## Feedback checklist per weapon

- fire sound (variation), empty click, reload sequence sounds
- melee swing whoosh, melee impact (body), melee swing animation clip
- muzzle flash sprite + light
- tracer
- shell ejection (HIGH/ULTRA only)
- impact by surface (wood, metal, glass, flesh, dirt)
- camera kick
- enemy stagger on hit
