import { el } from '../utils/dom.js';

/** EXMOB - CONTRACT FULFILLED. RETRY WAVE / RESTART CHAPTER / MAIN MENU. */
export class GameOverScreen {
  constructor(ctx, world) {
    this.ctx = ctx;
    this.world = world;
    this.el = el('div', { class: 'panel gameover ui-block', hidden: '' });
    ctx.ui.root.appendChild(this.el);
  }

  show() {
    const w = this.world, s = w.stats;
    this.el.innerHTML = '';
    this.el.append(
      el('div', { class: 'eyebrow', text: 'EXMOB' }),
      el('div', { class: 'big red', text: 'CONTRACT FULFILLED' }),
      el('div', { class: 'body', text: `Wave ${w.waves.index + 1}. ${s.kills} of them went first.` }),
      el('div', { class: 'row' }, [
        el('button', { class: 'btn primary', text: 'RETRY WAVE', onclick: () => this.ctx.scenes.current.retryWave() }),
        el('button', { class: 'btn ghost', text: 'RESTART CHAPTER', onclick: () => this.ctx.restartChapter() }),
        el('button', { class: 'btn ghost', text: 'MAIN MENU', onclick: () => this.ctx.goMenu() }),
      ]),
    );
    this.el.hidden = false;
  }

  hide() { this.el.hidden = true; }
  dispose() { this.el.remove(); }
}
