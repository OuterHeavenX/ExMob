import * as THREE from 'three';
import { enemyHitChance } from '../combat/DamageSystem.js';

/**
 * Perception + shooting for one enemy. Line of sight, last-known position, reaction time,
 * bursts, cooldowns, accuracy -> spread. Fires through the shared ProjectileSystem.
 *
 * Two archetypes opt out of the automatic burst loop: anyone whose weapon is `ranged: false`
 * (breacher, arsonist) has no gun to fire, and the sniper's shot is driven by the SNIPE state so
 * that the laser telegraph and the shot stay in step. Both still perceive and face normally.
 */
export class EnemyCombat {
  constructor(enemy) {
    this.e = enemy;
    this.canSee = false;
    this.lkp = null;
    this.lkpAge = 999;
    this.reactionT = enemy.profile.reactionTime;
    this.burstLeft = 0;
    this.burstT = 0;
    this.cooldownT = 0.5 + Math.random() * 0.5;
    this.aiming = false;
    this.distance = 999;
    this._m = new THREE.Vector3();
    this.suppressed = false;
  }

  get world() { return this.e.world; }
  get player() { return this.world.player; }

  onHit(shooter) {
    if (shooter && shooter.isPlayer) { this.lkp = { x: this.player.x, z: this.player.z }; this.lkpAge = 0; }
  }

  perceive(dt) {
    const p = this.player, e = this.e;
    this.distance = Math.hypot(p.x - e.x, p.z - e.z);
    this.canSee = !p.health.dead && this.distance < 40 && this.world.los.canSee(e.x, e.z, p.x, p.z);
    if (this.canSee) { this.lkp = { x: p.x, z: p.z }; this.lkpAge = 0; }
    else this.lkpAge += dt;
  }

  get inRange() { return this.distance <= this.e.profile.preferredRange.max * 1.35; }

  /** True when the automatic burst loop should drive this enemy's weapon. */
  get autoFires() { return this.e.weapon.ranged !== false && !this.e.profile.sniper; }

  /** Point the enemy at the player (or LKP). */
  face(dt) {
    const t = this.canSee ? this.player : this.lkp;
    if (!t) return;
    this.e.yaw = Math.atan2(t.x - this.e.x, t.z - this.e.z);
  }

  /** Call every frame from states that may shoot. */
  update(dt) {
    this.perceive(dt);
    const e = this.e;
    if (!this.autoFires) {
      this.aiming = this.canSee && this.inRange;
      return;
    }
    if (this.canSee && this.inRange && !e.dead) {
      this.aiming = true;
      this.face(dt);
      // floodlights: an attacker crossing the light takes longer to line up (DefenseManager)
      if (this.reactionT > 0) { this.reactionT -= dt / (this.world.defenses ? this.world.defenses.dazzleMul(e.x, e.z) : 1); return; }
      if (this.burstLeft > 0) {
        this.burstT -= dt;
        if (this.burstT <= 0) { this._shoot(); this.burstLeft--; this.burstT = e.profile.burst.interval; if (this.burstLeft === 0) this.cooldownT = e.profile.fireCooldown * (0.8 + Math.random() * 0.4); }
      } else {
        this.cooldownT -= dt;
        if (this.cooldownT <= 0 && e.staggerT <= 0) { this.burstLeft = e.profile.burst.count; this.burstT = 0; }
      }
    } else {
      this.aiming = this.lkpAge < 3;
      if (!this.canSee) this.reactionT = Math.min(e.profile.reactionTime, this.reactionT + dt * 0.5);
      if (this.burstLeft > 0 && !this.canSee) this.burstLeft = 0;
    }
  }

  /**
   * The sniper's single charged shot. Bypasses the burst loop and the accuracy roll's range term:
   * he has been aiming at one spot for a second and a half, and the fair counter is the laser, not
   * a dice roll.
   */
  snipeShot() {
    const e = this.e, p = this.player, w = this.world;
    if (e.dead || p.health.dead) return;
    const miss = Math.random() > (e.profile.accuracy * (w.difficulty.accuracy || 1));
    const dx0 = p.x - e.x, dz0 = p.z - e.z;
    let ang = Math.atan2(dx0, dz0);
    if (miss) ang += (Math.random() < 0.5 ? -1 : 1) * (0.05 + Math.random() * 0.06);
    const dir = { x: Math.sin(ang), z: Math.cos(ang) };
    const wd = e.weapon;
    const origin = { x: e.x + dir.x * 0.6, y: e.y + 1.35, z: e.z + dir.z * 0.6 };
    const ep = wd.enemyProfile || {};
    w.projectiles.fire({ isPlayer: false, x: e.x, z: e.z, id: e.id, enemy: e }, origin, dir, wd, { damage: ep.damage ?? wd.damage * 0.35, pellets: 1 });
    w.vfx.muzzleFlash(origin.x, origin.y, origin.z, dir.x, dir.z, wd);
    w.ctx.audio.play(wd.sfx.fire, { x: e.x, z: e.z, bus: 'ENEMY_WEAPONS', pitch: 0.95 + Math.random() * 0.08 });
    w.ctx.camera.shake(0.12);
    e.rig.kick(wd.recoil.kick * 4);
  }

  _shoot() {
    const e = this.e, p = this.player, w = this.world;
    const diff = w.difficulty;
    const chance = enemyHitChance(e.profile.accuracy, this.distance, e.profile.preferredRange.max, p.movement.speedNorm > 0.3, diff.accuracy || 1);
    const miss = Math.random() > chance;
    const dx0 = p.x - e.x, dz0 = p.z - e.z;
    const len = Math.hypot(dx0, dz0) || 1;
    let ang = Math.atan2(dx0, dz0);
    if (miss) ang += (Math.random() < 0.5 ? -1 : 1) * (0.08 + Math.random() * 0.16);
    const dir = { x: Math.sin(ang), z: Math.cos(ang) };
    const origin = { x: e.x + dir.x * 0.5, y: e.y + 1.25, z: e.z + dir.z * 0.5 };
    const wd = e.weapon;
    const ep = wd.enemyProfile || {};
    const def = { ...wd, spreadDeg: ep.spreadDeg ?? wd.spreadDeg, pellets: ep.pellets ?? wd.pellets };
    w.projectiles.fire({ isPlayer: false, x: e.x, z: e.z, id: e.id, enemy: e }, origin, dir, def, { damage: (ep.damage ?? wd.damage * 0.35), pellets: def.pellets });
    w.vfx.muzzleFlash(origin.x, origin.y, origin.z, dir.x, dir.z, wd);
    w.ctx.audio.play(wd.sfx.fire, { x: e.x, z: e.z, bus: 'ENEMY_WEAPONS', pitch: 0.9 + Math.random() * 0.15, gain: 0.8 });
    e.rig.kick(wd.recoil.kick * 3);
  }
}
