# EXMOB - MOBILE REQUIREMENTS

EXMOB must eventually run on iPhone, iPad, and modern Android in Safari/Chrome. Mobile is a
first-class target, not a port.

## Touch controls

- Left half of the screen: floating virtual move stick (appears where the thumb lands).
- Right half: floating virtual aim stick. Pushing past 55% of its radius fires; the stick angle
  is the aim direction. Releasing stops firing.
- Buttons (right side, above the aim stick): INTERACT, RELOAD, WEAPON (cycle), DODGE.
- Top: PAUSE. Between waves: SHOP and READY.
- Buttons are at least 56 CSS px, with generous hit slop. Layout scales with the `touchScale`
  setting.
- Multi-touch: sticks and buttons track by pointer id. A finger sliding off a button keeps the
  button owned until release.
- Touch mode is auto-detected on first touch input and can be forced in settings.

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
