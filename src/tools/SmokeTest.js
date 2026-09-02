import { EV } from '../core/Events.js';

/**
 * In-browser smoke test (docs/TECHNICAL_ARCHITECTURE.md Testing). Enabled with ?dev=1&smoke=1.
 * Drives the live game through the critical path and prints PASS/FAIL to the console and an
 * overlay. Results also on window.__EXMOB_SMOKE.
 */
export class SmokeTest {
  constructor(ctx, world) {
    this.ctx = ctx;
    this.world = world;
    this.results = [];
    window.__EXMOB_SMOKE = { done: false, results: this.results };
  }

  log(name, ok, detail = '') {
    this.results.push({ name, ok, detail });
    console[ok ? 'info' : 'error'](`[SMOKE] ${ok ? 'PASS' : 'FAIL'} ${name} ${detail}`);
  }

  wait(s) { return new Promise((r) => setTimeout(r, s * 1000)); }

  waitFor(pred, timeout = 15) {
    return new Promise((resolve) => {
      const t0 = performance.now();
      const tick = () => { if (pred()) return resolve(true); if (performance.now() - t0 > timeout * 1000) return resolve(false); setTimeout(tick, 100); };
      tick();
    });
  }

  async run() {
    const w = this.world, ctx = this.ctx, ev = ctx.events;
    await this.wait(0.5);
    this.log('cabin scene loaded', !!w.scene && w.scene.children.length > 10);
    this.log('nav grid baked', w.nav.walk.some((v) => v === 1));
    // skip intro
    w.cinematics.abort();
    if (w.waves.phase === 'IDLE') w.waves.start(0);
    await this.wait(0.2);
    // movement: drive the keyboard source (the unified state is rebuilt from it every tick)
    const p = w.player;
    const kbm = ctx.input.kbm;
    ctx.input.setMode('desktop');
    const x0 = p.x;
    kbm.keys.add('KeyD');
    await this.waitFor(() => Math.abs(p.x - x0) > 0.3, 8);
    kbm.keys.delete('KeyD');
    this.log('player moves', Math.abs(p.x - x0) > 0.3, `dx=${(p.x - x0).toFixed(2)}`);
    // shooting: mouse held for a couple of ticks
    const shots0 = w.stats.shotsFired;
    kbm.mouse.x = ctx.renderer.width / 2; kbm.mouse.y = ctx.renderer.height * 0.8;
    kbm.mouseDown = true;
    await this.waitFor(() => w.stats.shotsFired > shots0, 5);
    kbm.mouseDown = false;
    this.log('player shoots', w.stats.shotsFired > shots0);
    // wave 1 begins (warning -> active), enemies spawn
    if (w.waves.phase === 'PREP') w.waves.ready();
    const spawned = await this.waitFor(() => w.enemies.list.length > 0, 25);
    this.log('enemies spawn (vehicle arrival)', spawned, `phase=${w.waves.phase} count=${w.enemies.list.length}`);
    // enemies can die
    p.health.godMode = true;
    await this.wait(1.0);
    const e = w.enemies.alive()[0];
    if (e) { e.takeDamage(9999, 0, 1, 1, { stagger: 0.2 }, { isPlayer: true }); }
    this.log('enemy dies on damage', !!e && e.dead);
    // wave completes: kill all remaining as they spawn
    const killer = ev.on(EV.ENEMY_SPAWN, (x) => setTimeout(() => x.enemy.takeDamage(9999, 0, 1, 1, { stagger: 0.2 }, { isPlayer: true }), 300));
    w.enemies.killAll();
    const cleared = await this.waitFor(() => w.waves.phase === 'CLEARED' || w.waves.phase === 'PREP' && w.waves.index === 1, 40);
    this.log('wave 1 completes', cleared, `phase=${w.waves.phase} index=${w.waves.index}`);
    const next = await this.waitFor(() => w.waves.index === 1 && w.waves.phase === 'PREP', 10);
    this.log('next wave starts (prep)', next);
    killer();
    // cash & bounty
    this.log('cash awarded', w.economy.cash > 350, `cash=${w.economy.cash}`);
    // player can die
    p.health.godMode = false;
    p.health.damage(9999, {});
    this.log('player can die', p.health.dead);
    await this.wait(2.0);
    const goEl = document.querySelector('.gameover');
    this.log('game over screen shown', goEl && !goEl.hidden);
    // retry
    ctx.scenes.current.retryWave();
    await this.wait(0.3);
    this.log('retry works', !p.health.dead && w.waves.phase === 'PREP' && w.waves.index === 1, `phase=${w.waves.phase} idx=${w.waves.index}`);
    // save
    let saveOk = true;
    try { await ctx.save.persist(); } catch (err) { saveOk = false; }
    this.log('save does not crash', saveOk);
    const pass = this.results.filter((r) => r.ok).length;
    console.info(`[SMOKE] ${pass}/${this.results.length} passed`);
    window.__EXMOB_SMOKE.done = true;
    const box = document.createElement('pre');
    box.className = 'smoke-results';
    box.textContent = this.results.map((r) => `${r.ok ? 'PASS' : 'FAIL'}  ${r.name} ${r.detail}`).join('\n') + `\n${pass}/${this.results.length} passed`;
    document.body.appendChild(box);
    return this.results;
  }
}
