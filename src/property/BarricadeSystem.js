import { WORLD_PURCHASES } from '../data/upgrades/shopItems.js';
import { DEFENSES } from '../data/defenses/defenseRegistry.js';
import { EV } from '../core/Events.js';

/**
 * Between-wave in-world purchases: board a window, repair a door, barricade either
 * (docs/PROPERTY_SYSTEM.md, Defenses).
 *
 * A barricade is a layer on top of a portal's own state rather than a state of its own: a door can
 * be closed *and* barricaded, and repairing or shattering the thing behind it does not touch the
 * barricade. While it stands nothing passes, including an open door, and it carries its own
 * collider so the navigation grid re-bakes only that opening when it goes up or comes down.
 */
export class BarricadeSystem {
  constructor(pm) {
    this.pm = pm;
    this.def = DEFENSES.barricade;
  }

  get events() { return this.pm.events; }

  costFor(interaction) {
    const wp = WORLD_PURCHASES[interaction.type === 'repair' ? 'door_repair' : interaction.type === 'board' ? 'window_boards' : 'barricade'];
    return interaction.type === 'barricade' || interaction.type === 'repair' || interaction.type === 'board' ? wp.price : 0;
  }

  holdTimeFor(interaction) {
    const wp = WORLD_PURCHASES[interaction.type === 'repair' ? 'door_repair' : interaction.type === 'board' ? 'window_boards' : 'barricade'];
    return interaction.type === 'barricade' || interaction.type === 'repair' || interaction.type === 'board' ? wp.holdTime : 0;
  }

  /** Apply a completed interaction. Returns true if it took effect. */
  apply(interaction, economy) {
    const cost = this.costFor(interaction);
    if (!economy.spend(cost, interaction.type)) return false;
    if (interaction.type === 'repair') return this.pm.doors.repair(interaction.portal);
    if (interaction.type === 'board') return this.pm.windows.board(interaction.portal);
    if (interaction.type === 'barricade') return this.place(interaction.portal);
    return false;
  }

  isBarricaded(portal) { return portal.barricadeHp > 0; }

  place(portal, hp = this.def.hp) {
    if (portal.barricadeHp > 0) return false;
    portal.barricadeHp = hp;
    portal.maxBarricadeHp = this.def.hp;
    this._sync(portal);
    this.pm.ctx.audio.play('barricade_place', { x: portal.x, z: portal.z });
    this.events.emit(EV.BARRICADE_PLACED, { id: portal.id, portal });
    return true;
  }

  damage(portal, amount, source, hitPos) {
    if (portal.barricadeHp <= 0) return false;
    portal.barricadeHp -= amount;
    this.events.emit(EV.PORTAL_HIT, { id: portal.id, portal, amount, source, hitPos, barricade: true });
    if (source === 'breach') {
      this.pm.ctx.audio.play('barricade_hit', { x: portal.x, z: portal.z });
      this.pm.ctx.camera.shake(0.09);
    }
    if (portal.barricadeHp <= 0) this.destroy(portal, hitPos);
    return true;
  }

  destroy(portal, hitPos = null) {
    portal.barricadeHp = 0;
    this._sync(portal);
    this.pm.ctx.audio.play('door_break', { x: portal.x, z: portal.z, pitch: 0.8 });
    this.pm.ctx.camera.shake(0.25);
    this.events.emit(EV.BARRICADE_BROKEN, { id: portal.id, portal, x: portal.x, z: portal.z, facing: portal.facing, hitPos });
  }

  /** Silent removal for snapshot restore (no audio, no events). */
  setHp(portal, hp) {
    portal.barricadeHp = Math.max(0, hp);
    this._sync(portal);
  }

  /** Match mesh visibility and the collider to `portal.barricadeHp`. */
  _sync(portal) {
    const up = portal.barricadeHp > 0;
    const vis = portal.vis;
    if (vis.barricade) vis.barricade.visible = up;
    if (up && !portal.barricadeBox) {
      const ref = portal.kind === 'door' ? vis.box : vis.paneBox;
      portal.barricadeBox = this.pm.colliders.add({
        minX: ref.minX, maxX: ref.maxX, minZ: ref.minZ, maxZ: ref.maxZ,
        kind: 'barricade', walk: true, bullets: true, los: this.def.blocksLOS, surface: 'wood',
        portal: portal.id, height: 2.2, barricade: true,
      });
    } else if (!up && portal.barricadeBox) {
      this.pm.colliders.remove(portal.barricadeBox);
      portal.barricadeBox = null;
    }
  }
}
