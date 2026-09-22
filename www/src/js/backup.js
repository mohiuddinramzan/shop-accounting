// backup.js — Export/Import the entire database as a JSON file, and a guarded full reset.
'use strict';

const Backup = (() => {

  async function exportBackup() {
    const data = await DB.exportAll();
    const json = JSON.stringify(data, null, 2);
    const blob = new Blob([json], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    const stamp = Utils.todayStr();
    a.href = url;
    a.download = `shop-backup-${stamp}.json`;
    document.body.appendChild(a);
    a.click();
    a.remove();
    setTimeout(() => URL.revokeObjectURL(url), 2000);
    Utils.toast('ব্যাকআপ ডাউনলোড হয়েছে', 'success');
  }

  function readFileAsJson(file) {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => {
        try { resolve(JSON.parse(reader.result)); }
        catch (e) { reject(new Error('এই ফাইলটি সঠিক ব্যাকআপ JSON ফাইল নয়')); }
      };
      reader.onerror = () => reject(new Error('ফাইল পড়া যায়নি'));
      reader.readAsText(file);
    });
  }

  async function importBackup(file) {
    const ok = await Utils.confirmDialog({
      title: 'ব্যাকআপ ইম্পোর্ট করবেন?',
      message: 'বর্তমান সব ডেটা মুছে ব্যাকআপ ফাইলের ডেটা দিয়ে প্রতিস্থাপিত হবে। এই কাজটি পূর্বাবস্থায় ফেরানো যাবে না।',
      confirmText: 'ইম্পোর্ট করুন', danger: true
    });
    if (!ok) return false;
    const data = await readFileAsJson(file);
    await DB.importAll(data);
    Utils.toast('ব্যাকআপ সফলভাবে ইম্পোর্ট হয়েছে', 'success');
    return true;
  }

  async function resetAll() {
    const ok1 = await Utils.confirmDialog({
      title: 'সব ডেটা মুছবেন?',
      message: 'দোকানের সব বিক্রয়, ক্রয়, খরচ, কাস্টমার, সাপ্লায়ার ও পণ্যের তথ্য স্থায়ীভাবে মুছে যাবে।',
      confirmText: 'হ্যাঁ, মুছুন', danger: true
    });
    if (!ok1) return false;
    const ok2 = await Utils.confirmDialog({
      title: 'আপনি কি সম্পূর্ণ নিশ্চিত?',
      message: 'এই কাজটি একবার হয়ে গেলে ফেরানোর কোনো উপায় নেই। আগে ব্যাকআপ নিয়ে রাখার পরামর্শ দেওয়া হচ্ছে।',
      confirmText: 'হ্যাঁ, সব মুছে দিন', danger: true
    });
    if (!ok2) return false;
    await DB.clearAll();
    Utils.toast('সব ডেটা মুছে ফেলা হয়েছে', 'success');
    return true;
  }

  return { exportBackup, importBackup, resetAll };
})();
