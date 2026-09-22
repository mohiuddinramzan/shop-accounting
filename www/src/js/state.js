// state.js — lightweight global state + settings + a helper to log every money-moving action
// into the central `transactions` store so the Transactions screen always has a single source.
'use strict';

const State = (() => {
  const listeners = {};
  const cache = { theme: 'light', lang: 'bn' };

  function on(evt, fn) {
    (listeners[evt] = listeners[evt] || []).push(fn);
    return () => { listeners[evt] = listeners[evt].filter((f) => f !== fn); };
  }
  function emit(evt, payload) {
    (listeners[evt] || []).forEach((fn) => { try { fn(payload); } catch (e) { console.error(e); } });
  }

  async function loadSettings() {
    const rows = await DB.getAll('settings');
    rows.forEach((r) => { cache[r.key] = r.value; });
    if (!rows.find((r) => r.key === 'theme')) cache.theme = 'light';
    if (!rows.find((r) => r.key === 'lang')) cache.lang = 'bn';
    applyTheme();
    return cache;
  }

  async function setSetting(key, value) {
    cache[key] = value;
    await DB.put('settings', { key, value });
    emit('settings:' + key, value);
    return value;
  }

  function get(key) { return cache[key]; }

  function applyTheme() {
    document.documentElement.setAttribute('data-theme', cache.theme === 'dark' ? 'dark' : 'light');
  }

  async function toggleTheme() {
    await setSetting('theme', cache.theme === 'dark' ? 'light' : 'dark');
    applyTheme();
  }

  async function toggleLang() {
    await setSetting('lang', cache.lang === 'bn' ? 'en' : 'bn');
    emit('lang:changed', cache.lang);
  }

  // Every sale / purchase / expense / payment writes one row here so Transactions & search work centrally.
  async function logTransaction({ type, refId, date, amountMinor, description, partyId }) {
    const rec = {
      id: Utils.generateId('txn'),
      type, refId, date, amountMinor: Math.round(amountMinor), description: description || '', partyId: partyId || null
    };
    await DB.add('transactions', rec);
    emit('transactions:changed', rec);
    return rec;
  }

  async function removeTransactionsByRef(refId) {
    const all = await DB.getAll('transactions');
    const toRemove = all.filter((t) => t.refId === refId);
    for (const t of toRemove) await DB.remove('transactions', t.id);
  }

  return { on, emit, loadSettings, setSetting, get, applyTheme, toggleTheme, toggleLang, logTransaction, removeTransactionsByRef };
})();
