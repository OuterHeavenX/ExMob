import { CURRENT_SCHEMA_VERSION } from './SaveSchema.js';

/**
 * Ordered migrations. Each converts `from` -> `to` in place and returns the data.
 * Version 0 represents pre-release prototypes that had no schemaVersion field.
 */
export const MIGRATIONS = [
  {
    from: 0, to: 1,
    migrate(data) {
      const d = { ...data };
      d.schemaVersion = 1;
      d.createdAt = d.createdAt || Date.now();
      d.updatedAt = Date.now();
      d.campaign = d.campaign || { chapter: 'cabin', waveIndex: 0, completed: false };
      d.player = d.player || {};
      if (typeof d.player.cash !== 'number') d.player.cash = 350;
      if (typeof d.player.bounty !== 'number') d.player.bounty = 25000;
      if (typeof d.player.health !== 'number') d.player.health = 100;
      if (typeof d.player.armor !== 'number') d.player.armor = 0;
      if (!d.player.weapons) d.player.weapons = { pistol: { owned: true, mag: 12, reserve: 60 } };
      if (!d.player.equipped || !d.player.weapons[d.player.equipped]) d.player.equipped = 'pistol';
      if (!d.player.unlockedDefenses) d.player.unlockedDefenses = ['boards', 'door_repair'];
      d.property = d.property || { id: 'cabin', upgrades: [] };
      d.stats = d.stats || { kills: 0, shotsFired: 0, shotsHit: 0, cashEarned: 0, cashSpent: 0, deaths: 0, wavesSurvived: 0, playTime: 0 };
      return d;
    },
  },
  {
    // v0.3.0 added the melee strike; track its statistics alongside the shooting ones.
    from: 1, to: 2,
    migrate(data) {
      const d = { ...data };
      d.stats = d.stats || {};
      if (typeof d.stats.meleeHits !== 'number') d.stats.meleeHits = 0;
      if (typeof d.stats.meleeKills !== 'number') d.stats.meleeKills = 0;
      return d;
    },
  },
  {
    // v0.6.0 added standing property upgrades (the tripwire alarm and the floodlights). Older
    // saves have `property.upgrades` missing or holding the two always-available defenses.
    from: 2, to: 3,
    migrate(data) {
      const d = { ...data };
      d.property = d.property || { id: 'cabin' };
      if (!Array.isArray(d.property.upgrades)) d.property.upgrades = [];
      d.property.upgrades = d.property.upgrades.filter((id) => id === 'alarm' || id === 'exterior_lights');
      return d;
    },
  },
];

/**
 * Apply migrations from data.schemaVersion (or 0) up to CURRENT_SCHEMA_VERSION.
 * Throws if the save is from a newer version than this build understands.
 */
export function applyMigrations(data) {
  let d = data;
  let v = typeof d.schemaVersion === 'number' ? d.schemaVersion : 0;
  if (v > CURRENT_SCHEMA_VERSION) throw new Error(`Save schema ${v} is newer than supported ${CURRENT_SCHEMA_VERSION}`);
  while (v < CURRENT_SCHEMA_VERSION) {
    const m = MIGRATIONS.find((mm) => mm.from === v);
    if (!m) throw new Error(`No migration from schema ${v}`);
    d = m.migrate(d);
    v = m.to;
    d.schemaVersion = v;
  }
  return d;
}
