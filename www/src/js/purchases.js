// purchases.js — Purchase CRUD. On save: adds stock, updates the product's cost basis,
// updates supplier payable balance, and writes to the central transactions log.
'use strict';

const Purchases = (() => {
  async function all() {
    const rows = await DB.getAll('purchases');
    return rows.sort((a, b) => (a.date < b.date ? 1 : -1) || (a.createdAt < b.createdAt ? 1 : -1));
  }
  async function getById(id) { return DB.get('purchases', id); }

  function buildItems(rawItems) {
    if (!rawItems.length) throw new Error('অন্তত একটি পণ্য যোগ করুন');
    return rawItems.map((it) => {
      if (!Utils.validatePositiveNumber(it.qty) || Number(it.qty) <= 0) throw new Error('সঠিক পরিমাণ দিন');
      if (!Utils.validatePositiveNumber(it.unitPrice)) throw new Error('সঠিক মূল্য দিন');
      return { productId: it.productId, name: it.name, qty: Number(it.qty), unitPriceMinor: Utils.toMinor(it.unitPrice), costPriceMinor: Utils.toMinor(it.unitPrice) };
    });
  }

  async function applyEffects(purchase, sign) {
    for (const it of purchase.items) {
      await Products.adjustStock(it.productId, sign * it.qty);
      if (sign > 0) await Products.setLatestCost(it.productId, it.unitPriceMinor);
    }
    const total = Accounting.documentTotal(purchase.items, purchase.discountMinor);
    const dueAmt = Accounting.due(total, purchase.paidMinor);
    if (purchase.supplierId && dueAmt !== 0) {
      await Suppliers.adjustBalance(purchase.supplierId, sign * dueAmt);
    }
  }

  async function create(data, rawItems) {
    const items = buildItems(rawItems);
    const purchase = {
      date: data.date || Utils.todayStr(),
      supplierId: data.supplierId || null,
      supplierName: data.supplierName || 'সাধারণ সাপ্লায়ার',
      items,
      discountMinor: Utils.toMinor(data.discount || 0),
      paidMinor: Utils.toMinor(data.paid || 0),
      note: (data.note || '').trim()
    };
    const total = Accounting.documentTotal(purchase.items, purchase.discountMinor);
    if (purchase.paidMinor > total) throw new Error('পরিশোধিত অর্থ মোট মূল্যের চেয়ে বেশি হতে পারবে না');
    const saved = await DB.add('purchases', purchase);
    await applyEffects(saved, +1);
    await State.logTransaction({ type: 'purchase', refId: saved.id, date: saved.date, amountMinor: total, description: `ক্রয় — ${saved.supplierName}`, partyId: saved.supplierId });
    return saved;
  }

  async function update(id, data, rawItems) {
    const existing = await getById(id);
    if (!existing) throw new Error('ক্রয় পাওয়া যায়নি');
    await applyEffects(existing, -1);
    const items = buildItems(rawItems);
    const updated = {
      ...existing, date: data.date || existing.date, supplierId: data.supplierId || null,
      supplierName: data.supplierName || 'সাধারণ সাপ্লায়ার', items,
      discountMinor: Utils.toMinor(data.discount || 0), paidMinor: Utils.toMinor(data.paid || 0), note: (data.note || '').trim()
    };
    const total = Accounting.documentTotal(updated.items, updated.discountMinor);
    if (updated.paidMinor > total) { await applyEffects(existing, +1); throw new Error('পরিশোধিত অর্থ মোট মূল্যের চেয়ে বেশি হতে পারবে না'); }
    await DB.put('purchases', updated);
    await applyEffects(updated, +1);
    await State.removeTransactionsByRef(id);
    await State.logTransaction({ type: 'purchase', refId: id, date: updated.date, amountMinor: total, description: `ক্রয় — ${updated.supplierName}`, partyId: updated.supplierId });
    return updated;
  }

  async function remove(id) {
    const existing = await getById(id);
    if (!existing) return;
    await applyEffects(existing, -1);
    await DB.remove('purchases', id);
    await State.removeTransactionsByRef(id);
  }

  async function renderList(container) {
    const items = await all();
    container.innerHTML = `
      <div class="page-header">
        <h2>ক্রয়</h2>
        <button class="btn btn-primary" data-route="purchases/new">+ নতুন ক্রয়</button>
      </div>
      <input type="search" class="input search-box" id="purchase-search" placeholder="সাপ্লায়ারের নাম দিয়ে খুঁজুন...">
      <div id="purchase-list" class="card-list"></div>
    `;
    const listEl = Utils.qs('#purchase-list', container);
    function draw(rows) {
      if (!rows.length) { listEl.innerHTML = `<div class="empty-state">কোনো ক্রয় নেই</div>`; return; }
      listEl.innerHTML = rows.map((p) => {
        const total = Accounting.documentTotal(p.items, p.discountMinor);
        const dueAmt = Accounting.due(total, p.paidMinor);
        return `
        <div class="card item-card" data-id="${p.id}">
          <div class="item-main">
            <div class="item-title">${Utils.esc(p.supplierName)}</div>
            <div class="item-sub">${Utils.formatDate(p.date)} • ${p.items.length} পণ্য</div>
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
    Utils.qs('#purchase-search', container).addEventListener('input', Utils.debounce((e) => {
      const q = e.target.value.trim().toLowerCase();
      draw(items.filter((p) => p.supplierName.toLowerCase().includes(q)));
    }, 200));
    listEl.addEventListener('click', async (e) => {
      const card = e.target.closest('.item-card');
      if (!card) return;
      const id = card.getAttribute('data-id');
      const act = e.target.getAttribute('data-act');
      if (act === 'edit') Router.go(`purchases/edit/${id}`);
      else if (act === 'del') {
        const ok = await Utils.confirmDialog({ title: 'ক্রয় মুছবেন?', message: 'স্টক ও সাপ্লায়ারের হিসাব পূর্বাবস্থায় ফিরে যাবে।', danger: true });
        if (ok) { await remove(id); Utils.toast('ক্রয় মুছে ফেলা হয়েছে'); Router.go('purchases'); }
      }
    });
  }

  async function renderForm(container, id) {
    const editing = !!id;
    const purchase = editing ? await getById(id) : null;
    if (editing && !purchase) { Router.go('purchases'); return; }
    const [suppliers, products] = await Promise.all([Suppliers.all(), Products.all()]);
    let cart = editing ? purchase.items.map((it) => ({ ...it })) : [];

    container.innerHTML = `
      <div class="page-header">
        <button class="icon-btn" data-route="purchases">←</button>
        <h2>${editing ? 'ক্রয় সম্পাদনা' : 'নতুন ক্রয়'}</h2>
      </div>
      <form id="purchase-form" class="form">
        <label>তারিখ<input class="input" type="date" name="date" value="${purchase?.date || Utils.todayStr()}"></label>
        <label>সাপ্লায়ার
          <select class="input" name="supplierId">
            <option value="">সাধারণ সাপ্লায়ার</option>
            ${suppliers.map((s) => `<option value="${s.id}" ${purchase?.supplierId === s.id ? 'selected' : ''}>${Utils.esc(s.name)}</option>`).join('')}
          </select>
        </label>
        <div class="card">
          <h3>পণ্য যোগ করুন</h3>
          <div class="form-row">
            <select class="input" id="item-product">
              <option value="">পণ্য নির্বাচন করুন</option>
              ${products.map((p) => `<option value="${p.id}" data-price="${Utils.fromMinor(p.purchasePriceMinor)}">${Utils.esc(p.name)}</option>`).join('')}
            </select>
          </div>
          <div class="form-row">
            <input class="input" id="item-qty" type="number" min="1" step="1" placeholder="পরিমাণ" value="1">
            <input class="input" id="item-price" type="number" min="0" step="0.01" placeholder="ক্রয় মূল্য (৳)">
          </div>
          <button type="button" class="btn btn-secondary btn-block" id="add-item-btn">+ পণ্য যোগ করুন</button>
          <div id="cart-list" class="cart-list"></div>
        </div>
        <div class="form-row">
          <label>ছাড় (৳)<input class="input" name="discount" type="number" min="0" step="0.01" value="${purchase ? Utils.fromMinor(purchase.discountMinor) : 0}"></label>
          <label>পরিশোধিত (৳)<input class="input" name="paid" type="number" min="0" step="0.01" value="${purchase ? Utils.fromMinor(purchase.paidMinor) : ''}"></label>
        </div>
        <label>নোট<textarea class="input" name="note">${Utils.esc(purchase?.note || '')}</textarea></label>
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
      cart.push({ productId: opt.value, name: opt.textContent, qty, unitPriceMinor: Utils.toMinor(price), costPriceMinor: Utils.toMinor(price) });
      drawCart();
      prodSelect.value = ''; priceInput.value = ''; Utils.qs('#item-qty', container).value = 1;
    });
    cartListEl.addEventListener('click', (e) => {
      const idx = e.target.getAttribute('data-remove');
      if (idx !== null) { cart.splice(Number(idx), 1); drawCart(); }
    });
    paidInput.addEventListener('input', recalc);
    discountInput.addEventListener('input', recalc);

    Utils.qs('#purchase-form', container).addEventListener('submit', async (e) => {
      e.preventDefault();
      const data = Object.fromEntries(new FormData(e.target).entries());
      const supplier = suppliers.find((s) => s.id === data.supplierId);
      data.supplierName = supplier ? supplier.name : 'সাধারণ সাপ্লায়ার';
      try {
        if (editing) await update(id, data, cart); else await create(data, cart);
        Utils.toast('ক্রয় সংরক্ষিত হয়েছে', 'success');
        Router.go('purchases');
      } catch (err) { Utils.toast(err.message, 'error'); }
    });
  }

  return { all, getById, create, update, remove, renderList, renderForm };
})();
