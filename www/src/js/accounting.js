// accounting.js — ALL monetary calculations live here. No other file should re-derive these formulas.
// All money in this module is handled in "minor units" (poysha, 1 taka = 100 poysha) as integers.
'use strict';

const Accounting = (() => {

  // ---- Line / document level ----
  function lineTotal(qty, unitPriceMinor) {
    return Math.round(Number(qty) * Number(unitPriceMinor));
  }

  function itemsSubtotal(items) {
    return (items || []).reduce((sum, it) => sum + lineTotal(it.qty, it.unitPriceMinor), 0);
  }

  // total = sum(qty * unitPrice) - discount
  function documentTotal(items, discountMinor) {
    return Math.max(0, itemsSubtotal(items) - (Number(discountMinor) || 0));
  }

  // due = total - paid
  function due(totalMinor, paidMinor) {
    return (Number(totalMinor) || 0) - (Number(paidMinor) || 0);
  }

  // Cost of goods sold for a sale's line items (uses cost price snapshot stored on each item)
  function costOfGoods(items) {
    return (items || []).reduce((sum, it) => sum + Math.round(Number(it.qty) * Number(it.costPriceMinor || 0)), 0);
  }

  function saleGrossProfit(sale) {
    return documentTotal(sale.items, sale.discountMinor) - costOfGoods(sale.items);
  }

  // ---- Aggregate reads (used by Dashboard & Reports) ----

  function inRange(dateStr, startStr, endStr) {
    return dateStr >= startStr && dateStr <= endStr;
  }

  async function salesInRange(startDate, endDate) {
    const all = await DB.getAll('sales');
    return all.filter((s) => inRange(s.date, startDate, endDate));
  }
  async function purchasesInRange(startDate, endDate) {
    const all = await DB.getAll('purchases');
    return all.filter((p) => inRange(p.date, startDate, endDate));
  }
  async function expensesInRange(startDate, endDate) {
    const all = await DB.getAll('expenses');
    return all.filter((e) => inRange(e.date, startDate, endDate));
  }

  async function rangeSummary(startDate, endDate) {
    const [sales, purchases, expenses] = await Promise.all([
      salesInRange(startDate, endDate),
      purchasesInRange(startDate, endDate),
      expensesInRange(startDate, endDate)
    ]);
    const totalSales = sales.reduce((s, x) => s + documentTotal(x.items, x.discountMinor), 0);
    const totalPurchase = purchases.reduce((s, x) => s + documentTotal(x.items, x.discountMinor), 0);
    const totalExpense = expenses.reduce((s, x) => s + (Number(x.amountMinor) || 0), 0);
    const cogs = sales.reduce((s, x) => s + costOfGoods(x.items), 0);
    const grossProfit = totalSales - cogs;
    const netProfit = grossProfit - totalExpense;
    return { sales, purchases, expenses, totalSales, totalPurchase, totalExpense, cogs, grossProfit, netProfit };
  }

  async function todaySummary() {
    const t = Utils.todayStr();
    return rangeSummary(t, t);
  }

  async function totalReceivable() {
    const customers = await DB.getAll('customers');
    return customers.reduce((s, c) => s + Math.max(0, Number(c.balanceMinor) || 0), 0);
  }

  async function totalPayable() {
    const suppliers = await DB.getAll('suppliers');
    return suppliers.reduce((s, sup) => s + Math.max(0, Number(sup.balanceMinor) || 0), 0);
  }

  async function stockValue() {
    const products = await DB.getAll('products');
    return products.reduce((s, p) => s + Math.round((Number(p.stockQty) || 0) * (Number(p.purchasePriceMinor) || 0)), 0);
  }

  async function lowStockProducts() {
    const products = await DB.getAll('products');
    return products.filter((p) => (Number(p.stockQty) || 0) <= (Number(p.minStock) || 0));
  }

  return {
    lineTotal, itemsSubtotal, documentTotal, due, costOfGoods, saleGrossProfit,
    salesInRange, purchasesInRange, expensesInRange, rangeSummary, todaySummary,
    totalReceivable, totalPayable, stockValue, lowStockProducts
  };
})();
