import { damp } from '../utils/math.js';
import { EV } from '../core/Events.js';

/** Kinematic movement with acceleration, collision resolution, dodge roll, inside/outside tracking. */
export class PlayerMovement {
  constructor(player, def) {
    this.p = player;
    this.speed = def.speed;
    this.precisionMul = def.precisionSpeedMul;
    this.dodge = def.dodge;
    this.vx = 0; this.vz = 0;
    this.dodgeT = 0;
    this.dodgeCooldown = 0;
    this.dodgeDir = { x: 0, z: 1 };
    this.inside = false;
    this.moveYaw = 0;
    this.speedNorm = 0;
  }

  get dodging() { return this.dodgeT > 0; }

  tryDodge(mx, mz) {
    if (this.dodgeT > 0 || this.dodgeCooldown > 0 || this.p.health.dead) return false;
    const len = Math.hypot(mx, mz);
    if (len < 0.1) { mx = Math.sin(this.p.yaw); mz = Math.cos(this.p.yaw); }
    else { mx /= len; mz /= len; }
    this.dodgeDir.x = mx; this.dodgeDir.z = mz;
    this.dodgeT = this.dodge.duration;
    this.dodgeCooldown = this.dodge.cooldown;
    this.p.health.invulnerable = true;
    this.p.world.ctx.audio.play('dodge');
    this.p.world.events.emit(EV.PLAYER_DODGE, {});
    return true;
  }

  update(dt, moveX, moveZ, precision) {
    const p = this.p;
    if (this.dodgeCooldown > 0) this.dodgeCooldown -= dt;
    let tx, tz;
    if (this.dodgeT > 0) {
      this.dodgeT -= dt;
      const sp = this.dodge.distance / this.dodge.duration;
      tx = this.dodgeDir.x * sp; tz = this.dodgeDir.z * sp;
      if (this.dodgeT <= this.dodge.duration - this.dodge.invulnerable) p.health.invulnerable = false;
      if (this.dodgeT <= 0) p.health.invulnerable = false;
    } else {
      const swinging = p.combat && p.combat.swinging;
      const sp = this.speed * (precision ? this.precisionMul : 1) * (swinging ? 0.5 : 1) * (p.health.dead ? 0 : 1);
      tx = moveX * sp; tz = moveZ * sp;
    }
    const lambda = this.dodgeT > 0 ? 30 : 14;
    this.vx = damp(this.vx, tx, lambda, dt);
    this.vz = damp(this.vz, tz, lambda, dt);
    let nx = p.x + this.vx * dt, nz = p.z + this.vz * dt;
    const r = p.world.colliders.resolveCircle(nx, nz, p.radius);
    p.x = r.x; p.z = r.z;
    p.y = p.world.property.groundHeight(p.x, p.z);
    const spd = Math.hypot(this.vx, this.vz);
    this.speedNorm = Math.min(1, spd / this.speed);
    if (spd > 0.2) this.moveYaw = Math.atan2(this.vx, this.vz);
    const inside = p.world.property.isInside(p.x, p.z);
    if (inside !== this.inside) { this.inside = inside; p.world.events.emit(EV.PLAYER_INSIDE, { inside }); }
  }
}
