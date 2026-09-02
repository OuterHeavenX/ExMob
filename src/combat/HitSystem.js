import { EV } from '../core/Events.js';

/**
 * Applies hit results from ProjectileSystem to the world: characters, portals, props,
 * static surfaces. Owns impact VFX/audio selection by surface.
 */
export class HitSystem {
  constructor(world) { this.world = world; }

  apply(hit) {
    const w = this.world;
    const { kind, x, y, z, dx, dz, damage, def, shooter } = hit;
    const nx = -dx, nz = -dz;
    if (kind === 'enemy') {
      hit.target.takeDamage(damage, dx, dz, y, def, shooter);
      w.vfx.emit('blood', x, y, z, dx, 0.3, dz);
      w.ctx.audio.play('impact_flesh', { x, z });
      if (shooter.isPlayer) w.stats.shotsHit++;
      return;
    }
    if (kind === 'player') {
      hit.target.health.damage(damage, { x: -dx, z: -dz, source: shooter });
      w.vfx.emit('blood', x, y, z, dx, 0.3, dz, 0.6);
      return;
    }
    const box = hit.box;
    if (box.kind === 'pane' || box.kind === 'door') {
      const portal = w.property.portals.get(box.portal);
      const surface = box.surface;
      w.property.damagePortal(box.portal, damage, 'bullet', { x, y, z });
      if (portal && portal.kind === 'door' && portal.state === 'closed') {
        w.vfx.impact('wood', x, y, z, nx, nz);
        w.ctx.audio.play('impact_wood', { x, z });
      } else if (surface === 'wood') {
        w.vfx.impact('wood', x, y, z, nx, nz);
        w.ctx.audio.play('impact_wood', { x, z });
      }
      return;
    }
    if (box.kind === 'prop') {
      const prop = w.property.props.get(box.prop);
      w.property.damageProp(box.prop, damage, { x, y, z });
      const sfx = w.vfx.impact(box.surface, x, y, z, nx, nz);
      w.ctx.audio.play(sfx, { x, z });
      if (prop && !prop.destroyed && prop.vis.group) prop.vis.group.userData.wobble = 1;
      return;
    }
    // walls, trees, vehicles, rocks
    const sfx = w.vfx.impact(box.surface, x, y, z, nx, nz, box.kind === 'vehicle' ? 0.8 : 1);
    w.ctx.audio.play(sfx, { x, z });
    w.events.emit(EV.PROP_HIT, { id: box.kind, box, hitPos: { x, y, z } });
  }
}
