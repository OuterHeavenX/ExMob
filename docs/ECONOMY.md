# EXMOB - ECONOMY

Cash and bounty are the two numbers that define the campaign. All values live in
`src/data/economy/economyRegistry.js` and `src/data/upgrades/`.

## Cash

Sources:
- Enemy bodies drop a cash bundle (registry value with +/- variance). Pick up by walking over.
- Wave payout, framed as cash recovered from the crew's car / their advance.
- Ray's own stashes (story cash at chapter start).
- Later: black-market transactions, seized mob assets, contract payouts, stolen proceeds.

Sinks (Cabin):

| Item | Cost | Notes |
| --- | --- | --- |
| Ammo refill (current weapon) | $150 | Fills reserve to max |
| Ammo refill (all) | $350 | |
| Heal | $200 | Full health |
| Body armor | $400 | 50 armor points, absorbs 60% of damage until depleted |
| Door repair | $120 | Per door, in-world with E |
| Window boards | $80 | Per window, in-world with E |
| Revolver | $500 | Unlock |
| Shotgun | $900 | Unlock |
| SMG | $1,400 | Unlock |

Starting cash (Cabin): $350 - the coffee can.

Wave payouts (Cabin): $250, $400, $600, $900, $1,500.

Enemy drops: Goon $40-80, Enforcer $60-120, Soldier $80-140, Hitman $400-600.

## Bounty

| Stage | Bounty | Where |
| --- | --- | --- |
| Start | $25,000 | Cabin wave 1 |
| After Cabin wave 3 | $35,000 | |
| After Cabin wave 5 | $50,000 | Cabin compromised |
| Small House | $50k -> $100k | |
| Townhouse | $100k -> $250k | |
| Luxury Home | $250k -> $500k | |
| Estate | $500k -> $1M | |
| Mansion | OPEN CONTRACT | |

Bounty influences (via difficulty registry lookups): enemy quality tier, enemy equipment, squad
size multiplier, attack routes unlocked, boss frequency, special enemy chance, tactical
sophistication level. In the Cabin the bounty mostly narrates escalation; waves are hand-authored.

## Long-term balance philosophy

- The player should always be able to afford *something* meaningful between waves, but never
  everything.
- Repairs should feel worth it but not mandatory. Boards are cheap; doors are moderate; armor is
  the "treat".
- Weapon unlocks are milestones: roughly one per two waves in the Cabin.
- Later chapters add property purchase and relocation as large sinks that reset the player to
  "rich but stretched".
- No grinding: waves cannot be replayed for cash except via RETRY after death (which restores
  the wave-start snapshot, so no exploit).
