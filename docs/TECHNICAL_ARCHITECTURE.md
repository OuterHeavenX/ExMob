# EXMOB - TECHNICAL ARCHITECTURE

## Stack

- **Three.js** (0.185) with `WebGLRenderer` (WebGL2). WebGPU evaluated and deferred
  (DECISIONS.md ADR-002, GRAPHICS_TECHNOLOGY.md).
- **Vite** dev server and production build. `index.html` is the single entry point.
- **Vitest** for unit tests.
- No physics engine. Custom 2.5D kinematic controller and hitscan combat (ADR-004).
- Custom grid navigation with A* and portal links (ADR-005).
- **Web Audio API** with a bus graph; SFX are currently synthesized (ADR-007).
- **IndexedDB** save store with localStorage fallback (ADR-008).
- DOM/CSS for UI and HUD (ADR-009).

## Module map

```
src/main.js                 boot: create Game, start loop
src/core/                   Game, GameLoop, SceneManager, EventBus, Config, Registry
src/rendering/              Renderer, CameraManager, LightingManager, QualityManager, WallFader, PostProcessing (stub)
src/scenes/                 BootScene, MenuScene, CabinScene
src/world/                  CabinBuilder (geometry), AssetLoader (GLB + fallbacks), Colliders
src/player/                 Player, PlayerController, PlayerMovement, PlayerCombat, PlayerHealth
src/combat/                 WeaponSystem, ProjectileSystem, DamageSystem, HitSystem, ReloadSystem
src/enemies/                Enemy, EnemyController (FSM), EnemyNavigation, EnemyCombat, behaviors/*
src/ai/                     NavGrid, AStar, CoverNodes, LineOfSight
src/waves/                  WaveDirector, SpawnDirector
src/property/               PropertyManager, DoorSystem, WindowSystem, BreachSystem, PropertyDamageSystem, BarricadeSystem
src/economy/                EconomyManager, ShopManager
src/progression/            BountyManager, CampaignManager
src/entities/               Vehicle, CashPickup, CharacterRig (procedural part animation)
src/cinematics/             CinematicDirector + sequences (Intro, VehicleArrival, Compromised)
src/audio/                  AudioManager (buses), SynthSFX, MusicDirector
src/vfx/                    VFXManager, ParticlePool, MuzzleFlash, Tracers, Decals, Debris
src/ui/                     TitleScreen, HUD, WaveBanner, ShopUI, PauseMenu, GameOverScreen, SettingsMenu, DebugOverlay, TouchControls
src/input/                  InputManager, KeyboardMouseInput, TouchInput
src/save/                   SaveManager, SaveSchema, migrations, IndexedDBStore
src/utils/                  math, Pool, DeviceDetect, dom
src/data/                   registries (pure data, no THREE imports)
src/tools/                  SmokeTest (dev-only harness)
```

## Data flow

```
Input -> PlayerController -> PlayerMovement / PlayerCombat
PlayerCombat -> WeaponSystem -> ProjectileSystem (hitscan) -> HitSystem -> DamageSystem
DamageSystem -> EventBus('damage', 'death', 'prop:destroyed', 'portal:broken')
WaveDirector -> SpawnDirector -> Enemy instances -> EnemyController FSM -> EnemyNavigation / EnemyCombat
EnemyCombat -> ProjectileSystem -> HitSystem -> DamageSystem -> PlayerHealth
PropertyManager owns portals (Door/Window systems) and props; BreachSystem mediates enemy attacks on portals
EconomyManager listens for 'enemy:death' (cash drop), 'wave:cleared' (payout), 'shop:purchase'
BountyManager listens for 'wave:cleared'
SaveManager listens for 'wave:cleared', settings changes
HUD / banners listen to everything they display
```

Systems communicate through the `EventBus` for cross-cutting events and through direct references
(injected via the `Game` context object) for hot paths (per-frame queries such as "enemies in
range" or "line of sight").

## Event architecture

`EventBus` is a synchronous pub/sub with named events. Hot per-frame data never goes through the
bus. Event names are documented in `src/core/Events.js` as constants.

## Scene management

`SceneManager` holds one active scene (`BootScene` -> `MenuScene` -> `CabinScene`). Each scene
implements `enter(ctx)`, `update(dt)`, `render()`, `exit()`. Scenes own their Three.js `Scene`
and dispose it on exit.

## Game loop

Fixed timestep simulation (60 Hz, max 4 substeps) with interpolation-free rendering at display
rate. `dt` is clamped so tab switches do not explode the simulation. Pause stops simulation but
keeps rendering menus.

## Rendering

See GRAPHICS_TECHNOLOGY.md. Summary: WebGL2, ACES tone mapping, physically based lights,
one shadow-casting directional light (moon) plus a shadow-casting porch light on HIGH+, fog,
emissive lamp materials, pooled muzzle point lights, instanced trees/rocks/grass.

## Performance strategy

- Object pools for projectiles/tracers, particles, decals, debris, muzzle lights, cash pickups.
- Enemy active cap from WaveDirector, clamped by QualityManager.
- Navigation: A* on a coarse grid (0.5 m), path requests budgeted per frame, path caching with
  re-plan on portal state change.
- No per-frame allocations in hot loops (reused vectors).
- Frustum culling on, shadow map updates on a budget, instancing for vegetation.
- Budgets in PERFORMANCE_BUDGET.md.

## Debug and diagnostics

`DebugOverlay` (F3 in dev mode) shows FPS, frame time, draw calls, triangles, active enemies,
projectiles, particles, quality tier, camera info, and exposes cheats and visualizations.

## Testing

Vitest unit tests for pure logic (weapons, damage, economy, waves, bounty, save migrations,
registry validation). In-browser smoke harness (`?dev=1&smoke=1`) drives the real game through
the critical path and prints a pass/fail table to the console and an overlay.

## Build and deploy

`npm run build` outputs a static `dist/` (index.html + hashed assets + copied `assets/`). Any
static host works. Relative `base` so it can live under a subpath.
