// sales.js — Sales CRUD. On save: deducts stock, updates customer receivable balance,
// and writes one row to the central transactions log. Editing/deleting fully reverses prior effects first.
'use strict';

const Sales = (() => {
  const PAYMENT_METHODS = [
    { v: 'cash', l: 'নগদ' }, { v: 'bkash', l: 'বিকাশ' }, { v: 'nagad', l: 'নগদ (মোবাইল)' },
    { v: 'card', l: 'কার্ড' }, { v: 'other', l: 'অন্যান্য' }
  ];

  async function all() {
    const rows = await DB.getAll('sales');
    return rows.sort((a, b) => (a.date < b.date ? 1 : -1) || (a.createdAt < b.createdAt ? 1 : -1));
  }
  async function getById(id) { return DB.get('sales', id); }

  function buildItems(rawItems) {
    if (!rawItems.length) throw new Error('অন্তত একটি পণ্য যোগ করুন');
    return rawItems.map((it) => {
      if (!Utils.validatePositiveNumber(it.qty) || Number(it.qty) <= 0) throw new Error('সঠিক পরিমাণ দিন');
      if (!Utils.validatePositiveNumber(it.unitPrice)) throw new Error('সঠিক মূল্য দিন');
      return {
        productId: it.productId, name: it.name, qty: Number(it.qty),
        unitPriceMinor: Utils.toMinor(it.unitPrice), costPriceMinor: Number(it.costPriceMinor) || 0
      };
    });
  }

  async function applyEffects(sale, sign) {
    // sign = +1 to apply, -1 to reverse
    for (const it of sale.items) {
      await Products.adjustStock(it.productId, -1 * sign * it.qty);
    }
    const total = Accounting.documentTotal(sale.items, sale.discountMinor);
    const dueAmt = Accounting.due(total, sale.paidMinor);
    if (sale.customerId && dueAmt !== 0) {
      await Customers.adjustBalance(sale.customerId, sign * dueAmt);
    }
  }

  async function create(data, rawItems) {
    if (!Utils.validatePositiveNumber(data.discount)) data.discount = 0;
    if (!Utils.validatePositiveNumber(data.paid)) data.paid = 0;
    const items = buildItems(rawItems);
    const sale = {
      date: data.date || Utils.todayStr(),
      customerId: data.customerId || null,
      customerName: data.customerName || 'নগদ গ্রাহক',
      items,
      discountMinor: Utils.toMinor(data.discount),
      paidMinor: Utils.toMinor(data.paid),
      paymentMethod: data.paymentMethod || 'cash',
      note: (data.note || '').trim()
    };
    const total = Accounting.documentTotal(sale.items, sale.discountMinor);
    if (Utils.toMinor(data.paid) > total) throw new Error('পরিশোধিত অর্থ মোট মূল্যের চেয়ে বেশি হতে পারবে না');
    const saved = await DB.add('sales', sale);
    await applyEffects(saved, +1);
    await State.logTransaction({
      type: 'sale', refId: saved.id, date: saved.date, amountMinor: total,
      description: `বিক্রয় — ${saved.customerName}`, partyId: saved.customerId
    });
    return saved;
  }

  async function update(id, data, rawItems) {
    const existing = await getById(id);
    if (!existing) throw new Error('বিক্রয় পাওয়া যায়নি');
    await applyEffects(existing, -1); // reverse old effects first
    const items = buildItems(rawItems);
    const updated = {
      ...existing,
      date: data.date || existing.date,
      customerId: data.customerId || null,
      customerName: data.customerName || 'নগদ গ্রাহক',
      items,
      discountMinor: Utils.toMinor(data.discount || 0),
      paidMinor: Utils.toMinor(data.paid || 0),
      paymentMethod: data.paymentMethod || 'cash',
      note: (data.note || '').trim()
    };
    const total = Accounting.documentTotal(updated.items, updated.discountMinor);
    if (updated.paidMinor > total) { await applyEffects(existing, +1); throw new Error('পরিশোধিত অর্থ মোট মূল্যের চেয়ে বেশি হতে পারবে না'); }
    await DB.put('sales', updated);
    await applyEffects(updated, +1);
    await State.removeTransactionsByRef(id);
    await State.logTransaction({
      type: 'sale', refId: id, date: updated.date, amountMinor: total,
      description: `বিক্রয় — ${updated.customerName}`, partyId: updated.customerId
    });
    return updated;
  }

  async function remove(id) {
    const existing = await getById(id);
    if (!existing) return;
    await applyEffects(existing, -1);
    await DB.remove('sales', id);
    await State.removeTransactionsByRef(id);
  }

  // ---- Rendering ----
  async function renderList(container) {
    const items = await all();
    container.innerHTML = `
      <div class="page-header">
        <h2>বিক্রয়</h2>
        <button class="btn btn-primary" data-route="sales/new">+ নতুন বিক্রয়</button>
      </div>
      <input type="search" class="input search-box" id="sale-search" placeholder="কাস্টমারের নাম দিয়ে খুঁজুন...">
      <div id="sale-list" class="card-list"></div>
    `;
    const listEl = Utils.qs('#sale-list', container);
    function draw(rows) {
      if (!rows.length) { listEl.innerHTML = `<div class="empty-state">কোনো বিক্রয় নেই</div>`; return; }
      listEl.innerHTML = rows.map((s) => {
        const total = Accounting.documentTotal(s.items, s.discountMinor);
        const dueAmt = Accounting.due(total, s.paidMinor);
        return `
        <div class="card item-card" data-id="${s.id}">
          <div class="item-main">
            <div class="item-title">${Utils.esc(s.customerName)}</div>
            <div class="item-sub">${Utils.formatDate(s.date)} • ${s.items.length} পণ্য</div>
            <div class="item-sub">মোট: <b>${Utils.formatCurrency(total)}</b> ${dueAmt > 0 ? `• বাকি: <b class="text-danger">${Utils.formatCurrency(dueAmt)}</b>` : '<span class="tag tag-success">পরিশোধিত</span>'}</div>
          </div>
          <div class="item-actions">
            <button class="icon-btn" data-act="edit" title="সম্পাদনা">✏️</button>
            <button class="icon-btn" data-act="del" title="মুছুন">🗑️</button>
          </div>
        </div>`;
      }).join('');
    }
    draw(items);
    Utils.qs('#sale-search', container).addEventListener('input', Utils.debounce((e) => {
      const q = e.target.value.trim().toLowerCase();
      draw(items.filter((s) => s.customerName.toLowerCase().includes(q)));
    }, 200));
    listEl.addEventListener('click', async (e) => {
      const card = e.target.closest('.item-card');
      if (!card) return;
      const id = card.getAttribute('data-id');
      const act = e.target.getAttribute('data-act');
      if (act === 'edit') Router.go(`sales/edit/${id}`);
      else if (act === 'del') {
        const ok = await Utils.confirmDialog({ title: 'বিক্রয় মুছবেন?', message: 'স্টক ও কাস্টমারের হিসাব পূর্বাবস্থায় ফিরে যাবে।', danger: true });
        if (ok) { await remove(id); Utils.toast('বিক্রয় মুছে ফেলা হয়েছে'); Router.go('sales'); }
      }
    });
  }

  async function renderForm(container, id) {
    const editing = !!id;
    const sale = editing ? await getById(id) : null;
    if (editing && !sale) { Router.go('sales'); return; }
    const [customers, products] = await Promise.all([Customers.all(), Products.all()]);
    let cart = editing ? sale.items.map((it) => ({ ...it })) : [];

    container.innerHTML = `
      <div class="page-header">
        <button class="icon-btn" data-route="sales">←</button>
        <h2>${editing ? 'বিক্রয় সম্পাদনা' : 'নতুন বিক্রয়'}</h2>
      </div>
      <form id="sale-form" class="form">
        <label>তারিখ<input class="input" type="date" name="date" value="${sale?.date || Utils.todayStr()}"></label>
        <label>কাস্টমার
          <select class="input" name="customerId">
            <option value="">নগদ গ্রাহক</option>
            ${customers.map((c) => `<option value="${c.id}" ${sale?.customerId === c.id ? 'selected' : ''}>${Utils.esc(c.name)}</option>`).join('')}
          </select>
        </label>
        <div class="card">
          <h3>পণ্য যোগ করুন</h3>
          <div class="form-row">
            <select class="input" id="item-product">
              <option value="">পণ্য নির্বাচন করুন</option>
              ${products.map((p) => `<option value="${p.id}" data-price="${Utils.fromMinor(p.sellingPriceMinor)}" data-cost="${p.purchasePriceMinor}" data-stock="${p.stockQty}">${Utils.esc(p.name)} (স্টক: ${p.stockQty})</option>`).join('')}
            </select>
          </div>
          <div class="form-row">
            <input class="input" id="item-qty" type="number" min="1" step="1" placeholder="পরিমাণ" value="1">
            <input class="input" id="item-price" type="number" min="0" step="0.01" placeholder="একক মূল্য (৳)">
          </div>
          <button type="button" class="btn btn-secondary btn-block" id="add-item-btn">+ পণ্য যোগ করুন</button>
          <div id="cart-list" class="cart-list"></div>
        </div>
        <div class="form-row">
          <label>ছাড় (৳)<input class="input" name="discount" type="number" min="0" step="0.01" value="${sale ? Utils.fromMinor(sale.discountMinor) : 0}"></label>
          <label>পরিশোধিত (৳)<input class="input" name="paid" type="number" min="0" step="0.01" value="${sale ? Utils.fromMinor(sale.paidMinor) : ''}"></label>
        </div>
        <label>পেমেন্ট মাধ্যম
          <select class="input" name="paymentMethod">
            ${PAYMENT_METHODS.map((m) => `<option value="${m.v}" ${sale?.paymentMethod === m.v ? 'selected' : ''}>${m.l}</option>`).join('')}
          </select>
        </label>
        <label>নোট<textarea class="input" name="note">${Utils.esc(sale?.note || '')}</textarea></label>
        <div class="card total-summary">
          <div class="stat-row"><span>মোট</span><b id="calc-total">৳0</b></div>
          <div class="stat-row"><span>বাকি</span><b id="calc-due">৳0</b></div>
        </div>
        <button type="submit" class="btn btn-primary btn-block">${editing ? 'আপডেট করুন' : 'সংরক্ষণ করুন'}</button>
      </form>
    `;

    const cartListEl = Utils.qs('#cart-list', container);
    const totalEl = Utils.qs('#calc-total', container);
    const dueEl = Utils.qs('#calc-due', container);
    const paidInput = Utils.qs('[name="paid"]', container);
    const discountInput = Utils.qs('[name="discount"]', container);

    function recalc() {
      const total = Accounting.documentTotal(cart, Utils.toMinor(discountInput.value || 0));
      const dueAmt = Accounting.due(total, Utils.toMinor(paidInput.value || 0));
      totalEl.textContent = Utils.formatCurrency(total);
      dueEl.textContent = Utils.formatCurrency(Math.max(0, dueAmt));
    }
    function drawCart() {
      cartListEl.innerHTML = cart.length ? cart.map((it, idx) => `
        <div class="cart-row" data-idx="${idx}">
          <span>${Utils.esc(it.name)} × ${it.qty} @ ${Utils.formatCurrency(it.unitPriceMinor)}</span>
          <b>${Utils.formatCurrency(Accounting.lineTotal(it.qty, it.unitPriceMinor))}</b>
          <button type="button" class="icon-btn" data-remove="${idx}">✕</button>
        </div>`).join('') : `<div class="empty-state small">কোনো পণ্য যোগ করা হয়নি</div>`;
      recalc();
    }
    drawCart();

    const prodSelect = Utils.qs('#item-product', container);
    const priceInput = Utils.qs('#item-price', container);
    prodSelect.addEventListener('change', () => {
      const opt = prodSelect.selectedOptions[0];
      if (opt && opt.value) priceInput.value = opt.getAttribute('data-price');
    });

    Utils.qs('#add-item-btn', container).addEventListener('click', () => {
      const opt = prodSelect.selectedOptions[0];
      const qty = Number(Utils.qs('#item-qty', container).value);
      const price = priceInput.value;
      if (!opt || !opt.value) { Utils.toast('একটি পণ্য নির্বাচন করুন', 'error'); return; }
      if (!qty || qty <= 0) { Utils.toast('সঠিক পরিমাণ দিন', 'error'); return; }
      if (!Utils.validatePositiveNumber(price)) { Utils.toast('সঠিক মূল্য দিন', 'error'); return; }
      const stock = Number(opt.getAttribute('data-stock'));
      const alreadyInCart = cart.filter((c) => c.productId === opt.value).reduce((s, c) => s + c.qty, 0);
      if (!editing && alreadyInCart + qty > stock) { Utils.toast(`স্টকে মাত্র ${stock} টি আছে`, 'error'); return; }
      cart.push({ productId: opt.value, name: opt.textContent.replace(/\s*\(স্টক.*\)$/, ''), qty, unitPriceMinor: Utils.toMinor(price), costPriceMinor: Number(opt.getAttribute('data-cost')) });
      drawCart();
      prodSelect.value = ''; priceInput.value = ''; Utils.qs('#item-qty', container).value = 1;
    });
    cartListEl.addEventListener('click', (e) => {
      const idx = e.target.getAttribute('data-remove');
      if (idx !== null) { cart.splice(Number(idx), 1); drawCart(); }
    });
    paidInput.addEventListener('input', recalc);
    discountInput.addEventListener('input', recalc);

    Utils.qs('#sale-form', container).addEventListener('submit', async (e) => {
      e.preventDefault();
      const fd = new FormData(e.target);
      const data = Object.fromEntries(fd.entries());
      const customer = customers.find((c) => c.id === data.customerId);
      data.customerName = customer ? customer.name : 'নগদ গ্রাহক';
      try {
        if (editing) await update(id, data, cart); else await create(data, cart);
        Utils.toast('বিক্রয় সংরক্ষিত হয়েছে', 'success');
        Router.go('sales');
      } catch (err) { Utils.toast(err.message, 'error'); }
    });
  }

  return { all, getById, create, update, remove, renderList, renderForm, PAYMENT_METHODS };
})();
