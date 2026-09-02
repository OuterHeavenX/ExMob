/**
 * Minimal key/value store on IndexedDB with a localStorage fallback (private mode, WebViews).
 */
export class IndexedDBStore {
  constructor(dbName = 'exmob', storeName = 'kv') {
    this.dbName = dbName;
    this.storeName = storeName;
    this._db = null;
    this.fallback = typeof indexedDB === 'undefined';
  }

  async _open() {
    if (this._db) return this._db;
    if (this.fallback) return null;
    this._db = await new Promise((resolve, reject) => {
      let req;
      try { req = indexedDB.open(this.dbName, 1); } catch (e) { this.fallback = true; resolve(null); return; }
      req.onupgradeneeded = () => { req.result.createObjectStore(this.storeName); };
      req.onsuccess = () => resolve(req.result);
      req.onerror = () => { this.fallback = true; resolve(null); };
      req.onblocked = () => { this.fallback = true; resolve(null); };
    });
    return this._db;
  }

  _lsKey(key) { return `${this.dbName}:${this.storeName}:${key}`; }

  async get(key) {
    const db = await this._open();
    if (!db) {
      try { const raw = localStorage.getItem(this._lsKey(key)); return raw ? JSON.parse(raw) : null; } catch { return null; }
    }
    return new Promise((resolve) => {
      const tx = db.transaction(this.storeName, 'readonly');
      const req = tx.objectStore(this.storeName).get(key);
      req.onsuccess = () => resolve(req.result ?? null);
      req.onerror = () => resolve(null);
    });
  }

  async set(key, value) {
    const db = await this._open();
    if (!db) {
      try { localStorage.setItem(this._lsKey(key), JSON.stringify(value)); return true; } catch { return false; }
    }
    return new Promise((resolve) => {
      const tx = db.transaction(this.storeName, 'readwrite');
      tx.objectStore(this.storeName).put(value, key);
      tx.oncomplete = () => resolve(true);
      tx.onerror = () => resolve(false);
    });
  }

  async delete(key) {
    const db = await this._open();
    if (!db) { try { localStorage.removeItem(this._lsKey(key)); } catch { /* ignore */ } return true; }
    return new Promise((resolve) => {
      const tx = db.transaction(this.storeName, 'readwrite');
      tx.objectStore(this.storeName).delete(key);
      tx.oncomplete = () => resolve(true);
      tx.onerror = () => resolve(false);
    });
  }
}
