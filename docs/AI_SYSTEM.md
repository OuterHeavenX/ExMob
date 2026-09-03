# EXMOB - AI SYSTEM

## Goals

Enemies must feel like people attacking a house, not sprites walking toward a target. Low-level
goons can be reckless; professionals should use cover, flank, wait for openings, and coordinate.
The Cabin implements the foundation; later chapters add squad tactics on top of the same states.

## State machine

`EnemyController` runs a modular FSM. Each state is a class in `src/enemies/behaviors/` with
`enter(enemy)`, `update(enemy, dt)`, `exit(enemy)` and returns the next state id or null.

| State | Purpose | Cabin |
| --- | --- | --- |
| SPAWN | Appear (step out of vehicle / emerge from trees), brief delay | Yes |
| APPROACH | Path toward a chosen objective (entry point or player) | Yes |
| SEEK_COVER | Move to the best cover node relative to the player | Yes |
| SUPPRESS | Fire at the player's last known position from cover | Partial (fires at LKP) |
| FLANK | Choose an alternate entry point away from the player | Yes (hitman) |
| BREACH | Attack a portal (door/window/boards) until it opens | Yes |
| ENTER_BUILDING | Move through the portal (door walk / window climb) | Yes |
| SEARCH | Path to last known position inside | Yes |
| ENGAGE | Has line of sight: shoot, strafe, keep preferred range (non-aggressive archetypes back off when the player closes inside it) | Yes |
| RETREAT | Fall back when hurt (professionals) | Yes (hitman) |
| REPOSITION | Move to a better firing position | Partial (via SEEK_COVER) |
| SPECIAL_ACTION | Archetype-specific (throw molotov, call reinforcements) | No |
| DEAD | Death animation, drop cash, pooled body | Yes |

Transitions are data-influenced by the archetype `profile` (aggression, usesCover,
coverSeekOnHit, canEnterWindows, preferredRange).

## Perception

- Line of sight: 2D segment test against blocking wall segments; intact windows and boarded
  windows block LOS; open/broken doors and shattered windows do not.
- Awareness radius: enemies always know the general property location. They know the player's
  exact position only with LOS; otherwise they use the last known position (LKP) which decays.
- Hearing (planned): gunfire updates LKP for all enemies within a radius.

## Navigation

`NavGrid` bakes a 0.5 m walkability grid from the property's colliders. Portals (doors, windows)
are special cells with a portal id. `AStar` finds paths; closed portals cost extra but remain
traversable in planning, so enemies naturally choose the nearest entry and breach it. Windows are
only traversable for archetypes with `canEnterWindows`.

Specialist states (v0.6.0): MELEE for gunless attackers, SNIPE and REPOSITION for the rifleman,
THROW for the arsonist. Each is entered from APPROACH or ENGAGE when the profile carries the
matching block, so a new archetype is a registry entry plus at most one state.

Fire is deliberately absent from the navigation grid. A molotov would otherwise dirty the cells it
covers and re-bake them every time one landed; instead `FireSystem.repulsion` returns a steering
push and enemies walk out of a pool in about a second. It costs nothing and cannot spike a frame.

Baking the grid over the whole property costs about 67 ms, so it happens once at load. After
that, collider changes (a door opening, a prop destroyed, a car parking) record a dirty rectangle
and only those cells are re-baked, which costs well under a millisecond. `NavGrid.applyDirty` is
called once per frame and is a no-op when nothing changed.

Paths are smoothed with a bounded line-of-walk pass (scanning the whole path is quadratic). Path
requests are budgeted per frame.
Re-plans are triggered by portal state changes, target changes, or a stuck timer (an enemy that
has not moved in 1.5 s re-plans and, if still stuck, picks a new entry). The stuck timer is the
guard against "trapped on furniture".

## Cover

`CoverNodes` are generated from colliders (vehicle sides, tree trunks, wall ends, big furniture)
plus hand-placed nodes in the property data. A node scores by distance from the enemy, distance
to the player (within preferred range), and whether it blocks LOS from the player's position.
The Cabin uses this limited automatic system; no procedural tactical cover volumes.

## Breaching

An enemy in BREACH applies `breachDamage` every `breachInterval` to the portal via
`BreachSystem`. Doors take kicks (audio + shake); windows shatter instantly then boards take hits.
When a portal breaks the enemy transitions to ENTER_BUILDING. Portal breaks emit events for VFX
and HUD ("BACK DOOR BREACHED").

## Knockback

Melee hits (and, later, blasts) push an enemy along the hit direction with a velocity that decays
over about a quarter second. Knockback runs through the same collision resolution as normal
movement, so a shoved enemy cannot be pushed through a wall, and it applies to dead bodies for a
moment so they fall away with weight. Combined with the stagger it interrupts a breach.

## Combat

`EnemyCombat` handles reaction time, burst fire, cooldowns, accuracy vs range and vs target
movement, and precision falloff. Shots are hitscan through `ProjectileSystem` with the enemy
profile so player and enemy weapons share VFX and audio.

## Future squad tactics (not implemented)

- Captain buffs: accuracy, aggression, and coordinated breach timing for nearby enemies.
- Roles per group: suppressor, breacher, flanker assigned at spawn.
- Reinforcement calls (Driver).
- Dynamic entry choice based on defended/undefended sides.
- Hearing model and investigation.
