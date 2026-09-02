import * as THREE from 'three';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';

/**
 * GLB asset loader with a manifest (assets/models/manifest.json, served at /models/manifest.json
 * because Vite's publicDir is `assets/`). Assets not in the manifest
 * resolve to null immediately so callers use procedural fallbacks without 404 noise.
 * Loaded scenes are cached; `get()` returns a deep clone.
 */
const CATEGORY = { CHR: 'characters', WPN: 'weapons', PRP: 'props', VEH: 'vehicles', ENV: 'environment' };

export class AssetLoader {
  constructor(base = 'models/') {
    this.base = base;
    this.loader = new GLTFLoader();
    this.cache = new Map();
    this.manifest = null;
    this.failed = new Set();
  }

  async init() {
    try {
      const res = await fetch(this.base + 'manifest.json', { cache: 'no-cache' });
      this.manifest = res.ok ? await res.json() : { assets: [] };
    } catch { this.manifest = { assets: [] }; }
    this.available = new Set(this.manifest.assets || []);
    return this;
  }

  has(name) { return this.available ? this.available.has(name) : false; }

  pathFor(name) {
    const cat = CATEGORY[name.slice(0, 3)] || 'props';
    return `${this.base}${cat}/${name}.glb`;
  }

  async load(name) {
    if (!this.has(name) || this.failed.has(name)) return null;
    if (this.cache.has(name)) return this.cache.get(name);
    const p = new Promise((resolve) => {
      this.loader.load(this.pathFor(name), (gltf) => {
        gltf.scene.traverse((o) => {
          if (o.isMesh) { o.castShadow = true; o.receiveShadow = true; }
        });
        resolve(gltf);
      }, undefined, (err) => { console.warn('[Assets] failed', name, err?.message || err); this.failed.add(name); resolve(null); });
    });
    this.cache.set(name, p);
    return p;
  }

  /** Preload a list of asset names (missing ones are skipped). */
  async preload(names) {
    await Promise.all(names.filter((n) => this.has(n)).map((n) => this.load(n)));
  }

  /** Returns a cloned scene graph for an already-loaded asset, or null. */
  instance(name) {
    const p = this.cache.get(name);
    if (!p || !p._resolved) return null;
    return p._resolved.scene.clone(true);
  }

  /** Resolve promises into `_resolved` so instance() can be synchronous after preload. */
  async settle() {
    for (const [name, p] of this.cache) {
      const g = await p;
      if (g) p._resolved = g;
    }
  }
}

export { THREE };
