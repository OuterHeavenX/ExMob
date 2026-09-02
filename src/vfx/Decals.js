import * as THREE from 'three';

/** Pooled bullet-hole / dent decals: small textured planes snapped to the hit surface. */
function holeTexture() {
  const c = document.createElement('canvas');
  c.width = c.height = 64;
  const g = c.getContext('2d');
  const grd = g.createRadialGradient(32, 32, 2, 32, 32, 30);
  grd.addColorStop(0, 'rgba(10,6,4,0.95)');
  grd.addColorStop(0.35, 'rgba(20,12,8,0.8)');
  grd.addColorStop(0.7, 'rgba(40,30,20,0.25)');
  grd.addColorStop(1, 'rgba(0,0,0,0)');
  g.fillStyle = grd;
  g.fillRect(0, 0, 64, 64);
  const t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.SRGBColorSpace;
  return t;
}

export class Decals {
  constructor(scene, max = 64) {
    this.scene = scene;
    this.max = max;
    this.items = [];
    const tex = holeTexture();
    const geo = new THREE.PlaneGeometry(0.16, 0.16);
    for (let i = 0; i < max; i++) {
      const m = new THREE.Mesh(geo, new THREE.MeshBasicMaterial({ map: tex, transparent: true, depthWrite: false, polygonOffset: true, polygonOffsetFactor: -2, polygonOffsetUnits: -2 }));
      m.visible = false;
      m.renderOrder = 2;
      scene.add(m);
      this.items.push(m);
    }
    this.cursor = 0;
    this._n = new THREE.Vector3();
  }

  add(x, y, z, nx, nz, kind = 'hole', scale = 1) {
    const m = this.items[this.cursor];
    this.cursor = (this.cursor + 1) % this.max;
    const len = Math.hypot(nx, nz) || 1;
    nx /= len; nz /= len;
    m.position.set(x + nx * 0.012, y, z + nz * 0.012);
    this._n.set(x + nx, y, z + nz);
    m.lookAt(this._n);
    m.rotation.z = Math.random() * Math.PI;
    const s = (kind === 'dent' ? 0.7 : 1) * scale * (0.8 + Math.random() * 0.5);
    m.scale.set(s, s, s);
    m.visible = true;
  }

  clear() { for (const m of this.items) m.visible = false; }
  get count() { return this.items.filter((m) => m.visible).length; }
}
