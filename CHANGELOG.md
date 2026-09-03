# Changelog

All notable changes to EXMOB are documented here. The project uses semantic versioning.

## [0.3.0] - 2026-09-03

Playtest feedback: enemies that reach you need an answer that is not the gun.

### Added
- **Melee strike** (F or V on desktop, MELEE button on touch): a weapon-butt swing in a wide arc
  at close range, available with any weapon including an empty one. Weapon-flavored damage,
  reach, arc, cooldown and knockback live in each weapon's `melee` registry block
  (docs/WEAPONS.md). Hits knock enemies back, stagger them (interrupting a breach), and smash
  destructible props in the arc.
- Knockback on enemies, resolved through normal collision so nothing is shoved through a wall.
- `ANM_Melee` Blender clip on every character, plus a procedural swing for the rigid-part
  fallback rig.
- Baked `melee_swing` and `melee_hit` sound effects (7 new sample files).
- HUD melee prompt near the crosshair and a highlighted MELEE button on touch when a target is
  in reach.
- Save schema v2 with a 1 -> 2 migration adding melee statistics, covered by a unit test.

### Changed
- A swing cancels a reload in progress, blocks firing, and halves movement speed until it ends.
- `F` is no longer an alias for interact (E remains interact).

## [0.2.0] - 2026-09-02

Priority pass after the first vertical slice.

### Added
- Skeletal character rigs from Blender: shared 10-bone skeleton, one skinned mesh per character,
  nine keyframed clips (Idle, Aim, Walk, Run, Fire, Reload, Hit, Death, Kick) exported as NLA
  tracks; runtime AnimationMixer blending with a rigid-part fallback.
- File-based SFX pipeline: `tools/bake-sfx.mjs` renders 67 sample files (32 ids, with
  variations) into `assets/audio`; AudioManager plays files with random variation and falls back
  to realtime synthesis.
- GitHub Pages deployment workflow (build + tests on every push to `main`).
- GLB inspector tool (`tools/inspect-glb.mjs`).

### Changed
- Pistol damage 22 -> 24 (two shots on a Street Goon). Front/back door HP 120/100 -> 150/130.
  Goon breach damage 12 -> 8.
- Non-aggressive enemies back off when the player closes inside their preferred range.
- Decals are one InstancedMesh; window boards/shards, door panels, GLB weapons and procedural
  vehicles are merged. Combat draw calls ~343 (was 430-570).

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
