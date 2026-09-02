import { CONFIG } from './Config.js';

/**
 * Fixed-timestep simulation with variable-rate rendering. Clamps dt so a background tab
 * does not explode the simulation. Tracks frame statistics for the debug overlay.
 */
export class GameLoop {
  constructor({ update, render }) {
    this._update = update;
    this._render = render;
    this._running = false;
    this._last = 0;
    this._acc = 0;
    this.paused = false;
    this.timeScale = 1;
    this.stats = { fps: 0, frameMs: 0, simMs: 0, renderMs: 0, frames: 0 };
    this._fpsAcc = 0;
    this._fpsFrames = 0;
    this._raf = 0;
    this._tick = this._tick.bind(this);
  }

  start() {
    if (this._running) return;
    this._running = true;
    this._last = performance.now();
    this._lastTickAt = this._last;
    this._raf = requestAnimationFrame(this._tick);
    // Watchdog: some embedded browsers / WebViews starve requestAnimationFrame. If no frame has
    // run for a while, step the loop from a timer so the simulation and UI keep advancing.
    this._watchdog = setInterval(() => {
      if (!this._running) return;
      const now = performance.now();
      if (now - this._lastTickAt > 45) {
        cancelAnimationFrame(this._raf);
        this._tick(now);
      }
    }, 16);
  }

  stop() {
    this._running = false;
    cancelAnimationFrame(this._raf);
    clearInterval(this._watchdog);
  }

  _tick(now) {
    if (!this._running) return;
    this._raf = requestAnimationFrame(this._tick);
    this._lastTickAt = now;
    const frameStart = performance.now();
    let dt = (now - this._last) / 1000;
    this._last = now;
    if (dt > CONFIG.maxFrameDt) dt = CONFIG.maxFrameDt;
    if (dt < 0) dt = 0;

    const simStart = performance.now();
    if (!this.paused) {
      this._acc += dt * this.timeScale;
      let steps = 0;
      while (this._acc >= CONFIG.fixedDt && steps < CONFIG.maxSubsteps) {
        this._update(CONFIG.fixedDt);
        this._acc -= CONFIG.fixedDt;
        steps++;
      }
      if (steps === CONFIG.maxSubsteps) this._acc = 0; // drop time rather than spiral
    } else {
      this._update(0); // lets menus/UI animate while paused
    }
    const simEnd = performance.now();
    this._render(dt);
    const end = performance.now();

    this.stats.simMs = simEnd - simStart;
    this.stats.renderMs = end - simEnd;
    this.stats.frameMs = end - frameStart;
    this.stats.frames++;
    this._fpsAcc += dt;
    this._fpsFrames++;
    if (this._fpsAcc >= 0.5) {
      this.stats.fps = Math.round(this._fpsFrames / this._fpsAcc);
      this._fpsAcc = 0;
      this._fpsFrames = 0;
    }
  }
}
