# EXMOB - ENEMY DESIGN

All enemies are defined in `src/data/enemies/enemyRegistry.js`. Gameplay classes never hard-code
archetype stats. Tier indicates the earliest chapter the archetype is intended to appear.

| Archetype | Tier | Weapon | HP | Behavior summary | Cabin |
| --- | --- | --- | --- | --- | --- |
| Street Goon | 1 | Cheap pistol | 45 | Low accuracy, low discipline, walks up, shoots from the open, will breach doors when told | Yes |
| Enforcer | 1 | Shotgun | 80 | Aggressive, closes distance, prefers breaching, deadly inside 6 m | Yes |
| Mob Soldier | 1 | SMG | 65 | Moderate accuracy, uses cover between bursts, moves tactically | Yes |
| Shooter | 2 | Assault rifle | 70 | Maintains medium distance, suppresses windows | No |
| Hitman | 1 (elite) | Accurate handgun | 120 | Fast, intelligent, uses cover, waits for openings, flanks to a second entry | Yes (wave 5) |
| Breacher | 3 | Shotgun + tools | 90 | Destroys doors, barricades, shutters quickly | No |
| Arsonist | 4 | Molotov | 55 | Area denial, forces movement | No |
| Driver | 2 | Pistol | 50 | Operates reinforcement vehicles, drive-by attacks | No |
| Sniper | 3 | Rifle | 60 | Distant sightlines, highly dangerous if ignored | No |
| Cleaner | 4 | Rifle, armor | 150 + armor | Professional, high accuracy, better tactics | No |
| Captain | 4 | SMG | 130 | Command enemy, improves nearby enemy behavior | No |
| Underboss | 5 | Custom | Boss | Named boss encounter | No |
| Contract Killer | 6 | Procedural | Boss | Rare, extremely dangerous, procedurally selected loadout/behavior | No |

## Behavior profiles

Each registry entry carries a `profile` block consumed by the AI:

```
accuracy       0..1 base hit chance at reference range
reactionTime   seconds before first shot after acquiring the player
burst          { count, interval } shots per burst
fireCooldown   seconds between bursts
preferredRange { min, max } meters
aggression     0..1 willingness to push / breach instead of shooting from range
usesCover      boolean
coverSeekOnHit boolean
breachDamage   damage per hit to doors/boards
breachInterval seconds per breach hit
canEnterWindows boolean
speed          m/s walk, sprint multiplier
```

Low-level goons are reckless. Professionals use cover, flank, wait for openings, move between
cover, and coordinate breaches (later).

## Cabin enemies in detail

### Street Goon
The cheap ones Teddy sends first. Track suits, leather jackets, pistol held sideways in the
cheapest possible way. Walks up the driveway in a loose line. Shoots at the first thing he sees.
Kicks doors if the boss says so. Dies with a surprised expression.

### Enforcer
Big. Shotgun. Wants to be inside. Goes straight for the nearest door or window and breaches. The
player learns to keep distance and to hold a chokepoint.

### Mob Soldier
SMG. Fires bursts from behind the sedan or a tree, then moves. Teaches the player to use the
walls and to not stand in windows.

### Hitman
Wave 5 elite. Enters through a different route than the crowd. Uses cover, only exposes himself to
shoot, retreats when hit, and flanks to the back door while the enforcers pressure the front. Has
a name banner ("HIT SQUAD INBOUND") and a distinct silhouette (slim, long coat, hat).

## Death and loot

Enemies drop a cash bundle on death (value from the registry with variance). Bodies remain for
the session (pooled, capped per quality tier), then fade.

## Visual identity

See ART_DIRECTION.md. Enemies are readable at camera distance by silhouette and color: goons in
loud cheap colors, enforcers wide and dark, soldiers in gray tactical civilian wear, hitman slim
in black with a hat.
