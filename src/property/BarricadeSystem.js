import { WORLD_PURCHASES } from '../data/upgrades/shopItems.js';

/**
 * Between-wave in-world purchases: board a window, repair a door. Charges through the economy.
 * Full furniture barricades are a Chapter 2 feature (docs/PROPERTY_SYSTEM.md); this system is
 * the seam for them.
 */
export class BarricadeSystem {
  constructor(pm) { this.pm = pm; }

  costFor(interaction) {
    if (interaction.type === 'repair') return WORLD_PURCHASES.door_repair.price;
    if (interaction.type === 'board') return WORLD_PURCHASES.window_boards.price;
    return 0;
  }

  holdTimeFor(interaction) {
    if (interaction.type === 'repair') return WORLD_PURCHASES.door_repair.holdTime;
    if (interaction.type === 'board') return WORLD_PURCHASES.window_boards.holdTime;
    return 0;
  }

  /** Apply a completed interaction. Returns true if it took effect. */
  apply(interaction, economy) {
    const cost = this.costFor(interaction);
    if (!economy.spend(cost, interaction.type)) return false;
    if (interaction.type === 'repair') return this.pm.doors.repair(interaction.portal);
    if (interaction.type === 'board') return this.pm.windows.board(interaction.portal);
    return false;
  }
}
