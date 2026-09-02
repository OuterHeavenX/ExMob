# EXMOB - GRAPHICS TECHNOLOGY

Goal: **maximum perceived quality per unit of performance** on iPhone, iPad, and desktop
browsers, with reasonable load size. A beautifully lit, optimized scene beats a technically
expensive one.

## Evaluation summary (September 2026)

| Option | Verdict | Notes |
| --- | --- | --- |
| Three.js WebGLRenderer (WebGL2) | **Adopted** | Universal support incl. iOS Safari, mature PBR, shadows, instancing |
| Three.js WebGPURenderer | Deferred (ADR-002) | Requires TSL node materials; iOS support only on recent OS; no needed feature for Cabin |
| Babylon.js | Rejected | Excellent engine, larger bundle, less code-first |
| Baked lightmaps | Planned for production pass | Best quality/perf for static interiors; needs Blender bake step |
| Real-time shadows | Adopted, budgeted | One directional (moon) always; porch spot on HIGH+ |
| Post-processing | Deferred | Bloom desirable on desktop; ACES tone mapping + fog carry the look for now |
| Volumetrics | Rejected for now | Fog + additive light sprites fake it cheaply |
| Draco / meshopt compression | Planned | Enable in `blender:build` when asset size matters; prototypes are tiny |
| KTX2 / Basis textures | Planned | When real textures land; prototypes use vertex colors + flat PBR |

## Recommended combination

**Rendering backend:** WebGL2 via Three.js. Renderer configured with `antialias` on desktop
(MSAA via the default framebuffer), off on mobile in favor of render scale; `powerPreference:
high-performance`; `outputColorSpace: SRGB`; `toneMapping: ACESFilmic`, exposure ~1.0
(quality-scaled).

**Lighting strategy:** physically based lights. Hemisphere + dim ambient for the base;
directional moonlight with shadows; warm interior point lights (lamps) with small radii;
porch spot; vehicle headlight spots (2 per vehicle, shadowless); pooled muzzle point lights.
Production pass: bake interior static lighting to lightmaps in Blender, keep dynamic lights
only for lamps that can break, muzzles, and headlights.

**Shadows:** PCF soft shadows. Moon shadow map 1024 (mobile) / 2048 (high) / 4096 (ultra) with a
tight orthographic frustum around the property. Porch light casts on HIGH+. No shadow from muzzle
lights. Shadow map update is throttled when nothing dynamic moves (planned).

**PBR:** MeshStandardMaterial everywhere; MeshPhysicalMaterial only for glass (transmission off,
just transparency + high specular) to keep cost down.

**Reflections:** a single low-res environment map (night sky gradient) for specular response.
No screen-space or planar reflections.

**Post-processing:** none in v0.1 (tone mapping and fog in the main pass). Bloom on
HIGH/ULTRA is the first candidate once measured.

**Fog:** exponential fog, cold blue-black, tuned so the treeline reads as a wall and headlights
bloom in it.

**Particles:** pooled `Points` systems per particle family with a custom shader (size by
distance, soft alpha), CPU-simulated for small counts. Instanced meshes for debris and glass.

**Decals:** one InstancedMesh of small textured quads snapped to the hit surface (a single draw
call regardless of count), capped per quality tier.

**Texture compression:** KTX2/Basis when real textures arrive. Prototype assets use flat PBR
colors.

**Geometry compression:** meshopt via gltf-transform in the asset build step (planned).

**LOD:** manual `_LOD` suffix convention; runtime `LOD` objects for trees/rocks.

**Animation:** skeletal clips from Blender via `AnimationMixer` (v0.2.0); rigid-part procedural
fallback for assets without a skin (ADR-010). Mixer update throttling for distant enemies is
still planned.

**Instancing:** `InstancedMesh` for trees, rocks, grass tufts, glass shards.

## Quality tiers

Defined in `src/data/quality.js`:

| Setting | LOW | MEDIUM | HIGH | ULTRA |
| --- | --- | --- | --- | --- |
| Render scale (DPR cap) | 0.75 | 1.0 | 1.5 | 2.0 |
| Antialias | off | off | on | on |
| Shadow map | 1024 | 1024 | 2048 | 4096 |
| Shadow-casting lights | 1 | 1 | 2 | 2 |
| Muzzle lights | 1 | 2 | 4 | 6 |
| Particle density | 0.4 | 0.7 | 1.0 | 1.3 |
| Decals | 16 | 32 | 64 | 96 |
| Debris lifetime (s) | 3 | 5 | 8 | 12 |
| Foliage density | 0.5 | 0.75 | 1.0 | 1.0 |
| Fog | on | on | on | on |
| Active enemy clamp | 10 | 12 | 16 | 18 |

AUTO inspects `navigator.hardwareConcurrency`, `deviceMemory`, the WebGL renderer string, DPR,
and touch/mobile UA to choose LOW/MEDIUM on phones, MEDIUM on iPad and integrated GPUs, HIGH on
discrete desktop GPUs.

## Fallback behavior

- No WebGL2: the page shows a clear message (WebGL1 is not supported by this version of Three).
- Shadows unsupported or performance collapses (measured frame time over budget for several
  seconds): QualityManager steps down one tier at runtime (planned; not enabled automatically in
  v0.1, manual selection only).
