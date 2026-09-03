import * as THREE from 'three';

/**
 * The sniper's tell. A rifle that kills from the treeline is only fair if you can see it coming,
 * so a laser line is drawn from the shooter to where he is aiming while he charges, brightening
 * as the shot gets close (docs/ENEMY_DESIGN.md, Sniper).
 *
 * One shared thin box scaled per beam, drawn from a small pool: never more than a handful of
 * snipers, and none of them allocate per frame.
 */
export class LaserSights {
  constructor(scene, max = 4) {
    this.max = max;
    this.beams = [];
    this.group = new THREE.Group();
    this.group.name = 'lasers';
    scene.add(this.group);
    this.dotGeo = new THREE.SphereGeometry(0.07, 8, 6);
    this.active = new Map(); // owner -> beam
  }

  _take() {
    for (const b of this.beams) if (!b.inUse) { b.inUse = true; return b; }
    if (this.beams.length >= this.max) return null;
    const mat = new THREE.MeshBasicMaterial({ color: 0xff2a24, transparent: true, opacity: 0.5, depthWrite: false, blending: THREE.AdditiveBlending, fog: false });
    const geo = new THREE.BoxGeometry(0.012, 0.012, 1);
    geo.translate(0, 0, 0.5); // extend along +z from the origin
    const line = new THREE.Mesh(geo, mat);
    line.frustumCulled = false;
    line.visible = false;
    const dot = new THREE.Mesh(this.dotGeo, mat);
    dot.frustumCulled = false;
    dot.visible = false;
    this.group.add(line, dot);
    const b = { line, dot, mat, inUse: true };
    this.beams.push(b);
    return b;
  }

  /**
   * Draw (or move) the beam belonging to `owner`. `charge` is 0..1: the line brightens and the
   * dot swells as the shot approaches.
   */
  set(owner, from, to, charge) {
    let b = this.active.get(owner);
    if (!b) {
      b = this._take();
      if (!b) return;
      this.active.set(owner, b);
    }
    const dx = to.x - from.x, dy = to.y - from.y, dz = to.z - from.z;
    const len = Math.hypot(dx, dy, dz) || 1;
    b.line.position.set(from.x, from.y, from.z);
    b.line.lookAt(to.x, to.y, to.z);
    b.line.scale.set(1, 1, len);
    b.dot.position.set(to.x, to.y, to.z);
    b.dot.scale.setScalar(0.7 + charge * 1.1);
    b.mat.opacity = 0.25 + charge * 0.7;
    b.line.visible = true;
    b.dot.visible = true;
  }

  /** Drop `owner`'s beam (shot fired, target lost, enemy dead). */
  clear(owner) {
    const b = this.active.get(owner);
    if (!b) return;
    b.line.visible = false;
    b.dot.visible = false;
    b.inUse = false;
    this.active.delete(owner);
  }

  clearAll() { for (const owner of Array.from(this.active.keys())) this.clear(owner); }

  get count() { return this.active.size; }
}
