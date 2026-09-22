// app.js — router, dashboard, navigation shell, settings screen, and app bootstrap.
'use strict';

const Router = (() => {
  let content;
  function init(el) { content = el; window.addEventListener('hashchange', dispatch); }
  function go(path) { location.hash = '#/' + path; }
  function currentPath() { return (location.hash || '#/dashboard').slice(2); }

  async function dispatch() {
    const path = currentPath();
    const seg = path.split('/').filter(Boolean);
    const root = seg[0] || 'dashboard';
    updateNav(root);
    content.scrollTop = 0;
    try {
      switch (root) {
        case 'dashboard': await Dashboard.render(content); break;
        case 'products':
          if (seg[1] === 'new') await Products.renderForm(content);
          else if (seg[1] === 'edit') await Products.renderForm(content, seg[2]);
          else await Products.renderList(content);
          break;
        case 'customers': await routeParty(Customers, seg); break;
        case 'suppliers': await routeParty(Suppliers, seg); break;
        case 'sales':
          if (seg[1] === 'new') await Sales.renderForm(content);
          else if (seg[1] === 'edit') await Sales.renderForm(content, seg[2]);
          else await Sales.renderList(content);
          break;
        case 'purchases':
          if (seg[1] === 'new') await Purchases.renderForm(content);
          else if (seg[1] === 'edit') await Purchases.renderForm(content, seg[2]);
          else await Purchases.renderList(content);
          break;
        case 'expenses':
          if (seg[1] === 'new') await Expenses.renderForm(content);
          else if (seg[1] === 'edit') await Expenses.renderForm(content, seg[2]);
          else await Expenses.renderList(content);
          break;
        case 'payments':
          if (seg[1] === 'new') await Payments.renderForm(content, seg[2], seg[3]);
          else await Payments.renderList(content);
          break;
        case 'reports': await Reports.renderList(content); break;
        case 'transactions': await Transactions.renderList(content); break;
        case 'settings': await Settings.render(content); break;
        default: await Dashboard.render(content);
      }
    } catch (err) {
      console.error(err);
      Utils.toast('কিছু একটা সমস্যা হয়েছে', 'error');
    }
  }

  async function routeParty(mod, seg) {
    if (seg[1] === 'new') await mod.renderForm(content);
    else if (seg[1] === 'edit') await mod.renderForm(content, seg[2]);
    else if (seg[1] === 'view') await mod.renderView(content, seg[2]);
    else await mod.renderList(content);
  }

  function updateNav(root) {
    Utils.qsa('.bottom-nav [data-nav]').forEach((btn) => {
      btn.classList.toggle('active', btn.getAttribute('data-nav') === root);
    });
    const moreRoutes = ['purchases', 'expenses', 'customers', 'suppliers', 'payments', 'transactions', 'settings'];
    Utils.qs('.bottom-nav [data-nav="more"]')?.classList.toggle('active', moreRoutes.includes(root));
  }

  return { init, go, dispatch };
})();

const Dashboard = (() => {
  async function render(container) {
    container.innerHTML = `<div class="page-header"><h2>ড্যাশবোর্ড</h2></div><div id="dash-body"><div class="empty-state">লোড হচ্ছে...</div></div>`;
    const body = Utils.qs('#dash-body', container);
    const [today, receivable, payable, stockVal, lowStock, recentTxns] = await Promise.all([
      Accounting.todaySummary(), Accounting.totalReceivable(), Accounting.totalPayable(),
      Accounting.stockValue(), Accounting.lowStockProducts(), Transactions.all()
    ]);
    const recent = recentTxns.slice(0, 6);
    body.innerHTML = `
      <div class="grid-2">
        <div class="stat-card"><span>আজকের বিক্রি</span><b>${Utils.formatCurrency(today.totalSales)}</b></div>
        <div class="stat-card"><span>আজকের খরচ</span><b>${Utils.formatCurrency(today.totalExpense)}</b></div>
        <div class="stat-card"><span>আজকের লাভ</span><b class="${today.netProfit >= 0 ? 'text-success' : 'text-danger'}">${Utils.formatCurrency(today.netProfit)}</b></div>
        <div class="stat-card"><span>মোট পাওনা</span><b class="text-danger">${Utils.formatCurrency(receivable)}</b></div>
        <div class="stat-card"><span>মোট দেনা</span><b class="text-danger">${Utils.formatCurrency(payable)}</b></div>
        <div class="stat-card"><span>মোট স্টক মূল্য</span><b>${Utils.formatCurrency(stockVal)}</b></div>
      </div>
      ${lowStock.length ? `
      <div class="card alert-card">
        <b>⚠️ কম স্টকে থাকা পণ্য (${lowStock.length})</b>
        <div class="item-sub">${lowStock.map((p) => Utils.esc(p.name)).join(', ')}</div>
      </div>` : ''}
      <div class="quick-actions">
        <button class="btn btn-primary" data-route="sales/new">+ বিক্রয়</button>
        <button class="btn btn-secondary" data-route="purchases/new">+ ক্রয়</button>
        <button class="btn btn-secondary" data-route="expenses/new">+ খরচ</button>
      </div>
      <h3>সাম্প্রতিক লেনদেন</h3>
      <div class="card-list">
        ${recent.length ? recent.map((t) => {
          const meta = Transactions.TYPE_LABELS[t.type] || { label: t.type, icon: '•', cls: '' };
          return `<div class="card txn-row"><div><div class="item-title">${meta.icon} ${meta.label}</div><div class="item-sub">${Utils.formatDate(t.date)} ${t.description ? '• ' + Utils.esc(t.description) : ''}</div></div><b class="${meta.cls}">${Utils.formatCurrency(t.amountMinor)}</b></div>`;
        }).join('') : `<div class="empty-state">কোনো লেনদেন নেই</div>`}
      </div>
    `;
  }
  return { render };
})();

const Settings = (() => {
  async function render(container) {
    container.innerHTML = `
      <div class="page-header"><h2>সেটিংস</h2></div>
      <div class="card">
        <div class="settings-row">
          <span>থিম (ডার্ক/লাইট মোড)</span>
          <button class="btn btn-secondary" id="theme-toggle">${State.get('theme') === 'dark' ? '☀️ লাইট মোড' : '🌙 ডার্ক মোড'}</button>
        </div>
        <div class="settings-row">
          <span>ভাষা</span>
          <button class="btn btn-secondary" id="lang-toggle">${State.get('lang') === 'bn' ? 'English' : 'বাংলা'}</button>
        </div>
      </div>
      <div class="card">
        <h3>ব্যাকআপ ও রিস্টোর</h3>
        <button class="btn btn-primary btn-block" id="export-btn">⬇️ ব্যাকআপ এক্সপোর্ট করুন</button>
        <label class="btn btn-secondary btn-block file-btn">⬆️ ব্যাকআপ ইম্পোর্ট করুন
          <input type="file" accept="application/json" id="import-input" hidden>
        </label>
        <button class="btn btn-danger btn-block" id="reset-btn">🗑️ সব ডেটা রিসেট করুন</button>
      </div>
      <div class="card">
        <div class="item-sub">Shop Accounting App — সংস্করণ ১.০</div>
        <div class="item-sub">সব তথ্য শুধুমাত্র আপনার ডিভাইসে সংরক্ষিত থাকে।</div>
      </div>
    `;
    Utils.qs('#theme-toggle', container).addEventListener('click', async () => { await State.toggleTheme(); render(container); });
    Utils.qs('#lang-toggle', container).addEventListener('click', async () => { await State.toggleLang(); render(container); });
    Utils.qs('#export-btn', container).addEventListener('click', () => Backup.exportBackup());
    Utils.qs('#import-input', container).addEventListener('change', async (e) => {
      const file = e.target.files[0];
      if (!file) return;
      try { if (await Backup.importBackup(file)) Router.go('dashboard'); }
      catch (err) { Utils.toast(err.message, 'error'); }
      e.target.value = '';
    });
    Utils.qs('#reset-btn', container).addEventListener('click', async () => {
      if (await Backup.resetAll()) Router.go('dashboard');
    });
  }
  return { render };
})();

// ---- App bootstrap ----
(async function boot() {
  try {
    await DB.open();
    await State.loadSettings();
  } catch (err) {
    document.getElementById('app').innerHTML = `<div class="empty-state">অ্যাপ শুরু করা যায়নি: ${Utils.esc(err.message)}</div>`;
    return;
  }

  const content = document.getElementById('view');
  Router.init(content);

  // Global delegated click handling for any element with data-route (nav links, buttons)
  document.body.addEventListener('click', (e) => {
    const el = e.target.closest('[data-route]');
    if (el) { e.preventDefault(); Router.go(el.getAttribute('data-route')); closeMoreMenu(); }
  });

  // More menu (drawer) for screens that don't fit the 4 main bottom-nav slots
  const moreBtn = document.getElementById('nav-more-btn');
  const moreMenu = document.getElementById('more-menu');
  const moreOverlay = document.getElementById('more-overlay');
  function closeMoreMenu() { moreMenu.classList.remove('open'); moreOverlay.classList.remove('open'); }
  function toggleMoreMenu() { moreMenu.classList.toggle('open'); moreOverlay.classList.toggle('open'); }
  moreBtn.addEventListener('click', toggleMoreMenu);
  moreOverlay.addEventListener('click', closeMoreMenu);

  await Router.dispatch();
})();
