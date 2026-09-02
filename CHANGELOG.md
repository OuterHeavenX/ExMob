# Changelog

All notable changes to EXMOB are documented here. The project uses semantic versioning.

## [0.1.0] - 2026-09-02

First vertical slice: **Chapter 1 - The Cabin**.

### Added
- Repository architecture, data registries, and complete design bible (`docs/`).
- Three.js (WebGL2) rendering foundation with quality presets (LOW/MEDIUM/HIGH/ULTRA/AUTO),
  cinematic elevated follow camera, camera shake, wall/roof fading for interiors.
- Title screen with live night-cabin background, CONTINUE / NEW GAME / SETTINGS / CREDITS,
  DEBUG button in dev mode, version display.
- Gray-box/early-production Cabin environment: living room, kitchen, hallway, bedroom, bathroom,
  porch, driveway, parked car, forest clearing, front door, back door, six windows.
- Player movement, twin-stick aiming, dodge, health + armor, four weapons (pistol, revolver,
  shotgun, SMG) with reload, spread, recoil, and hitscan projectiles with tracers.
- Enemy archetypes for the slice: Street Goon, Enforcer, Mob Soldier, Hitman. Modular
  state-machine AI (approach, engage, breach, enter, search, seek cover, dead).
- Grid navigation with A* and breachable portal links (doors, windows).
- WaveDirector with active-enemy cap, five data-driven Cabin waves, vehicle arrival sequences,
  preparation phase with READY button.
- Doors (open/close/break/repair), windows (shatter/board), breach system, persistent property
  damage (bullet holes, glass, debris, destroyed props).
- Cash pickups, wave payouts, between-wave shop (ammo, heal, armor, repairs, boards, weapon
  unlocks), bounty progression.
- Web Audio bus architecture with procedurally synthesized placeholder SFX and dynamic music
  states.
- Pooled VFX: muzzle flashes, tracers, sparks, glass, wood chips, blood, smoke, decals, debris.
- HUD, wave banners, pause menu, shop UI, game-over screen, settings.
- Desktop (keyboard/mouse) and mobile (dual virtual stick + buttons) input.
- Versioned IndexedDB save system with migrations, export/import/reset.
- Debug overlay (FPS, frame time, draw calls, counts, cheats, AI/nav visualization).
- Blender generator scripts producing the initial GLB asset library.
- Vitest unit tests and an in-browser smoke test harness.
- Game loop watchdog for browsers that starve requestAnimationFrame, and a dev-only `?catchup=1`
  flag for automated testing in throttled tabs.
- Static geometry batching (walls, frames, props, vehicles, character parts) to keep draw calls
  within budget.
