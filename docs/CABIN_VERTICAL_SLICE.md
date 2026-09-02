# EXMOB - CABIN VERTICAL SLICE (MILESTONE 1)

The only production target. Nothing outside this document is required for the milestone.

## What the Cabin must prove

movement, aiming, shooting, enemy AI, navigation, doors, windows, breaching, wave progression,
preparation phase, money, basic upgrades, damage, VFX, audio architecture, HUD, mobile controls,
performance, Blender pipeline, asset loading, cinematic presentation.

## Layout

Original small remote cabin in a forest clearing. Camera looks north; the driveway comes from the
south.

```
            N (rear treeline, back door)
   +-----------------------------+
   |  BEDROOM   |  H  | BATHROOM |
   |  (W,N win) |  A  | (E win)  |
   |            |  L  |          |
   |------door--|  L  |--door----|
   |  LIVING ROOM     | KITCHEN  |
   |  (W win, S win)  | (E win)  |
   |      FRONT DOOR  |          |
   +-------[porch]---------------+
        driveway (S) -> county road
   W treeline                E treeline
```

- Footprint 12 m x 8 m, walls 2.8 m, roof hidden when player is inside.
- Entry points: FRONT DOOR (south, living room), BACK DOOR (north, hallway), windows:
  living W, living S, kitchen E, bedroom W, bedroom N, bathroom E.
- Exterior: porch with light, driveway, Ray's parked car (cover), shed (optional, not built),
  forest on all sides, clearing, rear approach.
- Spawn routes: driveway (vehicles), west trees, east trees, rear trees.

## Intro

Black screen. Wind. Trees. Distant engine. Fade in. Interior at night. Ray at the table. Burner
phone lights up: "ray. its teddy. we know where the porch is. sorry." Headlights through the
trees. A sedan stops. Doors open. Three men step out. Gameplay begins (Wave 1).

## Waves

Five waves as in WAVE_SYSTEM.md. After wave 5: CABIN COMPROMISED, ending screen, slice ends.

## Between waves

30-45 s (data) or READY. Reload, inspect damage, buy ammo, heal, repair door, board window,
buy armor, unlock weapon, swap weapon.

## Economy

Ammo refill, heal, door repair, window boards, body armor, revolver, shotgun, SMG. Values in
ECONOMY.md.

## Player

Health 100, optional armor. Pistol at start. Four slots.

## Success criteria (the moment)

ExMob stands in his cabin. Headlights appear. A car stops. Mobsters get out. The player takes
cover. Gunfight. Windows break. Door gets kicked in. Player retreats. Furniture destroyed. Wave
ends. Silence. Player walks through the wreckage, reloads, spends cash, boards a window. Then
hears **ANOTHER ENGINE APPROACHING**.

If that moment feels excellent: continue. If not: fix the core game. Do not build Chapter 2.

## Explicitly out of scope

Later properties, campaign economy, dozens of weapons, bodyguards, complex vehicles, multiplayer,
cloud saves, arsonist/sniper/breacher/driver archetypes, per-weapon upgrades, achievements UI.
