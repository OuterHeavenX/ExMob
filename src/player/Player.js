import * as THREE from 'three';
import { CharacterRig } from '../entities/CharacterRig.js';
import { PlayerHealth } from './PlayerHealth.js';
import { PlayerMovement } from './PlayerMovement.js';
import { PlayerCombat } from './PlayerCombat.js';
import { PlayerController } from './PlayerController.js';
import { CHARACTERS } from '../data/characters/characterRegistry.js';

/** The protagonist entity: composes rig, health, movement, combat, controller. */
export class Player {
  constructor(world, start) {
    this.world = world;
    this.def = CHARACTERS.exmob;
    this.x = start.x; this.z = start.z; this.y = 0;
    this.yaw = start.facing || 0;
    this.radius = this.def.radius;
    const gltf = world.assets.instance(this.def.model);
    this.rig = new CharacterRig({ look: this.def.look, height: this.def.height, width: this.def.look.width, gltf, clips: world.assets.clips(this.def.model), weaponId: 'pistol', assets: world.assets });
    world.scene.add(this.rig.root);
    this.health = new PlayerHealth(this, this.def.health);
    this.movement = new PlayerMovement(this, this.def);
    this.combat = new PlayerCombat(this);
    this.controller = new PlayerController(this);
    this._v = new THREE.Vector3();
    this.syncVisual();
  }

  update(dt) {
    this.controller.update(dt);
    this.health.update(dt);
    this.syncVisual();
    const aiming = true;
    this.rig.update(dt, { speedNorm: this.movement.speedNorm, moveYaw: this.movement.moveYaw, aimYaw: this.yaw, aiming });
    // dodge roll visual
    if (this.movement.dodging) {
      const t = 1 - this.movement.dodgeT / this.def.dodge.duration;
      this.rig.body.rotation.x = Math.sin(t * Math.PI) * -1.1;
    } else if (!this.health.dead) this.rig.body.rotation.x = 0;
  }

  syncVisual() {
    this.rig.root.position.set(this.x, this.y, this.z);
    this.world.ctx.camera.target.set(this.x, this.y, this.z);
    this.world.ctx.audio.setListener(this.x, this.z);
  }

  teleport(x, z, yaw = this.yaw) {
    this.x = x; this.z = z; this.yaw = yaw;
    this.movement.vx = 0; this.movement.vz = 0;
    this.syncVisual();
  }

  snapshot() {
    return { x: this.x, z: this.z, yaw: this.yaw, hp: this.health.hp, armor: this.health.armor, weapons: JSON.parse(JSON.stringify(this.combat.toSave())), equipped: this.combat.equipped };
  }

  restore(s) {
    this.teleport(s.x, s.z, s.yaw);
    this.health.revive(s.hp);
    this.health.armor = s.armor;
    this.rig.dead = false;
    this.rig.body.rotation.set(0, 0, 0);
    this.rig.body.position.y = 0;
    this.combat.fromSave(s.weapons, s.equipped);
  }

  toSave() {
    return { health: this.health.hp, armor: this.health.armor, weapons: this.combat.toSave(), equipped: this.combat.equipped };
  }

  fromSave(p) {
    this.health.hp = p.health ?? 100;
    this.health.armor = p.armor ?? 0;
    this.combat.fromSave(p.weapons || {}, p.equipped || 'pistol');
  }
}
