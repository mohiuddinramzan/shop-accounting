// expenses.js — Expense CRUD, categorized, logs to the central transactions store.
'use strict';

const Expenses = (() => {
  const CATEGORIES = ['দোকান ভাড়া', 'বিদ্যুৎ', 'কর্মচারী', 'পরিবহন', 'খাবার', 'অন্যান্য'];

  async function all() {
    const rows = await DB.getAll('expenses');
    return rows.sort((a, b) => (a.date < b.date ? 1 : -1) || (a.createdAt < b.createdAt ? 1 : -1));
  }
  async function getById(id) { return DB.get('expenses', id); }

  function validate(data) {
    if (!Utils.validatePositiveNumber(data.amount) || Number(data.amount) <= 0) throw new Error('সঠিক পরিমাণ দিন');
    if (!data.category) throw new Error('ক্যাটাগরি নির্বাচন করুন');
  }

  async function create(data) {
    validate(data);
    const rec = { date: data.date || Utils.todayStr(), category: data.category, amountMinor: Utils.toMinor(data.amount), description: (data.description || '').trim() };
    const saved = await DB.add('expenses', rec);
    await State.logTransaction({ type: 'expense', refId: saved.id, date: saved.date, amountMinor: saved.amountMinor, description: `${saved.category}${saved.description ? ' — ' + saved.description : ''}` });
    return saved;
  }

  async function update(id, data) {
    const existing = await getById(id);
    if (!existing) throw new Error('খরচ পাওয়া যায়নি');
    validate(data);
    const rec = { ...existing, date: data.date || existing.date, category: data.category, amountMinor: Utils.toMinor(data.amount), description: (data.description || '').trim() };
    await DB.put('expenses', rec);
    await State.removeTransactionsByRef(id);
    await State.logTransaction({ type: 'expense', refId: id, date: rec.date, amountMinor: rec.amountMinor, description: `${rec.category}${rec.description ? ' — ' + rec.description : ''}` });
    return rec;
  }

  async function remove(id) {
    await DB.remove('expenses', id);
    await State.removeTransactionsByRef(id);
  }

  async function renderList(container) {
    const items = await all();
    container.innerHTML = `
      <div class="page-header">
        <h2>খরচ</h2>
        <button class="btn btn-primary" data-route="expenses/new">+ নতুন খরচ</button>
      </div>
      <div id="expense-list" class="card-list"></div>
    `;
    const listEl = Utils.qs('#expense-list', container);
    if (!items.length) { listEl.innerHTML = `<div class="empty-state">কোনো খরচ নেই</div>`; }
    else {
      listEl.innerHTML = items.map((e) => `
        <div class="card item-card" data-id="${e.id}">
          <div class="item-main">
            <div class="item-title">${Utils.esc(e.category)}</div>
            <div class="item-sub">${Utils.formatDate(e.date)} ${e.description ? '• ' + Utils.esc(e.description) : ''}</div>
          </div>
          <div class="item-main" style="text-align:right; flex:0 0 auto;">
            <b>${Utils.formatCurrency(e.amountMinor)}</b>
          </div>
          <div class="item-actions">
            <button class="icon-btn" data-act="edit" title="সম্পাদনা">✏️</button>
            <button class="icon-btn" data-act="del" title="মুছুন">🗑️</button>
          </div>
        </div>`).join('');
    }
    listEl.addEventListener('click', async (e) => {
      const card = e.target.closest('.item-card');
      if (!card) return;
      const id = card.getAttribute('data-id');
      const act = e.target.getAttribute('data-act');
      if (act === 'edit') Router.go(`expenses/edit/${id}`);
      else if (act === 'del') {
        const ok = await Utils.confirmDialog({ title: 'খরচ মুছবেন?', danger: true });
        if (ok) { await remove(id); Utils.toast('খরচ মুছে ফেলা হয়েছে'); Router.go('expenses'); }
      }
    });
  }

  async function renderForm(container, id) {
    const editing = !!id;
    const e = editing ? await getById(id) : null;
    if (editing && !e) { Router.go('expenses'); return; }
    container.innerHTML = `
      <div class="page-header">
        <button class="icon-btn" data-route="expenses">←</button>
        <h2>${editing ? 'খরচ সম্পাদনা' : 'নতুন খরচ'}</h2>
      </div>
      <form id="expense-form" class="form">
        <label>তারিখ<input class="input" type="date" name="date" value="${e?.date || Utils.todayStr()}"></label>
        <label>ক্যাটাগরি *
          <select class="input" name="category" required>
            ${CATEGORIES.map((c) => `<option value="${c}" ${e?.category === c ? 'selected' : ''}>${c}</option>`).join('')}
          </select>
        </label>
        <label>পরিমাণ (৳) *<input class="input" name="amount" type="number" step="0.01" min="0" required value="${e ? Utils.fromMinor(e.amountMinor) : ''}"></label>
        <label>বিবরণ<textarea class="input" name="description">${Utils.esc(e?.description || '')}</textarea></label>
        <button type="submit" class="btn btn-primary btn-block">${editing ? 'আপডেট করুন' : 'সংরক্ষণ করুন'}</button>
      </form>
    `;
    Utils.qs('#expense-form', container).addEventListener('submit', async (ev) => {
      ev.preventDefault();
      const data = Object.fromEntries(new FormData(ev.target).entries());
      try {
        if (editing) await update(id, data); else await create(data);
        Utils.toast('সংরক্ষণ সম্পন্ন হয়েছে', 'success');
        Router.go('expenses');
      } catch (err) { Utils.toast(err.message, 'error'); }
    });
  }

  return { all, getById, create, update, remove, renderList, renderForm, CATEGORIES };
})();
