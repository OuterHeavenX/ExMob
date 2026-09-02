import { ECONOMY } from '../economy/economyRegistry.js';
import { WEAPONS } from '../weapons/weaponRegistry.js';

/**
 * Between-wave shop items. See docs/ECONOMY.md. `action` is interpreted by ShopManager.
 * `available(ctx)` decides visibility; `enabled(ctx)` decides if it can be bought right now.
 */
export const SHOP_ITEMS = Object.freeze([
  { id: 'ammo_current', name: 'AMMO (CURRENT WEAPON)', desc: 'Fill the reserve of the weapon in your hands.', price: ECONOMY.costs.ammoCurrent, category: 'supplies', action: { type: 'ammo', scope: 'current' } },
  { id: 'ammo_all', name: 'AMMO (ALL WEAPONS)', desc: 'Fill every reserve you own.', price: ECONOMY.costs.ammoAll, category: 'supplies', action: { type: 'ammo', scope: 'all' } },
  { id: 'heal', name: 'PATCH UP', desc: 'Full health. Whiskey and gauze.', price: ECONOMY.costs.heal, category: 'supplies', action: { type: 'heal' } },
  { id: 'armor', name: 'BODY ARMOR', desc: `${ECONOMY.armor.points} armor. Absorbs ${Math.round(ECONOMY.armor.absorb * 100)}% of damage until it is gone.`, price: ECONOMY.costs.armor, category: 'supplies', action: { type: 'armor' } },
  { id: 'unlock_revolver', name: WEAPONS.revolver.name, desc: 'Six rounds. Each one ends an argument.', price: WEAPONS.revolver.price, category: 'weapons', action: { type: 'unlockWeapon', weapon: 'revolver' } },
  { id: 'unlock_shotgun', name: WEAPONS.shotgun.name, desc: 'Own the doorway.', price: WEAPONS.shotgun.price, category: 'weapons', action: { type: 'unlockWeapon', weapon: 'shotgun' } },
  { id: 'unlock_smg', name: WEAPONS.smg.name, desc: 'Thirty rounds of not today.', price: WEAPONS.smg.price, category: 'weapons', action: { type: 'unlockWeapon', weapon: 'smg' } },
]);

/** In-world interactions with costs (E near the object during PREP). */
export const WORLD_PURCHASES = Object.freeze({
  door_repair: { id: 'door_repair', name: 'REPAIR DOOR', price: ECONOMY.costs.doorRepair, holdTime: 1.2 },
  window_boards: { id: 'window_boards', name: 'BOARD WINDOW', price: ECONOMY.costs.windowBoards, holdTime: 1.0 },
});
