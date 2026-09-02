/**
 * Character registry. The protagonist and named story characters. See docs/STORY_BIBLE.md.
 */
export const CHARACTERS = Object.freeze({
  exmob: Object.freeze({
    id: 'exmob', name: 'RAY MORETTI', alias: 'EXMOB', age: 54, model: 'CHR_ExMob',
    height: 1.85, radius: 0.36, speed: 4.2, precisionSpeedMul: 0.65,
    dodge: { distance: 3.2, duration: 0.42, cooldown: 1.1, invulnerable: 0.3 },
    health: 100,
    look: { body: 0x23262b, accent: 0xb9ad93, skin: 0xc9a78a, hat: null, coatLength: 0.9, width: 1.12 },
    bio: 'Twenty-nine years inside. Four months out. Counts everything.',
  }),
  teddy: Object.freeze({ id: 'teddy', name: 'TEDDY "TWO COATS" MARCHESE', role: 'captain', voiceOnly: true }),
  carmine: Object.freeze({ id: 'carmine', name: 'CARMINE VESCARI', role: 'boss', voiceOnly: true }),
  sal: Object.freeze({ id: 'sal', name: 'SAL BRANCUSI', role: 'underboss', voiceOnly: true }),
  danny: Object.freeze({ id: 'danny', name: 'DANNY KESSLER', role: 'ally', voiceOnly: true }),
});
