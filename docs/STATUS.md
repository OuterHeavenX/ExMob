# EXMOB - STATUS

Honest state of every system as of **v0.6.0** (2026-09-03). Rule 17 of AGENTS.md: nothing here is
marked working unless it was exercised. "Tested" means exercised in the dev browser (Chromium,
Windows 11, RTX 5080) unless stated otherwise.

## WORKING

- **Boot / title / menus**: index.html boots over HTTP, title screen with live 3D cabin
  background, CONTINUE / NEW GAME / SETTINGS / CREDITS, DEBUG in dev mode, version shown.
  In-game confirm/prompt dialogs (no native dialogs).
- **Rendering**: Three.js 0.185 WebGL2, ACES tone mapping, fog, PCF shadows from the moon,
  porch spotlight shadow on HIGH+, warm interior point lights, headlights, pooled muzzle
  lights. Quality presets LOW/MEDIUM/HIGH/ULTRA/AUTO with live switching.
- **Camera**: elevated follow camera with aim look-ahead, shake, zoom on vehicle arrival,
  cinematic overrides, roof and south-wall fading when inside.
- **Cabin environment (gray-box / early production)**: floor, batched walls with openings,
  3 doors, 6 windows, roof, porch with light, driveway, parked car, instanced forest, rocks,
  grass tufts, 23 furniture/prop instances, 6 story props. Static geometry is batched.
- **Player**: WASD movement with collision, mouse aim, precision aim, dodge roll with i-frames,
  health + armor, four weapons with reload (magazine and shell), hitscan with spread, recoil,
  tracers, muzzle flash.
- **Touch aiming**: aim line on the ground (trimmed at walls) with a target ring, aim assist
  inside a 26 degree cone, auto-facing the nearest threat when the aim stick is idle, and a 35%
  fire threshold. Measured in-browser on a sloppy 20 degree swipe at 6 m: 0/10 hits with assist
  off, 10/10 with it on. Desktop verified unchanged (no assist, no aim line).
- **Melee** (F/V, or the MELEE touch button): weapon-butt strike in an arc at close range, with
  a Blender swing clip, knockback, stagger, prop smashing and a HUD prompt when a target is in
  reach. Verified by stepping the simulation frame by frame in the browser: a pistol whip deals
  exactly 45 damage and kills a Street Goon in one swing; an Enforcer takes two; the swing
  cancels a reload, blocks firing, and is gated by its cooldown; it works with an empty
  magazine; a target out of reach or behind a closed door is not hit; no gun shot is fired.
- **Enemies**: Goon, Enforcer, Soldier, Hitman, Breacher, Sniper and Arsonist spawn from vehicles
  and treelines, path on the nav grid, breach doors and windows (with visible kicks and shatter),
  climb through windows, engage with line of sight, strafe, seek cover (soldier/hitman), retreat
  (hitman), flank (hitman), stagger on hit, die with a fall animation, drop cash.
- **Breacher**: verified by stepping the simulation. Walks the driveway, picks the barricaded door
  over the open one, destroys a 240 hp barricade in 3 s and the 150 hp door behind it in 1 s at
  62 damage a swing, is not distracted by the visible player while breaching, enters, then melees
  for exactly 26 a swing (measured 100 -> 0 hp on a stationary player, 3 swings plus goon fire).
- **Sniper**: verified. Repositions to 13 m, holds, charges 1.5 s with a visible laser on the
  player, fires for exactly 34, cools down 3.2 s, repeats. Does not walk into close range. With
  the player hidden indoors he held 15.6 m for 20 s and then closed in, so a hidden player cannot
  leave a wave unclearable.
- **Arsonist**: verified. Throws an arcing bottle at the player's position; the pool burns for 9 s
  at 12 damage a second to the player and 10 to enemies. A goon standing in one took 10 damage and
  walked clear in 1.3 s under the repulsion force.
- **Defenses**: barricades ($240, in the world), tripwire alarm ($450, +6 s warning, verified as
  10 s total on a 4 s wave), floodlights ($600, two lamps, 1.6x reaction penalty inside 12 m,
  40 hp each, shooting one out verified to restore normal reaction on that side only).
- **Waves**: five data-driven waves, prep countdown with READY, warning phase with engine
  audio and banner, vehicle arrivals that park and unload, active-enemy cap with reinforcement
  queue, cleared payout, bounty progression, chapter complete sequence.
- **Property**: doors open/close/break/repair, windows shatter/board, boards take damage,
  destructible props with collapse, lamps that go dark when destroyed, bullet decals, glass
  and wood debris, breach toasts.
- **Economy**: cash pickups with magnet, wave payouts, shop (ammo, heal, armor, revolver,
  shotgun, SMG), in-world door repair and window boarding with hold-to-confirm and cost.
- **Save**: IndexedDB with localStorage fallback, schema v1, migration framework, export/import/
  reset, autosave after each cleared wave. RETRY WAVE restores the wave-start snapshot.
- **Audio**: bus graph with per-bus volumes, positional attenuation and panning, synthesized
  SFX for every weapon/impact/UI event, wind and fridge ambience, layered dynamic music states.
- **HUD/UI**: health/armor, cash/bounty/wave, weapon/ammo/reload bar, crosshair, interact
  prompt with hold progress, prep panel, toasts, wave banners, low-health vignette, hurt flash,
  pause, game over, settings.
- **Debug**: F3 overlay with FPS, frame/sim/render ms, draw calls, triangles, enemy states,
  particle/decal/debris counts; cheats (god, cash, start/skip wave, kill all, heal, spawn by
  archetype); AI path and nav grid visualization.
- **Frame spikes (v0.6.0)**: 60 s of wave 5 with all 8 active enemies and every archetype in its
  own states - worst simulation frame 4.2 ms, median 0.1 ms, p99 0.6 ms, zero frames over 8 ms.
  Raising a barricade re-bakes 48 nav cells (0.7 ms); a molotov does no nav work at all.
- **Frame spikes (v0.5.0)**: fixed and measured. Simulating a full wave (2,400 frames with a vehicle
  arrival, breaching, deaths, a destroyed prop and a shattered window) the worst frame is 5.6 ms
  with zero frames over 8 ms; previously a single door opening cost 67 ms on its own. Budgets and
  per-event numbers are in docs/PERFORMANCE_BUDGET.md.
- **Tests**: 100 Vitest unit tests pass (`npm test`), including melee arc geometry, target
  selection, melee balance intent, aim assist cone/snap/pull behaviour, incremental navigation
  baking (asserted identical to a full bake), the barricade layer (damage order, collider
  lifetime, snapshot round trip, portal costs), archetype and wave-introduction invariants, and
  the save v1 -> v2 -> v3 migrations. Registry validation passes.
- **Blender pipeline**: headless generator scripts export 53 GLB prototypes with a manifest;
  the runtime loads them (skinned characters with clips, weapons in hand, props, sedan). The three
  new characters get a silhouette-defining volume each (hard hat, hood, satchel of bottles) so
  they are told apart from the game camera, verified in a side-by-side screenshot.
- **Skeletal animation**: all eight characters are skinned to a shared skeleton with Idle/Aim/
  Walk/Run/Fire/Reload/Hit/Death/Kick clips; locomotion blends by speed, one-shots on fire,
  reload, hit, door kick and death. Verified in-browser (run blend at full speed, death falls
  away from the shot, kicks on breach).
- **SFX files**: 32 ids play from baked samples with variation; synth fallback if a file is
  missing.
- **Deploy**: GitHub Pages workflow builds, tests and publishes `dist/` on every push to main.

## PARTIAL

- **Smoke test harness** (`?dev=1&smoke=1`): 13/13 checks pass (scene loads, nav bakes, player
  moves and shoots, vehicle arrival spawns enemies, enemies die, wave 1 clears, wave 2 prep
  starts, cash awarded, player dies, game over shown, retry restores, save persists). Run in the
  embedded dev browser with `&catchup=1`; not yet run on a phone.
- **Enemy AI**: SUPPRESS and REPOSITION are folded into ENGAGE/SEEK_COVER; SPECIAL_ACTION
  unused. Enemies always know the player's rough position (no hearing model).
- **Cover**: automatic nodes from vehicles, near trees, and hand-placed data; no dynamic cover
  evaluation inside rooms beyond the data nodes.
- **Property damage**: bullet holes, glass, debris, prop collapse; no wall damage stages, no
  scorch marks.
- **Difficulty**: NORMAL balanced by feel only (no playtest data). HARD / VERY HARD are data.
  The three new archetypes and the three new defenses have never been played by a human; every
  number in them is a first pass measured against the simulation, not against a player.
- **Enemy melee**: only the breacher has it. An Enforcer who reaches the player still shoots.
- **Fire**: area denial only. It does not spread, does not damage the property, and does not set
  the cabin alight. Burning the cabin down would be a win/lose condition, which Chapter 1 does not
  have (docs/DECISIONS.md ADR-013).
- **Vehicles**: drive, park, headlights, cover; no drive-bys, no player driving.
- **Performance scaling**: presets work; automatic step-down under load is not enabled.
- **Mobile UI**: verified by hit-testing on an 844x390 landscape viewport that the prep panel
  SHOP/READY, shop items (including the scrolled-to-bottom CLOSE/READY), the pause menu and the
  game over buttons all receive their taps, while empty space still drives the sticks.
- **Mobile**: touch controls implemented (floating dual sticks, buttons, safe areas, rotate
  prompt, aim line, aim assist) and exercised with synthetic pointer events in a 844x390 landscape
  viewport in the desktop browser. Still not tested on a physical phone or tablet: thumb comfort,
  real multi-touch, and frame rate on phone hardware remain unverified.

## PLACEHOLDER

- **All 3D assets**: procedural and Blender-generated blockouts with flat PBR materials. Not
  production art. Character clips are hand-keyed poses, not motion capture; no per-weapon
  fire/reload variants, no dodge or window-climb clips yet.
- **Textures**: canvas-generated wood grain and noise; no authored texture sets.
- **Audio**: every sound is still synthesized (now rendered offline to files). No recorded SFX,
  no composed music, no voice. The baked set is 2.8 MB of WAV; compress to OGG/MP3 before a
  mobile-focused release.
- **Intro / compromised cinematics**: captions and camera moves only; the phone message is a
  caption, not a rendered phone UI.
- **Story dressing**: newspaper clipping, coffee can, burner phone, photograph, mail, map exist
  as simple props without readable detail.

## NOT STARTED

- Chapters 2-6 (Small House through Mansion). Documented only.
- Enemy archetypes: Shooter (data only), Breacher, Arsonist, Driver, Sniper, Cleaner, Captain,
  Underboss, Contract Killer.
- Defenses beyond boards and door repair (barricades, alarm, cameras, lights, dog, muscle...).
- Weapon upgrades, rifles, melee.
- Post-processing (bloom), baked lightmaps, KTX2 textures, Draco/meshopt compression, LODs.
- Skeletal animation, ragdolls.
- Gamepad, localization, achievements screen, cloud saves.
- Physical device testing.

## KNOWN ISSUES

- Draw calls: wave 5 with 8 active enemies now measured. Peak 374 at LOW (inside the 400 budget)
  and 545 at HIGH (36% over it). The cost is skinned characters and effect pools: the v0.6.0
  content adds about one draw call in total. Fixing it means character batching or LODs, which is
  a separate pass and is not done.
- The embedded browser used for automated checks throttles `requestAnimationFrame` and timers
  to ~1 Hz when unfocused; the game loop watchdog and `?catchup=1` compensate for testing only.
  A normal Chromium window measured 240 fps at HIGH (uncapped) on the RTX 5080 dev machine.
- Enemies now back off inside their preferred range, but still bunch up in doorways when
  several arrive together.
- All frame timings above are simulation cost on the desktop dev machine, measured by stepping
  the loop directly. Rendering cost and phone hardware are not included: neither the stutter fix
  nor the v0.6.0 content has been confirmed on a physical device.
- The sniper's laser is drawn as a straight line from his chest to the player and is not trimmed
  by walls, so a beam can cross a wall corner while he is repositioning.
- A barricaded door cannot be opened by the player at all, even in PREP: the only way past your
  own barricade is to let it be destroyed. There is no refund and no way to take one down.
- The barricade mesh is one plank stack for every opening, scaled to the door or window width; it
  does not read as the specific furniture named in the item description.
- The breacher's swing plays the shared `ANM_Melee` clip, so a sledgehammer looks like a pistol
  whip.
- Aim assist helps only inside its cone: a swipe more than 26 degrees off target is still a
  miss, by design. LIGHT (14 degree cone) does nothing for large errors.
- The aim line is drawn on the ground plane, so it reads oddly across the porch step where the
  floor height changes.
- Melee has no dedicated per-weapon clips: every weapon plays the same `ANM_Melee` swing, so the
  shotgun buttstroke looks like the pistol whip.
- Enemies have no melee of their own; an Enforcer who reaches the player still shoots.
- Shadow map follows the player with a 60 m orthographic frustum; distant shadows are soft.
- Grass tufts and trees are single-LOD instanced cones; no LOD switching.
- The vehicle arrival zoom can coincide with a banner; both are brief.
- Save export uses an in-game text area (no file download) because of browser download
  restrictions in embedded contexts.

## NEXT PRIORITIES

1. Human playtest of waves 1-5 on the Pages build (desktop mouse + a phone), now including the
   breacher, sniper, arsonist and the three defenses, and record findings against
   docs/CABIN_VERTICAL_SLICE.md success criteria. Nothing in v0.6.0 has been balanced by a player.
2. Bring HIGH-preset draw calls back under 400: batch or LOD the skinned characters, and enable
   automatic quality step-down under load.
3. Per-weapon fire/reload clips, a real sledgehammer swing, dodge clip, window-climb clip; mixer
   throttling for distant enemies.
4. Compress baked SFX to OGG/MP3 and add recorded weapon layers behind the same ids.
5. Bloom on HIGH/ULTRA and baked interior lightmaps for the production art pass.
