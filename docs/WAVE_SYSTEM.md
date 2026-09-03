# EXMOB - WAVE SYSTEM

## Philosophy

Waves are attacks on a home, not rounds in an arena. Every wave has a story: who was sent, how
they arrived, what they were told, and how they intend to get inside.

Difficulty never comes from simply inflating HP. It comes from:

- enemy quantity (total population per wave)
- enemy composition (which archetypes, in what ratio)
- weapon quality (pistols -> shotguns -> SMGs -> rifles)
- attack directions (one route -> multiple simultaneous routes)
- aggression (how quickly they push, how willing they are to breach)
- coordination (staggered groups, flankers timed with a frontal push)
- armor (later chapters)
- breaching capability (who can kick a door, who can board through a window)
- special enemy types (hitman, arsonist, sniper, cleaner...)
- simultaneous threats (a breach while a shooter suppresses from a window)

Teach one threat. Then combine it with previous threats.

## Structure of a wave

A wave definition (see `src/data/waves/cabinWaves.js`) contains:

```
id, index, title, subtitle, banner,
prepTime (seconds of preparation before the warning),
activeCap (max simultaneous active enemies for this wave),
payout (cash awarded when the wave ends),
bountyAfter (bounty value after this wave is survived),
groups: [
  { delay, arrival: { type: 'vehicle'|'foot', route, vehicle }, enemies: [{ type, count }], tactics }
]
```

Groups arrive over time. A vehicle group triggers the arrival cinematic (headlights through the
trees, car stops, doors open, enemies step out). A foot group emerges from a treeline route.

## Active enemy cap

The WaveDirector never has more than `activeCap` enemies alive at once. Group members beyond the
cap are queued as reinforcements and released as active enemies die. The cap is per wave and
clamped by the QualityManager's device budget (mobile: 10, desktop: 16 in the Cabin). Wave
population can therefore be large while the frame stays stable.

Rule: **optimize before increasing the cap** (AGENTS.md rule 13).

## Phases

```
PREP  ->  WARNING  ->  ACTIVE  ->  CLEARED  ->  (next PREP)  ...  ->  CHAPTER COMPLETE
```

- **PREP**: countdown, shop available, repairs available, READY button visible.
- **WARNING**: 3-4 seconds. Engine audio, banner, headlights appear. Shop closes.
- **ACTIVE**: groups spawn according to their delays; reinforcements fill the cap.
- **CLEARED**: all population dead. Payout. Silence. Damage walkthrough. Then PREP.

## Cabin waves (NORMAL)

| Wave | Title | Population | Cap | Composition | Routes | Teaches |
| --- | --- | --- | --- | --- | --- | --- |
| 1 | They Found You | 4 | 4 | 4 Goons | Driveway (1 car) | Shooting, doors, windows shatter |
| 2 | Second Car | 7 | 6 | 7 Goons | Driveway (2 cars, staggered) + west trees | Two directions |
| 3 | Break In | 8 | 6 | 6 Goons, 2 Enforcers | Driveway + east trees | Breaching, shotgun rusher |
| 4 | Surrounded | 12 | 8 | 7 Goons, 2 Enforcers, 3 Soldiers | Driveway + west + east + rear | Multiple sides, SMG |
| 5 | Hit Squad | 12 | 8 | 4 Goons, 3 Enforcers, 4 Soldiers, 1 Hitman | All routes, coordinated | Elite, cover use, aggression |

Exact numbers are data and will be tuned. The table reflects the shipped registry values.

## Chapter 1 archetype introduction

Each new archetype gets its own wave to be learned in, and the wave before it teaches the thing it
punishes:

| Wave | Introduces | What it tests |
| --- | --- | --- |
| 1-2 | Goons | Movement, aiming, the doorway |
| 3 | Breacher | Whether boards and barricades were bought, and whether you defend them |
| 4 | Sniper | Whether you stay out of open ground and use the walls |
| 5 | Arsonist (plus all of the above and the hitman) | Whether you can give up a position |

The tripwire alarm adds its `warningBonus` to every warning phase, read fresh each wave so a
mid-chapter purchase takes effect on the next one.

## Difficulty modifiers

`src/data/difficulty/` scales: aggression, accuracy, group size multiplier, reinforcement
interval, special enemy chance. HARD and VERY HARD exist as data only; NORMAL is balanced.

## Boss / Hit Squad waves

A Hit Squad wave introduces an elite enemy with a name banner and a distinct music state. In the
Cabin it is a single Hitman. Later chapters add Captains (buff nearby enemies), the Underboss
(boss fight), and the Contract Killer.

## Spawn routes

Routes are named points/curves in the property data: `driveway`, `west_trees`, `east_trees`,
`rear_trees`. Vehicles use the driveway route and park at designated slots. Foot groups fade in
at treeline spawn points that are outside the camera frustum whenever possible.

## Future

- Reinforcement vehicles mid-wave (Driver archetype).
- Coordinated breach (two Breachers on two doors with a suppressor at a window).
- Dynamic route choice based on which side the player defends least.
- Wave mutators for replayability (night rain, power cut, no shop).
