# EXMOB - PROPERTY SYSTEM

The property is the battlefield and one of the game's main characters. This document covers
property gameplay, damage, defense, repair, and relocation.

## Property definition

A property is data (`src/data/properties/`) plus a builder module (`src/world/CabinBuilder.js`
for the Cabin). The data describes:

- footprint, rooms, and interior/exterior zones
- entry points: doors and windows with positions, orientations, HP, and which room they connect
- routes: named spawn routes and vehicle parking slots
- cover nodes (auto-generated from colliders plus hand-placed nodes)
- defense slots (where boards/barricades/equipment can be placed)
- player start position, shop/cache positions, camera zones

## Entry points

**Doors**
- States: OPEN, CLOSED, BROKEN.
- Player opens/closes with E. Enemies breach CLOSED doors (HP) and walk through OPEN/BROKEN.
- Broken doors cannot be closed until repaired (cost in economy registry).
- Repair: hold E near a broken door during PREP. Restores CLOSED with full HP.

**Windows**
- States: INTACT, SHATTERED, BOARDED.
- Any bullet shatters an intact window (glass VFX + audio + decal).
- Enemies with `canEnterWindows` shatter and climb through SHATTERED windows.
- Boards: purchased and applied with E during PREP; boards have HP and must be broken before the
  window can be entered. Boards block line of sight for AI.
- Shattered windows are shooting lanes for both sides.

Doors and windows are **portals** in the navigation graph. A portal is passable for enemies when
OPEN/BROKEN/SHATTERED (window) and requires a BREACH state otherwise.

## Damage

Persistent per combat session:

- bullet-hole decals on walls, floor, props (pooled, capped by quality tier)
- shattered glass shards on the floor near windows
- door fragments when a door breaks
- splinters and wood chips on wood impacts
- destructible props: lamps, table, chairs, shelves, decorations, the TV, the coffee pot. Each has
  HP; on destruction the mesh swaps to a broken variant (or hides) and pooled debris spawns.
  Lamps that break stop emitting light (the room goes darker - this matters).
- scorch marks (later, arsonist)

Rule: no fully physics-simulated decoration. Debris is pooled, lifetime-limited, and uses a
simple gravity/bounce integrator.

After a wave the player can walk through the wreckage. Repairs are deliberate and cost cash.

## Defense catalog (long-term)

| Defense | Effect | Chapter |
| --- | --- | --- |
| Window boards | Window gains HP, blocks LOS | 1 |
| Door repair | Restores a broken door | 1 |
| Barricades | Furniture pushed against doors/windows, high HP | 2 |
| Reinforced doors | Higher door HP, slower breach | 2 |
| Alarm system | Longer WARNING, enemy routes revealed | 2 |
| Exterior lighting | Reveals attackers in the dark; can be shot out | 2 |
| Guard dog | Defends a zone, stuns one enemy | 2 |
| Motion detectors | Reveal a specific route | 2 |
| Window shutters | Temporary hard protection for windows | 3 |
| Security cameras | Reveal approaching enemies on a HUD minimap | 3 |
| Gun cabinet | In-property ammo/weapon access during combat | 3 |
| Medical cabinet | In-property healing during combat | 3 |
| Safe room | Fallback position with reinforced door | 4 |
| Hired muscle | AI defender | 4 |
| Reinforced garage | Protects vehicle access | 4 |
| Gates | Delay vehicles and enemies | 5 |
| Private security | Late-game defensive personnel | 5 |
| Improvised traps | Setting-appropriate, limited | 3+ |

Military gadgets never dominate the game.

## Retreat geometry

Properties are designed so the fight has a physical fallback line:

```
OUTSIDE -> PORCH -> FRONT DOOR -> LIVING ROOM -> KITCHEN -> HALLWAY -> BEDROOM -> LAST STAND
```

The Cabin's bedroom has one door and two windows and is the natural last stand.

## Relocation

At the end of a chapter's final wave the property is COMPROMISED. The player pays relocation and
the next property's price, and the campaign advances. Not implemented beyond the Cabin ending
screen.
