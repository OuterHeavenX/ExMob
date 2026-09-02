import { IndexedDBStore } from './IndexedDBStore.js';
import { createDefaultSave, createDefaultSettings, validateSave, CURRENT_SCHEMA_VERSION } from './SaveSchema.js';
import { applyMigrations } from './migrations.js';
import { CONFIG } from '../core/Config.js';
import { EV } from '../core/Events.js';

/**
 * Persistent saves: campaign progress + settings. Versioned, migrated, exportable.
 * See docs/SAVE_SYSTEM.md.
 */
export class SaveManager {
  constructor(events, store = new IndexedDBStore(CONFIG.dbName, 'saves')) {
    this.events = events;
    this.store = store;
    this.data = null;
    this.settings = createDefaultSettings();
    this.lastError = null;
  }

  async init() {
    try {
      const s = await this.store.get('settings');
      if (s && typeof s === 'object') this.settings = { ...createDefaultSettings(), ...s };
    } catch (e) { this.lastError = e; }
    try {
      const raw = await this.store.get(CONFIG.saveKey);
      if (raw) {
        const migrated = applyMigrations(raw);
        const errs = validateSave(migrated);
        if (errs.length) { console.warn('[Save] invalid save, ignoring:', errs); this.data = null; }
        else this.data = migrated;
      }
    } catch (e) { this.lastError = e; console.warn('[Save] load failed', e); this.data = null; }
    return this;
  }

  hasSave() { return !!this.data && !this.data.campaign.completed; }

  async newGame() {
    this.data = createDefaultSave();
    await this.persist();
    return this.data;
  }

  async persist() {
    if (!this.data) return false;
    this.data.updatedAt = Date.now();
    const ok = await this.store.set(CONFIG.saveKey, this.data);
    this.events.emit(EV.SAVE_DONE, { ok });
    return ok;
  }

  async saveSettings() {
    await this.store.set('settings', this.settings);
    this.events.emit(EV.SETTINGS_CHANGED, this.settings);
  }

  async reset() {
    this.data = null;
    await this.store.delete(CONFIG.saveKey);
  }

  exportJSON() {
    return JSON.stringify({ exmob: true, schemaVersion: CURRENT_SCHEMA_VERSION, exportedAt: Date.now(), save: this.data, settings: this.settings }, null, 2);
  }

  async importJSON(text) {
    const parsed = JSON.parse(text);
    if (!parsed || !parsed.exmob || !parsed.save) throw new Error('Not an EXMOB save file');
    const migrated = applyMigrations(parsed.save);
    const errs = validateSave(migrated);
    if (errs.length) throw new Error('Invalid save: ' + errs.join(', '));
    this.data = migrated;
    if (parsed.settings) this.settings = { ...createDefaultSettings(), ...parsed.settings };
    await this.persist();
    await this.saveSettings();
    return this.data;
  }
}
