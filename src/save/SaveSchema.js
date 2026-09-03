import { ECONOMY } from '../data/economy/economyRegistry.js';
import { WEAPONS } from '../data/weapons/weaponRegistry.js';

/** Save schema. Bump CURRENT_SCHEMA_VERSION with a migration + test. See docs/SAVE_SYSTEM.md. */
export const CURRENT_SCHEMA_VERSION = 2;

export function createDefaultSettings() {
  return {
    quality: 'auto',
    masterVolume: 0.8,
    musicVolume: 0.6,
    sfxVolume: 1.0,
    screenShake: 1.0,
    touchScale: 1.0,
    difficulty: 'normal',
    inputMode: 'auto',
    aimAssist: 'auto',
    aimLine: 'auto',
    touchFireMode: 'hold',
  };
}

export function createDefaultSave(now = Date.now()) {
  return {
    schemaVersion: CURRENT_SCHEMA_VERSION,
    createdAt: now,
    updatedAt: now,
    campaign: { chapter: 'cabin', waveIndex: 0, completed: false },
    player: {
      cash: ECONOMY.startingCash,
      bounty: ECONOMY.bountyStart,
      health: 100,
      armor: 0,
      weapons: { pistol: { owned: true, mag: WEAPONS.pistol.magSize, reserve: WEAPONS.pistol.reserveStart } },
      equipped: 'pistol',
      unlockedDefenses: ['boards', 'door_repair'],
    },
    property: { id: 'cabin', upgrades: [] },
    stats: { kills: 0, shotsFired: 0, shotsHit: 0, meleeHits: 0, meleeKills: 0, cashEarned: 0, cashSpent: 0, deaths: 0, wavesSurvived: 0, playTime: 0 },
  };
}

/** Returns an array of problems (empty = valid). */
export function validateSave(data) {
  const errs = [];
  if (!data || typeof data !== 'object') return ['save is not an object'];
  if (data.schemaVersion !== CURRENT_SCHEMA_VERSION) errs.push(`schemaVersion ${data.schemaVersion} != ${CURRENT_SCHEMA_VERSION}`);
  if (!data.campaign || typeof data.campaign.waveIndex !== 'number') errs.push('campaign.waveIndex missing');
  if (!data.player || typeof data.player.cash !== 'number') errs.push('player.cash missing');
  if (!data.player || !data.player.weapons || !data.player.weapons[data.player.equipped]) errs.push('equipped weapon not owned');
  if (!data.stats) errs.push('stats missing');
  return errs;
}
