import { el } from '../utils/dom.js';
import { EV } from '../core/Events.js';
import { formatCash, formatBounty } from '../data/economy/economyRegistry.js';

/**
 * Minimal gameplay HUD (docs/GAME_DESIGN.md HUD): health/armor top-left, cash/bounty top-right,
 * weapon/ammo bottom, crosshair center, interact prompt, prep countdown + READY/SHOP, low-health
 * vignette, hurt flash, toasts.
 */
export class HUD {
  constructor(ctx, world) {
    this.ctx = ctx;
    this.world = world;
    const r = ctx.ui.root;
    this.el = el('div', { class: 'hud', hidden: '' });
    this.vignette = el('div', { class: 'vignette' });
    this.hurt = el('div', { class: 'hurt-flash' });
    this.health = el('div', { class: 'bar health' }, [el('div', { class: 'fill' }), el('span', { class: 'val' })]);
    this.armor = el('div', { class: 'bar armor' }, [el('div', { class: 'fill' }), el('span', { class: 'val' })]);
    this.cash = el('div', { class: 'stat cash' }, [el('span', { class: 'k', text: 'CASH' }), el('span', { class: 'v' })]);
    this.bounty = el('div', { class: 'stat bounty' }, [el('span', { class: 'k', text: 'BOUNTY' }), el('span', { class: 'v' })]);
    this.waveInfo = el('div', { class: 'stat wave' }, [el('span', { class: 'k', text: 'WAVE' }), el('span', { class: 'v' })]);
    this.weapon = el('div', { class: 'weapon' }, [el('div', { class: 'name' }), el('div', { class: 'ammo' }, [el('span', { class: 'mag' }), el('span', { class: 'sep', text: ' / ' }), el('span', { class: 'res' })]), el('div', { class: 'reload' }, [el('div', { class: 'fill' })])]);
    this.slots = el('div', { class: 'slots' });
    this.crosshair = el('div', { class: 'crosshair' });
    this.prompt = el('div', { class: 'prompt' }, [el('span', { class: 'txt' }), el('div', { class: 'hold' }, [el('div', { class: 'fill' })])]);
    this.prep = el('div', { class: 'prep ui-block', hidden: '' }, [
      el('div', { class: 'prep-title', text: 'PREPARE' }),
      el('div', { class: 'prep-time' }),
      el('div', { class: 'row' }, [
        el('button', { class: 'btn small', text: 'SHOP', onclick: () => world.shop.setOpen(true) }),
        el('button', { class: 'btn small primary', text: 'READY', onclick: () => world.waves.ready() }),
      ]),
    ]);
    this.meleeHint = el('div', { class: 'melee-hint' }, [el('span', { class: 'key', text: 'F' }), el('span', { class: 'lbl', text: 'MELEE' })]);
    this.toasts = el('div', { class: 'toasts' });
    this.el.append(this.vignette, this.hurt, el('div', { class: 'tl' }, [this.health, this.armor]), el('div', { class: 'tr' }, [this.cash, this.bounty, this.waveInfo]),
      el('div', { class: 'bottom' }, [this.weapon, this.slots]), this.crosshair, this.prompt, this.meleeHint, this.prep, this.toasts);
    r.appendChild(this.el);
    this._offs = [
      ctx.events.on(EV.PLAYER_HEALTH, (e) => this.setHealth(e.hp, e.max, e.armor)),
      ctx.events.on(EV.PLAYER_DAMAGE, () => { this.hurt.classList.remove('on'); void this.hurt.offsetWidth; this.hurt.classList.add('on'); }),
      ctx.events.on(EV.CASH_CHANGED, (e) => { this.cash.lastChild.textContent = formatCash(e.cash); if (e.delta > 0) this._pulse(this.cash); }),
      ctx.events.on(EV.BOUNTY_CHANGED, (e) => { this.bounty.lastChild.textContent = formatBounty(e.bounty); if (e.announce) this._pulse(this.bounty); }),
      ctx.events.on(EV.PLAYER_AMMO, (e) => this.setAmmo(e)),
      ctx.events.on(EV.PLAYER_WEAPON, (e) => this.setWeapon(e)),
      ctx.events.on(EV.INTERACT_PROMPT, (e) => this.setPrompt(e)),
      ctx.events.on(EV.WAVE_PREP, (e) => { this.prep.hidden = false; this.waveInfo.lastChild.textContent = `${e.index + 1} / ${world.waves.waves.length}`; }),
      ctx.events.on(EV.WAVE_PREP_TICK, (e) => { this.prep.querySelector('.prep-time').textContent = Math.ceil(e.time) + 's'; }),
      ctx.events.on(EV.WAVE_WARNING, () => { this.prep.hidden = true; }),
      ctx.events.on(EV.WAVE_START, (e) => { this.waveInfo.lastChild.textContent = `${e.index + 1} / ${world.waves.waves.length}`; }),
      ctx.events.on(EV.TOAST, (e) => this.toast(e.text)),
      ctx.events.on(EV.CINEMATIC_START, () => this.el.classList.add('cinematic')),
      ctx.events.on(EV.CINEMATIC_END, () => this.el.classList.remove('cinematic')),
      ctx.events.on(EV.INPUT_MODE, () => this._refreshSlots()),
    ];
    const p = world.player;
    this.setHealth(p.health.hp, p.health.max, p.health.armor);
    this.cash.lastChild.textContent = formatCash(world.economy.cash);
    this.bounty.lastChild.textContent = formatBounty(world.bounty.bounty);
    this.setWeapon({ id: p.combat.equipped, weapon: p.combat.current });
    p.combat.emitAmmo();
    this.lowT = 0;
  }

  _pulse(node) { node.classList.remove('pulse'); void node.offsetWidth; node.classList.add('pulse'); }

  setHealth(hp, max, armor) {
    this.health.firstChild.style.width = `${(hp / max) * 100}%`;
    this.health.lastChild.textContent = Math.ceil(hp);
    this.armor.firstChild.style.width = `${Math.min(100, (armor / 50) * 100)}%`;
    this.armor.lastChild.textContent = armor > 0 ? Math.ceil(armor) : '';
    this.armor.classList.toggle('empty', armor <= 0);
    this.health.classList.toggle('low', hp <= 30);
  }

  setAmmo(e) {
    this.weapon.querySelector('.mag').textContent = e.mag;
    this.weapon.querySelector('.res').textContent = e.reserve;
    this.weapon.classList.toggle('empty', e.mag === 0);
    this.weapon.classList.toggle('reloading', !!e.reloading);
    if (e.reloading) { const f = this.weapon.querySelector('.reload .fill'); f.style.animation = 'none'; void f.offsetWidth; f.style.animation = `reloadFill ${this.world.player.combat.current.def.reloadTime}s linear forwards`; }
  }

  setWeapon(e) {
    this.weapon.querySelector('.name').textContent = e.weapon.def.name;
    this._refreshSlots();
  }

  _refreshSlots() {
    const c = this.world.player.combat;
    this.slots.innerHTML = '';
    ['pistol', 'revolver', 'shotgun', 'smg'].forEach((id, i) => {
      const w = c.weapons[id];
      const s = el('div', { class: 'slot' + (w.owned ? '' : ' locked') + (id === c.equipped ? ' active' : ''), text: this.ctx.input.mode === 'touch' ? w.def.name[0] : String(i + 1) });
      this.slots.appendChild(s);
    });
  }

  setPrompt(e) {
    this.prompt.querySelector('.txt').textContent = e.text ? (this.ctx.input.mode === 'touch' ? e.text : `[E] ${e.text}`) : '';
    this.prompt.classList.toggle('on', !!e.text);
    this.prompt.classList.toggle('hold', !!e.hold);
    this.prompt.querySelector('.hold .fill').style.width = `${(e.progress || 0) * 100}%`;
  }

  setPhase(phase) { this.prep.hidden = phase !== 'prep'; }

  toast(text) {
    const t = el('div', { class: 'toast', text });
    this.toasts.appendChild(t);
    setTimeout(() => t.classList.add('out'), 2400);
    setTimeout(() => t.remove(), 3000);
    while (this.toasts.children.length > 4) this.toasts.firstChild.remove();
  }

  update(dt) {
    // melee availability: prompt on desktop, highlighted button on touch
    const combat = this.world.player.combat;
    const ready = !!combat.meleeTargetNearby;
    if (ready !== this._meleeReady) {
      this._meleeReady = ready;
      this.meleeHint.classList.toggle('on', ready && this.ctx.input.mode !== 'touch');
      this.ctx.input.touch.setMeleeReady(ready);
    }
    const h = this.world.player.health;
    const low = h.lowHealth ? 1 : 0;
    this.vignette.style.opacity = String(low * (0.55 + Math.sin(this.world.time * 5) * 0.15) + (h.hurtT > 0 ? 0.3 : 0));
    if (h.lowHealth) { this.lowT -= dt; if (this.lowT <= 0) { this.lowT = 0.9; this.ctx.audio.play('heartbeat'); } }
    // crosshair follows the mouse on desktop
    const input = this.ctx.input;
    if (input.mode === 'desktop' && input.aimScreen) { this.crosshair.style.left = input.aimScreen.x + 'px'; this.crosshair.style.top = input.aimScreen.y + 'px'; this.crosshair.hidden = false; }
    else this.crosshair.hidden = true;
  }

  show() { this.el.hidden = false; document.body.classList.add('in-game'); }
  hide() { this.el.hidden = true; document.body.classList.remove('in-game'); }
  dispose() { for (const off of this._offs) off(); this.el.remove(); }
}
