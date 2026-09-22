// transactions.js — reads the central `transactions` store written by sales/purchases/expenses/payments
// so the user has one searchable, filterable history of every money-moving event.
'use strict';

const Transactions = (() => {
  const TYPE_LABELS = {
    sale: { label: 'বিক্রয়', icon: '🛒', cls: 'text-success' },
    purchase: { label: 'ক্রয়', icon: '📦', cls: 'text-danger' },
    expense: { label: 'খরচ', icon: '💸', cls: 'text-danger' },
    customer_payment: { label: 'কাস্টমার পেমেন্ট', icon: '💰', cls: 'text-success' },
    supplier_payment: { label: 'সাপ্লায়ার পেমেন্ট', icon: '💵', cls: 'text-danger' }
  };

  async function all() {
    const rows = await DB.getAll('transactions');
    return rows.sort((a, b) => (a.date < b.date ? 1 : -1) || (a.id < b.id ? 1 : -1));
  }

  async function renderList(container) {
    const items = await all();
    container.innerHTML = `
      <div class="page-header"><h2>লেনদেন ইতিহাস</h2></div>
      <input type="search" class="input search-box" id="txn-search" placeholder="খুঁজুন...">
      <div class="segmented" id="txn-filter">
        <button data-t="" class="active">সব</button>
        <button data-t="sale">বিক্রয়</button>
        <button data-t="purchase">ক্রয়</button>
        <button data-t="expense">খরচ</button>
        <button data-t="customer_payment">পেমেন্ট</button>
      </div>
      <div id="txn-list" class="card-list"></div>
    `;
    const listEl = Utils.qs('#txn-list', container);
    let currentType = '';
    function draw() {
      const q = Utils.qs('#txn-search', container).value.trim().toLowerCase();
      let rows = items;
      if (currentType) rows = rows.filter((t) => currentType === 'customer_payment' ? (t.type === 'customer_payment' || t.type === 'supplier_payment') : t.type === currentType);
      if (q) rows = rows.filter((t) => t.description.toLowerCase().includes(q));
      if (!rows.length) { listEl.innerHTML = `<div class="empty-state">কোনো লেনদেন পাওয়া যায়নি</div>`; return; }
      listEl.innerHTML = rows.map((t) => {
        const meta = TYPE_LABELS[t.type] || { label: t.type, icon: '•', cls: '' };
        return `
        <div class="card txn-row">
          <div>
            <div class="item-title">${meta.icon} ${meta.label}</div>
            <div class="item-sub">${Utils.formatDate(t.date)} ${t.description ? '• ' + Utils.esc(t.description) : ''}</div>
          </div>
          <b class="${meta.cls}">${Utils.formatCurrency(t.amountMinor)}</b>
        </div>`;
      }).join('');
    }
    draw();
    Utils.qs('#txn-search', container).addEventListener('input', Utils.debounce(draw, 200));
    Utils.qs('#txn-filter', container).addEventListener('click', (e) => {
      const btn = e.target.closest('button[data-t]');
      if (!btn) return;
      Utils.qsa('button', Utils.qs('#txn-filter', container)).forEach((b) => b.classList.remove('active'));
      btn.classList.add('active');
      currentType = btn.getAttribute('data-t');
      draw();
    });
  }

  return { all, renderList, TYPE_LABELS };
})();
