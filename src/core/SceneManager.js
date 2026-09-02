import { EV } from './Events.js';

/**
 * Holds one active scene. Scenes implement enter(ctx), update(dt), render(dt), exit().
 * Transitions dispose the old scene before entering the new one.
 */
export class SceneManager {
  constructor(ctx) {
    this.ctx = ctx;
    this.current = null;
    this._switching = false;
  }

  async switchTo(scene) {
    if (this._switching) return;
    this._switching = true;
    try {
      if (this.current) {
        this.ctx.events.emit(EV.SCENE_EXIT, { scene: this.current.name });
        await this.current.exit();
      }
      this.current = scene;
      await scene.enter(this.ctx);
      this.ctx.events.emit(EV.SCENE_ENTER, { scene: scene.name });
    } finally {
      this._switching = false;
    }
  }

  update(dt) { if (this.current && this.current.ready) this.current.update(dt); }
  render(dt) { if (this.current && this.current.ready) this.current.render(dt); }
}
