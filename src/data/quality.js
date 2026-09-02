/**
 * Quality presets. QualityManager owns the active preset; every system reads
 * its caps from there (never from local constants). See docs/GRAPHICS_TECHNOLOGY.md
 * and docs/PERFORMANCE_BUDGET.md.
 */
export const QUALITY_PRESETS = Object.freeze({
  low: Object.freeze({
    id: 'low', label: 'LOW',
    renderScale: 0.75, antialias: false,
    shadows: true, shadowMapSize: 1024, shadowCasters: 1,
    muzzleLights: 1, maxDynamicLights: 4,
    particleDensity: 0.4, maxParticles: 1500,
    maxDecals: 16, maxDebris: 24, debrisLifetime: 3,
    foliageDensity: 0.5, fog: true,
    maxActiveEnemies: 10, maxBodies: 6, maxTracers: 48,
    pathRequestsPerFrame: 2, shellCasings: false,
  }),
  medium: Object.freeze({
    id: 'medium', label: 'MEDIUM',
    renderScale: 1.0, antialias: false,
    shadows: true, shadowMapSize: 1024, shadowCasters: 1,
    muzzleLights: 2, maxDynamicLights: 6,
    particleDensity: 0.7, maxParticles: 3000,
    maxDecals: 32, maxDebris: 48, debrisLifetime: 5,
    foliageDensity: 0.75, fog: true,
    maxActiveEnemies: 12, maxBodies: 10, maxTracers: 64,
    pathRequestsPerFrame: 3, shellCasings: false,
  }),
  high: Object.freeze({
    id: 'high', label: 'HIGH',
    renderScale: 1.5, antialias: true,
    shadows: true, shadowMapSize: 2048, shadowCasters: 2,
    muzzleLights: 4, maxDynamicLights: 10,
    particleDensity: 1.0, maxParticles: 6000,
    maxDecals: 64, maxDebris: 96, debrisLifetime: 8,
    foliageDensity: 1.0, fog: true,
    maxActiveEnemies: 16, maxBodies: 20, maxTracers: 128,
    pathRequestsPerFrame: 6, shellCasings: true,
  }),
  ultra: Object.freeze({
    id: 'ultra', label: 'ULTRA',
    renderScale: 2.0, antialias: true,
    shadows: true, shadowMapSize: 4096, shadowCasters: 2,
    muzzleLights: 6, maxDynamicLights: 12,
    particleDensity: 1.3, maxParticles: 8000,
    maxDecals: 96, maxDebris: 128, debrisLifetime: 12,
    foliageDensity: 1.0, fog: true,
    maxActiveEnemies: 18, maxBodies: 24, maxTracers: 160,
    pathRequestsPerFrame: 8, shellCasings: true,
  }),
});

export const QUALITY_ORDER = Object.freeze(['low', 'medium', 'high', 'ultra']);
