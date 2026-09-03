import { SHOP_ITEMS } from '../data/upgrades/shopItems.js';
import { ECONOMY } from '../data/economy/economyRegistry.js';
import { EV } from '../core/Events.js';

/** Between-wave shop. Applies item actions to the player; only open during PREP. */
export class ShopManager {
  constructor(world) {
    this.world = world;
    this.items = SHOP_ITEMS;
    this.open = false;
  }

  get events() { return this.world.events; }
  get player() { return this.world.player; }
  get economy() { return this.world.economy; }

  canOpen() { return this.world.waves.phase === 'PREP' && !this.player.health.dead; }

  setOpen(v) {
    if (v && !this.canOpen()) return false;
    if (this.open === v) return true;
    this.open = v;
    this.events.emit(v ? EV.SHOP_OPEN : EV.SHOP_CLOSE, {});
    return true;
  }

  /** Status of an item: { visible, enabled, reason } */
  status(item) {
    const a = item.action, p = this.player;
    if (a.type === 'unlockWeapon') {
      if (p.combat.weapons[a.weapon].owned) return { visible: true, enabled: false, reason: 'OWNED' };
    }
    if (a.type === 'defense' && this.world.defenses.has(a.defense)) return { visible: true, enabled: false, reason: 'INSTALLED' };
    if (a.type === 'heal' && p.health.hp >= p.health.max) return { visible: true, enabled: false, reason: 'FULL' };
    if (a.type === 'armor' && p.health.armor >= ECONOMY.armor.points) return { visible: true, enabled: false, reason: 'FULL' };
    if (a.type === 'ammo') {
      const ws = a.scope === 'current' ? [p.combat.current] : Object.values(p.combat.weapons).filter((w) => w.owned);
      if (ws.every((w) => w.reserve >= w.def.reserveMax)) return { visible: true, enabled: false, reason: 'FULL' };
    }
    if (!this.economy.canAfford(item.price)) return { visible: true, enabled: false, reason: 'NO CASH' };
    return { visible: true, enabled: true, reason: '' };
  }

  buy(itemId) {
    const item = this.items.find((i) => i.id === itemId);
    if (!item) return false;
    const st = this.status(item);
    if (!st.enabled) { this.events.emit(EV.SHOP_DENIED, { item, reason: st.reason }); this.world.ctx.audio.play('ui_denied'); return false; }
    if (!this.economy.spend(item.price, item.id)) return false;
    const p = this.player, a = item.action;
    switch (a.type) {
      case 'ammo': p.combat.refill(a.scope); break;
      case 'heal': p.health.heal(); break;
      case 'armor': p.health.addArmor(ECONOMY.armor.points); break;
      case 'unlockWeapon': p.combat.unlock(a.weapon); p.combat.equip(a.weapon, true); break;
      case 'defense': this.world.defenses.install(a.defense); break;
      default: break;
    }
    this.world.ctx.audio.play('ui_buy');
    this.events.emit(EV.SHOP_PURCHASE, { item });
    return true;
  }
}
