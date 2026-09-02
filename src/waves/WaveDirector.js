import { EV } from '../core/Events.js';
import { wavePopulation } from '../data/waves/cabinWaves.js';

/**
 * Data-driven wave orchestration with an active-enemy cap (docs/WAVE_SYSTEM.md).
 * Phases: PREP -> WARNING -> ACTIVE -> CLEARED -> PREP ... -> COMPLETE.
 * Spawning is delegated to a spawner ({ arrive(group, wave, onReady), spawnOne(entry) }) so the
 * director is testable without Three.js.
 */
export class WaveDirector {
  constructor({ waves, events, spawner, getActiveCount, capClamp = 99, difficulty = null }) {
    this.waves = waves;
    this.events = events;
    this.spawner = spawner;
    this.getActiveCount = getActiveCount;
    this.capClamp = capClamp;
    this.difficulty = difficulty || { groupSize: 1, reinforcementInterval: 1 };
    this.index = 0;
    this.phase = 'IDLE';
    this.timer = 0;
    this.queue = [];        // pending enemies: { type, x, z, groupId }
    this.groupsPending = [];
    this.remaining = 0;     // population not yet dead
    this.spawnedTotal = 0;
    this.killed = 0;
    this.releaseT = 0;
    this.prepTotal = 0;
    this.warningTotal = 0;
    this.completed = false;
  }

  get wave() { return this.waves[this.index] || null; }
  get cap() { return Math.min(this.wave ? this.wave.activeCap : 0, this.capClamp); }
  get isLastWave() { return this.index >= this.waves.length - 1; }

  /** Begin at wave `index` in PREP (or WARNING if prepTime is 0). */
  start(index = 0) {
    this.index = Math.min(index, this.waves.length - 1);
    this.completed = false;
    this.queue.length = 0;
    this.groupsPending.length = 0;
    this.killed = 0;
    this.spawnedTotal = 0;
    this._enterPrep();
  }

  _enterPrep() {
    const w = this.wave;
    this.phase = 'PREP';
    this.prepTotal = w.prepTime;
    this.timer = w.prepTime;
    this.events.emit(EV.WAVE_PREP, { wave: w, index: this.index, time: this.timer, isFirst: this.index === 0 });
    if (w.prepTime <= 0) this._enterWarning();
  }

  /** Player pressed READY. */
  ready() {
    if (this.phase !== 'PREP') return false;
    this._enterWarning();
    return true;
  }

  _enterWarning() {
    const w = this.wave;
    this.phase = 'WARNING';
    this.warningTotal = w.warningTime;
    this.timer = w.warningTime;
    this.events.emit(EV.WAVE_WARNING, { wave: w, index: this.index, time: this.timer });
  }

  _enterActive() {
    const w = this.wave;
    this.phase = 'ACTIVE';
    this.timer = 0;
    this.remaining = Math.round(wavePopulation(w) * (this.difficulty.groupSize || 1));
    this.killed = 0;
    this.spawnedTotal = 0;
    this.queue.length = 0;
    this.groupsPending = w.groups.map((g, i) => ({ ...g, id: i, fired: false }));
    this.events.emit(EV.WAVE_START, { wave: w, index: this.index, population: this.remaining, cap: this.cap });
  }

  /** Spawner calls this when a group's arrival is complete (vehicle parked / route point ready). */
  enqueue(entries) {
    for (const e of entries) this.queue.push(e);
  }

  onEnemyDeath() {
    if (this.phase !== 'ACTIVE') return;
    this.killed++;
    this.remaining = Math.max(0, this.remaining - 1);
  }

  /** Dev: skip to the next wave immediately. */
  skip() {
    if (this.completed) return;
    this.queue.length = 0;
    this.groupsPending.length = 0;
    this._cleared(true);
  }

  update(dt) {
    if (this.completed) return;
    switch (this.phase) {
      case 'PREP':
        this.timer -= dt;
        this.events.emit(EV.WAVE_PREP_TICK, { time: Math.max(0, this.timer), total: this.prepTotal });
        if (this.timer <= 0) this._enterWarning();
        break;
      case 'WARNING':
        this.timer -= dt;
        if (this.timer <= 0) this._enterActive();
        break;
      case 'ACTIVE':
        this.timer += dt;
        for (const g of this.groupsPending) {
          if (!g.fired && this.timer >= g.delay) {
            g.fired = true;
            const scaled = g.enemies.map((e) => ({ type: e.type, count: Math.max(1, Math.round(e.count * (this.difficulty.groupSize || 1))) }));
            this.spawner.arrive({ ...g, enemies: scaled }, this.wave, (entries) => this.enqueue(entries));
          }
        }
        // release queued enemies under the cap
        this.releaseT -= dt;
        if (this.queue.length && this.releaseT <= 0 && this.getActiveCount() < this.cap) {
          const entry = this.queue.shift();
          this.spawner.spawnOne(entry, this.wave);
          this.spawnedTotal++;
          this.releaseT = (this.spawnedTotal <= 2 ? 0.25 : 0.7) * (this.difficulty.reinforcementInterval || 1);
        }
        if (this.remaining <= 0 && this.queue.length === 0 && this.groupsPending.every((g) => g.fired) && this.getActiveCount() === 0) this._cleared(false);
        break;
      case 'CLEARED':
        this.timer -= dt;
        if (this.timer <= 0) {
          if (this.isLastWave) { this.completed = true; this.phase = 'COMPLETE'; this.events.emit(EV.CHAPTER_COMPLETE, { wave: this.wave }); }
          else { this.index++; this._enterPrep(); }
        }
        break;
      default: break;
    }
  }

  _cleared(skipped) {
    const w = this.wave;
    this.phase = 'CLEARED';
    this.timer = skipped ? 0.5 : 3.5;
    this.remaining = 0;
    this.events.emit(EV.WAVE_CLEARED, { wave: w, index: this.index, payout: w.payout, bountyAfter: w.bountyAfter, skipped, isLast: this.isLastWave });
  }

  /** Serializable state for retry snapshots. */
  snapshot() { return { index: this.index }; }
}
