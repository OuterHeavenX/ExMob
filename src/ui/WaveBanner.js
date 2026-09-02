import { el } from '../utils/dom.js';
import { EV } from '../core/Events.js';
import { formatCash, formatBounty } from '../data/economy/economyRegistry.js';

/** Dramatic but brief wave banners: WARNING, WAVE N - TITLE, WAVE CLEARED, HIT SQUAD. */
export class WaveBanner {
  constructor(ctx, world) {
    this.ctx = ctx;
    this.el = el('div', { class: 'banner' }, [el('div', { class: 'eyebrow' }), el('div', { class: 'big' }), el('div', { class: 'sub' })]);
    ctx.ui.root.appendChild(this.el);
    this.t = 0;
    this._offs = [
      ctx.events.on(EV.WAVE_WARNING, (e) => this.show('WARNING', e.index === 0 ? 'THEY FOUND YOU' : 'ENGINE APPROACHING', e.wave.elite ? 'SOMETHING PROFESSIONAL THIS TIME' : '', 3.2, true)),
      ctx.events.on(EV.WAVE_START, (e) => this.show(e.wave.title, e.wave.banner, e.wave.elite ? 'ELITE CONTRACT KILLER ON SITE' : '', 3.0, false)),
      ctx.events.on(EV.WAVE_CLEARED, (e) => { if (!e.skipped) this.show('WAVE CLEARED', `+${formatCash(e.payout)}`, e.bountyAfter !== world.bounty.bounty ? `BOUNTY RAISED TO ${formatBounty(e.bountyAfter)}` : 'SILENCE', 3.4, false); }),
      ctx.events.on(EV.PLAYER_DEATH, () => this.show('EXMOB', 'CONTRACT FULFILLED', '', 4, true)),
      ctx.events.on(EV.BOUNTY_CHANGED, (e) => { if (e.announce) ctx.audio.play('wave_banner'); }),
    ];
  }

  show(eyebrow, big, sub, seconds, danger) {
    this.el.children[0].textContent = eyebrow;
    this.el.children[1].textContent = big;
    this.el.children[2].textContent = sub;
    this.el.classList.toggle('danger', danger);
    this.el.classList.remove('on'); void this.el.offsetWidth; this.el.classList.add('on');
    this.t = seconds;
    this.ctx.audio.play('wave_banner');
    this.ctx.camera.shake(0.08);
  }

  update(dt) { if (this.t > 0) { this.t -= dt; if (this.t <= 0) this.el.classList.remove('on'); } }
  dispose() { for (const off of this._offs) off(); this.el.remove(); }
}
