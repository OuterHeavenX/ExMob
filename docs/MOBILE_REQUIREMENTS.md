# EXMOB - MOBILE REQUIREMENTS

EXMOB must eventually run on iPhone, iPad, and modern Android in Safari/Chrome. Mobile is a
first-class target, not a port.

## Touch controls

- Left half of the screen: floating virtual move stick (appears where the thumb lands).
- Right half: floating virtual aim stick. Pushing past 55% of its radius fires; the stick angle
  is the aim direction. Releasing stops firing.
- Buttons (right side, above the aim stick, two rows of three): MELEE, INTERACT, RELOAD,
  WEAPON (cycle), DODGE. MELEE lights up while an enemy is inside its reach, which is how the
  action is taught on touch (there is no key prompt to read). PAUSE sits in the top corner clear
  of the cash/bounty readout.
- Top: PAUSE. Between waves: SHOP and READY.
- Buttons are at least 56 CSS px, with generous hit slop. Layout scales with the `touchScale`
  setting.
- Multi-touch: sticks and buttons track by pointer id. A finger sliding off a button keeps the
  button owned until release.
- Touch mode is auto-detected on first touch input and can be forced in settings.

## Aiming

A mouse gives a world-space point; a thumb gives a direction and nothing else, with no cursor to
look at. Touch aiming therefore needs help that desktop does not, and it is data-driven in
`src/data/aim.js`:

- **Aim line** (`src/vfx/AimIndicator.js`): a ground line from Ray along the aim direction,
  trimmed where it meets a wall, plus a pulsing ring on the acquired target. Without it the
  player is swiping blind. Default: on for touch, off for mouse (`aimLine` setting).
- **Aim assist** (`src/combat/AimAssist.js`): rotates the raw stick direction toward the best
  target inside a cone. Presets:

  | Preset | Cone | Snap | Pull | Range | Auto-face |
  | --- | --- | --- | --- | --- | --- |
  | OFF | - | - | - | - | - |
  | LIGHT | 14 deg | 4 deg | 0.6 | 28 m | no |
  | STRONG | 26 deg | 10 deg | 0.95 | 34 m | 14 m |

  Inside `snap` the aim locks exactly on target; between `snap` and `cone` it closes `pull` of
  the remaining angle; outside `cone` nothing changes, so deliberately shooting elsewhere still
  works. Targets behind cover are never acquired. Default: STRONG on touch, OFF on mouse.
- **Auto-facing**: with no thumb on the aim stick, Ray turns to the nearest visible threat
  within `autoTargetRange`. Keeps him oriented while the player moves with one thumb and makes
  melee usable without aiming.
- **Fire threshold**: the aim stick fires at 35% deflection, not 55%. Aiming and firing are the
  same thumb, and requiring a hard push to fire is precisely what ruins precision. `TOUCH FIRING`
  can also be set to FIRE ONLY WHEN AIMED, which holds fire until assist has acquired someone
  (ammo costs cash, so spraying at walls is a real loss).

Measured effect (in-browser, deliberately sloppy swipe 20 degrees off a goon 6 m away, 10 shots):
0/10 hits with assist off, 10/10 with STRONG, average aim error 20 degrees down to 1 degree.

## Touch layering (do not regress this)

`#ui` (z-index 10) holds every DOM panel and is `pointer-events: none`, with only `.ui-block`
panels taking events. The touch layer must stay **below** it (z-index 8). If the touch layer is
placed above `#ui` it covers the whole screen and swallows every tap meant for a panel: the
between-wave SHOP and READY, shop items, the pause menu and the game over buttons all stop
working, and tapping them starts a movement stick instead. This was shipped broken in v0.4.0 and
fixed in v0.4.1. Because empty space is `pointer-events: none` all the way down, taps that miss a
panel still reach the sticks.

Between-wave actions live on the prep panel, not on floating touch buttons, so there is one
tappable path rather than two.

## Safe areas

The HUD and controls respect `env(safe-area-inset-*)`; `viewport-fit=cover` is set. Nothing
critical is placed within 24 px of the screen edge on notched devices.

## Resolution and render scale

Render scale (device pixel ratio cap) is a quality setting: LOW 0.75, MEDIUM 1.0, HIGH 1.5,
ULTRA min(2.0, DPR). AUTO picks LOW/MEDIUM on phones. The canvas fills the viewport; the game
is landscape-first and shows a rotate prompt in portrait.

## Performance

Targets (to be measured; see STATUS.md for what has actually been measured):
- 60 fps on recent iPhone/iPad in MEDIUM.
- 30 fps floor on mid-range Android in LOW.
- Active enemy cap 10 on mobile, shadows from the moon only, no muzzle shadow lights, half
  particle density, 16 decals, 3 s debris lifetime.

## Memory

- Keep total GPU texture memory under 128 MB on mobile (PERFORMANCE_BUDGET.md).
- Dispose scenes on exit. Pools are sized once.
- Avoid audio decoding spikes: SFX are synthesized or small.

## Audio on mobile

Web Audio requires a user gesture; the title screen's first tap unlocks the context. iOS silent
switch behavior is respected (no workaround).

## Testing status

See STATUS.md. Touch controls in v0.1.0 were exercised in a desktop browser with a mobile
viewport emulation and touch events; no physical device testing has been performed yet.
