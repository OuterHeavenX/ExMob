/**
 * Economy registry. See docs/ECONOMY.md.
 */
export const ECONOMY = Object.freeze({
  startingCash: 350,
  bountyStart: 25000,
  bountyStages: Object.freeze([25000, 35000, 50000, 100000, 250000, 500000, 1000000]),
  bountyOpenContractLabel: 'OPEN CONTRACT',
  costs: Object.freeze({
    doorRepair: 120,
    windowBoards: 80,
    barricade: 240,
    alarm: 450,
    floodlights: 600,
    ammoCurrent: 150,
    ammoAll: 350,
    heal: 200,
    armor: 400,
  }),
  armor: Object.freeze({ points: 50, absorb: 0.6 }),
  cashPickupLifetime: 90,
  cashPickupMagnetRadius: 1.3,
});

/** Format cash as $1,234. Pure (unit-tested). */
export function formatCash(n) {
  const v = Math.max(0, Math.round(n));
  return '$' + v.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ',');
}

/** Format bounty (handles open contract). */
export function formatBounty(n) {
  if (n === Infinity || n === null) return ECONOMY.bountyOpenContractLabel;
  return formatCash(n);
}
