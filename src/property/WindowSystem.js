import { EV } from '../core/Events.js';

/** Windows: INTACT / SHATTERED / BOARDED. Bullets shatter; boards take breach/bullet damage. */
export class WindowSystem {
  constructor(pm) { this.pm = pm; this.events = pm.events; }

  init(portal) { this.setState(portal, 'intact', 0); }

  setState(portal, state, boardHp = 0) {
    portal.state = state;
    portal.boardHp = boardHp;
    const vis = portal.vis;
    vis.pane.visible = state === 'intact';
    vis.shards.visible = state !== 'intact';
    vis.boards.visible = state === 'boarded';
    const blocks = state !== 'shattered';
    vis.paneBox.bullets = blocks;
    vis.paneBox.los = blocks;
    vis.paneBox.surface = state === 'boarded' ? 'wood' : 'glass';
    this.events.emit(EV.PORTAL_STATE, { id: portal.id, portal, state });
  }

  shatter(portal, hitPos) {
    if (portal.state === 'shattered') return;
    const wasBoarded = portal.state === 'boarded';
    this.setState(portal, 'shattered', 0);
    this.pm.ctx.audio.play(wasBoarded ? 'door_break' : 'impact_glass', { x: portal.x, z: portal.z });
    this.events.emit(EV.PORTAL_BROKEN, { id: portal.id, portal, x: portal.x, z: portal.z, facing: portal.facing, glass: !wasBoarded, boards: wasBoarded, hitPos });
  }

  damage(portal, amount, source, hitPos) {
    if (portal.state === 'shattered') return false;
    if (portal.state === 'intact') { this.shatter(portal, hitPos); return true; }
    // boarded
    portal.boardHp -= amount;
    this.events.emit(EV.PORTAL_HIT, { id: portal.id, portal, amount, source, hitPos });
    if (source === 'breach') { this.pm.ctx.audio.play('board_hit', { x: portal.x, z: portal.z }); this.pm.ctx.camera.shake(0.06); }
    if (portal.boardHp <= 0) this.shatter(portal, hitPos);
    return true;
  }

  board(portal) {
    if (portal.state === 'boarded') return false;
    this.setState(portal, 'boarded', portal.maxBoardHp);
    this.events.emit(EV.PROP_REPAIRED, { id: portal.id, portal, boards: true });
    return true;
  }

  update() {}
}
