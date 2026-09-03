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

## Defenses (Chapter 1)

| Defense | Cost | Where | Effect |
| --- | --- | --- | --- |
| Window boards | $80 | In the world, PREP | 90 hp of planks over a window |
| Door repair | $120 | In the world, PREP | Rehangs a broken door |
| Barricade | $240 | In the world, PREP | 240 hp across a door or window, blocks line of sight |
| Tripwire alarm | $450 | Shop, once | +6 seconds of warning before every wave |
| Floodlights | $600 | Shop, once | Two lamps; attackers in the light are 60% slower to shoot |

A **barricade is a layer, not a state**. `portal.barricadeHp` sits alongside the door's own
OPEN/CLOSED/BROKEN or the window's INTACT/SHATTERED/BOARDED, so a door can be closed *and*
barricaded and shattering the glass behind one changes nothing about it. It carries its own
collider, added when it goes up and removed when it comes down, so the navigation grid re-bakes
only that opening (48 cells, 0.7 ms) rather than the whole property. Breach damage goes through
the barricade first and never carries over into what is behind it.

The interaction offers the cheap layer first: a window wants boards before it will take a
barricade. A door keeps working normally during PREP - a tap opens or closes it, a hold barricades
it - so buying a barricade never costs you the ability to use the door up to that moment.

**Floodlights** are the only defense that can be destroyed mid-wave. Each lamp has 40 hp and a
12 m radius; the two mounts are 16 m apart, so shooting one out frees its side of the property and
leaves the other side lit. Bulbs are replaced free between waves - the install was the expense.

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
