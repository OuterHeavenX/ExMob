import { EV } from '../core/Events.js';

/**
 * Turns property events into persistent visual damage: decals for bullet holes, glass shards
 * and door fragments as debris, dust and chips. Listens to the bus; VFXManager does the drawing.
 */
export class PropertyDamageSystem {
  constructor(pm) {
    this.pm = pm;
    this.events = pm.events;
    this._offs = [];
    this._offs.push(this.events.on(EV.PORTAL_BROKEN, (e) => this.onPortalBroken(e)));
    this._offs.push(this.events.on(EV.PROP_DESTROYED, (e) => this.onPropDestroyed(e)));
    this._offs.push(this.events.on(EV.PORTAL_HIT, (e) => this.onPortalHit(e)));
  }

  get vfx() { return this.pm.world.vfx; }

  onPortalBroken(e) {
    const y = 1.2;
    const fx = e.facing.x, fz = e.facing.z;
    if (e.portal.kind === 'door') {
      // door fragments fly inward (away from the breacher)
      const inward = this.pm.isInside(e.x + fx, e.z + fz) ? 1 : -1;
      this.vfx.emit('doorBreak', e.x, y, e.z, fx * inward, 0.5, fz * inward);
      this.vfx.debris(e.x, y, e.z, 'wood', 8, fx * inward * 3, fz * inward * 3);
      this.vfx.emit('dust', e.x, 0.5, e.z, 0, 1, 0);
    } else {
      // glass sprays inward
      this.vfx.emit('glass', e.x, y, e.z, -fx, 0.2, -fz);
      this.vfx.debris(e.x, y, e.z, e.boards ? 'wood' : 'glass', e.boards ? 6 : 12, -fx * 2.5, -fz * 2.5);
      if (e.boards) this.vfx.emit('doorBreak', e.x, y, e.z, -fx, 0.4, -fz);
    }
  }

  onPortalHit(e) {
    if (e.source !== 'breach') return;
    const p = e.portal;
    this.vfx.emit('wood', p.x, 1.0, p.z, -p.facing.x, 0.3, -p.facing.z, 0.6);
  }

  onPropDestroyed(e) {
    this.vfx.emit('propBreak', e.x, e.y, e.z, 0, 1, 0);
    this.vfx.debris(e.x, e.y, e.z, 'wood', 6, 0, 0);
    this.vfx.emit('dust', e.x, e.y, e.z, 0, 0.6, 0);
    this.pm.ctx.audio.play('prop_break', { x: e.x, z: e.z });
  }

  update() {}

  dispose() { for (const off of this._offs) off(); }
}
