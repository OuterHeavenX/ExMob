import { HUD } from './HUD.js';
import { WaveBanner } from './WaveBanner.js';
import { ShopUI } from './ShopUI.js';
import { PauseMenu } from './PauseMenu.js';
import { GameOverScreen } from './GameOverScreen.js';
import { DebugOverlay } from './DebugOverlay.js';

/** Composes all in-game UI for the Cabin scene. */
export class GameUI {
  constructor(ctx, world) {
    this.ctx = ctx;
    this.world = world;
    this.hud = new HUD(ctx, world);
    this.banner = new WaveBanner(ctx, world);
    this.shop = new ShopUI(ctx, world);
    this.pause = new PauseMenu(ctx, world);
    this.gameOver = new GameOverScreen(ctx, world);
    this.debug = new DebugOverlay(ctx, world);
  }

  show() { this.hud.show(); }
  hide() { this.hud.hide(); this.banner.dispose(); this.shop.dispose(); this.pause.dispose(); this.gameOver.dispose(); this.debug.dispose(); this.hud.dispose(); }
  showGameOver() { this.gameOver.show(); }
  hideGameOver() { this.gameOver.hide(); }
  touchPhase(phase) { this.ctx.input.touch.setPhase(phase); this.hud.setPhase(phase); }
  update(dt) { this.hud.update(dt); this.banner.update(dt); this.debug.update(dt); }
}
