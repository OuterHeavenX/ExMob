/**
 * Synchronous pub/sub. Cross-cutting events only; hot per-frame data uses direct references.
 * Event names live in Events.js.
 */
export class EventBus {
  constructor() { this._handlers = new Map(); }

  on(event, fn) {
    if (!this._handlers.has(event)) this._handlers.set(event, new Set());
    this._handlers.get(event).add(fn);
    return () => this.off(event, fn);
  }

  once(event, fn) {
    const off = this.on(event, (p) => { off(); fn(p); });
    return off;
  }

  off(event, fn) {
    const set = this._handlers.get(event);
    if (set) set.delete(fn);
  }

  emit(event, payload) {
    const set = this._handlers.get(event);
    if (!set || set.size === 0) return;
    for (const fn of Array.from(set)) {
      try { fn(payload); } catch (err) { console.error(`[EventBus] handler for "${event}" threw`, err); }
    }
  }

  clear() { this._handlers.clear(); }
}
