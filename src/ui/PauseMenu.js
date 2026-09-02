import { el } from '../utils/dom.js';
import { EV } from '../core/Events.js';
import { SettingsMenu } from './SettingsMenu.js';
import { VERSION } from '../core/Config.js';

/** ESC pause: RESUME / SETTINGS / QUIT TO MENU. */
export class PauseMenu {
  constructor(ctx, world) {
    this.ctx = ctx;
    this.world = world;
    this.settings = new SettingsMenu(ctx);
    this.el = el('div', { class: 'panel pause ui-block', hidden: '' }, [
      el('div', { class: 'big', text: 'PAUSED' }),
      el('button', { class: 'btn', text: 'RESUME', onclick: () => this.resume() }),
      el('button', { class: 'btn ghost', text: 'SETTINGS', onclick: () => this.settings.open() }),
      el('button', { class: 'btn ghost', text: 'QUIT TO MENU', onclick: () => ctx.goMenu() }),
      el('div', { class: 'body dim', text: `EXMOB v${VERSION}` }),
    ]);
    ctx.ui.root.append(this.el, this.settings.el);
    this._offs = [
      ctx.events.on(EV.PAUSE, () => { this.el.hidden = false; }),
      ctx.events.on(EV.RESUME, () => { this.el.hidden = true; this.settings.close(); }),
    ];
  }

  resume() { this.ctx.scenes.current.setPaused(false); }
  dispose() { for (const off of this._offs) off(); this.el.remove(); this.settings.el.remove(); }
}
