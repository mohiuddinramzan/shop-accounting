// reports.js — Date-range reports built entirely from Accounting's aggregate functions.
'use strict';

const Reports = (() => {

  function rangeFor(preset) {
    const today = Utils.todayStr();
    switch (preset) {
      case '7days': return { start: Utils.daysAgoStr(6), end: today };
      case 'month': return { start: Utils.startOfMonthStr(), end: today };
      case 'today':
      default: return { start: today, end: today };
    }
  }

  async function renderList(container) {
    container.innerHTML = `
      <div class="page-header"><h2>রিপোর্ট</h2></div>
      <div class="segmented" id="report-tabs">
        <button data-p="today" class="active">আজ</button>
        <button data-p="7days">৭ দিন</button>
        <button data-p="month">এই মাস</button>
        <button data-p="custom">কাস্টম</button>
      </div>
      <div id="custom-range" class="form-row" style="display:none;">
        <label>শুরু<input class="input" type="date" id="range-start"></label>
        <label>শেষ<input class="input" type="date" id="range-end"></label>
      </div>
      <div id="report-body"></div>
    `;
    const body = Utils.qs('#report-body', container);
    const tabs = Utils.qs('#report-tabs', container);
    const customBox = Utils.qs('#custom-range', container);
    const startInput = Utils.qs('#range-start', container);
    const endInput = Utils.qs('#range-end', container);
    startInput.value = Utils.todayStr();
    endInput.value = Utils.todayStr();

    async function draw(range) {
      body.innerHTML = `<div class="empty-state">লোড হচ্ছে...</div>`;
      const summary = await Accounting.rangeSummary(range.start, range.end);
      const [receivable, payable, stockVal] = await Promise.all([Accounting.totalReceivable(), Accounting.totalPayable(), Accounting.stockValue()]);
      body.innerHTML = `
        <div class="card">
          <div class="stat-row"><span>মোট বিক্রয়</span><b>${Utils.formatCurrency(summary.totalSales)}</b></div>
          <div class="stat-row"><span>মোট ক্রয়</span><b>${Utils.formatCurrency(summary.totalPurchase)}</b></div>
          <div class="stat-row"><span>মোট খরচ</span><b>${Utils.formatCurrency(summary.totalExpense)}</b></div>
          <div class="stat-row"><span>বিক্রিত পণ্যের ক্রয়মূল্য (COGS)</span><b>${Utils.formatCurrency(summary.cogs)}</b></div>
          <hr>
          <div class="stat-row"><span>নিট লাভ/ক্ষতি</span><b class="${summary.netProfit >= 0 ? 'text-success' : 'text-danger'}">${Utils.formatCurrency(summary.netProfit)}</b></div>
        </div>
        <div class="card">
          <div class="stat-row"><span>মোট পাওনা (সব সময়)</span><b class="text-danger">${Utils.formatCurrency(receivable)}</b></div>
          <div class="stat-row"><span>মোট দেনা (সব সময়)</span><b class="text-danger">${Utils.formatCurrency(payable)}</b></div>
          <div class="stat-row"><span>স্টক মূল্য (সব সময়)</span><b>${Utils.formatCurrency(stockVal)}</b></div>
        </div>
        <h3>বিক্রয় (${summary.sales.length})</h3>
        <div class="card-list">${summary.sales.length ? summary.sales.map((s) => `
          <div class="card txn-row"><div><div class="item-title">${Utils.esc(s.customerName)}</div><div class="item-sub">${Utils.formatDate(s.date)}</div></div><b>${Utils.formatCurrency(Accounting.documentTotal(s.items, s.discountMinor))}</b></div>
        `).join('') : `<div class="empty-state small">নেই</div>`}</div>
        <h3>খরচ (${summary.expenses.length})</h3>
        <div class="card-list">${summary.expenses.length ? summary.expenses.map((e) => `
          <div class="card txn-row"><div><div class="item-title">${Utils.esc(e.category)}</div><div class="item-sub">${Utils.formatDate(e.date)}</div></div><b>${Utils.formatCurrency(e.amountMinor)}</b></div>
        `).join('') : `<div class="empty-state small">নেই</div>`}</div>
      `;
    }

    draw(rangeFor('today'));
    tabs.addEventListener('click', (e) => {
      const btn = e.target.closest('button[data-p]');
      if (!btn) return;
      Utils.qsa('button', tabs).forEach((b) => b.classList.remove('active'));
      btn.classList.add('active');
      const p = btn.getAttribute('data-p');
      if (p === 'custom') { customBox.style.display = 'flex'; draw({ start: startInput.value, end: endInput.value }); }
      else { customBox.style.display = 'none'; draw(rangeFor(p)); }
    });
    [startInput, endInput].forEach((inp) => inp.addEventListener('change', () => {
      if (startInput.value && endInput.value) draw({ start: startInput.value, end: endInput.value });
    }));
  }

  return { renderList };
})();
