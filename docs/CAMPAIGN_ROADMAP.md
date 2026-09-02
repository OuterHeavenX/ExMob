# EXMOB - CAMPAIGN ROADMAP

Only **Chapter 1 - The Cabin** is built. Every later chapter is documented here so the
architecture can point toward it, and so nobody builds it early.

| # | Property | Bounty range | New systems introduced | Status |
| --- | --- | --- | --- | --- |
| 1 | The Cabin | $25k -> $50k | Everything foundational | **In development (vertical slice)** |
| 2 | The Small House | $50k -> $100k | Fence, guard dog, drive-bys, alarm | Not started |
| 3 | The Townhouse | $100k -> $250k | Multi-floor, street/alley approaches, neighbors, snipers | Not started |
| 4 | The Luxury Home | $250k -> $500k | Cameras, hired muscle, cleaners, arsonists, gated approach | Not started |
| 5 | The Estate | $500k -> $1M | Multiple buildings, perimeter gates, guards, captain, underboss boss | Not started |
| 6 | The Mansion | OPEN CONTRACT | Total assault, floors, security failure cascade, contract killer | Not started |

## Chapter 1 - The Cabin

- Remote wilderness clearing. One building, porch, driveway, parked car, forest on all sides.
- Rooms: living room, kitchen, hallway, bedroom, bathroom.
- Entry points: front door (south), back door (north), six windows.
- Approach routes: driveway (south), west treeline, east treeline, rear treeline (north).
- Five waves. Enemy set: Street Goon, Enforcer, Mob Soldier, Hitman.
- Purchases: ammo, heal, armor, door repair, window boards, shotgun, SMG, revolver.
- Ends with CABIN COMPROMISED and Ray leaving.
- Full spec: CABIN_VERTICAL_SLICE.md.

## Chapter 2 - The Small House

- Suburban lot, single-story house, fenced backyard, garage, street front.
- New enemy behaviors: drive-by from the street, fence climbing, garage breach.
- New defenses: alarm (earlier warning), guard dog, reinforced door, motion detector.
- Economy: first property purchase; relocation cost introduced.

## Chapter 3 - The Townhouse

- Urban block. Two floors plus rooftop access. Alley behind. Street front with parked cars.
- New: vertical navigation (stairs), sniper sightlines from across the street, breacher archetype,
  window shutters, security cameras.
- Story: Sal Brancusi takes over the hunt. Danny Kessler contact.

## Chapter 4 - The Luxury Home

- Gated suburban estate lot, pool, two floors, long driveway.
- New: hired muscle (AI defender), private security lite, cleaners, arsonists, captain.
- Story: Carmine calls Ray.

## Chapter 5 - The Estate

- Multi-building property with a perimeter wall, main gate, guard house, garage block.
- New: gates (delay vehicles), multiple simultaneous assault vectors, captain coordination,
  Underboss boss fight, staff.

## Chapter 6 - The Mansion

- Massive property. Multiple floors, wings, grounds, gates, security room.
- Final assault: security failure cascade, gates breached, guards overwhelmed, vehicles flood
  the grounds, floor-by-floor retreat, Contract Killer.
- Tests every progression system.
- Original sequence. See STORY_BIBLE.md finale rules.

## Cross-chapter progression carried in the save

- Cash, bounty, weapons owned, ammo, armor level.
- Unlocked defenses and property upgrades.
- Statistics (kills, waves survived, cash earned, property damage repaired).
- Campaign chapter and wave index.

## Relocation rule

A location becomes compromised at the end of its final wave. Relocation is a story beat with a
cost (cash) and a purchase (the next property). It is never optional and never mid-chapter.
