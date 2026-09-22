// payments.js — Records customer payments (reduces receivable) and supplier payments (reduces payable)
// separately, as required. Both update the relevant party's balance and log a central transaction.
'use strict';

const Payments = (() => {
  async function all() {
    const rows = await DB.getAll('payments');
    return rows.sort((a, b) => (a.date < b.date ? 1 : -1) || (a.createdAt < b.createdAt ? 1 : -1));
  }
  async function getById(id) { return DB.get('payments', id); }

  function partyModule(type) { return type === 'customer' ? Customers : Suppliers; }

  async function applyEffect(payment, sign) {
    await partyModule(payment.type).recordPayment(payment.partyId, sign * payment.amountMinor);
  }

  async function create(data) {
    if (!data.type || !['customer', 'supplier'].includes(data.type)) throw new Error('ধরন নির্বাচন করুন');
    if (!data.partyId) throw new Error(`${data.type === 'customer' ? 'কাস্টমার' : 'সাপ্লায়ার'} নির্বাচন করুন`);
    if (!Utils.validatePositiveNumber(data.amount) || Number(data.amount) <= 0) throw new Error('সঠিক পরিমাণ দিন');
    const party = await partyModule(data.type).getById(data.partyId);
    if (!party) throw new Error('নির্বাচিত পার্টি পাওয়া যায়নি');
    const rec = {
      date: data.date || Utils.todayStr(), type: data.type, partyId: data.partyId, partyName: party.name,
      amountMinor: Utils.toMinor(data.amount), note: (data.note || '').trim()
    };
    const saved = await DB.add('payments', rec);
    await applyEffect(saved, +1);
    await State.logTransaction({
      type: data.type === 'customer' ? 'customer_payment' : 'supplier_payment', refId: saved.id, date: saved.date,
      amountMinor: saved.amountMinor, description: `${data.type === 'customer' ? 'কাস্টমার পেমেন্ট' : 'সাপ্লায়ার পেমেন্ট'} — ${party.name}`, partyId: party.id
    });
    return saved;
  }

  async function remove(id) {
    const existing = await getById(id);
    if (!existing) return;
    await applyEffect(existing, -1);
    await DB.remove('payments', id);
    await State.removeTransactionsByRef(id);
  }

  async function renderList(container) {
    const items = await all();
    container.innerHTML = `
      <div class="page-header">
        <h2>পেমেন্ট</h2>
        <button class="btn btn-primary" data-route="payments/new">+ নতুন পেমেন্ট</button>
      </div>
      <div id="payment-list" class="card-list"></div>
    `;
    const listEl = Utils.qs('#payment-list', container);
    if (!items.length) { listEl.innerHTML = `<div class="empty-state">কোনো পেমেন্ট নেই</div>`; }
    else {
      listEl.innerHTML = items.map((p) => `
        <div class="card item-card" data-id="${p.id}">
          <div class="item-main">
            <div class="item-title">${Utils.esc(p.partyName)} <span class="tag">${p.type === 'customer' ? 'কাস্টমার' : 'সাপ্লায়ার'}</span></div>
            <div class="item-sub">${Utils.formatDate(p.date)} ${p.note ? '• ' + Utils.esc(p.note) : ''}</div>
          </div>
          <div class="item-main" style="text-align:right; flex:0 0 auto;"><b>${Utils.formatCurrency(p.amountMinor)}</b></div>
          <div class="item-actions"><button class="icon-btn" data-act="del" title="মুছুন">🗑️</button></div>
        </div>`).join('');
    }
    listEl.addEventListener('click', async (e) => {
      const card = e.target.closest('.item-card');
      if (!card) return;
      const id = card.getAttribute('data-id');
      if (e.target.getAttribute('data-act') === 'del') {
        const ok = await Utils.confirmDialog({ title: 'পেমেন্ট মুছবেন?', message: 'পার্টির হিসাব পূর্বাবস্থায় ফিরে যাবে।', danger: true });
        if (ok) { await remove(id); Utils.toast('পেমেন্ট মুছে ফেলা হয়েছে'); Router.go('payments'); }
      }
    });
  }

  async function renderForm(container, presetType, presetPartyId) {
    const [customers, suppliers] = await Promise.all([Customers.all(), Suppliers.all()]);
    let type = presetType || 'customer';

    function partyOptions() {
      const list = type === 'customer' ? customers : suppliers;
      return list.map((p) => `<option value="${p.id}" ${presetPartyId === p.id ? 'selected' : ''}>${Utils.esc(p.name)}</option>`).join('');
    }

    container.innerHTML = `
      <div class="page-header">
        <button class="icon-btn" data-route="payments">←</button>
        <h2>নতুন পেমেন্ট</h2>
      </div>
      <form id="payment-form" class="form">
        <label>ধরন
          <select class="input" name="type" id="payment-type">
            <option value="customer" ${type === 'customer' ? 'selected' : ''}>কাস্টমার পেমেন্ট (গ্রহণ)</option>
            <option value="supplier" ${type === 'supplier' ? 'selected' : ''}>সাপ্লায়ার পেমেন্ট (প্রদান)</option>
          </select>
        </label>
        <label id="party-label">পার্টি
          <select class="input" name="partyId" id="payment-party">${partyOptions()}</select>
        </label>
        <label>তারিখ<input class="input" type="date" name="date" value="${Utils.todayStr()}"></label>
        <label>পরিমাণ (৳) *<input class="input" name="amount" type="number" step="0.01" min="0" required></label>
        <label>নোট<textarea class="input" name="note"></textarea></label>
        <button type="submit" class="btn btn-primary btn-block">সংরক্ষণ করুন</button>
      </form>
    `;
    const typeSelect = Utils.qs('#payment-type', container);
    const partySelect = Utils.qs('#payment-party', container);
    typeSelect.addEventListener('change', () => {
      type = typeSelect.value;
      partySelect.innerHTML = partyOptions();
    });
    Utils.qs('#payment-form', container).addEventListener('submit', async (e) => {
      e.preventDefault();
      const data = Object.fromEntries(new FormData(e.target).entries());
      try {
        await create(data);
        Utils.toast('পেমেন্ট সংরক্ষিত হয়েছে', 'success');
        Router.go('payments');
      } catch (err) { Utils.toast(err.message, 'error'); }
    });
  }

  return { all, getById, create, remove, renderList, renderForm };
})();
