import { EV } from '../core/Events.js';

/**
 * Campaign progression glue: writes the save after cleared waves, keeps the wave-start snapshot
 * for RETRY WAVE, handles chapter completion. Chapter/property switching is future work.
 */
export class CampaignManager {
  constructor(world) {
    this.world = world;
    this.snapshot = null;
    this._offs = [
      world.events.on(EV.WAVE_PREP, () => this.takeSnapshot()),
      world.events.on(EV.WAVE_CLEARED, (e) => this.onWaveCleared(e)),
      world.events.on(EV.CHAPTER_COMPLETE, () => this.onChapterComplete()),
    ];
  }

  takeSnapshot() {
    const w = this.world;
    this.snapshot = {
      waveIndex: w.waves.index,
      player: w.player.snapshot(),
      cash: w.economy.cash,
      bounty: w.bounty.bounty,
      property: w.property.snapshot(),
    };
  }

  async onWaveCleared(e) {
    const w = this.world;
    w.stats.wavesSurvived++;
    const save = w.ctx.save;
    if (!save.data) return;
    save.data.campaign.waveIndex = Math.min(e.index + 1, w.waves.waves.length - 1);
    save.data.campaign.completed = e.isLast;
    Object.assign(save.data.player, w.player.toSave(), { cash: w.economy.cash, bounty: w.bounty.bounty });
    Object.assign(save.data.stats, w.stats);
    await save.persist();
  }

  onChapterComplete() {
    this.world.cinematics.compromised();
  }

  /** Restore the wave-start snapshot (RETRY WAVE). */
  restoreSnapshot() {
    const s = this.snapshot;
    const w = this.world;
    if (!s) return false;
    w.enemies.clear();
    w.spawner.clearVehicles();
    w.pickups.clear();
    w.vfx.clear();
    w.player.restore(s.player);
    w.economy.set(s.cash);
    w.bounty.set(s.bounty);
    w.property.restore(s.property);
    w.navDirty = true; // wholesale property restore: a full re-bake is warranted here
    w.waves.start(s.waveIndex);
    return true;
  }

  dispose() { for (const off of this._offs) off(); }
}
