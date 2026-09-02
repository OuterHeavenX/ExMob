import { damp } from '../utils/math.js';

/**
 * Fades camera-facing walls and the roof when the player is inside so the interior stays
 * readable from the elevated camera. Meshes register with a `fadeGroup` ('south' | 'roof').
 */
export class WallFader {
  constructor() {
    this.groups = { south: [], roof: [] };
    this.opacity = { south: 1, roof: 1 };
    this.targets = { south: 1, roof: 1 };
    this.inside = false;
  }

  register(mesh, group) {
    if (!this.groups[group]) this.groups[group] = [];
    const mats = Array.isArray(mesh.material) ? mesh.material : [mesh.material];
    for (const m of mats) {
      if (!m.userData.fadeClone) {
        const clone = m.clone();
        clone.transparent = true;
        clone.userData.fadeClone = true;
        clone.userData.baseOpacity = m.opacity;
        mesh.material = Array.isArray(mesh.material) ? mesh.material.map((mm) => (mm === m ? clone : mm)) : clone;
      }
    }
    mesh.userData.fadeGroup = group;
    this.groups[group].push(mesh);
  }

  setInside(inside) {
    this.inside = inside;
    this.targets.south = inside ? 0.12 : 1;
    this.targets.roof = inside ? 0.0 : 1;
  }

  update(dt) {
    for (const g of Object.keys(this.groups)) {
      const t = this.targets[g] ?? 1;
      const cur = this.opacity[g] ?? 1;
      if (Math.abs(cur - t) < 0.002) continue;
      const next = damp(cur, t, 8, dt);
      this.opacity[g] = next;
      for (const mesh of this.groups[g]) {
        const mats = Array.isArray(mesh.material) ? mesh.material : [mesh.material];
        for (const m of mats) m.opacity = next * (m.userData.baseOpacity ?? 1);
        mesh.castShadow = next > 0.5;
        mesh.visible = next > 0.01;
      }
    }
  }
}
