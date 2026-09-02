import * as THREE from 'three';
import { buildWeaponMesh } from '../world/PropFactory.js';
import { WEAPONS } from '../data/weapons/weaponRegistry.js';
import { damp, angleDamp } from '../utils/math.js';
import { batchPivotChildren } from '../world/Batch.js';

/**
 * Procedurally animated character (ADR-010). Builds a rigid-part humanoid from a `look`
 * descriptor (or a GLB with named parts Head/Torso/ArmL/ArmR/LegL/LegR/Hat/SOCK_Hand_R) and
 * drives walk cycle, aim pose, recoil, flinch, and death. Silhouette-first (docs/ART_DIRECTION.md).
 */
export class CharacterRig {
  constructor({ look, height = 1.8, width = 1.0, gltf = null, weaponId = 'pistol', assets = null }) {
    this.root = new THREE.Group();
    this.body = new THREE.Group();   // yaw-facing container
    this.root.add(this.body);
    this.parts = {};
    this.height = height;
    this.width = width;
    this.walkPhase = 0;
    this.speedNorm = 0;
    this.aimYaw = 0;
    this.moveYaw = 0;
    this.recoil = 0;
    this.flinch = 0;
    this.dead = false;
    this.deathT = 0;
    this.deathDir = 1;
    this.assets = assets;
    if (gltf) this._fromGLTF(gltf);
    else this._buildProcedural(look, height, width);
    this._buildBlob(height, width);
    for (const n of ['Head', 'Torso', 'ArmL', 'ArmR', 'LegL', 'LegR']) if (this.parts[n]) batchPivotChildren(this.parts[n]);
    this.setWeapon(weaponId);
  }

  _mat(hex, rough = 0.85) { return new THREE.MeshStandardMaterial({ color: hex, roughness: rough }); }

  _buildProcedural(look, H, W) {
    const s = H / 1.8;
    const body = this._mat(look.body), accent = this._mat(look.accent), skin = this._mat(look.skin, 0.7);
    const mk = (geo, mat, x, y, z) => { const m = new THREE.Mesh(geo, mat); m.position.set(x, y, z); m.castShadow = true; m.receiveShadow = false; return m; };
    // legs (pivot at hip)
    const legLen = 0.85 * s;
    for (const side of ['L', 'R']) {
      const sx = side === 'L' ? -1 : 1;
      const pivot = new THREE.Group();
      pivot.position.set(sx * 0.11 * s * W, legLen, 0);
      const leg = mk(new THREE.BoxGeometry(0.16 * s * W, legLen, 0.18 * s), this._mat(0x1a1a1e), 0, -legLen / 2, 0);
      const shoe = mk(new THREE.BoxGeometry(0.17 * s * W, 0.08 * s, 0.28 * s), this._mat(0x0e0e10, 0.5), 0, -legLen + 0.04 * s, 0.05 * s);
      pivot.add(leg, shoe);
      this.body.add(pivot);
      this.parts['Leg' + side] = pivot;
    }
    // torso / coat
    const torsoY = legLen;
    const torso = new THREE.Group();
    torso.position.y = torsoY;
    const chest = mk(new THREE.BoxGeometry(0.46 * s * W, 0.62 * s, 0.28 * s), body, 0, 0.31 * s, 0);
    const shoulders = mk(new THREE.BoxGeometry(0.56 * s * W, 0.12 * s, 0.3 * s), body, 0, 0.58 * s, 0);
    const coat = mk(new THREE.BoxGeometry(0.5 * s * W, look.coatLength * s, 0.32 * s), body, 0, -look.coatLength * s / 2 + 0.05 * s, 0);
    const sweater = mk(new THREE.BoxGeometry(0.2 * s * W, 0.5 * s, 0.05 * s), accent, 0, 0.3 * s, 0.14 * s);
    torso.add(chest, shoulders, coat, sweater);
    this.body.add(torso);
    this.parts.Torso = torso;
    // head (pivot at neck)
    const head = new THREE.Group();
    head.position.set(0, 0.66 * s, 0);
    const skull = mk(new THREE.BoxGeometry(0.22 * s, 0.26 * s, 0.24 * s), skin, 0, 0.14 * s, 0);
    const hair = mk(new THREE.BoxGeometry(0.23 * s, 0.09 * s, 0.25 * s), this._mat(0x2a2320), 0, 0.26 * s, -0.01 * s);
    head.add(skull, hair);
    if (look.hat) {
      const brim = mk(new THREE.CylinderGeometry(0.2 * s, 0.2 * s, 0.02 * s, 12), this._mat(look.hat, 0.6), 0, 0.28 * s, 0);
      const crown = mk(new THREE.CylinderGeometry(0.12 * s, 0.13 * s, 0.13 * s, 12), this._mat(look.hat, 0.6), 0, 0.35 * s, 0);
      head.add(brim, crown);
    }
    torso.add(head);
    this.parts.Head = head;
    // arms (pivot at shoulder)
    const armLen = 0.62 * s;
    for (const side of ['L', 'R']) {
      const sx = side === 'L' ? -1 : 1;
      const pivot = new THREE.Group();
      pivot.position.set(sx * 0.3 * s * W, 0.56 * s, 0);
      const upper = mk(new THREE.BoxGeometry(0.13 * s, armLen, 0.14 * s), body, 0, -armLen / 2, 0);
      const hand = mk(new THREE.BoxGeometry(0.1 * s, 0.1 * s, 0.1 * s), skin, 0, -armLen - 0.03 * s, 0);
      pivot.add(upper, hand);
      torso.add(pivot);
      this.parts['Arm' + side] = pivot;
      if (side === 'R') {
        const sock = new THREE.Group();
        sock.position.set(0, -armLen - 0.02 * s, 0.03 * s);
        pivot.add(sock);
        this.parts.Hand_R = sock;
      }
    }
  }

  /** Cheap contact shadow that grounds the character on any surface. */
  _buildBlob(H, W) {
    const s = H / 1.8;
    const blob = new THREE.Mesh(new THREE.CircleGeometry(0.42 * s * W, 16), new THREE.MeshBasicMaterial({ color: 0x000000, transparent: true, opacity: 0.35, depthWrite: false }));
    blob.rotation.x = -Math.PI / 2;
    blob.position.y = 0.012;
    this.root.add(blob);
    this.blob = blob;
  }

  _fromGLTF(gltf) {
    this.body.add(gltf);
    for (const n of ['Head', 'Torso', 'ArmL', 'ArmR', 'LegL', 'LegR', 'Hand_R', 'SOCK_Hand_R']) {
      const o = gltf.getObjectByName(n);
      if (o) this.parts[n === 'SOCK_Hand_R' ? 'Hand_R' : n] = o;
    }
    if (!this.parts.Hand_R && this.parts.ArmR) { const s = new THREE.Group(); s.position.y = -0.6; this.parts.ArmR.add(s); this.parts.Hand_R = s; }
  }

  setWeapon(weaponId) {
    if (this.weaponMesh) this.weaponMesh.parent?.remove(this.weaponMesh);
    const model = WEAPONS[weaponId]?.model;
    const glb = model && this.assets ? this.assets.instance(model) : null;
    this.weaponMesh = glb || buildWeaponMesh(weaponId);
    // Barrel must run down the arm (local -y) so the aim pose points it forward.
    // GLB barrels point +z (Blender -Y); procedural barrels point -z.
    this.weaponMesh.rotation.x = glb ? Math.PI / 2 - 0.1 : -Math.PI / 2 + 0.1;
    if (glb) this.weaponMesh.traverse((o) => { if (o.isMesh) { o.castShadow = false; o.receiveShadow = false; } });
    if (this.parts.Hand_R) this.parts.Hand_R.add(this.weaponMesh);
    this.weaponId = weaponId;
  }

  /** World position of the muzzle (approximate). */
  muzzleWorld(out) {
    out = out || new THREE.Vector3();
    if (this.parts.Hand_R) { this.parts.Hand_R.getWorldPosition(out); out.y += 0.02; return out; }
    return out.copy(this.root.position).setY(this.root.position.y + this.height * 0.75);
  }

  kick(amount) { this.recoil = Math.min(1, this.recoil + amount); }
  hit() { this.flinch = 1; }

  die(dirX, dirZ) {
    this.dead = true;
    this.deathT = 0;
    // fall away from the shot
    this.deathYaw = Math.atan2(dirX, dirZ);
  }

  /**
   * dt, speedNorm 0..1 (movement), moveYaw (radians, direction of travel), aimYaw (radians), aiming bool
   */
  update(dt, { speedNorm = 0, moveYaw = 0, aimYaw = 0, aiming = true } = {}) {
    if (this.dead) {
      this.deathT += dt;
      const t = Math.min(1, this.deathT / 0.55);
      const e = 1 - Math.pow(1 - t, 3);
      this.body.rotation.y = this.deathYaw;
      this.body.rotation.x = -e * (Math.PI / 2 - 0.12);
      this.body.position.y = e * 0.25;
      if (this.blob) this.blob.material.opacity = 0.35 * (1 - e * 0.5);
      return;
    }
    this.speedNorm = damp(this.speedNorm, speedNorm, 10, dt);
    this.walkPhase += dt * (6 + this.speedNorm * 8) * Math.max(0.1, this.speedNorm);
    const swing = Math.sin(this.walkPhase) * 0.75 * this.speedNorm;
    // facing: aim direction dominates; strafing is legs-vs-torso twist
    this.aimYaw = angleDamp(this.aimYaw, aimYaw, 18, dt);
    this.body.rotation.y = this.aimYaw;
    const P = this.parts;
    if (P.LegL) { P.LegL.rotation.x = swing; P.LegR.rotation.x = -swing; }
    // twist legs toward move direction a bit
    let twist = 0;
    if (speedNorm > 0.05) {
      let d = moveYaw - this.aimYaw;
      d = Math.atan2(Math.sin(d), Math.cos(d));
      twist = Math.max(-0.7, Math.min(0.7, d));
    }
    if (P.LegL) { P.LegL.rotation.y = twist; P.LegR.rotation.y = twist; }
    // bob
    const bob = Math.abs(Math.sin(this.walkPhase)) * 0.035 * this.speedNorm;
    this.body.position.y = bob;
    // arms: aim pose (both hands forward) with recoil and idle sway
    this.recoil = damp(this.recoil, 0, 14, dt);
    this.flinch = damp(this.flinch, 0, 8, dt);
    const aimPitch = aiming ? -Math.PI / 2 + 0.15 : -0.2;
    if (P.ArmR) {
      P.ArmR.rotation.x = aimPitch + this.recoil * 0.45 - this.flinch * 0.3;
      P.ArmR.rotation.z = aiming ? 0.05 : 0.1 - swing * 0.5;
      P.ArmR.rotation.y = aiming ? -0.12 : 0;
    }
    if (P.ArmL) {
      const twoHanded = this.weaponId === 'shotgun' || this.weaponId === 'smg';
      P.ArmL.rotation.x = aiming ? (twoHanded ? aimPitch + 0.1 : -0.35 + this.recoil * 0.2) : -0.2 + swing * 0.5;
      P.ArmL.rotation.z = aiming && twoHanded ? -0.35 : -0.08;
      P.ArmL.rotation.y = aiming && twoHanded ? 0.35 : 0;
    }
    if (P.Torso) {
      P.Torso.rotation.x = -this.recoil * 0.06 + this.flinch * 0.12;
      P.Torso.rotation.z = this.flinch * 0.08;
    }
    if (P.Head) P.Head.rotation.x = this.flinch * 0.3;
  }
}
