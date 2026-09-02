import * as THREE from 'three';

/**
 * Bullet-hole / dent decals as ONE InstancedMesh (one draw call regardless of count).
 * Small textured quads snapped to the hit surface; the pool overwrites the oldest entry.
 */
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
    const mat = new THREE.MeshBasicMaterial({ map: holeTexture(), transparent: true, depthWrite: false, polygonOffset: true, polygonOffsetFactor: -2, polygonOffsetUnits: -2 });
    this.mesh = new THREE.InstancedMesh(new THREE.PlaneGeometry(0.16, 0.16), mat, max);
    this.mesh.count = 0;
    this.mesh.frustumCulled = false;
    this.mesh.renderOrder = 2;
    scene.add(this.mesh);
    this.cursor = 0;
    this.used = 0;
    this._dummy = new THREE.Object3D();
    this._target = new THREE.Vector3();
  }

  add(x, y, z, nx, nz, kind = 'hole', scale = 1) {
    const len = Math.hypot(nx, nz) || 1;
    nx /= len; nz /= len;
    const d = this._dummy;
    d.position.set(x + nx * 0.012, y, z + nz * 0.012);
    d.lookAt(this._target.set(x + nx, y, z + nz));
    d.rotateZ(Math.random() * Math.PI);
    const s = (kind === 'dent' ? 0.7 : 1) * scale * (0.8 + Math.random() * 0.5);
    d.scale.setScalar(s);
    d.updateMatrix();
    this.mesh.setMatrixAt(this.cursor, d.matrix);
    this.cursor = (this.cursor + 1) % this.max;
    this.used = Math.min(this.used + 1, this.max);
    this.mesh.count = this.used;
    this.mesh.instanceMatrix.needsUpdate = true;
  }

  clear() { this.used = 0; this.cursor = 0; this.mesh.count = 0; }
  get count() { return this.used; }
}
