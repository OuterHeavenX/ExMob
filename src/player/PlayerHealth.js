import { applyArmor } from '../combat/DamageSystem.js';
import { ECONOMY } from '../data/economy/economyRegistry.js';
import { EV } from '../core/Events.js';

/** Health + optional armor layer, invulnerability window, death. */
export class PlayerHealth {
  constructor(player, max = 100) {
    this.player = player;
    this.max = max;
    this.hp = max;
    this.armor = 0;
    this.dead = false;
    this.invulnerable = false;
    this.godMode = false;
    this.lastHitT = 0;
    this.hurtT = 0;
  }

  get events() { return this.player.world.events; }

  damage(amount, info = {}) {
    if (this.dead || this.invulnerable || this.godMode) return 0;
    const r = applyArmor(amount * (this.player.world.difficulty.enemyDamage || 1), this.armor, ECONOMY.armor.absorb);
    this.armor = r.armorLeft;
    this.hp = Math.max(0, this.hp - r.healthDamage);
    this.hurtT = 0.35;
    this.player.rig.hit();
    this.player.world.ctx.camera.shake(0.18);
    this.player.world.ctx.audio.play('player_hurt');
    this.events.emit(EV.PLAYER_DAMAGE, { amount: r.healthDamage, hp: this.hp, armor: this.armor, dir: info });
    this.events.emit(EV.PLAYER_HEALTH, { hp: this.hp, max: this.max, armor: this.armor });
    if (this.hp <= 0) this.die(info);
    return r.healthDamage;
  }

  heal(amount = Infinity) {
    this.hp = Math.min(this.max, this.hp + amount);
    this.events.emit(EV.PLAYER_HEALTH, { hp: this.hp, max: this.max, armor: this.armor });
  }

  addArmor(points) {
    this.armor = Math.min(ECONOMY.armor.points, this.armor + points);
    this.events.emit(EV.PLAYER_HEALTH, { hp: this.hp, max: this.max, armor: this.armor });
  }

  die(info) {
    if (this.dead) return;
    this.dead = true;
    this.player.rig.die(info.x || 0, info.z || 1);
    this.events.emit(EV.PLAYER_DEATH, { info });
  }

  revive(hp = this.max) {
    this.dead = false;
    this.hp = hp;
    this.events.emit(EV.PLAYER_HEALTH, { hp: this.hp, max: this.max, armor: this.armor });
  }

  update(dt) { if (this.hurtT > 0) this.hurtT -= dt; }

  get lowHealth() { return this.hp <= 30 && !this.dead; }
}
