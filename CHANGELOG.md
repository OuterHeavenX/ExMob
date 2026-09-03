# Changelog

All notable changes to EXMOB are documented here. The project uses semantic versioning.

## [0.6.0] - 2026-09-03

Content depth for Chapter 1: three attacker archetypes with counterplay of their own, and three
defenses to spend cash on. Chapter 1 remains the only production content.

### Added
- **BREACHER.** Sledgehammer, no gun, 110 hp. Tears through boards and barricades at 62 damage a
  swing and will not be distracted by a visible player mid-breach. Boarded and barricaded openings
  *attract* him rather than deterring him, so a defended door is bait as much as protection. Once
  he is through he swings at the player instead of shooting, which is the first enemy melee in the
  game and makes closing distance dangerous in both directions.
- **SNIPER.** Bolt-action from the treeline, 34 damage a shot, 60 hp. Holds beyond 13 m, paints a
  laser on the player for 1.5 seconds before firing, and moves to a new vantage when the sightline
  breaks or the player closes. He cannot open a door or climb a window, so the answer is to break
  line of sight or go and get him. A shut-out sniper gives up on range after 20 seconds and closes
  in, so a player who simply hides can never leave a wave unclearable.
- **ARSONIST.** Molotovs, 60 hp, keeps to 9-17 m. The bottle arcs and lights a pool of fire that
  burns for 9 seconds and hurts whoever stands in it, attackers included. Fire is area denial: it
  does not spread and does not burn the cabin down, it moves you off the chokepoint you were
  holding.
- **BARRICADES** ($240, in the world during PREP). Furniture and planks across a door or window,
  240 hp, blocks line of sight and passage. A layer *on top of* the opening's own state rather
  than a state of its own, so a door can be closed and barricaded, and shattering the window
  behind one changes nothing. Boards first, then a barricade over them.
- **TRIPWIRE ALARM** ($450, shop). Six more seconds of warning before every wave.
- **FLOODLIGHTS** ($600, shop). Two lamps on opposite corners; attackers crossing a lit area are
  60% slower to line up a shot. Each lamp has 40 hp and can be shot out, which frees its side of
  the property until the bulbs are replaced between waves.
- Three new Blender characters (helmet, hood and satchel silhouettes) and three new weapons
  (rifle, sledgehammer, molotov), built by the existing generator scripts.

### Changed
- Waves 3, 4 and 5 introduce one new archetype each, in that order, so they can be learned
  separately. Wave 4 pays $1050 (was $900) and wave 5 pays $1800 (was $1500).
- Save schema v3: `property.upgrades` now records the standing installations. v2 saves migrate.

### Measured
Sixty seconds of wave 5 with all eight active enemies and every archetype in its own states:
worst simulation frame **4.2 ms**, median 0.1 ms, zero frames over 8 ms. Placing a barricade
re-bakes 48 navigation cells (0.7 ms), not the grid. Peak draw calls during that fight are 374 at
LOW and 545 at HIGH; the HIGH figure is over the 400 budget and is logged in docs/STATUS.md.

## [0.5.0] - 2026-09-03

Playtest feedback: the game stutters occasionally.

### Fixed
- **The stutter.** The navigation grid was fully re-baked whenever anything changed its
  walkability, which is 14,208 cells and **67 ms**, or four dropped frames. It fired on every door
  opening or breaking, every window shattered, every destructible prop, and every arriving car.
  `ColliderSet` now records a dirty rectangle per change and `NavGrid.applyDirty` re-bakes only
  those cells: a door costs **0.7 ms** (48 cells), a shattered window 0.1 ms, a destroyed prop
  1.3 ms. A unit test asserts the incremental result is byte-identical to a full bake.
- A parking car and a cleared car each forced a full re-bake on top of that, because they set a
  "rebuild everything" flag even though adding or removing their collider already registered the
  area. That was a 69 ms hitch at the exact moment a wave's vehicle arrived.
- Shaders are compiled up front. Three only compiles what is visible, and effect meshes (tracers,
  decals, debris, muzzle sprites, the aim line) start hidden, so their shaders used to compile on
  first use: a hitch on the first shot, the first broken window and the first body.

### Changed
- A* uses a binary heap over typed arrays instead of allocating an object per push, and path
  smoothing uses a bounded look-ahead instead of scanning to the end of the path (which was
  quadratic). A path now costs 0.4-2.4 ms; eight enemies re-planning in the same frame cost 3.8 ms
  in total. A greedy heuristic was tried and rejected: it drives into the cabin wall and then
  explores badly, making the common driveway-to-bedroom route twice as slow.
- Enemy rigs are recycled from removed bodies rather than rebuilt, halving the cost of a
  reinforcement spawn (2.9 ms to 1.4 ms).
- The debug overlay tracks the worst frame and counts frames over 33 ms, with RESET SPIKES and
  REBAKE NAV buttons, so a stutter can be caught rather than guessed at.

### Measured
Simulating a full wave (2,400 frames, vehicle arrival, breaching, deaths, a destroyed prop and a
shattered window): worst frame **5.6 ms**, median 0.1 ms, **zero** frames over 8 ms. Before this
release a single door opening cost 67 ms on its own.

## [0.4.1] - 2026-09-03

### Fixed
- **Touch taps never reached the UI.** The touch layer covered the screen above `#ui`, so during
  gameplay every panel button was unreachable on a phone and tapping one started a movement stick
  instead: the between-wave SHOP and READY, every shop item, the pause menu, and the game over
  buttons (a mobile player who died could not press RETRY WAVE). The touch layer now sits below
  `#ui`; panels take their own taps and empty space still falls through to the sticks.
- Removed the floating SHOP/READY touch buttons that duplicated the prep panel and sat over the
  play area. The prep panel row is now shown on every screen size.

## [0.4.0] - 2026-09-03

Playtest feedback: shooting on a phone meant swiping toward an enemy and hoping.

### Added
- **Aim line** for touch play: a ground line showing exactly where you point, trimmed where it
  meets a wall, with a pulsing ring on the acquired target (`src/vfx/AimIndicator.js`).
- **Aim assist** (`src/combat/AimAssist.js`, presets in `src/data/aim.js`): rotates the raw stick
  direction toward the best target inside a cone. Snaps exactly on target inside 10 degrees,
  closes 95% of the error out to 26 degrees, and changes nothing beyond that, so the player still
  picks the target. Targets behind cover are never acquired. Measured on a 20 degree off-target
  swipe at 6 m: 0/10 hits before, 10/10 after.
- **Auto-facing**: with no thumb on the aim stick, Ray turns to the nearest visible threat within
  14 m, so moving and meleeing with one thumb works.
- Settings for AIM ASSIST (auto/off/light/strong), AIM LINE (auto/always/off) and TOUCH FIRING
  (hold to fire / fire only when aimed).

### Changed
- The touch aim stick now fires at 35% deflection instead of 55%: a small, precise push shoots,
  where before precision required a hard push that ruined it.
- Desktop is deliberately untouched. Aim assist and the aim line default to off for mouse play.

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
