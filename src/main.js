import { Game } from './core/Game.js';

/** Boot. Everything else is owned by Game. */
const game = new Game(document.getElementById('game'), document.getElementById('ui'));
window.EXMOB = game; // debugging / smoke test handle
game.start().catch((err) => {
  console.error('[EXMOB] fatal boot error', err);
  const sub = document.getElementById('boot-sub');
  if (sub) sub.textContent = 'BOOT FAILED: ' + (err?.message || err);
});
