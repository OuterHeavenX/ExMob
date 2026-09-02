# EXMOB - GAME DESIGN

## One-line pitch

A stylish, high-angle third-person action-survival game about a former mob fixer defending the
place he lives from the organization that wants him dead, getting richer and more visible with
every attack he survives.

## Core fantasy

"I survived long enough to build this life, and now they're trying to take it from me."

The fantasy never changes. Only the scale does. The player begins broke, alone, and hiding in a
cabin with a handgun. The player ends in an enormous mansion with an armory, security, allies, and
an army coming up the driveway.

## Genre

High-angle third-person 3D action survival with:

- twin-stick shooter mechanics (move with one input, aim with another)
- property defense (the home is the battlefield, never an arena)
- wave survival with quiet preparation phases between attacks
- home upgrading, repair, and light economic progression
- enemy escalation driven by composition and tactics, not just HP
- property progression across the campaign
- cinematic presentation (arrivals, camera events, lighting)
- persistent character progression (weapons, armor, cash, bounty)

It is **not** a tower-defense game. The player personally controls ExMob at all times during
combat. Defensive equipment supports the player; it never replaces him.

## Core loop

```
PREPARE  ->  WARNING  ->  DEFEND  ->  SILENCE  ->  WALK THE WRECKAGE  ->  SPEND  ->  PREPARE
```

Campaign loop (macro):

```
SURVIVE -> GET PAID -> IMPROVE EQUIPMENT -> IMPROVE DEFENSES -> SURVIVE LARGER ATTACKS
-> LOCATION COMPROMISED -> RELOCATE -> BUY A BETTER PROPERTY -> BUILD A BETTER LIFE
-> GET DISCOVERED AGAIN -> DEFEND IT
```

## Camera

Cinematic elevated third-person camera using a **perspective projection**, not a locked
isometric projection.

- Default pitch around 55 degrees, yaw fixed looking north (into the property from the approach
  side), height ~13 m, distance ~9 m behind the player.
- Smooth follow with damping.
- Look-ahead toward the aim direction (up to ~2.5 m) so the player can see what they are shooting
  at.
- Tasteful camera shake on firing, impacts, breaches, and vehicle arrival.
- Mild zoom-out during large events (vehicle arrival, Hit Squad banner).
- No free orbit during normal gameplay. Designed camera zones may override framing in cinematic
  locations (the Cabin uses one: the driveway arrival shot).
- Interiors: the roof and the camera-facing (south) walls fade to near-transparent when the player
  is inside so the character and the room stay readable.

## Controls

See README.md for the full mapping. Design intent:

- Movement and aiming are fully independent (twin-stick).
- Firing is immediate and responsive; there is no wind-up.
- Precision aim (right mouse / hold) tightens spread and slows movement. It is optional.
- Dodge is a short invulnerable roll with a cooldown; it is an escape tool, not a spam tool.
- Interaction (E) is context sensitive: open/close doors, repair, board windows, pick up.
- Mobile uses dual virtual sticks with fire-on-aim, plus context buttons. It is a first-class
  path designed alongside desktop, not an afterthought.

## Combat philosophy

Fast, responsive, readable, powerful, cinematic, arcade-driven. Not a military simulation.

Feedback that must exist for every shot: muzzle flash (with light), recoil (camera + weapon),
weapon audio, tracer, impact effect that matches the surface (wood chips, sparks, glass, blood,
dust), hit reaction on enemies, camera impulse. Enemies stagger when hit and die with weight.

Shooting must feel satisfying with the starting pistol, before any progression exists.

## The property is a character

Enemies do not spawn in an arena. They arrive in vehicles, walk up the driveway, come through the
trees, approach windows, break them, kick doors, breach entrances, fire through openings, and
flank. The fight has a physical shape that the player can read:

```
OUTSIDE -> PORCH -> FRONT DOOR -> LIVING ROOM -> KITCHEN -> HALLWAY -> BEDROOM -> LAST STAND
```

The player may hold the porch, retreat to the door, fall back room by room, and make a last stand
in the bedroom. Defenses (boards, repaired doors) shape where that line holds.

## Property damage

Damage persists for the duration of a combat session: broken windows, bullet holes, splintered
doors, destroyed lamps and decorations, shattered tables, debris on the floor. After the wave the
player walks through what just happened. Between waves they can repair what matters.

Destruction is controlled, not fully physics-simulated: props have HP and a destroyed state
(swap mesh, spawn pooled debris, spawn decals). See PROPERTY_SYSTEM.md.

## Preparation phase

Between waves the player gets 30-45 seconds (data-driven) or presses READY to start sooner. In
that time they can reload, collect cash, heal, buy ammo, repair doors, board windows, buy armor,
unlock weapons, swap weapons, and reposition. Then: **WARNING - engine approaching.** The
contrast between quiet and chaos is the emotional core of EXMOB.

## Waves

See WAVE_SYSTEM.md. Summary: waves have a total population and an active cap; difficulty comes
from quantity, composition, weapon quality, attack directions, aggression, coordination, armor,
breaching capability, special enemy types, and simultaneous threats. Every threat is taught alone
before it is combined.

## Enemies

See ENEMY_DESIGN.md. The Cabin uses Street Goon, Enforcer, Mob Soldier, and Hitman.

## Bounty

The bounty on Ray's head is the campaign's difficulty dial and its narrative pulse. It rises with
every attack he survives and every dollar he visibly accumulates. Higher bounty means better
enemies, better equipment, larger squads, more attack routes, more bosses. Bounty is shown in the
HUD and announced dramatically when it changes. See ECONOMY.md.

## Money

Cash. Bundles of bills, not floating coins. Cash comes from enemy bodies (they are carrying
their advance), Ray's own hidden stashes, wave payouts (recovered from the crew's car), and
later black-market and contract work. Cash buys ammo, healing, armor, repairs, defenses, weapons,
security, help, relocation, and property. See ECONOMY.md.

## Home defense

Believable crime/property-defense equipment, not military gadgets: boards and barricades,
reinforced doors, shutters, cameras, exterior lighting, alarms, gun cabinets, medical cabinets,
safe rooms, guard dog, hired muscle, private security, gates, motion detectors, and improvised
traps. See PROPERTY_SYSTEM.md. The Cabin implements boards, door repair, ammo/med access via the
shop, and the parked car as cover.

## Property progression

Cabin -> Small House -> Townhouse -> Luxury Home -> Estate -> Mansion. See CAMPAIGN_ROADMAP.md.
Only the Cabin is built.

## Player

- Health 100, optional armor layered above it (absorbs a percentage of damage until depleted).
- Clear low-health feedback: vignette, heartbeat audio, desaturation.
- No instant deaths from ordinary enemies. Deaths should feel understandable.
- Inventory: primary weapon, secondary weapon, utility slot (reserved), equipment slots (later).
  The Cabin keeps this to four weapon slots selected with 1-4, no inventory management.

## Game over

"EXMOB - CONTRACT FULFILLED". Options: RETRY WAVE, RESTART CHAPTER, MAIN MENU. Retry restarts the
current wave from the preparation phase with the state saved at the start of that wave.

## HUD

Minimal. Top-left health/armor. Top-right cash and bounty. Bottom weapon, ammo, reload indicator.
Center crosshair. Wave banners appear dramatically but briefly ("WAVE 3 - BREAK IN",
"HIT SQUAD INBOUND"). No permanent panels covering gameplay.

## Menus

Title: CONTINUE, NEW GAME, SETTINGS, CREDITS, and DEBUG (dev mode only). Version shown.
Pause: RESUME, SETTINGS, QUIT TO MENU. Settings: quality preset, master/music/SFX volume,
screen shake, touch layout size, save export/import/reset.

## Difficulty

NORMAL, HARD, VERY HARD are architected in `src/data/difficulty`. Only NORMAL is balanced for the
Cabin. Difficulty adjusts aggression, aim, quantities, spawn intervals, and special enemy
frequency. It does not multiply HP massively.

## Tone

Crime, betrayal, dark humor, paranoia, loyalty, regret, survival, wealth, consequence.
See STORY_BIBLE.md.

## Originality

EXMOB draws on gangster cinema, crime thrillers, survival games, wave-defense games, and action
films for feel only. Every character, line, organization, symbol, layout, and story beat is
original.
