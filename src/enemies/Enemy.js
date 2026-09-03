import { CharacterRig } from '../entities/CharacterRig.js';
import { EnemyController } from './EnemyController.js';
import { EnemyNavigation } from './EnemyNavigation.js';
import { EnemyCombat } from './EnemyCombat.js';
import { staggerTime } from '../combat/DamageSystem.js';
import { WEAPONS } from '../data/weapons/weaponRegistry.js';
import { EV } from '../core/Events.js';

let NEXT_ID = 1;

/** Enemy entity: definition, position, health, rig, FSM controller, navigation, combat. */
export class Enemy {
  constructor(world, def, x, z, opts = {}) {
    this.world = world;
    this.id = NEXT_ID++;
    this.def = def;
    this.weapon = WEAPONS[def.weapon];
    this.x = x; this.z = z; this.y = world.property.groundHeight(x, z);
    this.yaw = Math.atan2(-x, -z);
    this.hp = def.hp * (world.difficulty.enemyHp || 1);
    this.maxHp = this.hp;
    this.dead = false;
    this.deadT = 0;
    this.staggerT = 0;
    this.ignoreCollision = false;
    this.speedNorm = 0;
    this.moveYaw = this.yaw;
    this.opts = opts;
    this.lastHitBy = null;
    this.knockVx = 0;
    this.knockVz = 0;
    this.throwCd = 1.5 + Math.random() * 2; // arsonists do not all throw on the same frame
    if (opts.rig) {
      this.rig = opts.rig;
      this.rig.resetForReuse(def.weapon);
    } else {
      const gltf = world.assets.instance(def.model);
      this.rig = new CharacterRig({ look: def.look, height: def.height, width: def.look.width, gltf, clips: world.assets.clips(def.model), weaponId: def.weapon, assets: world.assets });
    }
    world.scene.add(this.rig.root);
    this.nav = new EnemyNavigation(this);
    this.combat = new EnemyCombat(this);
    this.controller = new EnemyController(this, opts.initialState || 'SPAWN');
    this.syncVisual();
  }

  get profile() { return this.def.profile; }
  get alive() { return !this.dead; }

  takeDamage(amount, dx, dz, hitY, weaponDef, shooter) {
    if (this.dead) return;
    this.hp -= amount;
    this.lastHitBy = shooter;
    this.rig.hit();
    this.staggerT = Math.max(this.staggerT, staggerTime(weaponDef?.stagger || 0.2, amount, this.maxHp));
    this.combat.onHit(shooter);
    this.controller.onHit();
    this.world.events.emit(EV.ENEMY_HIT, { enemy: this, amount, hp: this.hp });
    if (this.hp <= 0) this.die(dx, dz);
  }

  /** Shove the enemy along (dx,dz) at `speed` m/s; decays over ~0.25 s. Melee and future blasts. */
  applyKnockback(dx, dz, speed) {
    const d = Math.hypot(dx, dz) || 1;
    this.knockVx = (dx / d) * speed;
    this.knockVz = (dz / d) * speed;
  }

  _updateKnockback(dt) {
    if (this.knockVx === 0 && this.knockVz === 0) return;
    this.moveBy(this.knockVx * dt, this.knockVz * dt);
    const decay = Math.exp(-12 * dt);
    this.knockVx *= decay;
    this.knockVz *= decay;
    if (Math.hypot(this.knockVx, this.knockVz) < 0.05) { this.knockVx = 0; this.knockVz = 0; }
  }

  die(dx = 0, dz = 1) {
    if (this.dead) return;
    this.dead = true;
    this.deadT = 0;
    this.rig.die(dx, dz);
    this.controller.set('DEAD');
    this.world.cover.release(this);
    if (this.world.lasers) this.world.lasers.clear(this);
    this.world.ctx.audio.play('enemy_death', { x: this.x, z: this.z });
    this.world.events.emit(EV.ENEMY_DEATH, { enemy: this, x: this.x, z: this.z, def: this.def });
  }

  /** Move by (mx,mz) meters with collision (unless ignoring for window climbs). */
  moveBy(mx, mz) {
    let nx = this.x + mx, nz = this.z + mz;
    if (!this.ignoreCollision) {
      const r = this.world.colliders.resolveCircle(nx, nz, this.def.radius);
      nx = r.x; nz = r.z;
    }
    // soft separation from other enemies
    for (const o of this.world.enemies.list) {
      if (o === this || o.dead) continue;
      const dx = nx - o.x, dz = nz - o.z;
      const d = Math.hypot(dx, dz);
      const minD = this.def.radius + o.def.radius;
      if (d < minD && d > 1e-4) { nx += (dx / d) * (minD - d) * 0.5; nz += (dz / d) * (minD - d) * 0.5; }
    }
    // keep out of the player
    const p = this.world.player;
    if (!p.health.dead) {
      const dx = nx - p.x, dz = nz - p.z, d = Math.hypot(dx, dz), minD = this.def.radius + p.radius;
      if (d < minD && d > 1e-4) { nx += (dx / d) * (minD - d); nz += (dz / d) * (minD - d); }
    }
    const moved = Math.hypot(nx - this.x, nz - this.z);
    if (moved > 0.001) this.moveYaw = Math.atan2(nx - this.x, nz - this.z);
    this.x = nx; this.z = nz;
    return moved;
  }

  update(dt) {
    this._updateKnockback(dt);
    if (this.dead) { this.deadT += dt; this.rig.update(dt, {}); this.syncVisual(); return; }
    if (this.staggerT > 0) this.staggerT -= dt;
    if (this.throwCd > 0) this.throwCd -= dt;
    this._avoidFire(dt);
    this.controller.update(dt);
    this.combat.update(dt);
    this.syncVisual();
    this.rig.update(dt, { speedNorm: this.speedNorm, moveYaw: this.moveYaw, aimYaw: this.yaw, aiming: this.combat.aiming });
  }

  /**
   * Walk out of a burning pool. Fire is deliberately kept out of the navigation grid (a re-bake
   * per bottle would be a frame spike), so avoidance is a steering force instead.
   */
  _avoidFire(dt) {
    const fires = this.world.fires;
    if (!fires || !fires.count) return;
    const r = fires.repulsion(this.x, this.z);
    if (r.x === 0 && r.z === 0) return;
    this.moveBy(r.x * dt, r.z * dt);
  }

  syncVisual() {
    this.y = this.world.property.groundHeight(this.x, this.z);
    this.rig.root.position.set(this.x, this.y, this.z);
  }

  dispose() {
    this.world.scene.remove(this.rig.root);
    this.world.cover.release(this);
  }
}
