/**
 * VFX registry. Families for the pooled particle systems. Counts are scaled by
 * QualityManager.particleDensity. Colors are hex. See docs/ART_DIRECTION.md (VFX language).
 */
export const VFX = Object.freeze({
  muzzle: { pool: 'sparks', count: 6, speed: [4, 9], life: [0.05, 0.12], size: 0.12, color: 0xffd08a, gravity: 0 },
  spark: { pool: 'sparks', count: 10, speed: [3, 8], life: [0.15, 0.4], size: 0.06, color: 0xffcc66, gravity: -9 },
  wood: { pool: 'chips', count: 12, speed: [2, 5], life: [0.4, 0.9], size: 0.07, color: 0x8a6a45, gravity: -12 },
  dust: { pool: 'smoke', count: 6, speed: [0.4, 1.2], life: [0.5, 1.2], size: 0.35, color: 0x9a9080, gravity: 0.3 },
  glass: { pool: 'glass', count: 26, speed: [1.5, 5], life: [0.8, 1.6], size: 0.06, color: 0xcfe6ff, gravity: -12 },
  blood: { pool: 'blood', count: 14, speed: [1.5, 4], life: [0.3, 0.7], size: 0.09, color: 0x5a0d0d, gravity: -10 },
  smoke: { pool: 'smoke', count: 4, speed: [0.3, 0.8], life: [1.2, 2.4], size: 0.5, color: 0x6a6a70, gravity: 0.5 },
  dirt: { pool: 'chips', count: 10, speed: [2, 4], life: [0.3, 0.7], size: 0.07, color: 0x4a3f30, gravity: -12 },
  metal: { pool: 'sparks', count: 14, speed: [4, 10], life: [0.2, 0.5], size: 0.05, color: 0xffe0a0, gravity: -9 },
  flame: { pool: 'sparks', count: 5, speed: [0.6, 2.0], life: [0.35, 0.8], size: 0.22, color: 0xff9a3a, gravity: 2.4 },
  doorBreak: { pool: 'chips', count: 40, speed: [2, 6], life: [0.6, 1.4], size: 0.1, color: 0x7a5a3a, gravity: -12 },
  propBreak: { pool: 'chips', count: 24, speed: [1.5, 5], life: [0.5, 1.2], size: 0.08, color: 0x8a7050, gravity: -12 },
  vehicleDust: { pool: 'smoke', count: 3, speed: [0.5, 1.5], life: [1.0, 2.0], size: 0.9, color: 0x5a5548, gravity: 0.2 },
});

export const SURFACE_VFX = Object.freeze({
  wood: { vfx: 'wood', sfx: 'impact_wood', decal: 'hole' },
  metal: { vfx: 'metal', sfx: 'impact_metal', decal: 'dent' },
  glass: { vfx: 'glass', sfx: 'impact_glass', decal: null },
  flesh: { vfx: 'blood', sfx: 'impact_flesh', decal: null },
  dirt: { vfx: 'dirt', sfx: 'impact_dirt', decal: null },
  fabric: { vfx: 'dust', sfx: 'impact_wood', decal: 'hole' },
});
