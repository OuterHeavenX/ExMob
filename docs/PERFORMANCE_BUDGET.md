# EXMOB - PERFORMANCE BUDGET

Budgets are per rendered frame at the Cabin, from the game camera. They are targets that
QualityManager enforces where it can (caps) and that asset production must respect. Measured
numbers are recorded in STATUS.md, never here.

| Budget | MOBILE (LOW/MEDIUM) | DESKTOP (HIGH/ULTRA) |
| --- | --- | --- |
| Triangles on screen | 250k | 900k |
| Draw calls | 150 | 400 |
| Texture memory (GPU) | 128 MB | 512 MB |
| Max texture size | 1024 (2048 hero) | 2048 (4096 hero only) |
| Active enemies | 10 | 16 |
| Projectiles/tracers in flight | 48 | 128 |
| Particles alive | 1,500 | 6,000 |
| Decals alive | 16 | 96 |
| Debris chunks alive | 24 | 96 |
| Debris lifetime | 3 s | 10 s |
| Dynamic point/spot lights | 4 (moon + porch + 2 muzzle/headlight) | 10 |
| Shadow-casting lights | 1 (moon) | 2 (moon + porch) |
| Shadow map | 1024 | 2048 / 4096 ULTRA |
| Positional audio sources | 12 | 32 |
| Enemy bodies retained | 6 | 20 |
| Render scale (DPR cap) | 0.75 / 1.0 | 1.5 / 2.0 |
| Path requests per frame | 2 | 6 |
| Target frame rate | 60 (30 floor) | 60 |

## Per-asset budgets (triangles, LOD0)

| Asset class | Mobile-ready target |
| --- | --- |
| ExMob (hero) | 12k |
| Enemy | 6k |
| Weapon (in hand) | 1.5k |
| Vehicle | 8k |
| Furniture piece | 300-1,500 |
| Wall module | under 50 |
| Tree (instanced) | 400 |
| Rock | 150 |

## Frame spikes

Average frame rate hides stutter completely: one 67 ms frame in an otherwise perfect minute is
invisible in an FPS counter and very visible to a player. Simulation spikes are therefore budgeted
separately from the steady-state costs above.

| Simulation event | Budget | Measured (desktop, v0.5.0) |
| --- | --- | --- |
| Door opened, closed or broken | 2 ms | 0.7 ms (48 nav cells re-baked) |
| Window shattered or boarded | 2 ms | 0.1 ms |
| Destructible prop destroyed | 2 ms | 1.3 ms |
| Vehicle arrival | 2 ms | 0.5 ms |
| Single path request | 3 ms | 0.4-2.4 ms |
| All active enemies re-planning at once | 8 ms | 3.8 ms (8 enemies) |
| Enemy spawn | 4 ms | 1.4 ms recycled rig, 2.9 ms cold |
| Worst frame over a full wave | 8 ms | 5.6 ms |
| Worst frame over a full wave 5, all archetypes (v0.6.0) | 8 ms | 4.2 ms |
| Barricade raised or destroyed | 2 ms | 0.7 ms (48 nav cells) |
| Molotov lands and a fire pool lights | 2 ms | under 0.1 ms (no nav work at all) |

Rules that keep it there:

- **Never re-bake the whole navigation grid at runtime.** A full bake is ~67 ms. Changes go
  through `ColliderSet.invalidate` (or `setWalk`/`add`/`remove`, which call it) so `NavGrid`
  re-bakes only the affected cells. `invalidateAll` is reserved for wholesale state restores.
- Anything that becomes visible for the first time mid-fight must have its shader compiled at
  scene load (`CabinScene._prewarmShaders`).
- Per-spawn allocation is pooled where the object is expensive: enemy rigs, particles, decals,
  debris, tracers, cash pickups.
- The debug overlay's worst-frame and long-frame counters are the check. Reset them, play a wave,
  and read them back.
- Runtime hazards stay out of the navigation grid. Fire pushes AI with a steering force rather
  than making cells unwalkable, so a thrown bottle costs nothing to path around.

## Draw calls

Measured during 50 seconds of wave 5 with eight active enemies, bodies, decals, debris, a fire
pool and the floodlights installed:

| Preset | Max active enemies | Peak draw calls | Triangles |
| --- | --- | --- | --- |
| LOW | 10 | 374 | 48.7k |
| HIGH | 16 | 545 | 71.1k |

LOW is inside the 400 budget; HIGH is over it by 36%. The cost is skinned characters and effect
pools, not the v0.6.0 content: floodlights, fires and a barricade together add about one draw call
(measured by toggling each in an otherwise idle scene, 251 to 252). Reducing it means batching or
LODing characters, which is a separate pass.

## Rules

- Optimize before raising any cap (AGENTS.md rule 13).
- QualityManager owns the cap values in `src/data/quality.js`; systems read from it, never from
  constants of their own.
- The debug overlay shows the live values so budgets can be checked in-game.
