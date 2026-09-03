import { EventBus } from './EventBus.js';
import { GameLoop } from './GameLoop.js';
import { SceneManager } from './SceneManager.js';
import { CONFIG, VERSION } from './Config.js';
import { EV } from './Events.js';
import { Renderer } from '../rendering/Renderer.js';
import { QualityManager } from '../rendering/QualityManager.js';
import { CameraManager } from '../rendering/CameraManager.js';
import { InputManager } from '../input/InputManager.js';
import { AudioManager } from '../audio/AudioManager.js';
import { SaveManager } from '../save/SaveManager.js';
import { AssetLoader } from '../world/AssetLoader.js';
import { UIRoot } from '../ui/UIRoot.js';
import { BootScene } from '../scenes/BootScene.js';
import { MenuScene } from '../scenes/MenuScene.js';
import { CabinScene } from '../scenes/CabinScene.js';
import { validateRegistries } from '../data/index.js';
import { DIFFICULTY } from '../data/difficulty/difficultyRegistry.js';

/**
 * Composition root. Builds the shared context (`ctx`) every scene and system receives, then
 * runs the loop. Scenes: Boot -> Menu -> Cabin.
 */
export class Game {
  constructor(canvas, uiRoot) {
    this.canvas = canvas;
    this.version = VERSION;
    this.events = new EventBus();
    this.save = new SaveManager(this.events);
    this.quality = new QualityManager('auto');
    this.assets = new AssetLoader();
    this.ui = new UIRoot(uiRoot, this);
    this.scenes = new SceneManager(this);
    this.loop = new GameLoop({ update: (dt) => this._update(dt), render: (dt) => this._render(dt) });
    this.dev = CONFIG.devMode;
    this.renderer = null;
    this.camera = null;
    this.input = null;
    this.audio = null;
  }

  get settings() { return this.save.settings; }
  get difficulty() { return DIFFICULTY[this.settings.difficulty] || DIFFICULTY.normal; }

  async start() {
    if (this.dev) {
      const errors = validateRegistries();
      if (errors.length) console.error('[EXMOB] registry errors', errors);
      else console.info('[EXMOB] registries valid');
    }
    if (!Renderer.isSupported()) {
      this.ui.bootMessage('WebGL2 is not available in this browser. EXMOB needs a WebGL2-capable browser (Chrome, Edge, Firefox, Safari 15+).');
      throw new Error('WebGL2 unsupported');
    }
    await this.save.init();
    this.quality.set(this.settings.quality || 'auto');
    this.renderer = new Renderer(this.canvas, this.quality);
    this.quality.refineAuto(this.renderer);
    this.camera = new CameraManager();
    this.camera.setAspect(this.renderer.width, this.renderer.height);
    this.renderer.onResize = (w, h) => this.camera.setAspect(w, h);
    this.input = new InputManager(this.events, { forceTouch: CONFIG.forceTouch || this.settings.inputMode === 'touch', device: this.quality.device });
    if (this.settings.inputMode === 'desktop') this.input.setMode('desktop');
    this.input.touch.setScale(this.settings.touchScale || 1);
    this.input.touch.setFireMode(this.settings.touchFireMode || 'hold');
    this.audio = new AudioManager(this.settings);
    this.camera.shakeScale = this.settings.screenShake ?? 1;
    this.events.on(EV.SETTINGS_CHANGED, (s) => {
      this.audio.applySettings(s);
      this.camera.shakeScale = s.screenShake ?? 1;
      this.input.touch.setScale(s.touchScale || 1);
      this.input.touch.setFireMode(s.touchFireMode || 'hold');
      if (s.inputMode === 'touch') this.input.setMode('touch');
      else if (s.inputMode === 'desktop') this.input.setMode('desktop');
    });
    await this.assets.init();
    this.loop.start();
    await this.scenes.switchTo(new BootScene(this));
    await this.scenes.switchTo(new MenuScene(this));
    console.info(`[EXMOB] v${VERSION} ready. dev=${this.dev} quality=${this.quality.label} input=${this.input.mode}`);
  }

  // navigation helpers used by UI
  async goMenu() { await this.scenes.switchTo(new MenuScene(this)); }
  async newGame() { await this.save.newGame(); await this.scenes.switchTo(new CabinScene(this, { fresh: true })); }
  async continueGame() { if (!this.save.hasSave()) return this.newGame(); await this.scenes.switchTo(new CabinScene(this, { fresh: false })); }
  async restartChapter() { await this.save.newGame(); await this.scenes.switchTo(new CabinScene(this, { fresh: true, skipIntro: true })); }

  _update(dt) {
    this.input.update();
    this.scenes.update(dt);
    this.audio.update(dt);
    this.input.endFrame();
  }

  _render(dt) {
    this.scenes.render(dt);
    this.ui.update(dt);
  }
}
