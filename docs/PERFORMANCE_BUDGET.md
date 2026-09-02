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

## Rules

- Optimize before raising any cap (AGENTS.md rule 13).
- QualityManager owns the cap values in `src/data/quality.js`; systems read from it, never from
  constants of their own.
- The debug overlay shows the live values so budgets can be checked in-game.
