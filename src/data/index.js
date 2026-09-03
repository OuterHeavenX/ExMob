/**
 * Registry index + validation. Validation runs at boot (dev mode) and in tests.
 * Pure JS, no THREE imports, so it can run in node.
 */
import { WEAPONS, WEAPON_SLOTS } from './weapons/weaponRegistry.js';
import { ENEMIES, CABIN_ENEMY_IDS } from './enemies/enemyRegistry.js';
import { CABIN_WAVES } from './waves/cabinWaves.js';
import { CABIN } from './properties/cabin.js';
import { SHOP_ITEMS, WORLD_PURCHASES } from './upgrades/shopItems.js';
import { DEFENSES } from './defenses/defenseRegistry.js';
import { ECONOMY } from './economy/economyRegistry.js';
import { DIFFICULTY } from './difficulty/difficultyRegistry.js';
import { SFX, AUDIO_BUSES, MUSIC_STATES } from './audio/audioRegistry.js';
import { VFX, SURFACE_VFX } from './vfx/vfxRegistry.js';
import { CHARACTERS } from './characters/characterRegistry.js';
import { QUALITY_PRESETS, QUALITY_ORDER } from './quality.js';

export {
  WEAPONS, WEAPON_SLOTS, ENEMIES, CABIN_ENEMY_IDS, CABIN_WAVES, CABIN, SHOP_ITEMS, WORLD_PURCHASES,
  DEFENSES, ECONOMY, DIFFICULTY, SFX, AUDIO_BUSES, MUSIC_STATES, VFX, SURFACE_VFX, CHARACTERS,
  QUALITY_PRESETS, QUALITY_ORDER,
};

export const PROPERTIES = Object.freeze({ cabin: CABIN });
export const WAVE_SETS = Object.freeze({ cabin: CABIN_WAVES });

/**
 * Validate cross-references between registries. Returns an array of error strings (empty = valid).
 */
export function validateRegistries() {
  const errors = [];
  const push = (m) => errors.push(m);

  // weapons
  for (const [key, w] of Object.entries(WEAPONS)) {
    if (w.id !== key) push(`weapon ${key}: id mismatch`);
    for (const f of ['damage', 'pellets', 'rpm', 'magSize', 'reserveStart', 'reserveMax', 'spreadDeg', 'falloffStart', 'maxRange', 'reloadTime'])
      if (typeof w[f] !== 'number' || w[f] < 0) push(`weapon ${key}: bad ${f}`);
    if (!['semi', 'auto', 'pump'].includes(w.mode)) push(`weapon ${key}: bad mode`);
    if (w.falloffStart > w.maxRange) push(`weapon ${key}: falloffStart > maxRange`);
    if (w.reserveStart > w.reserveMax) push(`weapon ${key}: reserveStart > reserveMax`);
    for (const s of ['fire', 'reload', 'empty']) if (!SFX[w.sfx[s]]) push(`weapon ${key}: missing sfx ${w.sfx[s]}`);
    const m = w.melee;
    if (!m) push(`weapon ${key}: missing melee block`);
    else {
      for (const f of ['damage', 'range', 'arcDeg', 'windup', 'duration', 'cooldown', 'knockback', 'stagger', 'maxTargets'])
        if (typeof m[f] !== 'number' || m[f] <= 0) push(`weapon ${key}: bad melee.${f}`);
      if (m.arcDeg > 180) push(`weapon ${key}: melee.arcDeg must be <= 180`);
      if (m.windup >= m.duration) push(`weapon ${key}: melee.windup must be shorter than duration`);
      if (m.cooldown < m.duration) push(`weapon ${key}: melee.cooldown must cover the swing`);
      if (!SFX[m.sfx]) push(`weapon ${key}: missing melee sfx ${m.sfx}`);
    }
  }
  for (const id of WEAPON_SLOTS) if (!WEAPONS[id]) push(`slot references unknown weapon ${id}`);

  // enemies
  for (const [key, e] of Object.entries(ENEMIES)) {
    if (e.id !== key) push(`enemy ${key}: id mismatch`);
    if (!WEAPONS[e.weapon]) push(`enemy ${key}: unknown weapon ${e.weapon}`);
    if (!(e.hp > 0)) push(`enemy ${key}: hp must be > 0`);
    if (!(e.cash && e.cash.min <= e.cash.max)) push(`enemy ${key}: bad cash range`);
    const p = e.profile;
    if (!p) { push(`enemy ${key}: missing profile`); continue; }
    if (p.accuracy < 0 || p.accuracy > 1) push(`enemy ${key}: accuracy out of range`);
    if (p.preferredRange.min > p.preferredRange.max) push(`enemy ${key}: preferredRange min > max`);
    if (!p.burst || p.burst.count < 1) push(`enemy ${key}: bad burst`);
  }
  for (const id of CABIN_ENEMY_IDS) if (!ENEMIES[id] || ENEMIES[id].future) push(`cabin enemy ${id} missing or marked future`);

  // waves
  CABIN_WAVES.forEach((w, i) => {
    if (w.index !== i) push(`wave ${w.id}: index ${w.index} != position ${i}`);
    if (!(w.activeCap > 0)) push(`wave ${w.id}: activeCap`);
    if (!MUSIC_STATES[w.music]) push(`wave ${w.id}: unknown music state ${w.music}`);
    if (w.elite && !ENEMIES[w.elite]) push(`wave ${w.id}: unknown elite ${w.elite}`);
    for (const g of w.groups) {
      if (!CABIN.routes[g.arrival.route]) push(`wave ${w.id}: unknown route ${g.arrival.route}`);
      const route = CABIN.routes[g.arrival.route];
      if (route && route.type !== g.arrival.type) push(`wave ${w.id}: route ${g.arrival.route} type mismatch`);
      if (g.arrival.type === 'vehicle' && !(route && route.slots[g.arrival.slot])) push(`wave ${w.id}: unknown slot ${g.arrival.slot}`);
      for (const e of g.enemies) {
        if (!ENEMIES[e.type]) push(`wave ${w.id}: unknown enemy ${e.type}`);
        else if (ENEMIES[e.type].future) push(`wave ${w.id}: enemy ${e.type} is a future archetype`);
        if (!(e.count > 0)) push(`wave ${w.id}: bad count`);
      }
    }
  });

  // property
  for (const wall of CABIN.walls) {
    const len = Math.hypot(wall.x2 - wall.x1, wall.z2 - wall.z1);
    for (const o of wall.openings) {
      if (o.along < 0 || o.along > len) push(`wall ${wall.id}: opening outside wall`);
      if ((o.type === 'door' || o.type === 'window') && !CABIN.portals[o.portal]) push(`wall ${wall.id}: unknown portal ${o.portal}`);
    }
  }
  for (const [key, p] of Object.entries(CABIN.portals)) {
    if (p.id !== key) push(`portal ${key}: id mismatch`);
    if (!CABIN.rooms.find((r) => r.id === p.room)) push(`portal ${key}: unknown room ${p.room}`);
    if (!(p.hp > 0)) push(`portal ${key}: hp`);
  }
  const propIds = new Set();
  for (const pr of CABIN.props) {
    if (propIds.has(pr.id)) push(`prop ${pr.id}: duplicate id`);
    propIds.add(pr.id);
  }

  // shop
  for (const item of SHOP_ITEMS) {
    if (!(item.price >= 0)) push(`shop ${item.id}: price`);
    if (item.action.type === 'unlockWeapon' && !WEAPONS[item.action.weapon]) push(`shop ${item.id}: unknown weapon`);
  }
  for (const wp of Object.values(WORLD_PURCHASES)) if (!(wp.price >= 0)) push(`world purchase ${wp.id}: price`);

  // defenses, difficulty, audio, vfx, quality, economy, characters
  for (const [key, d] of Object.entries(DEFENSES)) if (d.id !== key) push(`defense ${key}: id mismatch`);
  for (const [key, d] of Object.entries(DIFFICULTY)) if (d.id !== key) push(`difficulty ${key}: id mismatch`);
  if (!DIFFICULTY.normal) push('difficulty normal missing');
  for (const [key, s] of Object.entries(SFX)) if (!AUDIO_BUSES.includes(s.bus)) push(`sfx ${key}: unknown bus ${s.bus}`);
  if (!SFX.melee_hit) push('sfx melee_hit missing');
  for (const [key, s] of Object.entries(SURFACE_VFX)) {
    if (!VFX[s.vfx]) push(`surface ${key}: unknown vfx ${s.vfx}`);
    if (!SFX[s.sfx]) push(`surface ${key}: unknown sfx ${s.sfx}`);
  }
  for (const q of QUALITY_ORDER) if (!QUALITY_PRESETS[q]) push(`quality ${q} missing`);
  if (ECONOMY.bountyStages[0] !== ECONOMY.bountyStart) push('economy: bountyStart must equal first stage');
  for (const w of CABIN_WAVES) if (!ECONOMY.bountyStages.includes(w.bountyAfter)) push(`wave ${w.id}: bountyAfter not a bounty stage`);
  if (!CHARACTERS.exmob) push('characters: exmob missing');

  return errors;
}
