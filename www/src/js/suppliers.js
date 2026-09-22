// suppliers.js — instantiates the shared party factory (see customers.js) for Suppliers.
'use strict';

const Suppliers = createPartyModule('suppliers', {
  title: 'সাপ্লায়ার', singular: 'সাপ্লায়ার', route: 'suppliers',
  balanceLabel: 'মোট দেনা', paidLabel: 'মোট পরিশোধ', docStore: 'purchases', docPartyField: 'supplierId', paymentType: 'supplier'
});
