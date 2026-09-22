// customers.js — defines a reusable "party" factory (shared shape for Customers & Suppliers so the
// CRUD + balance logic is written exactly once), then instantiates the Customers module from it.
'use strict';

// Reusable factory — Suppliers module (suppliers.js) reuses this exact function.
function createPartyModule(storeName, cfg) {
  // cfg: { title, singular, route, balanceLabel, paidLabel, docStore ('sales'|'purchases'), docPartyField }

  async function all() {
    const rows = await DB.getAll(storeName);
    return rows.sort((a, b) => a.name.localeCompare(b.name, 'bn'));
  }
  async function getById(id) { return DB.get(storeName, id); }

  function validate(data) {
    if (!data.name || !data.name.trim()) throw new Error('নাম আবশ্যক');
    if (data.phone && !/^[0-9+\-\s]{6,20}$/.test(data.phone)) throw new Error('সঠিক মোবাইল নম্বর দিন');
  }

  async function create(data) {
    validate(data);
    const rec = { name: data.name.trim(), phone: (data.phone || '').trim(), address: (data.address || '').trim(), balanceMinor: 0, totalPaidMinor: 0 };
    return DB.add(storeName, rec);
  }

  async function update(id, data) {
    const existing = await getById(id);
    if (!existing) throw new Error(`${cfg.singular} পাওয়া যায়নি`);
    validate(data);
    const rec = { ...existing, name: data.name.trim(), phone: (data.phone || '').trim(), address: (data.address || '').trim() };
    return DB.put(storeName, rec);
  }

  async function remove(id) { return DB.remove(storeName, id); }

  // delta > 0 increases what's owed; called when a sale/purchase due is created
  async function adjustBalance(id, deltaMinor) {
    const p = await getById(id);
    if (!p) return;
    p.balanceMinor = (Number(p.balanceMinor) || 0) + deltaMinor;
    await DB.put(storeName, p);
  }

  async function recordPayment(id, amountMinor) {
    const p = await getById(id);
    if (!p) return;
    p.balanceMinor = (Number(p.balanceMinor) || 0) - amountMinor;
    p.totalPaidMinor = (Number(p.totalPaidMinor) || 0) + amountMinor;
    await DB.put(storeName, p);
  }

  async function history(id) {
    const [docs, payments] = await Promise.all([DB.getAll(cfg.docStore), DB.getAll('payments')]);
    const myDocs = docs.filter((d) => d[cfg.docPartyField] === id).map((d) => ({
      kind: cfg.docStore === 'sales' ? 'sale' : 'purchase', date: d.date, id: d.id,
      amountMinor: Accounting.documentTotal(d.items, d.discountMinor), note: d.note
    }));
    const myPays = payments.filter((p) => p.partyId === id && p.type === cfg.paymentType).map((p) => ({
      kind: 'payment', date: p.date, id: p.id, amountMinor: p.amountMinor, note: p.note
    }));
    return [...myDocs, ...myPays].sort((a, b) => (a.date < b.date ? 1 : -1));
  }

  async function renderList(container) {
    const items = await all();
    container.innerHTML = `
      <div class="page-header">
        <h2>${cfg.title}</h2>
        <button class="btn btn-primary" data-route="${cfg.route}/new">+ নতুন</button>
      </div>
      <input type="search" class="input search-box" id="${cfg.route}-search" placeholder="নাম বা মোবাইল দিয়ে খুঁজুন...">
      <div id="${cfg.route}-list" class="card-list"></div>
    `;
    const listEl = Utils.qs(`#${cfg.route}-list`, container);
    function draw(rows) {
      if (!rows.length) { listEl.innerHTML = `<div class="empty-state">কোনো তথ্য পাওয়া যায়নি</div>`; return; }
      listEl.innerHTML = rows.map((p) => `
        <div class="card item-card" data-id="${p.id}">
          <div class="item-main">
            <div class="item-title">${Utils.esc(p.name)}</div>
            <div class="item-sub">${Utils.esc(p.phone || 'মোবাইল নেই')}</div>
            <div class="item-sub">${cfg.balanceLabel}: <b class="${p.balanceMinor > 0 ? 'text-danger' : 'text-success'}">${Utils.formatCurrency(Math.abs(p.balanceMinor))}</b></div>
          </div>
          <div class="item-actions">
            <button class="icon-btn" data-act="view" title="বিস্তারিত">📄</button>
            <button class="icon-btn" data-act="edit" title="সম্পাদনা">✏️</button>
            <button class="icon-btn" data-act="del" title="মুছুন">🗑️</button>
          </div>
        </div>`).join('');
    }
    draw(items);
    Utils.qs(`#${cfg.route}-search`, container).addEventListener('input', Utils.debounce((e) => {
      const q = e.target.value.trim().toLowerCase();
      draw(items.filter((p) => p.name.toLowerCase().includes(q) || (p.phone || '').includes(q)));
    }, 200));
    listEl.addEventListener('click', async (e) => {
      const card = e.target.closest('.item-card');
      if (!card) return;
      const id = card.getAttribute('data-id');
      const act = e.target.getAttribute('data-act');
      if (act === 'edit') Router.go(`${cfg.route}/edit/${id}`);
      else if (act === 'view') Router.go(`${cfg.route}/view/${id}`);
      else if (act === 'del') {
        const ok = await Utils.confirmDialog({ title: `${cfg.singular} মুছবেন?`, message: 'সংশ্লিষ্ট সব লেনদেন ইতিহাসে থেকে যাবে, শুধু প্রোফাইল মুছে যাবে।', danger: true });
        if (ok) { await remove(id); Utils.toast('মুছে ফেলা হয়েছে'); Router.go(cfg.route); }
      }
    });
  }

  async function renderForm(container, id) {
    const editing = !!id;
    const p = editing ? await getById(id) : null;
    if (editing && !p) { Router.go(cfg.route); return; }
    container.innerHTML = `
      <div class="page-header">
        <button class="icon-btn" data-route="${cfg.route}">←</button>
        <h2>${editing ? `${cfg.singular} সম্পাদনা` : `নতুন ${cfg.singular}`}</h2>
      </div>
      <form id="party-form" class="form">
        <label>নাম *<input class="input" name="name" required value="${Utils.esc(p?.name || '')}"></label>
        <label>মোবাইল<input class="input" name="phone" value="${Utils.esc(p?.phone || '')}"></label>
        <label>ঠিকানা<textarea class="input" name="address">${Utils.esc(p?.address || '')}</textarea></label>
        <button type="submit" class="btn btn-primary btn-block">${editing ? 'আপডেট করুন' : 'সংরক্ষণ করুন'}</button>
      </form>
    `;
    Utils.qs('#party-form', container).addEventListener('submit', async (e) => {
      e.preventDefault();
      const data = Object.fromEntries(new FormData(e.target).entries());
      try {
        if (editing) await update(id, data); else await create(data);
        Utils.toast('সংরক্ষণ সম্পন্ন হয়েছে', 'success');
        Router.go(cfg.route);
      } catch (err) { Utils.toast(err.message, 'error'); }
    });
  }

  async function renderView(container, id) {
    const p = await getById(id);
    if (!p) { Router.go(cfg.route); return; }
    const hist = await history(id);
    container.innerHTML = `
      <div class="page-header">
        <button class="icon-btn" data-route="${cfg.route}">←</button>
        <h2>${Utils.esc(p.name)}</h2>
      </div>
      <div class="card">
        <div class="item-sub">📞 ${Utils.esc(p.phone || '-')}</div>
        <div class="item-sub">🏠 ${Utils.esc(p.address || '-')}</div>
        <div class="stat-row">
          <div class="stat"><span>${cfg.balanceLabel}</span><b class="${p.balanceMinor > 0 ? 'text-danger' : 'text-success'}">${Utils.formatCurrency(Math.abs(p.balanceMinor))}</b></div>
          <div class="stat"><span>${cfg.paidLabel}</span><b>${Utils.formatCurrency(p.totalPaidMinor)}</b></div>
        </div>
        <button class="btn btn-primary btn-block" data-route="payments/new/${cfg.paymentType}/${p.id}">+ পেমেন্ট যোগ করুন</button>
      </div>
      <h3>লেনদেন ইতিহাস</h3>
      <div class="card-list">
        ${hist.length ? hist.map((h) => `
          <div class="card txn-row">
            <div>
              <div class="item-title">${h.kind === 'sale' ? 'বিক্রয়' : h.kind === 'purchase' ? 'ক্রয়' : 'পেমেন্ট'}</div>
              <div class="item-sub">${Utils.formatDate(h.date)} ${h.note ? '• ' + Utils.esc(h.note) : ''}</div>
            </div>
            <b>${Utils.formatCurrency(h.amountMinor)}</b>
          </div>`).join('') : `<div class="empty-state">কোনো লেনদেন নেই</div>`}
      </div>
    `;
  }

  return { all, getById, create, update, remove, adjustBalance, recordPayment, history, renderList, renderForm, renderView, cfg };
}

const Customers = createPartyModule('customers', {
  title: 'কাস্টমার', singular: 'কাস্টমার', route: 'customers',
  balanceLabel: 'মোট পাওনা', paidLabel: 'মোট পরিশোধ', docStore: 'sales', docPartyField: 'customerId', paymentType: 'customer'
});
