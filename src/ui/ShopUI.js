import { el } from '../utils/dom.js';
import { EV } from '../core/Events.js';
import { formatCash } from '../data/economy/economyRegistry.js';

/** Between-wave shop panel. */
export class ShopUI {
  constructor(ctx, world) {
    this.ctx = ctx;
    this.world = world;
    this.el = el('div', { class: 'panel shop ui-block', hidden: '' });
    ctx.ui.root.appendChild(this.el);
    this._offs = [
      ctx.events.on(EV.SHOP_OPEN, () => this.render()),
      ctx.events.on(EV.SHOP_CLOSE, () => { this.el.hidden = true; }),
      ctx.events.on(EV.SHOP_PURCHASE, () => this.render()),
      ctx.events.on(EV.CASH_CHANGED, () => { if (!this.el.hidden) this.render(); }),
      ctx.events.on(EV.SHOP_DENIED, (e) => { const n = this.el.querySelector(`[data-id="${e.item.id}"]`); if (n) { n.classList.remove('shake'); void n.offsetWidth; n.classList.add('shake'); } }),
    ];
  }

  render() {
    const w = this.world, shop = w.shop;
    this.el.innerHTML = '';
    const cats = { supplies: 'SUPPLIES', weapons: 'WEAPONS', defenses: 'THE PROPERTY' };
    this.el.append(el('div', { class: 'shop-head' }, [el('div', { class: 'big', text: 'THE TRUNK' }), el('div', { class: 'cash', text: formatCash(w.economy.cash) })]));
    this.el.append(el('div', { class: 'body dim', text: 'Doors, boards and barricades are bought in the world: walk up and hold INTERACT.' }));
    for (const [cat, label] of Object.entries(cats)) {
      const list = el('div', { class: 'shop-list' });
      for (const item of shop.items.filter((i) => i.category === cat)) {
        const st = shop.status(item);
        const row = el('button', { class: 'shop-item' + (st.enabled ? '' : ' disabled'), 'data-id': item.id, onclick: () => shop.buy(item.id) }, [
          el('div', { class: 'name', text: item.name }),
          el('div', { class: 'desc', text: item.desc }),
          el('div', { class: 'price', text: st.enabled ? formatCash(item.price) : st.reason }),
        ]);
        list.appendChild(row);
      }
      this.el.append(el('div', { class: 'eyebrow', text: label }), list);
    }
    this.el.append(el('div', { class: 'row' }, [
      el('button', { class: 'btn ghost', text: 'CLOSE', onclick: () => shop.setOpen(false) }),
      el('button', { class: 'btn primary', text: 'READY', onclick: () => { shop.setOpen(false); w.waves.ready(); } }),
    ]));
    this.el.hidden = false;
  }

  dispose() { for (const off of this._offs) off(); this.el.remove(); }
}
