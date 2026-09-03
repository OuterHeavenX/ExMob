import * as THREE from 'three';
import { buildWeaponMesh } from '../world/PropFactory.js';
import { WEAPONS } from '../data/weapons/weaponRegistry.js';
import { damp, angleDamp, clamp } from '../utils/math.js';
import { batchPivotChildren, batchGroup } from '../world/Batch.js';

/**
 * Character visual + animation. Three sources, one interface:
 *  1. SKELETAL: a GLB with a skinned mesh and ANM_* clips (Blender rig, docs/BLENDER_PIPELINE.md).
 *     Locomotion clips are blended by speed; Fire/Reload/Hit/Kick/Melee/Death are one-shots.
 *  2. RIGID GLB: named part pivots (Head/Torso/ArmL/...) driven procedurally (ADR-010 fallback).
 *  3. PROCEDURAL: boxes built from a `look` descriptor when no asset exists.
 * Interface used by gameplay: root, body, setWeapon, muzzleWorld, kick, hit, breach, reload, die, update.
 */
export class CharacterRig {
  constructor({ look, height = 1.8, width = 1.0, gltf = null, clips = [], weaponId = 'pistol', assets = null }) {
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
    this.deathYaw = 0;
    this.swingT = 0;
    this.assets = assets;
    this.skeletal = false;
    let skinned = false;
    if (gltf) gltf.traverse((o) => { if (o.isSkinnedMesh) skinned = true; });
    if (gltf && skinned && clips && clips.length) this._fromSkinned(gltf, clips);
    else if (gltf) this._fromGLTF(gltf);
    else this._buildProcedural(look, height, width);
    this._buildBlob(height, width);
    if (!this.skeletal) for (const n of ['Head', 'Torso', 'ArmL', 'ArmR', 'LegL', 'LegR']) if (this.parts[n]) batchPivotChildren(this.parts[n]);
    this.setWeapon(weaponId);
  }

  _mat(hex, rough = 0.85) { return new THREE.MeshStandardMaterial({ color: hex, roughness: rough }); }

  // ------------------------------------------------------------------ skeletal
  _fromSkinned(gltf, clips) {
    this.skeletal = true;
    this.body.add(gltf);
    gltf.traverse((o) => { if (o.isSkinnedMesh) { o.castShadow = true; o.frustumCulled = false; } });
    this.mixer = new THREE.AnimationMixer(gltf);
    this.actions = {};
    for (const clip of clips) {
      const key = clip.name.replace(/^ANM_/i, '').toLowerCase();
      this.actions[key] = this.mixer.clipAction(clip);
    }
    for (const k of ['idle', 'walk', 'run']) {
      const a = this.actions[k];
      if (!a) continue;
      a.setLoop(THREE.LoopRepeat);
      a.setEffectiveWeight(k === 'idle' ? 1 : 0);
      a.play();
    }
    for (const k of ['fire', 'reload', 'hit', 'kick', 'melee', 'death']) {
      const a = this.actions[k];
      if (!a) continue;
      a.setLoop(THREE.LoopOnce, 1);
      a.clampWhenFinished = true;
      a.enabled = false;
    }
    this.handBone = gltf.getObjectByName('hand_R') || gltf.getObjectByName('handR') || null;
    if (this.handBone) this.parts.Hand_R = this.handBone;
  }

  _oneShot(key, weight = 1, fade = 0.06) {
    const a = this.actions && this.actions[key];
    if (!a) return false;
    a.enabled = true;
    a.reset();
    a.setEffectiveTimeScale(1);
    a.setEffectiveWeight(weight);
    a.fadeIn(fade);
    a.play();
    return true;
  }

  // ------------------------------------------------------------------ rigid GLB / procedural
  _buildProcedural(look, H, W) {
    const s = H / 1.8;
    const body = this._mat(look.body), accent = this._mat(look.accent), skin = this._mat(look.skin, 0.7);
    const mk = (geo, mat, x, y, z) => { const m = new THREE.Mesh(geo, mat); m.position.set(x, y, z); m.castShadow = true; m.receiveShadow = false; return m; };
    const legLen = 0.85 * s;
    for (const side of ['L', 'R']) {
      const sx = side === 'L' ? -1 : 1;
      const pivot = new THREE.Group();
      pivot.position.set(sx * 0.11 * s * W, legLen, 0);
      pivot.add(mk(new THREE.BoxGeometry(0.16 * s * W, legLen, 0.18 * s), this._mat(0x1a1a1e), 0, -legLen / 2, 0));
      pivot.add(mk(new THREE.BoxGeometry(0.17 * s * W, 0.08 * s, 0.28 * s), this._mat(0x0e0e10, 0.5), 0, -legLen + 0.04 * s, 0.05 * s));
      this.body.add(pivot);
      this.parts['Leg' + side] = pivot;
    }
    const torso = new THREE.Group();
    torso.position.y = legLen;
    torso.add(mk(new THREE.BoxGeometry(0.46 * s * W, 0.62 * s, 0.28 * s), body, 0, 0.31 * s, 0));
    torso.add(mk(new THREE.BoxGeometry(0.56 * s * W, 0.12 * s, 0.3 * s), body, 0, 0.58 * s, 0));
    torso.add(mk(new THREE.BoxGeometry(0.5 * s * W, look.coatLength * s, 0.32 * s), body, 0, -look.coatLength * s / 2 + 0.05 * s, 0));
    torso.add(mk(new THREE.BoxGeometry(0.2 * s * W, 0.5 * s, 0.05 * s), accent, 0, 0.3 * s, 0.14 * s));
    this.body.add(torso);
    this.parts.Torso = torso;
    const head = new THREE.Group();
    head.position.set(0, 0.66 * s, 0);
    head.add(mk(new THREE.BoxGeometry(0.22 * s, 0.26 * s, 0.24 * s), skin, 0, 0.14 * s, 0));
    head.add(mk(new THREE.BoxGeometry(0.23 * s, 0.09 * s, 0.25 * s), this._mat(0x2a2320), 0, 0.26 * s, -0.01 * s));
    if (look.hat) {
      head.add(mk(new THREE.CylinderGeometry(0.2 * s, 0.2 * s, 0.02 * s, 12), this._mat(look.hat, 0.6), 0, 0.28 * s, 0));
      head.add(mk(new THREE.CylinderGeometry(0.12 * s, 0.13 * s, 0.13 * s, 12), this._mat(look.hat, 0.6), 0, 0.35 * s, 0));
    }
    torso.add(head);
    this.parts.Head = head;
    const armLen = 0.62 * s;
    for (const side of ['L', 'R']) {
      const sx = side === 'L' ? -1 : 1;
      const pivot = new THREE.Group();
      pivot.position.set(sx * 0.3 * s * W, 0.56 * s, 0);
      pivot.add(mk(new THREE.BoxGeometry(0.13 * s, armLen, 0.14 * s), body, 0, -armLen / 2, 0));
      pivot.add(mk(new THREE.BoxGeometry(0.1 * s, 0.1 * s, 0.1 * s), skin, 0, -armLen - 0.03 * s, 0));
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

  _fromGLTF(gltf) {
    this.body.add(gltf);
    for (const n of ['Head', 'Torso', 'ArmL', 'ArmR', 'LegL', 'LegR', 'Hand_R', 'SOCK_Hand_R']) {
      const o = gltf.getObjectByName(n);
      if (o) this.parts[n === 'SOCK_Hand_R' ? 'Hand_R' : n] = o;
    }
    if (!this.parts.Hand_R && this.parts.ArmR) { const s = new THREE.Group(); s.position.y = -0.6; this.parts.ArmR.add(s); this.parts.Hand_R = s; }
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

  // ------------------------------------------------------------------ weapons
  setWeapon(weaponId) {
    if (this.weaponMesh) this.weaponMesh.parent?.remove(this.weaponMesh);
    const model = WEAPONS[weaponId]?.model;
    const glb = model && this.assets ? this.assets.instance(model) : null;
    this.weaponMesh = batchGroup(glb || buildWeaponMesh(weaponId));
    this.weaponMesh.traverse((o) => { if (o.isMesh) { o.castShadow = false; o.receiveShadow = false; } });
    // Barrel must run along the hand. GLB barrels point +z (Blender -Y); procedural barrels point -z.
    if (this.skeletal && this.handBone) {
      // bone local +Y runs down the arm toward the fingertips
      this.weaponMesh.rotation.set(glb ? -Math.PI / 2 : Math.PI / 2, 0, 0);
      this.weaponMesh.position.set(0, 0.06, 0.04);
      this.handBone.add(this.weaponMesh);
    } else {
      this.weaponMesh.rotation.x = glb ? Math.PI / 2 - 0.1 : -Math.PI / 2 + 0.1;
      if (this.parts.Hand_R) this.parts.Hand_R.add(this.weaponMesh);
    }
    this.weaponId = weaponId;
  }

  /** World position of the muzzle (approximate). */
  muzzleWorld(out) {
    out = out || new THREE.Vector3();
    if (this.parts.Hand_R) { this.parts.Hand_R.getWorldPosition(out); out.y += 0.02; return out; }
    return out.copy(this.root.position).setY(this.root.position.y + this.height * 0.75);
  }

  // ------------------------------------------------------------------ events
  kick(amount) {
    if (this.skeletal) { this._oneShot('fire', clamp(amount * 2.5, 0.6, 1.6), 0.02); return; }
    this.recoil = Math.min(1, this.recoil + amount);
  }

  hit() {
    if (this.skeletal) { this._oneShot('hit', 1, 0.03); return; }
    this.flinch = 1;
  }

  breach() {
    if (this.skeletal && this._oneShot('kick', 1.4, 0.04)) return;
    this.kick(0.8);
  }

  reload() { if (this.skeletal) this._oneShot('reload', 1, 0.08); }

  /**
   * Put a recycled rig back into its spawn state. Building a rig costs a skinned-mesh clone plus
   * a fresh AnimationMixer, which is most of an enemy spawn, so bodies hand their rig back to the
   * pool instead (see EnemyManager).
   */
  resetForReuse(weaponId) {
    this.dead = false;
    this.deathT = 0;
    this.swingT = 0;
    this.recoil = 0;
    this.flinch = 0;
    this.speedNorm = 0;
    this.walkPhase = 0;
    this.body.rotation.set(0, 0, 0);
    this.body.position.set(0, 0, 0);
    if (this.blob) this.blob.material.opacity = 0.35;
    if (this.skeletal && this.mixer) {
      this.mixer.stopAllAction();
      for (const k of ['idle', 'walk', 'run']) {
        const a = this.actions[k];
        if (!a) continue;
        a.reset();
        a.enabled = true;
        a.setEffectiveTimeScale(1);
        a.setEffectiveWeight(k === 'idle' ? 1 : 0);
        a.play();
      }
      for (const k of ['fire', 'reload', 'hit', 'kick', 'melee', 'death']) {
        const a = this.actions[k];
        if (!a) continue;
        a.stop();
        a.enabled = false;
        a.setEffectiveWeight(0);
      }
      this.mixer.update(0);
    } else {
      for (const n of ['Head', 'Torso', 'ArmL', 'ArmR', 'LegL', 'LegR']) {
        const part = this.parts[n];
        if (part) part.rotation.set(0, 0, 0);
      }
    }
    if (weaponId && weaponId !== this.weaponId) this.setWeapon(weaponId);
  }

  /** Weapon-butt swing. Skeletal clip when available, procedural arm swing otherwise. */
  melee() {
    if (this.skeletal && this._oneShot('melee', 1.5, 0.02)) return;
    this.swingT = 0.34;
  }

  die(dirX, dirZ) {
    this.dead = true;
    this.deathT = 0;
    this.deathYaw = Math.atan2(dirX, dirZ);
    if (this.skeletal) {
      // the clip falls backward from the feet: face the shooter so the body falls away from the shot
      this.body.rotation.y = Math.atan2(-dirX, -dirZ);
      for (const k of ['idle', 'walk', 'run', 'fire', 'reload', 'hit', 'kick', 'melee']) if (this.actions[k]) this.actions[k].fadeOut(0.08);
      this._oneShot('death', 1, 0.05);
    }
  }

  // ------------------------------------------------------------------ per-frame
  update(dt, { speedNorm = 0, moveYaw = 0, aimYaw = 0, aiming = true } = {}) {
    if (this.skeletal) return this._updateSkeletal(dt, speedNorm, aimYaw);
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
    this.aimYaw = angleDamp(this.aimYaw, aimYaw, 18, dt);
    this.body.rotation.y = this.aimYaw;
    const P = this.parts;
    if (P.LegL) { P.LegL.rotation.x = swing; P.LegR.rotation.x = -swing; }
    let twist = 0;
    if (speedNorm > 0.05) {
      let d = moveYaw - this.aimYaw;
      d = Math.atan2(Math.sin(d), Math.cos(d));
      twist = Math.max(-0.7, Math.min(0.7, d));
    }
    if (P.LegL) { P.LegL.rotation.y = twist; P.LegR.rotation.y = twist; }
    this.body.position.y = Math.abs(Math.sin(this.walkPhase)) * 0.035 * this.speedNorm;
    this.recoil = damp(this.recoil, 0, 14, dt);
    this.flinch = damp(this.flinch, 0, 8, dt);
    if (this.swingT > 0) this.swingT = Math.max(0, this.swingT - dt);
    const swingP = this.swingT > 0 ? Math.sin((1 - this.swingT / 0.34) * Math.PI) : 0;
    const aimPitch = aiming ? -Math.PI / 2 + 0.15 : -0.2;
    if (P.ArmR) {
      P.ArmR.rotation.x = aimPitch + this.recoil * 0.45 - this.flinch * 0.3 + swingP * 0.9;
      P.ArmR.rotation.z = (aiming ? 0.05 : 0.1 - swing * 0.5) - swingP * 1.25;
      P.ArmR.rotation.y = aiming ? -0.12 : 0;
    }
    if (P.ArmL) {
      const twoHanded = this.weaponId === 'shotgun' || this.weaponId === 'smg';
      P.ArmL.rotation.x = aiming ? (twoHanded ? aimPitch + 0.1 : -0.35 + this.recoil * 0.2) : -0.2 + swing * 0.5;
      P.ArmL.rotation.z = aiming && twoHanded ? -0.35 : -0.08;
      P.ArmL.rotation.y = aiming && twoHanded ? 0.35 : 0;
    }
    if (P.Torso) { P.Torso.rotation.x = -this.recoil * 0.06 + this.flinch * 0.12; P.Torso.rotation.z = this.flinch * 0.08 + swingP * 0.3; }
    if (P.Head) P.Head.rotation.x = this.flinch * 0.3;
  }

  _updateSkeletal(dt, speedNorm, aimYaw) {
    if (this.dead) {
      this.deathT += dt;
      if (this.blob) this.blob.material.opacity = 0.35 * Math.max(0.5, 1 - this.deathT);
      this.mixer.update(dt);
      return;
    }
    this.speedNorm = damp(this.speedNorm, speedNorm, 10, dt);
    this.aimYaw = angleDamp(this.aimYaw, aimYaw, 18, dt);
    this.body.rotation.y = this.aimYaw;
    const s = this.speedNorm;
    const runW = clamp((s - 0.55) / 0.45, 0, 1);
    const walkW = clamp(s / 0.4, 0, 1) * (1 - runW);
    const idleW = Math.max(0, 1 - walkW - runW);
    const A = this.actions;
    if (A.idle) A.idle.setEffectiveWeight(idleW);
    if (A.walk) { A.walk.setEffectiveWeight(walkW); A.walk.setEffectiveTimeScale(0.7 + s * 0.9); }
    if (A.run) { A.run.setEffectiveWeight(runW); A.run.setEffectiveTimeScale(0.8 + s * 0.5); }
    this.mixer.update(dt);
  }
}
