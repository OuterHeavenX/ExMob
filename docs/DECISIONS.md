# EXMOB - ARCHITECTURAL DECISION RECORDS

Each record: Decision, Why, Alternatives considered, Risks, Future consequences.

---

## ADR-001: Three.js as the rendering library

**Decision.** Use Three.js (0.185) for all rendering.

**Why.** Mature glTF pipeline, PBR materials, shadows, instancing, animation system, huge
ecosystem, works on every target browser including iOS Safari. Fastest path to a premium-looking
scene with a small team.

**Alternatives.** Babylon.js (heavier, more opinionated, excellent but larger bundle); PlayCanvas
(editor-centric, less suited to a code-first repo); raw WebGL/WebGPU (too slow to build).

**Risks.** Three.js API churn between versions. Mitigation: pin the version, wrap renderer
creation in `Renderer.js` so upgrades touch one module.

**Consequences.** All rendering code targets Three.js; the Blender pipeline targets glTF.

---

## ADR-002: WebGL2 now, WebGPU later

**Decision.** Ship v0.1 on `WebGLRenderer` (WebGL2). Keep `WebGPURenderer` behind an
experimental flag (`?gpu=1`, off by default) once the node-material path is validated; not
enabled in v0.1.

**Why.** Cabin visuals do not need compute or storage buffers. WebGPU on iOS Safari (26+) is
new; older iPhones and many Android WebViews still lack it. Three's WebGPU path requires TSL node
materials which our shaders do not yet use. Stability and compatibility beat the badge.

**Alternatives.** WebGPU-first with WebGL fallback through `WebGPURenderer` (which falls back
internally) - rejected because it changes the whole material stack for no visible gain at this
milestone.

**Risks.** Later migration cost for custom shaders. Mitigation: keep custom shaders minimal
(tracers, particles), use standard materials elsewhere.

**Consequences.** GRAPHICS_TECHNOLOGY.md documents the feature set attainable on WebGL2.

---

## ADR-003: Vite for dev server and build

**Decision.** Vite.

**Why.** Zero-config ES module dev server, fast HMR, static build with hashed assets, relative
base support, Vitest integration.

**Alternatives.** No bundler with import maps (workable but no build/minify); Webpack (heavier).

**Risks.** None significant.

---

## ADR-004: No physics engine; custom 2.5D collision and hitscan combat

**Decision.** Movement uses a custom kinematic circle-vs-AABB resolver on the XZ plane. Combat is
hitscan with visual tracers. Debris uses a trivial integrator.

**Why.** The game is top-down-ish on flat properties; a physics engine (Rapier, Ammo, Cannon)
adds bundle size, WASM loading, and determinism headaches for no gameplay gain in the Cabin.
Hitscan is standard for this genre and keeps hit registration exact and cheap.

**Alternatives.** Rapier (WASM, excellent) - kept as the candidate if ragdolls or vehicle physics
become required (FUTURE_FEATURES.md).

**Risks.** Sloped terrain and stairs (Townhouse) need a height sampling extension.

---

## ADR-005: Grid A* navigation with portal links

**Decision.** Bake a 0.5 m walkability grid from colliders per property. Doors and windows are
portal cells with ids; A* costs closed portals higher but still plans through them so enemies
select an entry and breach it.

**Why.** Navmesh generation (Recast) in the browser is heavy; the properties are small and grid
resolution is enough. Portals map directly to the breaching design.

**Alternatives.** recast-navigation-js (future for large estates); hand-placed waypoint graph
(too rigid).

**Risks.** Grid memory for large estates (Chapter 5+). Mitigation: hierarchical grids or a
navmesh later; the interface (`findPath(from, to, opts)`) hides the implementation.

---

## ADR-006: Data registries as ES modules

**Decision.** Registries are plain JS modules exporting frozen objects, validated at boot and in
tests.

**Why.** No loader, tree-shakable, type hints via JSDoc, easy to diff.

**Alternatives.** JSON files (no comments, no computed values); YAML (needs a parser).

---

## ADR-007: Synthesized placeholder SFX via Web Audio

**Decision.** v0.1 ships procedurally synthesized SFX (noise bursts, oscillators) through a bus
graph. No audio files. **v0.2 update:** SFX are now file-based (`assets/audio/manifest.json`
maps each registry id to one or more sample files with random variation) with the realtime synth
as fallback. The shipped files are still synthesized, rendered offline by `tools/bake-sfx.mjs`
with heavier DSP; recorded SFX replace them per id with no code change.

**Why.** Zero asset licensing risk, zero load time, and it forces the bus architecture to exist
now. Real recorded SFX slot in later without changing callers.

**Risks.** Placeholder sound quality. Clearly labeled in STATUS.md.

---

## ADR-008: IndexedDB saves with localStorage fallback and versioned migrations

**Decision.** As stated. Schema version 1.

**Why.** Structured storage, larger quota, async. localStorage fallback covers restricted
contexts.

---

## ADR-009: DOM/CSS for UI and HUD

**Decision.** All UI (title, HUD, shop, menus, touch controls) is HTML/CSS layered over the canvas.

**Why.** Crisp text at any DPR, accessibility, trivial responsive layout, fast iteration, native
touch event handling. In-canvas UI would cost more for no benefit.

---

## ADR-010: Procedural part animation before skeletal rigs

**Decision.** Characters export as named rigid parts; the runtime swings limbs procedurally.
Skeletal animation is planned (BLENDER_PIPELINE.md).

**Why.** Gets readable motion into the slice immediately without rigging time. Keeps the
character asset contract simple.

**Risks.** Visual ceiling. Must be replaced before any public showing.

---

## ADR-011: Proprietary license

**Decision.** All rights reserved (see LICENSE).

**Why.** The project is a commercial game in development. Open-sourcing can be revisited later.

---

## ADR-012: Procedural gray-box plus Blender prototype GLBs for the Cabin

**Decision.** The Cabin environment is built in code (`CabinBuilder`) from modular dimensions
that match the Blender wall module standard, and dresses the scene with Blender-generated
prototype GLBs where available, falling back to primitives.

**Why.** Prove scale, camera, navigation, and portals first (PHASE 3 of the development order).
The Blender production pass replaces meshes without touching gameplay because colliders and
portals are data.

**Risks.** Two sources of truth for dimensions. Mitigation: module sizes live in one place
(`src/data/properties/cabin.js`) and the Blender scripts read the same numbers.
