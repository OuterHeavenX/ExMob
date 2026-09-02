import { EV } from '../core/Events.js';
import { damp } from '../utils/math.js';

/** Doors: OPEN / CLOSED / BROKEN. Player toggles; enemies breach. Repairable during PREP. */
export class DoorSystem {
  constructor(pm) { this.pm = pm; this.events = pm.events; }

  init(portal) {
    this.setState(portal, 'closed', portal.maxHp);
  }

  setState(portal, state, hp = null) {
    portal.state = state;
    if (hp !== null) portal.hp = hp;
    const vis = portal.vis;
    const box = vis.box;
    const solid = state === 'closed';
    this.pm.colliders.setWalk(box, solid);
    box.bullets = solid;
    box.los = solid;
    vis.door.visible = state !== 'broken';
    vis.knob.visible = state !== 'broken';
    vis.stub.visible = state === 'broken';
    portal.openAngle = state === 'open' ? 1 : 0;
    this.events.emit(EV.PORTAL_STATE, { id: portal.id, portal, state });
  }

  toggle(portal) {
    if (portal.state === 'broken') return false;
    const next = portal.state === 'open' ? 'closed' : 'open';
    // don't close on top of a character
    if (next === 'closed') {
      const b = portal.vis.box;
      const blocked = this.pm.world.charactersOverlapping(b);
      if (blocked) return false;
    }
    this.setState(portal, next);
    this.pm.ctx.audio.play('door_open', { x: portal.x, z: portal.z, pitch: next === 'open' ? 1 : 0.85 });
    return true;
  }

  damage(portal, amount, source, hitPos) {
    if (portal.state === 'broken') return false;
    if (portal.state === 'open') return false; // an open door is not in the way
    portal.hp -= amount;
    this.events.emit(EV.PORTAL_HIT, { id: portal.id, portal, amount, source, hitPos });
    if (source === 'breach') {
      this.pm.ctx.audio.play('door_kick', { x: portal.x, z: portal.z });
      this.pm.ctx.camera.shake(0.12);
      portal.vis.group.userData.kick = 1;
    }
    if (portal.hp <= 0) this.breakDoor(portal);
    return true;
  }

  breakDoor(portal) {
    this.setState(portal, 'broken', 0);
    this.pm.ctx.audio.play('door_break', { x: portal.x, z: portal.z });
    this.pm.ctx.camera.shake(0.35);
    this.events.emit(EV.PORTAL_BROKEN, { id: portal.id, portal, x: portal.x, z: portal.z, facing: portal.facing });
  }

  repair(portal) {
    if (portal.state !== 'broken') return false;
    this.setState(portal, 'closed', portal.maxHp);
    this.events.emit(EV.PROP_REPAIRED, { id: portal.id, portal });
    return true;
  }

  update(dt) {
    for (const p of this.pm.portals.values()) {
      if (p.kind !== 'door') continue;
      const g = p.vis.group;
      const target = p.state === 'open' ? -p.vis.hingeSide * 1.85 : 0;
      const base = p.vis.horizontal ? 0 : Math.PI / 2;
      const kick = g.userData.kick || 0;
      const cur = g.rotation.y - base;
      const next = damp(cur, target + (p.state === 'closed' ? -p.vis.hingeSide * kick * 0.12 : 0), 10, dt);
      g.rotation.y = base + next;
      if (kick > 0) g.userData.kick = Math.max(0, kick - dt * 6);
    }
  }
}
