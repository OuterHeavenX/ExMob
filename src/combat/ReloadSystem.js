/**
 * Reload state machine. Magazine weapons swap all at once after reloadTime; shell weapons
 * insert one shell per reloadTime and can be interrupted by firing.
 */
export class ReloadSystem {
  constructor(audio, events) { this.audio = audio; this.events = events; }

  start(ws, sfxPos) {
    if (ws.reloading || !ws.needsReload()) return false;
    ws.reloading = true;
    ws.reloadT = ws.def.reloadTime;
    this.audio?.play(ws.def.sfx.reload, sfxPos);
    return true;
  }

  cancel(ws) { ws.reloading = false; ws.reloadT = 0; }

  /** Returns true when a reload step completed this tick. */
  update(ws, dt, sfxPos) {
    if (!ws.reloading) return false;
    ws.reloadT -= dt;
    if (ws.reloadT > 0) return false;
    if (ws.def.reloadType === 'shell') {
      ws.fillFromReserve(1);
      if (ws.needsReload()) { ws.reloadT = ws.def.reloadTime; this.audio?.play(ws.def.sfx.reload, sfxPos); }
      else { ws.reloading = false; if (ws.def.sfx.pump) this.audio?.play(ws.def.sfx.pump, sfxPos); }
    } else {
      ws.fillFromReserve();
      ws.reloading = false;
    }
    return true;
  }
}
