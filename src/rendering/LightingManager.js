import * as THREE from 'three';
import { Pool } from '../utils/Pool.js';

/**
 * Cinematic night lighting for the Cabin: cold moon (shadow caster), warm interior lamps,
 * porch light, fog, plus a pooled set of muzzle-flash point lights capped by quality.
 * See docs/ART_DIRECTION.md (Lighting) and docs/GRAPHICS_TECHNOLOGY.md.
 */
export class LightingManager {
  constructor(scene, quality) {
    this.scene = scene;
    this.quality = quality;
    const p = quality.preset;

    scene.background = new THREE.Color(0x05070d);
    scene.fog = new THREE.FogExp2(0x070a12, 0.028);

    this.hemi = new THREE.HemisphereLight(0x2a3a5a, 0x0d0a08, 0.9);
    scene.add(this.hemi);

    this.ambient = new THREE.AmbientLight(0x1a2030, 0.5);
    scene.add(this.ambient);

    this.moon = new THREE.DirectionalLight(0x8fa8d6, 1.4);
    this.moon.position.set(-18, 30, -12);
    this.moon.castShadow = p.shadows;
    this.moon.shadow.mapSize.set(p.shadowMapSize, p.shadowMapSize);
    const s = 30;
    Object.assign(this.moon.shadow.camera, { left: -s, right: s, top: s, bottom: -s, near: 1, far: 90 });
    this.moon.shadow.bias = -0.0008;
    this.moon.shadow.normalBias = 0.03;
    this.moon.shadow.radius = 2;
    scene.add(this.moon);
    scene.add(this.moon.target);
    this.moon.target.position.set(0, 0, 4);

    this.lamps = new Map(); // id -> PointLight
    this.headlights = [];

    this._muzzlePool = new Pool({
      create: () => {
        const l = new THREE.PointLight(0xffc27a, 0, 9, 2);
        l.visible = false;
        scene.add(l);
        return l;
      },
      reset: (l) => { l.visible = false; l.intensity = 0; },
      max: Math.max(1, p.muzzleLights),
    });
    this._flashes = [];

    quality.onChange((preset) => this.applyQuality(preset));
  }

  applyQuality(p) {
    this.moon.castShadow = p.shadows;
    this.moon.shadow.mapSize.set(p.shadowMapSize, p.shadowMapSize);
    if (this.moon.shadow.map) { this.moon.shadow.map.dispose(); this.moon.shadow.map = null; }
    this._muzzlePool.max = Math.max(1, p.muzzleLights);
    if (this.porch) this.porch.castShadow = p.shadows && p.shadowCasters >= 2;
  }

  addPorchLight(x, y, z, color, intensity, distance) {
    const p = this.quality.preset;
    const spot = new THREE.SpotLight(color, intensity, distance, Math.PI / 2.6, 0.55, 1.4);
    spot.position.set(x, y, z);
    spot.target.position.set(x, 0, z + 1.5);
    spot.castShadow = p.shadows && p.shadowCasters >= 2;
    spot.shadow.mapSize.set(1024, 1024);
    spot.shadow.bias = -0.002;
    this.scene.add(spot);
    this.scene.add(spot.target);
    this.porch = spot;
    const bulb = new THREE.Mesh(new THREE.SphereGeometry(0.06, 8, 8), new THREE.MeshBasicMaterial({ color: 0xffe0b0, fog: false }));
    bulb.position.set(x, y - 0.1, z);
    this.scene.add(bulb);
    return spot;
  }

  addLamp(id, x, y, z, color, intensity, distance) {
    const l = new THREE.PointLight(color, intensity, distance, 1.8);
    l.position.set(x, y, z);
    this.scene.add(l);
    this.lamps.set(id, l);
    return l;
  }

  killLamp(id) {
    const l = this.lamps.get(id);
    if (!l) return;
    l.intensity = 0;
    l.visible = false;
  }

  restoreLamp(id, intensity) {
    const l = this.lamps.get(id);
    if (!l) return;
    l.intensity = intensity;
    l.visible = true;
  }

  /** Brief point light at a muzzle. Pooled and capped. */
  flash(x, y, z, color = 0xffc27a, intensity = 14, duration = 0.06) {
    const l = this._muzzlePool.acquire();
    l.position.set(x, y, z);
    l.color.setHex(color);
    l.intensity = intensity;
    l.visible = true;
    this._flashes.push({ light: l, t: duration, d: duration, i: intensity });
  }

  update(dt) {
    for (let i = this._flashes.length - 1; i >= 0; i--) {
      const f = this._flashes[i];
      f.t -= dt;
      if (f.t <= 0) {
        this._muzzlePool.release(f.light);
        this._flashes.splice(i, 1);
      } else {
        f.light.intensity = f.i * (f.t / f.d);
      }
    }
  }

  /** Attach the moon shadow frustum to follow a point (keeps resolution where the action is). */
  followShadow(x, z) {
    this.moon.position.set(x - 18, 30, z - 12);
    this.moon.target.position.set(x, 0, z);
  }
}
