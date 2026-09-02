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
| Pistol | 22 | 1 | 300 (semi) | 12 | 60 | 2.0 | 30 m | low |
| Revolver | 60 | 1 | 120 (semi) | 6 | 24 | 1.2 | 40 m | high |
| Shotgun | 14 | 8 | 70 (pump) | 6 | 18 | 9.0 | 14 m | high |
| SMG | 15 | 1 | 720 (auto) | 30 | 120 | 4.5 | 25 m | low |

Precision aim (hold RMB) halves spread and slows movement to 65%.

Recoil: camera kick per shot and a visual weapon kick. Muzzle flash spawns a short-lived point
light (pooled, capped by quality tier).

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
- muzzle flash sprite + light
- tracer
- shell ejection (HIGH/ULTRA only)
- impact by surface (wood, metal, glass, flesh, dirt)
- camera kick
- enemy stagger on hit
