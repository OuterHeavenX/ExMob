/**
 * Aim assist presets. See docs/MOBILE_REQUIREMENTS.md (Aiming).
 *
 * A touch player has no cursor: the right stick gives a direction and nothing else. Without help
 * they are swiping toward an enemy and hoping. Assist rotates the raw stick direction toward a
 * valid target inside a cone, so the thumb chooses the target and the game handles the last few
 * degrees. It never aims at something outside the cone, so deliberately shooting elsewhere still
 * works.
 *
 * coneDeg          half-angle around the raw aim in which a target may be considered
 * snapDeg          inside this half-angle the aim locks exactly onto the target
 * pull             0..1 fraction of the remaining angle closed each frame beyond snapDeg
 * maxRange         meters; targets further away are ignored
 * autoTargetRange  meters; with no aim input at all, face the nearest threat within this radius
 *                  (0 disables). Touch only: it keeps Ray oriented while the player is moving
 *                  with one thumb, which also makes melee usable without aiming.
 */
export const AIM_ASSIST = Object.freeze({
  off: Object.freeze({ id: 'off', label: 'OFF', coneDeg: 0, snapDeg: 0, pull: 0, maxRange: 0, autoTargetRange: 0 }),
  light: Object.freeze({ id: 'light', label: 'LIGHT', coneDeg: 14, snapDeg: 4, pull: 0.6, maxRange: 28, autoTargetRange: 0 }),
  strong: Object.freeze({ id: 'strong', label: 'STRONG', coneDeg: 26, snapDeg: 10, pull: 0.95, maxRange: 34, autoTargetRange: 14 }),
});

/** What `auto` resolves to per input mode. Desktop has a mouse and needs no help. */
export const AIM_ASSIST_DEFAULTS = Object.freeze({ touch: 'strong', desktop: 'off' });

/**
 * Touch firing. The aim stick fires once it is pushed past `fireThreshold` of its radius.
 * Kept low so a small, precise deflection still shoots: aiming and firing are the same thumb,
 * and requiring a big push to fire is exactly what makes touch aiming imprecise.
 */
export const TOUCH_AIM = Object.freeze({
  fireThreshold: 0.35,
  aimDeadZone: 0.16,
  /** In 'aimed' fire mode the shot only goes off when assist has a target in the cone. */
  fireModes: Object.freeze(['hold', 'aimed']),
});

export function resolveAssist(setting, inputMode) {
  const id = setting === 'auto' || !setting ? AIM_ASSIST_DEFAULTS[inputMode === 'touch' ? 'touch' : 'desktop'] : setting;
  return AIM_ASSIST[id] || AIM_ASSIST.off;
}
