import * as THREE from 'three';

/** Pooled bullet tracers: thin additive boxes stretched from muzzle to impact, fading in ~60 ms. */
export class Tracers {
  constructor(scene, max = 64) {
    this.scene = scene;
    this.max = max;
    this.items = [];
    const geo = new THREE.BoxGeometry(0.02, 0.02, 1);
    geo.translate(0, 0, 0.5);
    for (let i = 0; i < max; i++) {
      const mat = new THREE.MeshBasicMaterial({ color: 0xffd9a0, transparent: true, opacity: 0, blending: THREE.AdditiveBlending, depthWrite: false });
      const m = new THREE.Mesh(geo, mat);
      m.visible = false;
      m.frustumCulled = false;
      scene.add(m);
      this.items.push({ mesh: m, t: 0, d: 0 });
    }
    this.cursor = 0;
    this._a = new THREE.Vector3(); this._b = new THREE.Vector3();
  }

  add(x0, y0, z0, x1, y1, z1, color = 0xffd9a0) {
    const it = this.items[this.cursor];
    this.cursor = (this.cursor + 1) % this.max;
    const m = it.mesh;
    this._a.set(x0, y0, z0); this._b.set(x1, y1, z1);
    const len = this._a.distanceTo(this._b);
    if (len < 0.05) return;
    m.position.copy(this._a);
    m.lookAt(this._b);
    m.scale.set(1.2, 1.2, len);
    m.material.color.setHex(color);
    m.material.opacity = 0.85;
    m.visible = true;
    it.t = 0.07; it.d = 0.07;
  }

  update(dt) {
    for (const it of this.items) {
      if (!it.mesh.visible) continue;
      it.t -= dt;
      if (it.t <= 0) { it.mesh.visible = false; continue; }
      it.mesh.material.opacity = 0.85 * (it.t / it.d);
    }
  }

  clear() { for (const it of this.items) it.mesh.visible = false; }
}
