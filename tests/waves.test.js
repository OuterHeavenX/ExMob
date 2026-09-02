import { describe, it, expect } from 'vitest';
import { EventBus } from '../src/core/EventBus.js';
import { EV } from '../src/core/Events.js';
import { WaveDirector } from '../src/waves/WaveDirector.js';
import { CABIN_WAVES, wavePopulation } from '../src/data/waves/cabinWaves.js';

/** Fake spawner: arrivals complete instantly; spawned enemies tracked as alive until killed. */
function makeHarness(waves = CABIN_WAVES, capClamp = 99) {
  const events = new EventBus();
  const alive = new Set();
  const spawner = {
    arrive(group, wave, enqueue) {
      const entries = [];
      for (const e of group.enemies) for (let i = 0; i < e.count; i++) entries.push({ type: e.type, x: 0, z: 0 });
      enqueue(entries);
    },
    spawnOne(entry) { const e = { type: entry.type }; alive.add(e); return e; },
  };
  const wd = new WaveDirector({ waves, events, spawner, getActiveCount: () => alive.size, capClamp });
  const killAll = () => { for (const e of Array.from(alive)) { alive.delete(e); wd.onEnemyDeath(); } };
  const step = (seconds, dt = 1 / 30) => { for (let t = 0; t < seconds; t += dt) wd.update(dt); };
  return { events, wd, alive, killAll, step };
}

describe('WaveDirector', () => {
  it('runs PREP -> WARNING -> ACTIVE and respects the active cap', () => {
    const { wd, alive, step } = makeHarness();
    wd.start(1); // wave 2 has prep time
    expect(wd.phase).toBe('PREP');
    expect(wd.ready()).toBe(true);
    expect(wd.phase).toBe('WARNING');
    step(wd.wave.warningTime + 0.1);
    expect(wd.phase).toBe('ACTIVE');
    step(30); // both groups arrive; releases limited by cap
    expect(alive.size).toBeLessThanOrEqual(wd.cap);
    expect(wd.queue.length + alive.size + wd.killed).toBe(wavePopulation(wd.wave));
  });

  it('clamps the cap by device budget', () => {
    const { wd, alive, step } = makeHarness(CABIN_WAVES, 3);
    wd.start(0);
    step(5);
    step(10);
    expect(alive.size).toBeLessThanOrEqual(3);
  });

  it('clears when population is dead and advances to the next wave', () => {
    const { wd, step, killAll, events } = makeHarness();
    const seen = [];
    events.on(EV.WAVE_CLEARED, (e) => seen.push(e.index));
    wd.start(0);
    step(5);
    for (let i = 0; i < 40 && wd.phase === 'ACTIVE'; i++) { step(1); killAll(); }
    expect(seen).toEqual([0]);
    expect(wd.phase).toBe('CLEARED');
    step(4);
    expect(wd.phase).toBe('PREP');
    expect(wd.index).toBe(1);
  });

  it('completes the chapter after the last wave', () => {
    const { wd, step, killAll, events } = makeHarness();
    let done = false;
    events.on(EV.CHAPTER_COMPLETE, () => { done = true; });
    wd.start(4);
    wd.ready();
    step(wd.wave.warningTime + 0.1);
    for (let i = 0; i < 60 && wd.phase === 'ACTIVE'; i++) { step(1); killAll(); }
    step(4);
    expect(done).toBe(true);
    expect(wd.completed).toBe(true);
  });

  it('skip moves to the next wave', () => {
    const { wd, step } = makeHarness();
    wd.start(0);
    wd.skip();
    step(1);
    expect(wd.index).toBe(1);
    expect(wd.phase).toBe('PREP');
  });

  it('difficulty group size scales population', () => {
    const events = new EventBus();
    const wd = new WaveDirector({ waves: CABIN_WAVES, events, spawner: { arrive() {}, spawnOne() {} }, getActiveCount: () => 0, difficulty: { groupSize: 1.5, reinforcementInterval: 1 } });
    wd.start(0);
    wd._enterActive();
    expect(wd.remaining).toBe(Math.round(wavePopulation(CABIN_WAVES[0]) * 1.5));
  });
});
