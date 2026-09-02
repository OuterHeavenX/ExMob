import * as THREE from 'three';
import { getMaterials } from '../world/Materials.js';

/**
 * Pooled debris chunks (door fragments, wood, glass) with a trivial gravity/bounce integrator.
 * Lifetime and cap come from the quality preset. Uses InstancedMesh per kind.
 */
export class Debris {
  constructor(scene, max = 64, lifetime = 6) {
    this.scene = scene;
    this.max = max;
    this.lifetime = lifetime;
    const M = getMaterials();
    this.kinds = {
      wood: this._make(scene, new THREE.BoxGeometry(0.22, 0.05, 0.09), M.door, max),
      glass: this._make(scene, new THREE.BoxGeometry(0.1, 0.01, 0.12), M.glass, max),
    };
    this._m = new THREE.Matrix4();
    this._q = new THREE.Quaternion();
    this._e = new THREE.Euler();
    this._s = new THREE.Vector3(1, 1, 1);
    this._p = new THREE.Vector3();
  }

  _make(scene, geo, mat, max) {
    const mesh = new THREE.InstancedMesh(geo, mat, max);
    mesh.castShadow = true;
    mesh.count = 0;
    mesh.frustumCulled = false;
    scene.add(mesh);
    return { mesh, items: [] };
  }

  spawn(x, y, z, kind, count, vx0 = 0, vz0 = 0) {
    const k = this.kinds[kind] || this.kinds.wood;
    for (let i = 0; i < count; i++) {
      const it = k.items.length < this.max ? {} : k.items.shift();
      it.x = x; it.y = y; it.z = z;
      it.vx = vx0 + (Math.random() - 0.5) * 4; it.vy = 1.5 + Math.random() * 4; it.vz = vz0 + (Math.random() - 0.5) * 4;
      it.rx = Math.random() * 6; it.ry = Math.random() * 6; it.rz = Math.random() * 6;
      it.wx = (Math.random() - 0.5) * 12; it.wz = (Math.random() - 0.5) * 12;
      it.life = this.lifetime * (0.7 + Math.random() * 0.6);
      it.s = 0.6 + Math.random() * 0.9;
      it.rest = false;
      k.items.push(it);
    }
  }

  update(dt) {
    for (const k of Object.values(this.kinds)) {
      let n = 0;
      for (let i = k.items.length - 1; i >= 0; i--) {
        const it = k.items[i];
        it.life -= dt;
        if (it.life <= 0) { k.items.splice(i, 1); continue; }
        if (!it.rest) {
          it.vy -= 12 * dt;
          it.x += it.vx * dt; it.y += it.vy * dt; it.z += it.vz * dt;
          it.rx += it.wx * dt; it.rz += it.wz * dt;
          if (it.y <= 0.03) {
            it.y = 0.03;
            it.vy = -it.vy * 0.3;
            it.vx *= 0.6; it.vz *= 0.6;
            if (Math.abs(it.vy) < 0.4) { it.rest = true; it.rx = 0; it.rz = 0; }
          }
        }
      }
      for (const it of k.items) {
        const fade = it.life < 1 ? it.life : 1;
        this._e.set(it.rx, it.ry, it.rz);
        this._q.setFromEuler(this._e);
        this._s.setScalar(it.s * fade);
        this._p.set(it.x, it.y, it.z);
        this._m.compose(this._p, this._q, this._s);
        k.mesh.setMatrixAt(n++, this._m);
      }
      k.mesh.count = n;
      k.mesh.instanceMatrix.needsUpdate = true;
    }
  }

  clear() { for (const k of Object.values(this.kinds)) { k.items.length = 0; k.mesh.count = 0; } }
  get count() { return Object.values(this.kinds).reduce((n, k) => n + k.items.length, 0); }
}
