/**
 * Enemy behavior states. Each: { enter(e), update(e, dt, t) -> nextStateId|null, exit(e), onHit(e) }.
 * Shared helpers keep states short. See docs/AI_SYSTEM.md.
 */
import { EV } from '../../core/Events.js';

const player = (e) => e.world.player;
const prof = (e) => e.def.profile;

function wantsToPush(e) {
  // aggressive archetypes keep closing until inside their preferred range minimum
  const c = e.combat;
  const pr = prof(e).preferredRange;
  const aggression = prof(e).aggression * (e.world.difficulty.aggression || 1);
  if (!c.canSee) return true;
  if (c.distance > pr.max) return true;
  if (c.distance > pr.min && aggression > 0.7) return true;
  return false;
}

/** Non-aggressive archetypes step back when the player closes inside their preferred range. */
function backOff(e, dt) {
  const pr = prof(e).preferredRange;
  const aggression = prof(e).aggression * (e.world.difficulty.aggression || 1);
  if (aggression >= 0.75 || e.combat.distance > pr.min * 0.85) return false;
  const p = player(e);
  const dx = e.x - p.x, dz = e.z - p.z, d = Math.hypot(dx, dz) || 1;
  const sp = e.def.speed * 0.6;
  const moved = e.moveBy((dx / d) * sp * dt, (dz / d) * sp * dt);
  e.speedNorm = 0.5;
  return moved > sp * dt * 0.2;
}

/**
 * A cover node the sniper can actually shoot from: inside his window of ranges and with line of
 * sight to the player. CoverNodes.best() scores the opposite (nodes that BREAK line of sight), so
 * a rifleman needs his own pick.
 */
function pickVantage(e) {
  const p = player(e), pr = prof(e).preferredRange, s = prof(e).sniper;
  let best = null, bestScore = -Infinity;
  for (const n of e.world.cover.nodes) {
    const owner = e.world.cover.claimed.get(n);
    if (owner && owner !== e && !owner.dead) continue;
    const dT = Math.hypot(n.x - p.x, n.z - p.z);
    if (dT < s.minRange || dT > pr.max) continue;
    if (!e.world.los.canSee(n.x, n.z, p.x, p.z)) continue;
    const travel = Math.hypot(n.x - e.x, n.z - e.z);
    if (travel > 26) continue;
    const score = 2 - Math.abs(dT - (s.minRange + pr.max) / 2) * 0.06 - travel * 0.09;
    if (score > bestScore) { bestScore = score; best = n; }
  }
  if (best) { e.world.cover.release(e); e.world.cover.claimed.set(best, e); }
  return best;
}

/** Seconds a sniper will go without a shot before he stops being picky about range. */
const IMPATIENT_AFTER = 20;

/** A sniper who has been shut out long enough will take a closer shot rather than stand there. */
function snipeMinRange(e) {
  return prof(e).sniper.minRange * ((e.noShotT || 0) > IMPATIENT_AFTER ? 0.35 : 1);
}

/** Walk directly away from the player. Used to keep a rifleman out of knife range. */
function backAway(e, dt) {
  const p = player(e);
  const dx = e.x - p.x, dz = e.z - p.z, d = Math.hypot(dx, dz) || 1;
  const sp = e.def.speed * 0.85;
  e.moveBy((dx / d) * sp * dt, (dz / d) * sp * dt);
  e.speedNorm = 0.7;
}

/** Does the melee attacker's swing connect? Reach plus the player's own radius, in front only. */
function meleeConnects(e, m) {
  const p = player(e);
  const dx = p.x - e.x, dz = p.z - e.z;
  const d = Math.hypot(dx, dz);
  if (d > m.range + p.radius) return false;
  const facing = Math.cos(Math.atan2(dx, dz) - e.yaw);
  return facing > 0.35;
}

function strafe(e, dt) {
  const s = prof(e).strafe;
  if (s <= 0) { e.speedNorm = 0; return; }
  if (e._strafeT === undefined || e._strafeT <= 0) { e._strafeT = 0.6 + Math.random() * 1.2; e._strafeDir = Math.random() < 0.5 ? -1 : 1; }
  e._strafeT -= dt;
  const p = player(e);
  const dx = p.x - e.x, dz = p.z - e.z, d = Math.hypot(dx, dz) || 1;
  // sideways vector
  const sx = -dz / d * e._strafeDir, sz = dx / d * e._strafeDir;
  const sp = e.def.speed * 0.45 * s;
  const moved = e.moveBy(sx * sp * dt, sz * sp * dt);
  if (moved < sp * dt * 0.3) e._strafeDir *= -1;
  e.speedNorm = 0.4 * s;
}

export const BEHAVIORS = {
  SPAWN: {
    enter(e) { e.spawnT = 0.4 + Math.random() * 0.6; e.speedNorm = 0; },
    update(e, dt) { e.spawnT -= dt; if (e.spawnT <= 0) return 'APPROACH'; return null; },
  },

  APPROACH: {
    enter(e) {
      e.nav.flank = !!prof(e).flank;
      const p = player(e);
      e.nav.setDestination(p.x, p.z, true);
    },
    update(e, dt, t) {
      const p = player(e), c = e.combat;
      // keep destination fresh
      if (t > 0.5 && (t % 1.0) < dt) e.nav.setDestination(p.x, p.z);
      // specialists peel off before the generic engage rules apply
      const sp = prof(e);
      if (sp.melee && c.canSee && c.distance <= sp.melee.range) return 'MELEE';
      if (sp.sniper) {
        if (c.canSee && c.distance >= snipeMinRange(e)) return 'SNIPE';
        // do not walk a rifleman into shotgun range while hunting for a sightline
        if (c.distance <= snipeMinRange(e) * 1.15 && (e.noShotT || 0) <= IMPATIENT_AFTER) return 'REPOSITION';
      }
      // engage if we can see and are in range and don't want to push further
      if (c.canSee && c.inRange && !wantsToPush(e)) return 'ENGAGE';
      if (c.canSee && prof(e).usesCover && c.distance < prof(e).preferredRange.max && Math.random() < 0.01) return 'SEEK_COVER';
      const r = e.nav.follow(dt, e.staggerT > 0 ? 0.3 : 1);
      if (typeof r === 'object') { e.breachPortal = r.portal; return r.action === 'breach' ? 'BREACH' : 'ENTER_BUILDING'; }
      if (r === 'arrived') { if (c.canSee) return 'ENGAGE'; e.nav.setDestination(p.x, p.z, true); }
      if (r === 'noPath') { e.nav.setDestination(p.x, p.z, true); }
      return null;
    },
  },

  ENGAGE: {
    enter(e) { e.engageT = 0; },
    update(e, dt, t) {
      const c = e.combat;
      const sp = prof(e);
      if (sp.sniper) return 'SNIPE';
      if (sp.melee && c.canSee && c.distance <= sp.melee.range) return 'MELEE';
      if (sp.throw && c.canSee && e.throwCd <= 0 && c.distance >= sp.throw.minRange && c.distance <= sp.throw.maxRange) return 'THROW';
      if (!c.canSee) return t > 0.6 ? 'SEARCH' : null;
      if (wantsToPush(e)) return 'APPROACH';
      // professionals seek cover after a burst
      if (prof(e).usesCover && t > 2.5 + Math.random() * 2) return 'SEEK_COVER';
      // enforcers: too far -> push
      if (c.distance > prof(e).preferredRange.max) return 'APPROACH';
      if (!backOff(e, dt)) strafe(e, dt);
      return null;
    },
    onHit(e) {
      if (prof(e).coverSeekOnHit && Math.random() < 0.5) return 'SEEK_COVER';
      if (prof(e).retreatHealth > 0 && e.hp < e.maxHp * prof(e).retreatHealth) return 'RETREAT';
      return null;
    },
  },

  SEEK_COVER: {
    enter(e) {
      const p = player(e), pr = prof(e).preferredRange;
      e.coverNode = e.world.cover.best(e, p.x, p.z, pr.min, pr.max, 9);
      if (e.coverNode) e.nav.setDestination(e.coverNode.x, e.coverNode.z, true);
      e.coverHold = 1.5 + Math.random() * 2.5;
    },
    update(e, dt, t) {
      if (!e.coverNode) return 'APPROACH';
      const d = Math.hypot(e.coverNode.x - e.x, e.coverNode.z - e.z);
      if (d > 0.5) {
        const r = e.nav.follow(dt);
        if (typeof r === 'object') { e.breachPortal = r.portal; return r.action === 'breach' ? 'BREACH' : 'ENTER_BUILDING'; }
        if (r === 'noPath' || t > 6) return 'APPROACH';
        return null;
      }
      // in cover: hold and shoot (combat.update handles firing when visible)
      e.speedNorm = 0;
      e.combat.face(dt);
      e.coverHold -= dt;
      if (e.coverHold <= 0) return e.combat.canSee ? 'ENGAGE' : 'APPROACH';
      if (e.combat.distance < prof(e).preferredRange.min * 0.8) return 'APPROACH';
      return null;
    },
    exit(e) { e.world.cover.release(e); },
    onHit(e) {
      if (prof(e).retreatHealth > 0 && e.hp < e.maxHp * prof(e).retreatHealth) return 'RETREAT';
      return null;
    },
  },

  BREACH: {
    enter(e) {
      const pm = e.world.property;
      e.breachStand = pm.breach.standPoint(e.breachPortal, e.x, e.z);
      e.breachT = 0.3;
      e.breachTotal = 0;
      const portal = pm.portals.get(e.breachPortal);
      if (portal) e.yaw = Math.atan2(portal.x - e.x, portal.z - e.z);
    },
    update(e, dt, t) {
      const pm = e.world.property;
      const portal = pm.portals.get(e.breachPortal);
      if (!portal) return 'APPROACH';
      if (pm.breach.isPassable(e.breachPortal)) return 'ENTER_BUILDING';
      const d = e.nav.steerTo(e.breachStand.x, e.breachStand.z, dt, 0.8);
      if (d > 0.35) { if (t > 5) { e.nav.replan(); return 'APPROACH'; } return null; }
      e.speedNorm = 0;
      e.yaw = Math.atan2(portal.x - e.x, portal.z - e.z);
      e.combat.aiming = false;
      e.breachT -= dt;
      if (e.breachT <= 0) {
        e.breachT = prof(e).breachInterval;
        e.rig.breach();
        if (pm.breach.hit(e, e.breachPortal)) return 'ENTER_BUILDING';
        e.breachTotal++;
        if (e.breachTotal === 1 && portal.kind === 'door' && Math.random() < 0.6) e.world.events.emit(EV.TOAST, { text: `${portal.name}: BREACHING` });
      }
      // opportunistic: player visible from the door -> engage briefly. A breach specialist is
      // never distracted: he is here for the door, and the player has to make him stop.
      if (!prof(e).breachSpecialist && e.combat.canSee && e.combat.distance < 4 && prof(e).aggression < 0.8) return 'ENGAGE';
      return null;
    },
    onHit(e) {
      if (prof(e).breachSpecialist) return null;
      if (prof(e).coverSeekOnHit && Math.random() < 0.35) return 'SEEK_COVER';
      return null;
    },
  },

  /**
   * Close-quarters attack for archetypes with no gun (the breacher's sledgehammer). Self-cycling:
   * wind up, swing, land the hit if the player is still in front and in reach, cool down, repeat.
   */
  MELEE: {
    enter(e) { e.meleeArmed = false; e.meleeSwingT = 0; e.meleeCdT = 0.15; e.speedNorm = 0; },
    update(e, dt) {
      const m = prof(e).melee, c = e.combat;
      e.speedNorm = 0;
      c.face(dt);
      c.aiming = false;
      if (e.staggerT > 0) return null;
      if (!c.canSee || c.distance > m.range * 1.4) return 'APPROACH';
      if (!e.meleeArmed) {
        e.meleeCdT -= dt;
        if (e.meleeCdT <= 0) {
          e.meleeArmed = true;
          e.meleeSwingT = m.windup;
          e.rig.melee();
          e.world.ctx.audio.play('melee_swing', { x: e.x, z: e.z, bus: 'ENEMY_WEAPONS' });
          e.world.events.emit(EV.ENEMY_MELEE, { enemy: e, phase: 'windup' });
        }
        return null;
      }
      e.meleeSwingT -= dt;
      if (e.meleeSwingT > 0) return null;
      e.meleeArmed = false;
      e.meleeCdT = m.cooldown;
      if (meleeConnects(e, m)) {
        const p = player(e);
        p.health.damage(m.damage, { x: p.x - e.x, z: p.z - e.z, melee: true });
        e.world.ctx.audio.play('melee_hit', { x: p.x, z: p.z });
        e.world.ctx.camera.shake(0.3);
        e.world.events.emit(EV.ENEMY_MELEE, { enemy: e, phase: 'hit' });
      }
      return null;
    },
  },

  /**
   * Rifleman. Sets up, paints a laser on the player while the shot charges, fires, and moves to a
   * new vantage when the player breaks line of sight or closes the distance.
   */
  SNIPE: {
    enter(e) {
      const s = prof(e).sniper;
      e.snipeT = s.setupTime;
      e.snipeCharge = 0;
      e.snipeHold = s.holdTime;
      e.speedNorm = 0;
    },
    update(e, dt) {
      const s = prof(e).sniper, c = e.combat, p = player(e);
      e.speedNorm = 0;
      c.aiming = true;
      c.face(dt);
      if (c.distance < snipeMinRange(e)) { e.world.lasers.clear(e); return 'REPOSITION'; }
      if (!c.canSee) { e.world.lasers.clear(e); return 'REPOSITION'; }
      e.noShotT = 0;
      if (e.snipeT > 0) { e.snipeT -= dt; return null; }
      e.snipeCharge += dt / s.chargeTime;
      e.world.lasers.set(e, { x: e.x, y: e.y + 1.35, z: e.z }, { x: p.x, y: p.y + 1.0, z: p.z }, Math.min(1, e.snipeCharge));
      if (e.snipeCharge >= 1) {
        c.snipeShot();
        e.snipeCharge = 0;
        e.snipeT = prof(e).fireCooldown;
        e.world.lasers.clear(e);
      }
      e.snipeHold -= dt;
      if (e.snipeHold <= 0) return 'REPOSITION';
      return null;
    },
    exit(e) { e.world.lasers.clear(e); },
    onHit(e) { return Math.random() < 0.7 ? 'REPOSITION' : null; },
  },

  /**
   * The sniper's SEEK_COVER: find somewhere that can see the player from a distance. He never
   * walks into knife range on purpose, so with no vantage available he backs off and keeps
   * looking. `noShotT` is the anti-stalemate valve: a player who simply stays out of sight would
   * otherwise leave an untouchable enemy standing and the wave unclearable, so after
   * IMPATIENT_AFTER seconds without a shot he starts closing in and takes what he can get.
   */
  REPOSITION: {
    enter(e) {
      e.vantage = pickVantage(e);
      if (e.vantage) e.nav.setDestination(e.vantage.x, e.vantage.z, true);
      e.retryT = 1.0;
    },
    update(e, dt, t) {
      const c = e.combat;
      e.noShotT = (e.noShotT || 0) + dt;
      if (c.canSee && c.distance >= snipeMinRange(e)) return 'SNIPE';
      if (e.noShotT > IMPATIENT_AFTER) return 'APPROACH';
      if (e.vantage) {
        const d = Math.hypot(e.vantage.x - e.x, e.vantage.z - e.z);
        if (d < 0.6) e.vantage = null;
        else {
          const r = e.nav.follow(dt, 1.15);
          if (typeof r === 'object' || r === 'noPath' || r === 'arrived' || t > 8) e.vantage = null;
        }
        return null;
      }
      // no vantage: hold the distance, face the threat, and look again in a moment
      if (c.distance < snipeMinRange(e) * 1.2) { backAway(e, dt); return null; }
      e.speedNorm = 0;
      c.face(dt);
      e.retryT -= dt;
      if (e.retryT <= 0) {
        e.retryT = 1.0;
        e.vantage = pickVantage(e);
        if (e.vantage) e.nav.setDestination(e.vantage.x, e.vantage.z, true);
      }
      return null;
    },
    exit(e) { e.vantage = null; },
  },

  /** One bottle, thrown at where the player is standing. Committed once the windup starts. */
  THROW: {
    enter(e) {
      const p = player(e);
      e.throwT = prof(e).throw.windup;
      e.threw = false;
      e.throwTarget = { x: p.x, z: p.z };
      e.speedNorm = 0;
    },
    update(e, dt) {
      const th = prof(e).throw, c = e.combat;
      e.speedNorm = 0;
      c.face(dt);
      c.aiming = false;
      if (e.threw) return 'SEEK_COVER';
      e.throwT -= dt;
      if (e.throwT > 0) return null;
      e.threw = true;
      e.rig.melee();
      e.world.fires.throwBottle(e, e.throwTarget, th.flightTime);
      e.throwCd = th.interval;
      e.world.ctx.audio.play('molotov_throw', { x: e.x, z: e.z, bus: 'ENEMY_WEAPONS' });
      return null;
    },
  },

  ENTER_BUILDING: {
    enter(e) {
      const pm = e.world.property;
      e.enterTarget = pm.breach.throughPoint(e.breachPortal, e.x, e.z);
      const portal = pm.portals.get(e.breachPortal);
      e.enterIsWindow = portal && portal.kind === 'window';
      e.ignoreCollision = true;
      e.enterT = 0;
    },
    update(e, dt, t) {
      if (!e.enterTarget) return 'APPROACH';
      const d = e.nav.steerTo(e.enterTarget.x, e.enterTarget.z, dt, e.enterIsWindow ? 0.55 : 1.0);
      // window climb: bob the body over the sill
      if (e.enterIsWindow) e.rig.body.position.y = Math.sin(Math.min(1, t / 1.2) * Math.PI) * 0.75;
      if (d < 0.2 || t > 3) {
        e.ignoreCollision = false;
        e.rig.body.position.y = 0;
        e.nav.passedPortal(e.breachPortal);
        e.breachPortal = null;
        return 'SEARCH';
      }
      return null;
    },
    exit(e) { e.ignoreCollision = false; e.rig.body.position.y = 0; },
  },

  SEARCH: {
    enter(e) {
      const c = e.combat;
      const t = c.lkp || player(e);
      e.nav.setDestination(t.x, t.z, true);
      e.searchT = 0;
    },
    update(e, dt, t) {
      const c = e.combat;
      if (c.canSee && c.inRange && !wantsToPush(e)) return 'ENGAGE';
      if (c.canSee) return 'APPROACH';
      const r = e.nav.follow(dt);
      if (typeof r === 'object') { e.breachPortal = r.portal; return r.action === 'breach' ? 'BREACH' : 'ENTER_BUILDING'; }
      if (r === 'arrived' || r === 'noPath' || t > 4) return 'APPROACH';
      return null;
    },
  },

  RETREAT: {
    enter(e) {
      const p = player(e);
      e.coverNode = e.world.cover.best(e, p.x, p.z, 8, 20, 14);
      if (e.coverNode) e.nav.setDestination(e.coverNode.x, e.coverNode.z, true);
      e.retreatT = 3 + Math.random() * 2;
    },
    update(e, dt, t) {
      e.retreatT -= dt;
      if (!e.coverNode || e.retreatT <= 0) return 'APPROACH';
      const d = Math.hypot(e.coverNode.x - e.x, e.coverNode.z - e.z);
      if (d > 0.5) { const r = e.nav.follow(dt, 1.2); if (typeof r === 'object' || r === 'noPath') return 'APPROACH'; }
      else { e.speedNorm = 0; e.combat.face(dt); }
      return null;
    },
    exit(e) { e.world.cover.release(e); },
  },

  DEAD: {
    enter(e) { e.speedNorm = 0; e.ignoreCollision = false; },
    update() { return null; },
  },
};
