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
| Breacher | 1 | Sledgehammer | 110 | Destroys boards and barricades fast, then swings at the player | Yes (wave 3) |
| Sniper | 1 | Bolt-action rifle | 60 | Distant sightlines, telegraphed shot, dangerous if ignored | Yes (wave 4) |
| Arsonist | 1 | Molotov | 60 | Area denial, forces movement | Yes (wave 5) |
| Driver | 2 | Pistol | 50 | Operates reinforcement vehicles, drive-by attacks | No |
| Cleaner | 4 | Rifle, armor | 150 + armor | Professional, high accuracy, better tactics | No |
| Captain | 4 | SMG | 130 | Command enemy, improves nearby enemy behavior | No |
| Underboss | 5 | Custom | Boss | Named boss encounter | No |
| Contract Killer | 6 | Procedural | Boss | Rare, extremely dangerous, procedurally selected loadout/behavior | No |

The breacher, sniper and arsonist were originally tiered to Chapters 3 and 4. They were pulled
forward into Chapter 1 in v0.6.0 because the Cabin needed threats the *property* answers rather
than the gun: something that makes boards and barricades matter, something that punishes standing
in the open, and something that moves the player off a chokepoint. Nothing from Chapters 2-6 was
built to do it.

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

Specialist blocks are optional and each is read by exactly one behaviour state, so an archetype
opts into a behaviour by carrying the data for it:

```
melee   { damage, range, windup, cooldown, knockback, stagger }  -> MELEE
sniper  { setupTime, chargeTime, minRange, holdTime }            -> SNIPE / REPOSITION
throw   { interval, minRange, maxRange, windup, flightTime }     -> THROW
breachSpecialist  never breaks off a breach for a visible player
prefersDefended   boarded and barricaded openings cost *less* to path through
```

A weapon with `ranged: false` (the sledgehammer, the molotov) means EnemyCombat never fires it;
the archetype's own state drives the attack.

Low-level goons are reckless. Professionals use cover, flank, wait for openings, move between
cover, and coordinate breaches (later).

## Cabin enemies in detail

### Street Goon
The cheap ones Teddy sends first. Track suits, leather jackets, pistol held sideways in the
cheapest possible way. Walks up the driveway in a loose line. Shoots at the first thing he sees.
Kicks doors if the boss says so. Dies with a surprised expression.

### Enforcer
Big. Shotgun. Wants to be inside. Goes straight for the nearest door or window and breaches. The
player learns to keep distance and to hold a chokepoint. He is the reason melee exists: when he
reaches the doorway, two swings put him down and knock him off the threshold.

### Mob Soldier
SMG. Fires bursts from behind the sedan or a tree, then moves. Teaches the player to use the
walls and to not stand in windows.

### Breacher
Work coat, hard hat, sledgehammer. He is the answer to a player who thinks a boarded window is a
wall: 62 damage a swing chews a 240 hp barricade in four seconds, and while he is working he does
not care that he can see you. Defended openings cost him *less* to path to, so barricading the
front door reliably brings him to it, which is the point: you know where he will be. He carries no
gun at all, so once he is inside he closes and swings, and two swings is 52 damage.

Counterplay: shoot him while he works (he will not shoot back), or meet him at the threshold,
where a shotgun buttstroke and his 110 hp are an even trade.

### Sniper
Hood, olive coat, bolt-action. Sets up past 13 m, paints a laser on the player for a second and a
half, and takes 34 off you. He cannot open a door or climb through a window, so he is never a
threat to someone who stays out of his sightlines - and he is fragile, so he is never a threat to
someone who walks over and shoots him. He is the enemy that makes the open ground between the
treeline and the porch feel like open ground.

The laser is the fairness contract: every shot is announced before it lands. A sniper who is shut
out for twenty seconds stops being picky about range and closes in, so hiding indefinitely is not
a way to leave a wave unclearable.

### Arsonist
Satchel of bottles, keeps to 9-17 m, throws every 5 seconds. The bottle arcs, and where it lands
burns for nine seconds at 12 damage a second - fatal if you stand in it for the whole pool,
trivial if you move. It hurts his own side too (10 a second), and enemies are steered out of it,
so a badly thrown bottle is his problem as much as yours.

He exists to break stalemates: the doorway you were holding, the corner you were shooting from.

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
