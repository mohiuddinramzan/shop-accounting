// db.js — IndexedDB abstraction layer. All other modules talk to the database only through this file.
'use strict';

const DB = (() => {
  const DB_NAME = 'shopAccountingDB';
  const DB_VERSION = 1;
  const STORES = ['products', 'customers', 'suppliers', 'sales', 'purchases', 'expenses', 'payments', 'transactions', 'settings'];

  let dbPromise = null;

  function open() {
    if (dbPromise) return dbPromise;
    dbPromise = new Promise((resolve, reject) => {
      if (!window.indexedDB) {
        reject(new Error('এই ব্রাউজারে IndexedDB সমর্থিত নয়।'));
        return;
      }
      const req = indexedDB.open(DB_NAME, DB_VERSION);
      req.onupgradeneeded = (e) => {
        const db = e.target.result;
        STORES.forEach((name) => {
          if (!db.objectStoreNames.contains(name)) {
            const keyPath = name === 'settings' ? 'key' : 'id';
            const store = db.createObjectStore(name, { keyPath });
            if (name !== 'settings') store.createIndex('createdAt', 'createdAt', { unique: false });
            if (['sales', 'purchases', 'expenses', 'payments', 'transactions'].includes(name)) {
              store.createIndex('date', 'date', { unique: false });
            }
          }
        });
      };
      req.onsuccess = (e) => resolve(e.target.result);
      req.onerror = (e) => reject(e.target.error || new Error('Database খোলা যায়নি'));
      req.onblocked = () => reject(new Error('Database ব্লক হয়ে আছে — অ্যাপের অন্য ট্যাব বন্ধ করুন'));
    });
    return dbPromise;
  }

  async function tx(storeName, mode, fn) {
    const db = await open();
    return new Promise((resolve, reject) => {
      const t = db.transaction(storeName, mode);
      const store = t.objectStore(storeName);
      let result;
      try {
        result = fn(store);
      } catch (err) {
        reject(err);
        return;
      }
      t.oncomplete = () => resolve(result);
      t.onerror = () => reject(t.error);
      t.onabort = () => reject(t.error || new Error('Transaction বাতিল হয়েছে'));
    });
  }

  function reqToPromise(req) {
    return new Promise((resolve, reject) => {
      req.onsuccess = () => resolve(req.result);
      req.onerror = () => reject(req.error);
    });
  }

  async function add(storeName, record) {
    const db = await open();
    return new Promise((resolve, reject) => {
      const t = db.transaction(storeName, 'readwrite');
      const store = t.objectStore(storeName);
      const now = new Date().toISOString();
      if (!record.id && storeName !== 'settings') record.id = Utils.generateId(storeName.slice(0, 3));
      if (storeName !== 'settings') {
        record.createdAt = record.createdAt || now;
        record.updatedAt = now;
      }
      const r = store.add(record);
      r.onsuccess = () => resolve(record);
      r.onerror = () => reject(r.error);
    });
  }

  async function put(storeName, record) {
    const db = await open();
    return new Promise((resolve, reject) => {
      const t = db.transaction(storeName, 'readwrite');
      const store = t.objectStore(storeName);
      if (storeName !== 'settings') record.updatedAt = new Date().toISOString();
      const r = store.put(record);
      r.onsuccess = () => resolve(record);
      r.onerror = () => reject(r.error);
    });
  }

  async function get(storeName, key) {
    const db = await open();
    const t = db.transaction(storeName, 'readonly');
    return reqToPromise(t.objectStore(storeName).get(key));
  }

  async function getAll(storeName) {
    const db = await open();
    const t = db.transaction(storeName, 'readonly');
    const result = await reqToPromise(t.objectStore(storeName).getAll());
    return result || [];
  }

  async function remove(storeName, key) {
    const db = await open();
    return new Promise((resolve, reject) => {
      const t = db.transaction(storeName, 'readwrite');
      const r = t.objectStore(storeName).delete(key);
      r.onsuccess = () => resolve(true);
      r.onerror = () => reject(r.error);
    });
  }

  async function clearStore(storeName) {
    const db = await open();
    return new Promise((resolve, reject) => {
      const t = db.transaction(storeName, 'readwrite');
      const r = t.objectStore(storeName).clear();
      r.onsuccess = () => resolve(true);
      r.onerror = () => reject(r.error);
    });
  }

  async function clearAll() {
    for (const s of STORES) await clearStore(s);
  }

  async function exportAll() {
    const data = {};
    for (const s of STORES) data[s] = await getAll(s);
    data.__meta = { exportedAt: new Date().toISOString(), version: DB_VERSION, app: 'shop-accounting' };
    return data;
  }

  async function importAll(data) {
    if (!data || typeof data !== 'object') throw new Error('অকার্যকর ব্যাকআপ ফাইল');
    for (const s of STORES) {
      if (Array.isArray(data[s])) {
        await clearStore(s);
        const db = await open();
        await new Promise((resolve, reject) => {
          const t = db.transaction(s, 'readwrite');
          const store = t.objectStore(s);
          data[s].forEach((rec) => store.put(rec));
          t.oncomplete = resolve;
          t.onerror = () => reject(t.error);
        });
      }
    }
    return true;
  }

  return { open, add, put, get, getAll, remove, clearStore, clearAll, exportAll, importAll, STORES };
})();
