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
      if (!c.canSee) return t > 0.6 ? 'SEARCH' : null;
      if (wantsToPush(e)) return 'APPROACH';
      // professionals seek cover after a burst
      if (prof(e).usesCover && t > 2.5 + Math.random() * 2) return 'SEEK_COVER';
      // enforcers: too far -> push
      if (c.distance > prof(e).preferredRange.max) return 'APPROACH';
      strafe(e, dt);
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
        e.rig.kick(0.8);
        if (pm.breach.hit(e, e.breachPortal)) return 'ENTER_BUILDING';
        e.breachTotal++;
        if (e.breachTotal === 1 && portal.kind === 'door' && Math.random() < 0.6) e.world.events.emit(EV.TOAST, { text: `${portal.name}: BREACHING` });
      }
      // opportunistic: player visible from the door -> engage briefly
      if (e.combat.canSee && e.combat.distance < 4 && prof(e).aggression < 0.8) return 'ENGAGE';
      return null;
    },
    onHit(e) {
      if (prof(e).coverSeekOnHit && Math.random() < 0.35) return 'SEEK_COVER';
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
