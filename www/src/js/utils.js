// utils.js — shared helper functions used across all modules
'use strict';

const Utils = (() => {

  function generateId(prefix) {
    return (prefix ? prefix + '_' : '') + Date.now().toString(36) + '_' + Math.random().toString(36).slice(2, 9);
  }

  // ---- Money is stored internally as integer "poysha" (1 taka = 100 poysha) to avoid float errors ----
  function toMinor(amount) {
    const n = Number(amount);
    if (isNaN(n)) return 0;
    return Math.round(n * 100);
  }

  function fromMinor(minor) {
    return (Number(minor) || 0) / 100;
  }

  function formatCurrency(minorOrAmount, isMinor = true) {
    const value = isMinor ? fromMinor(minorOrAmount) : Number(minorOrAmount || 0);
    const fixed = value.toFixed(2);
    const parts = fixed.split('.');
    let intPart = parts[0];
    const decPart = parts[1];
    let sign = '';
    if (intPart.startsWith('-')) { sign = '-'; intPart = intPart.slice(1); }
    // Indian/Bengali digit grouping: last 3 digits, then groups of 2
    let lastThree = intPart.slice(-3);
    let other = intPart.slice(0, -3);
    if (other !== '') {
      lastThree = ',' + lastThree;
      other = other.replace(/\B(?=(\d{2})+(?!\d))/g, ',');
    }
    const grouped = other + lastThree;
    const decStr = decPart === '00' ? '' : '.' + decPart;
    return `${sign}৳${grouped}${decStr}`;
  }

  function todayStr() {
    return dateToStr(new Date());
  }

  function dateToStr(d) {
    const yyyy = d.getFullYear();
    const mm = String(d.getMonth() + 1).padStart(2, '0');
    const dd = String(d.getDate()).padStart(2, '0');
    return `${yyyy}-${mm}-${dd}`;
  }

  function formatDate(dateStr) {
    if (!dateStr) return '';
    const d = new Date(dateStr);
    if (isNaN(d.getTime())) return dateStr;
    const months = ['জানু', 'ফেব্রু', 'মার্চ', 'এপ্রিল', 'মে', 'জুন', 'জুলাই', 'আগস্ট', 'সেপ্টে', 'অক্টো', 'নভে', 'ডিসে'];
    return `${d.getDate()} ${months[d.getMonth()]} ${d.getFullYear()}`;
  }

  function startOfDay(dateStr) { return dateStr + 'T00:00:00.000'; }
  function endOfDay(dateStr) { return dateStr + 'T23:59:59.999'; }

  function daysAgoStr(n) {
    const d = new Date();
    d.setDate(d.getDate() - n);
    return dateToStr(d);
  }

  function startOfMonthStr() {
    const d = new Date();
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-01`;
  }

  // Escape any user text before inserting into innerHTML to prevent HTML injection
  function esc(str) {
    if (str === undefined || str === null) return '';
    return String(str)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#039;');
  }

  function debounce(fn, wait) {
    let t;
    return (...args) => {
      clearTimeout(t);
      t = setTimeout(() => fn(...args), wait);
    };
  }

  function toast(msg, type = 'info') {
    const host = document.getElementById('toast-host');
    if (!host) { alert(msg); return; }
    const el = document.createElement('div');
    el.className = `toast toast-${type}`;
    el.textContent = msg;
    host.appendChild(el);
    requestAnimationFrame(() => el.classList.add('show'));
    setTimeout(() => {
      el.classList.remove('show');
      setTimeout(() => el.remove(), 300);
    }, 2600);
  }

  // Promise-based confirm dialog (replaces window.confirm with a nicer, app-like modal)
  function confirmDialog({ title, message, confirmText = 'নিশ্চিত করুন', cancelText = 'বাতিল', danger = false }) {
    return new Promise((resolve) => {
      const overlay = document.createElement('div');
      overlay.className = 'modal-overlay';
      overlay.innerHTML = `
        <div class="modal-box">
          <h3>${esc(title || 'নিশ্চিত করুন')}</h3>
          <p>${esc(message || '')}</p>
          <div class="modal-actions">
            <button class="btn btn-secondary" data-act="cancel">${esc(cancelText)}</button>
            <button class="btn ${danger ? 'btn-danger' : 'btn-primary'}" data-act="ok">${esc(confirmText)}</button>
          </div>
        </div>`;
      document.body.appendChild(overlay);
      requestAnimationFrame(() => overlay.classList.add('show'));
      overlay.addEventListener('click', (e) => {
        const act = e.target.getAttribute('data-act');
        if (e.target === overlay || act === 'cancel') { close(false); }
        else if (act === 'ok') { close(true); }
      });
      function close(result) {
        overlay.classList.remove('show');
        setTimeout(() => overlay.remove(), 200);
        resolve(result);
      }
    });
  }

  function validatePositiveNumber(v) {
    const n = Number(v);
    return !isNaN(n) && n >= 0 && isFinite(n);
  }

  function qs(sel, root = document) { return root.querySelector(sel); }
  function qsa(sel, root = document) { return Array.from(root.querySelectorAll(sel)); }

  return {
    generateId, toMinor, fromMinor, formatCurrency, todayStr, dateToStr, formatDate,
    startOfDay, endOfDay, daysAgoStr, startOfMonthStr, esc, debounce, toast,
    confirmDialog, validatePositiveNumber, qs, qsa
  };
})();
