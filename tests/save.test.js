import { describe, it, expect } from 'vitest';
import { createDefaultSave, validateSave, CURRENT_SCHEMA_VERSION } from '../src/save/SaveSchema.js';
import { applyMigrations, MIGRATIONS } from '../src/save/migrations.js';
import { SaveManager } from '../src/save/SaveManager.js';
import { EventBus } from '../src/core/EventBus.js';

class MemoryStore {
  constructor() { this.m = new Map(); }
  async get(k) { return this.m.has(k) ? JSON.parse(JSON.stringify(this.m.get(k))) : null; }
  async set(k, v) { this.m.set(k, JSON.parse(JSON.stringify(v))); return true; }
  async delete(k) { this.m.delete(k); return true; }
}

describe('save schema', () => {
  it('default save validates', () => {
    expect(validateSave(createDefaultSave())).toEqual([]);
  });

  it('migration chain covers 0..current', () => {
    let v = 0;
    while (v < CURRENT_SCHEMA_VERSION) {
      const m = MIGRATIONS.find((x) => x.from === v);
      expect(m).toBeDefined();
      v = m.to;
    }
  });

  it('migrates a pre-release save without schemaVersion', () => {
    const legacy = { player: { cash: 900 }, campaign: { waveIndex: 2 } };
    const out = applyMigrations(legacy);
    expect(out.schemaVersion).toBe(CURRENT_SCHEMA_VERSION);
    expect(out.player.cash).toBe(900);
    expect(out.player.weapons.pistol).toBeDefined();
    expect(validateSave(out)).toEqual([]);
  });

  it('refuses saves from the future', () => {
    expect(() => applyMigrations({ schemaVersion: CURRENT_SCHEMA_VERSION + 1 })).toThrow();
  });
});

describe('SaveManager', () => {
  it('new game, persist, reload, export/import round trip', async () => {
    const store = new MemoryStore();
    const sm = new SaveManager(new EventBus(), store);
    await sm.init();
    expect(sm.hasSave()).toBe(false);
    await sm.newGame();
    sm.data.player.cash = 4242;
    await sm.persist();
    const sm2 = new SaveManager(new EventBus(), store);
    await sm2.init();
    expect(sm2.hasSave()).toBe(true);
    expect(sm2.data.player.cash).toBe(4242);
    const json = sm2.exportJSON();
    const sm3 = new SaveManager(new EventBus(), new MemoryStore());
    await sm3.init();
    await sm3.importJSON(json);
    expect(sm3.data.player.cash).toBe(4242);
    await sm3.reset();
    expect(sm3.hasSave()).toBe(false);
  });

  it('rejects garbage imports', async () => {
    const sm = new SaveManager(new EventBus(), new MemoryStore());
    await sm.init();
    await expect(sm.importJSON('{"nope":true}')).rejects.toThrow();
  });
});
