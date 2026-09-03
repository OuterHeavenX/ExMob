import { el } from '../utils/dom.js';
import { VERSION } from '../core/Config.js';
import { SettingsMenu } from './SettingsMenu.js';

/** Title: EXMOB, tagline, CONTINUE / NEW GAME / SETTINGS / CREDITS (+ DEBUG in dev), version. */
export class TitleScreen {
  constructor(ctx) {
    this.ctx = ctx;
    this.el = el('div', { class: 'title-screen ui-block', hidden: '' });
    this.settings = new SettingsMenu(ctx);
    this.credits = el('div', { class: 'panel credits ui-block', hidden: '' });
    ctx.ui.root.append(this.el, this.settings.el, this.credits);
    this._build();
  }

  _build() {
    const ctx = this.ctx;
    const hasSave = ctx.save.hasSave();
    const btn = (label, onclick, cls = '') => el('button', { class: 'btn menu-btn ' + cls, text: label, onclick: () => { ctx.audio.unlock(); ctx.audio.play('ui_click'); onclick(); } });
    const menu = el('div', { class: 'menu' }, [
      btn('CONTINUE', () => ctx.continueGame(), hasSave ? '' : 'disabled'),
      btn('NEW GAME', () => this._newGame()),
      btn('SETTINGS', () => this.settings.open()),
      btn('CREDITS', () => this._credits()),
      ctx.dev ? btn('DEBUG', () => this._debug(), 'debug') : null,
    ]);
    this.el.append(
      el('div', { class: 'title-block' }, [
        el('div', { class: 'title-eyebrow', text: 'A CRIME-ACTION SURVIVAL GAME' }),
        el('div', { class: 'title-logo', text: 'EXMOB' }),
        el('div', { class: 'title-tag', html: 'YOU CAN LEAVE THE FAMILY.<br>THE FAMILY DOESN\'T LEAVE YOU.' }),
      ]),
      menu,
      el('div', { class: 'title-version', text: `v${VERSION}` }),
      el('div', { class: 'title-hint', text: ctx.input.mode === 'touch' ? 'TOUCH: LEFT STICK MOVE, RIGHT STICK AIM + FIRE' : 'WASD MOVE  ·  MOUSE AIM  ·  LMB FIRE  ·  F MELEE  ·  E INTERACT  ·  R RELOAD  ·  SPACE DODGE' }),
    );
  }

  async _newGame() {
    if (this.ctx.save.hasSave() && !(await this.ctx.ui.confirm('Start a new game? Your current save will be replaced.'))) return;
    this.ctx.newGame();
  }

  _credits() {
    this.credits.innerHTML = '';
    this.credits.append(
      el('div', { class: 'big', text: 'EXMOB' }),
      el('div', { class: 'body', html: 'Design, code, and art direction: OuterHeavenX with Claude.<br>Built with Three.js and Vite.<br>All characters, organizations, and events are fictional.<br><br>Chapter 1 - The Cabin. Vertical slice v' + VERSION + '.' }),
      el('button', { class: 'btn', text: 'BACK', onclick: () => { this.credits.hidden = true; } }),
    );
    this.credits.hidden = false;
  }

  async _debug() {
    const which = await this.ctx.ui.prompt('DEBUG: start at wave (1-5) with $5,000', '1');
    const n = parseInt(which, 10);
    if (!Number.isFinite(n)) return;
    this.ctx.save.newGame().then(() => {
      this.ctx.save.data.campaign.waveIndex = Math.max(0, Math.min(4, n - 1));
      this.ctx.save.data.player.cash = 5000;
      return this.ctx.save.persist();
    }).then(() => this.ctx.continueGame());
  }

  show() { this.el.hidden = false; }
  hide() { this.el.hidden = true; this.settings.close(); this.credits.hidden = true; }
}
