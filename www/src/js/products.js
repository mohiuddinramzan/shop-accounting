// products.js — Product/Inventory CRUD + stock adjustment helpers used by Sales & Purchases
'use strict';

const Products = (() => {
  const CATEGORIES_KEY = 'products';

  async function all() {
    const rows = await DB.getAll('products');
    return rows.sort((a, b) => a.name.localeCompare(b.name, 'bn'));
  }

  async function getById(id) { return DB.get('products', id); }

  async function create(data) {
    if (!data.name || !data.name.trim()) throw new Error('পণ্যের নাম আবশ্যক');
    if (!Utils.validatePositiveNumber(data.purchasePrice)) throw new Error('সঠিক ক্রয় মূল্য দিন');
    if (!Utils.validatePositiveNumber(data.sellingPrice)) throw new Error('সঠিক বিক্রয় মূল্য দিন');
    if (!Utils.validatePositiveNumber(data.stockQty)) throw new Error('সঠিক স্টক পরিমাণ দিন');
    const rec = {
      name: data.name.trim(),
      sku: (data.sku || '').trim(),
      category: (data.category || '').trim(),
      purchasePriceMinor: Utils.toMinor(data.purchasePrice),
      sellingPriceMinor: Utils.toMinor(data.sellingPrice),
      stockQty: Number(data.stockQty),
      minStock: Utils.validatePositiveNumber(data.minStock) ? Number(data.minStock) : 0,
      supplierId: data.supplierId || null
    };
    return DB.add('products', rec);
  }

  async function update(id, data) {
    const existing = await getById(id);
    if (!existing) throw new Error('পণ্য পাওয়া যায়নি');
    if (!data.name || !data.name.trim()) throw new Error('পণ্যের নাম আবশ্যক');
    if (!Utils.validatePositiveNumber(data.purchasePrice)) throw new Error('সঠিক ক্রয় মূল্য দিন');
    if (!Utils.validatePositiveNumber(data.sellingPrice)) throw new Error('সঠিক বিক্রয় মূল্য দিন');
    if (!Utils.validatePositiveNumber(data.stockQty)) throw new Error('সঠিক স্টক পরিমাণ দিন');
    const rec = {
      ...existing,
      name: data.name.trim(),
      sku: (data.sku || '').trim(),
      category: (data.category || '').trim(),
      purchasePriceMinor: Utils.toMinor(data.purchasePrice),
      sellingPriceMinor: Utils.toMinor(data.sellingPrice),
      stockQty: Number(data.stockQty),
      minStock: Utils.validatePositiveNumber(data.minStock) ? Number(data.minStock) : 0,
      supplierId: data.supplierId || null
    };
    return DB.put('products', rec);
  }

  async function remove(id) { return DB.remove('products', id); }

  // Called by Sales (delta negative) / Purchases (delta positive) to keep stock in sync
  async function adjustStock(id, delta) {
    const p = await getById(id);
    if (!p) return;
    p.stockQty = (Number(p.stockQty) || 0) + delta;
    await DB.put('products', p);
  }

  // Updates the product's cost basis to the latest purchase price (simple latest-cost method)
  async function setLatestCost(id, costPriceMinor) {
    const p = await getById(id);
    if (!p) return;
    p.purchasePriceMinor = costPriceMinor;
    await DB.put('products', p);
  }

  // ---- Rendering ----
  async function renderList(container) {
    const items = await all();
    container.innerHTML = `
      <div class="page-header">
        <h2>পণ্য / স্টক</h2>
        <button class="btn btn-primary" data-route="products/new">+ নতুন পণ্য</button>
      </div>
      <input type="search" class="input search-box" id="product-search" placeholder="পণ্য খুঁজুন...">
      <div id="product-list" class="card-list"></div>
    `;
    const listEl = Utils.qs('#product-list', container);
    function draw(rows) {
      if (!rows.length) { listEl.innerHTML = `<div class="empty-state">কোনো পণ্য পাওয়া যায়নি</div>`; return; }
      listEl.innerHTML = rows.map((p) => `
        <div class="card item-card" data-id="${p.id}">
          <div class="item-main">
            <div class="item-title">${Utils.esc(p.name)} ${p.sku ? `<span class="tag">${Utils.esc(p.sku)}</span>` : ''}</div>
            <div class="item-sub">${Utils.esc(p.category || 'বিবিধ')} • স্টক: <b class="${p.stockQty <= p.minStock ? 'text-danger' : ''}">${p.stockQty}</b></div>
            <div class="item-sub">ক্রয়: ${Utils.formatCurrency(p.purchasePriceMinor)} • বিক্রয়: ${Utils.formatCurrency(p.sellingPriceMinor)}</div>
          </div>
          <div class="item-actions">
            <button class="icon-btn" data-act="edit" title="সম্পাদনা">✏️</button>
            <button class="icon-btn" data-act="del" title="মুছুন">🗑️</button>
          </div>
        </div>`).join('');
    }
    draw(items);
    Utils.qs('#product-search', container).addEventListener('input', Utils.debounce((e) => {
      const q = e.target.value.trim().toLowerCase();
      draw(items.filter((p) => p.name.toLowerCase().includes(q) || (p.sku || '').toLowerCase().includes(q)));
    }, 200));

    listEl.addEventListener('click', async (e) => {
      const card = e.target.closest('.item-card');
      if (!card) return;
      const id = card.getAttribute('data-id');
      const act = e.target.getAttribute('data-act');
      if (act === 'edit') { Router.go(`products/edit/${id}`); }
      else if (act === 'del') {
        const ok = await Utils.confirmDialog({ title: 'পণ্য মুছবেন?', message: 'এই পণ্যটি স্থায়ীভাবে মুছে ফেলা হবে।', danger: true });
        if (ok) { await remove(id); Utils.toast('পণ্য মুছে ফেলা হয়েছে'); Router.go('products'); }
      }
    });
  }

  async function renderForm(container, id) {
    const editing = !!id;
    const p = editing ? await getById(id) : null;
    if (editing && !p) { Router.go('products'); return; }
    container.innerHTML = `
      <div class="page-header">
        <button class="icon-btn" data-route="products">←</button>
        <h2>${editing ? 'পণ্য সম্পাদনা' : 'নতুন পণ্য'}</h2>
      </div>
      <form id="product-form" class="form">
        <label>পণ্যের নাম *<input class="input" name="name" required value="${Utils.esc(p?.name || '')}"></label>
        <label>SKU/কোড<input class="input" name="sku" value="${Utils.esc(p?.sku || '')}"></label>
        <label>ক্যাটাগরি<input class="input" name="category" value="${Utils.esc(p?.category || '')}"></label>
        <div class="form-row">
          <label>ক্রয় মূল্য (৳) *<input class="input" name="purchasePrice" type="number" step="0.01" min="0" required value="${p ? Utils.fromMinor(p.purchasePriceMinor) : ''}"></label>
          <label>বিক্রয় মূল্য (৳) *<input class="input" name="sellingPrice" type="number" step="0.01" min="0" required value="${p ? Utils.fromMinor(p.sellingPriceMinor) : ''}"></label>
        </div>
        <div class="form-row">
          <label>স্টক পরিমাণ *<input class="input" name="stockQty" type="number" step="1" min="0" required value="${p ? p.stockQty : ''}"></label>
          <label>ন্যূনতম স্টক সতর্কতা<input class="input" name="minStock" type="number" step="1" min="0" value="${p ? p.minStock : 0}"></label>
        </div>
        <button type="submit" class="btn btn-primary btn-block">${editing ? 'আপডেট করুন' : 'সংরক্ষণ করুন'}</button>
      </form>
    `;
    Utils.qs('#product-form', container).addEventListener('submit', async (e) => {
      e.preventDefault();
      const fd = new FormData(e.target);
      const data = Object.fromEntries(fd.entries());
      try {
        if (editing) await update(id, data); else await create(data);
        Utils.toast('সংরক্ষণ সম্পন্ন হয়েছে', 'success');
        Router.go('products');
      } catch (err) { Utils.toast(err.message, 'error'); }
    });
  }

  return { all, getById, create, update, remove, adjustStock, setLatestCost, renderList, renderForm };
})();
