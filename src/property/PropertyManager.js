import { DoorSystem } from './DoorSystem.js';
import { WindowSystem } from './WindowSystem.js';
import { BreachSystem } from './BreachSystem.js';
import { BarricadeSystem } from './BarricadeSystem.js';
import { PropertyDamageSystem } from './PropertyDamageSystem.js';
import { EV } from '../core/Events.js';
import { pointInBox } from '../utils/math.js';

/**
 * Owns the property's runtime state: portals (doors/windows), destructible props, rooms,
 * inside/outside queries, ground height, and interaction lookup. Composes the Door, Window,
 * Breach, Barricade, and Damage systems (docs/PROPERTY_SYSTEM.md).
 */
export class PropertyManager {
  constructor(data, builder, ctx, world) {
    this.data = data;
    this.builder = builder;
    this.ctx = ctx;
    this.world = world;
    this.events = ctx.events;
    this.colliders = builder.colliders;
    this.portals = new Map();
    this.props = new Map();
    this.doors = new DoorSystem(this);
    this.windows = new WindowSystem(this);
    this.breach = new BreachSystem(this);
    this.barricades = new BarricadeSystem(this);
    this.damage = new PropertyDamageSystem(this);
    this._init();
  }

  _init() {
    for (const [id, def] of Object.entries(this.data.portals)) {
      const vis = this.builder.portalVisuals[id];
      const portal = {
        id, def, kind: def.kind, name: def.name, x: def.x, z: def.z, axis: def.axis, facing: def.facing, room: def.room, exterior: def.exterior,
        state: def.kind === 'door' ? 'closed' : 'intact',
        hp: def.hp, maxHp: def.hp, boardHp: 0, maxBoardHp: def.boardHp || 0,
        vis, navBox: def.kind === 'door' ? vis.box : vis.sillBox,
        openAngle: 0,
      };
      this.portals.set(id, portal);
      if (def.kind === 'door') this.doors.init(portal); else this.windows.init(portal);
    }
    for (const p of this.data.props) {
      const vis = this.builder.propVisuals[p.id];
      this.props.set(p.id, { id: p.id, def: p, hp: p.hp, maxHp: p.hp, destroyed: false, vis, x: p.x, z: p.z, light: p.light || null });
    }
  }

  // ---------- queries
  isInside(x, z) { return pointInBox(x, z, this.data.bounds, -0.05); }
  roomAt(x, z) { return this.data.rooms.find((r) => x >= r.minX && x <= r.maxX && z >= r.minZ && z <= r.maxZ) || null; }
  groundHeight(x, z) { return this.builder.groundHeight(x, z); }

  /** Portal nearest to a point within radius. */
  nearestPortal(x, z, radius = 1.6, filter = null) {
    let best = null, bd = radius;
    for (const p of this.portals.values()) {
      if (filter && !filter(p)) continue;
      const d = Math.hypot(p.x - x, p.z - z);
      if (d < bd) { bd = d; best = p; }
    }
    return best;
  }

  /** Damage a portal (door hp or window boards). source: 'bullet'|'breach'. */
  damagePortal(id, amount, source = 'breach', hitPos = null) {
    const p = this.portals.get(id);
    if (!p) return false;
    if (p.kind === 'door') return this.doors.damage(p, amount, source, hitPos);
    return this.windows.damage(p, amount, source, hitPos);
  }

  /** Damage a destructible prop. */
  damageProp(id, amount, hitPos = null) {
    const prop = this.props.get(id);
    if (!prop || prop.destroyed || prop.maxHp <= 0) return false;
    prop.hp -= amount;
    this.events.emit(EV.PROP_HIT, { id, prop, hitPos });
    if (prop.hp <= 0) this.destroyProp(prop, hitPos);
    return true;
  }

  destroyProp(prop, hitPos) {
    prop.destroyed = true;
    prop.hp = 0;
    const g = prop.vis.group;
    // collapse: tilt and sink, disable collider
    g.rotation.z = (Math.random() - 0.5) * 0.6;
    g.rotation.x = (Math.random() - 0.5) * 0.4;
    g.position.y -= 0.25;
    g.scale.y = 0.7;
    if (prop.vis.box) { prop.vis.box.walk = prop.vis.box.height > 1.2; prop.vis.box.bullets = false; prop.vis.box.los = false; this.colliders.version++; }
    if (prop.light) {
      this.world.lighting.killLamp(prop.id);
      if (prop.vis.shade) prop.vis.shade.material = this.builder.M.lampOff;
    }
    this.events.emit(EV.PROP_DESTROYED, { id: prop.id, prop, x: prop.x, z: prop.z, y: (hitPos && hitPos.y) || 0.6 });
  }

  /** Between-wave: restore destroyed props? No - damage persists (docs). Only doors/boards are repairable. */

  /** Interactables near the player for the E prompt during PREP or for doors any time. */
  interactableNear(x, z, phase) {
    // doors: open/close (any phase) or repair (prep)
    const door = this.nearestPortal(x, z, 1.7, (p) => p.kind === 'door');
    if (door) {
      if (door.state === 'broken') return phase === 'prep' ? { type: 'repair', portal: door } : null;
      return { type: door.state === 'open' ? 'close' : 'open', portal: door };
    }
    const win = this.nearestPortal(x, z, 1.7, (p) => p.kind === 'window');
    if (win && phase === 'prep' && win.state !== 'boarded') return { type: 'board', portal: win };
    return null;
  }

  update(dt) {
    this.doors.update(dt);
    this.windows.update(dt);
    this.damage.update(dt);
  }

  /** Portal cost for A*: closed doors and intact/boarded windows are planned through with cost. */
  portalCost(id, profile) {
    const p = this.portals.get(id);
    if (!p) return 0;
    if (p.kind === 'door') {
      if (!profile.canBreachDoors && p.state === 'closed') return Infinity;
      return p.state === 'closed' ? 18 : 0;
    }
    if (!profile.canEnterWindows) return Infinity;
    if (p.state === 'boarded') return 46;
    if (p.state === 'intact') return 30;
    return 6;
  }

  /** Snapshot for retry (portal + prop state). */
  snapshot() {
    return {
      portals: Array.from(this.portals.values()).map((p) => ({ id: p.id, state: p.state, hp: p.hp, boardHp: p.boardHp })),
      props: Array.from(this.props.values()).map((p) => ({ id: p.id, hp: p.hp, destroyed: p.destroyed })),
    };
  }

  restore(snap) {
    for (const s of snap.portals) {
      const p = this.portals.get(s.id);
      if (!p) continue;
      if (p.kind === 'door') this.doors.setState(p, s.state, s.hp); else this.windows.setState(p, s.state, s.boardHp);
    }
    for (const s of snap.props) {
      const p = this.props.get(s.id);
      if (!p) continue;
      if (s.destroyed && !p.destroyed) this.destroyProp(p, null);
      if (!s.destroyed && p.destroyed) this._restoreProp(p);
      p.hp = s.hp;
    }
  }

  _restoreProp(prop) {
    prop.destroyed = false;
    const g = prop.vis.group;
    g.rotation.set(0, prop.def.rot || 0, 0);
    g.position.y = this.groundHeight(prop.x, prop.z);
    g.scale.y = 1;
    if (prop.vis.box) { prop.vis.box.walk = true; prop.vis.box.bullets = prop.vis.box.height >= 1.2; prop.vis.box.los = prop.vis.box.height >= 1.2; this.colliders.version++; }
    if (prop.light) { this.world.lighting.restoreLamp(prop.id, prop.light.intensity); if (prop.vis.shade) prop.vis.shade.material = this.builder.M.lampShade; }
  }
}
