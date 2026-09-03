import * as THREE from 'three';
import { el } from '../utils/dom.js';
import { ENEMIES } from '../data/enemies/enemyRegistry.js';

/**
 * Dev-only overlay (F3 / ?dev=1): FPS, frame time, draw calls, triangles, counts, quality,
 * camera; cheats (god, cash, start/skip wave, spawn, kill all); AI + nav visualization.
 */
export class DebugOverlay {
  constructor(ctx, world) {
    this.ctx = ctx;
    this.world = world;
    this.visible = false;
    this.el = el('div', { class: 'debug ui-block', hidden: '' });
    this.stats = el('pre', { class: 'debug-stats' });
    const b = (label, fn) => el('button', { class: 'dbg-btn', text: label, onclick: fn });
    this.el.append(this.stats, el('div', { class: 'dbg-row' }, [
      b('GOD', () => { world.player.health.godMode = !world.player.health.godMode; }),
      b('+$1000', () => world.economy.addCash(1000, 'debug')),
      b('START WAVE', () => world.waves.ready()),
      b('SKIP WAVE', () => world.waves.skip()),
      b('KILL ALL', () => world.enemies.killAll()),
      b('HEAL', () => world.player.health.heal()),
      b('AI VIZ', () => this.toggleAI()),
      b('NAV VIZ', () => this.toggleNav()),
      b('QUALITY-', () => ctx.quality.stepDown()),
      b('RESET SPIKES', () => ctx.loop.resetSpikes()),
      b('REBAKE NAV', () => { const t = performance.now(); world.colliders.invalidateAll(); world.nav.applyDirty(world.colliders); console.info('[EXMOB] full nav bake', (performance.now() - t).toFixed(1), 'ms'); }),
    ]), el('div', { class: 'dbg-row' }, Object.keys(ENEMIES).filter((k) => !ENEMIES[k].future).map((k) => b('SPAWN ' + k.toUpperCase(), () => {
      const p = world.player;
      world.enemies.spawn(k, p.x + (Math.random() - 0.5) * 8, p.z + 9 + Math.random() * 3, { initialState: 'APPROACH' });
    }))));
    ctx.ui.root.appendChild(this.el);
    this.accum = 0;
    this.aiViz = null;
    this.navViz = null;
    if (ctx.dev && new URLSearchParams(location.search).get('debug') === '1') this.toggle();
  }

  toggle() { this.visible = !this.visible; this.el.hidden = !this.visible; }

  toggleAI() {
    if (this.aiViz) { this.world.scene.remove(this.aiViz); this.aiViz = null; return; }
    this.aiViz = new THREE.Group();
    this.world.scene.add(this.aiViz);
  }

  toggleNav() {
    const w = this.world;
    if (this.navViz) { w.scene.remove(this.navViz); this.navViz = null; return; }
    const nav = w.nav;
    const pos = [], col = [];
    for (let cz = 0; cz < nav.h; cz++) for (let cx = 0; cx < nav.w; cx++) {
      const i = nav.idx(cx, cz);
      const wp = nav.toWorld(cx, cz);
      if (!nav.walk[i]) continue;
      pos.push(wp.x, 0.2, wp.z);
      const portal = nav.portalIdx[i] >= 0;
      col.push(portal ? 1 : 0.1, portal ? 0.3 : 0.9, 0.2);
    }
    const g = new THREE.BufferGeometry();
    g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
    g.setAttribute('color', new THREE.Float32BufferAttribute(col, 3));
    this.navViz = new THREE.Points(g, new THREE.PointsMaterial({ size: 0.12, vertexColors: true }));
    w.scene.add(this.navViz);
  }

  update(dt) {
    if (this.aiViz) {
      this.aiViz.clear();
      for (const e of this.world.enemies.list) {
        if (e.dead) continue;
        const pts = [new THREE.Vector3(e.x, 0.3, e.z)];
        for (let i = e.nav.index; i < e.nav.path.length; i++) pts.push(new THREE.Vector3(e.nav.path[i].x, 0.3, e.nav.path[i].z));
        const line = new THREE.Line(new THREE.BufferGeometry().setFromPoints(pts), new THREE.LineBasicMaterial({ color: e.combat.canSee ? 0xff3030 : 0x30c0ff }));
        this.aiViz.add(line);
        const sprite = new THREE.Sprite(new THREE.SpriteMaterial({ color: 0xffffff }));
        sprite.position.set(e.x, 2.3, e.z);
        sprite.scale.set(0.15, 0.15, 1);
        this.aiViz.add(sprite);
      }
    }
    if (!this.visible) return;
    this.accum += dt;
    if (this.accum < 0.25) return;
    this.accum = 0;
    const w = this.world, r = this.ctx.renderer.gl.info, s = this.ctx.loop.stats;
    const p = w.player;
    const states = {};
    for (const e of w.enemies.list) if (!e.dead) states[e.controller.state] = (states[e.controller.state] || 0) + 1;
    this.stats.textContent = [
      `EXMOB DEBUG  v${this.ctx.version}  quality=${this.ctx.quality.label}  input=${this.ctx.input.mode}`,
      `fps ${s.fps}  frame ${s.frameMs.toFixed(1)}ms  sim ${s.simMs.toFixed(1)}ms  render ${s.renderMs.toFixed(1)}ms`,
      `worst frame ${s.worstMs.toFixed(1)}ms  frames over ${this.ctx.loop.longFrameMs}ms: ${s.longFrames}  nav cells last bake ${w.nav.lastBakedCells}`,
      `draw calls ${r.render.calls}  tris ${r.render.triangles}  geoms ${r.memory.geometries}  tex ${r.memory.textures}`,
      `enemies active ${w.enemies.activeCount}/${w.waves.cap}  bodies ${w.enemies.list.length - w.enemies.activeCount}  queue ${w.waves.queue.length}  remaining ${w.waves.remaining}`,
      `wave ${w.waves.index + 1} phase ${w.waves.phase} t=${w.waves.timer.toFixed(1)}  states ${JSON.stringify(states)}`,
      `particles ${w.vfx.particleCount}  decals ${w.vfx.decals.count}  debris ${w.vfx.debrisSys.count}  pickups ${w.pickups.count}`,
      `player (${p.x.toFixed(1)}, ${p.z.toFixed(1)}) inside=${p.movement.inside} hp=${p.health.hp.toFixed(0)} armor=${p.health.armor.toFixed(0)} god=${p.health.godMode}`,
      `camera (${this.ctx.camera.camera.position.x.toFixed(1)}, ${this.ctx.camera.camera.position.y.toFixed(1)}, ${this.ctx.camera.camera.position.z.toFixed(1)}) zoom=${this.ctx.camera.zoom.toFixed(2)}`,
      `cash $${w.economy.cash}  bounty $${w.bounty.bounty}  shots ${w.stats.shotsFired} hits ${w.stats.shotsHit}  kills ${w.stats.kills}`,
      `gpu: ${this.ctx.quality.gpuString}`,
    ].join('\n');
  }

  dispose() { this.el.remove(); if (this.aiViz) this.world.scene.remove(this.aiViz); if (this.navViz) this.world.scene.remove(this.navViz); }
}
