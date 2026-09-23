# 🏪 দোকান হিসাব (Shop Accounting)

ছোট দোকানের জন্য সম্পূর্ণ **অফলাইন** হিসাব-রক্ষণ Android অ্যাপ — বিক্রয়, ক্রয়, খরচ, লাভ-ক্ষতি, বাকি/ধার, কাস্টমার-সাপ্লায়ার হিসাব, স্টক ও রিপোর্ট। ইন্টারনেট ছাড়াই সম্পূর্ণভাবে কাজ করে; কোনো programming জ্ঞান ছাড়াই যে কেউ ব্যবহার করতে পারবেন।

---

## 📲 কীভাবে ডাউনলোড করবেন

1. এই রিপোজিটরির উপরের দিকে ডান পাশে **Releases** এ ক্লিক করুন (অথবা সরাসরি রিপোর `Releases` ট্যাবে যান)।
2. সবচেয়ে উপরে থাকা রিলিজ থেকে **`app-debug.apk`** ফাইলে ট্যাপ করে ডাউনলোড করুন।
3. ডাউনলোড শেষ হলে ফাইলটি ওপেন করুন।
4. প্রথমবার ইনস্টল করার সময় ফোন হয়তো বলবে *"Install blocked"* বা *"অজানা উৎস থেকে অ্যাপ ইনস্টল করা নিষিদ্ধ"* — তখন:
   - **Settings → Security (বা Apps)** এ গিয়ে **"Install unknown apps"** অপশনে যান
   - যে অ্যাপ দিয়ে ফাইলটি খুলেছেন (যেমন Chrome/Files) তাকে অনুমতি দিন
   - আবার ফাইলটি ওপেন করে **Install** চাপুন
5. ইনস্টল শেষে **"দোকান হিসাব"** আইকনে ট্যাপ করে অ্যাপ চালু করুন।

> 🔄 নতুন আপডেট এলে এই একই Releases পেজ থেকে নতুন `app-debug.apk` ডাউনলোড করে আবার ইনস্টল করলেই আপডেট হয়ে যাবে। এতে আপনার আগের হিসাবের ডেটা মুছে যায় না।

---

## 🧭 কীভাবে ব্যবহার করবেন

অ্যাপ খুললেই নিচে ৫টি বাটন পাবেন: **হোম, বিক্রয়, পণ্য, রিপোর্ট, আরও**।

- **🏠 হোম (ড্যাশবোর্ড):** আজকের বিক্রি, খরচ, লাভ, মোট পাওনা-দেনা ও স্টক মূল্য একনজরে দেখা যায়।
- **🛒 বিক্রয়:** নতুন বিক্রয় যোগ করতে "+ নতুন বিক্রয়" চাপুন — কাস্টমার, পণ্য, পরিমাণ, মূল্য, ছাড়, পরিশোধিত টাকা দিন। বাকি থাকলে স্বয়ংক্রিয়ভাবে কাস্টমারের হিসাবে যোগ হবে।
- **📦 পণ্য:** নতুন পণ্য যোগ করুন, ক্রয়-বিক্রয় মূল্য ও স্টক পরিমাণ সেট করুন। বিক্রয়/ক্রয় করলে স্টক এমনিতেই কমবে/বাড়বে।
- **📊 রিপোর্ট:** আজ, গত ৭ দিন, এই মাস বা কাস্টম তারিখ অনুযায়ী বিক্রি-খরচ-লাভের হিসাব দেখুন।
- **☰ আরও:** এখান থেকে পাবেন —
  - **ক্রয়:** সাপ্লায়ারের কাছ থেকে পণ্য কেনার হিসাব
  - **খরচ:** দোকান ভাড়া, বিদ্যুৎ, কর্মচারী বেতন ইত্যাদি
  - **কাস্টমার / সাপ্লায়ার:** প্রতিটি মানুষের নাম, মোবাইল, মোট পাওনা/দেনা ও লেনদেনের ইতিহাস
  - **পেমেন্ট:** কাস্টমারের কাছ থেকে বাকি টাকা নেওয়া বা সাপ্লায়ারকে টাকা পরিশোধ করা রেকর্ড করুন
  - **লেনদেন ইতিহাস:** সব লেনদেনের একটি সম্পূর্ণ তালিকা, সার্চ ও ফিল্টার সহ
  - **সেটিংস:** ডার্ক/লাইট মোড পরিবর্তন, ব্যাকআপ নেওয়া/ফেরানো, এবং প্রয়োজনে সব ডেটা রিসেট করা

### 💾 ব্যাকআপ নেওয়া জরুরি
আপনার সব তথ্য শুধু আপনার ফোনেই সংরক্ষিত থাকে (কোনো সার্ভারে যায় না)। তাই **সেটিংস → ব্যাকআপ এক্সপোর্ট করুন** থেকে নিয়মিত (যেমন সপ্তাহে একবার) একটি ব্যাকআপ ফাইল ডাউনলোড করে রাখুন। ফোন পরিবর্তন বা হারিয়ে গেলে সেই ফাইল দিয়েই নতুন ফোনে **ব্যাকআপ ইম্পোর্ট করুন** দিয়ে সব হিসাব ফিরিয়ে আনতে পারবেন।

---

## ✨ ফিচার সমূহ
- বিক্রয়, ক্রয়, খরচ, লাভ-ক্ষতি, বাকি/ধার হিসাব
- কাস্টমার ও সাপ্লায়ারের আলাদা হিসাব ও লেনদেন ইতিহাস
- পণ্য/স্টক ব্যবস্থাপনা, কম-স্টক সতর্কতা
- দৈনিক/৭দিন/মাসিক/কাস্টম রিপোর্ট
- সম্পূর্ণ কেন্দ্রীয় লেনদেন ইতিহাস, সার্চ ও ফিল্টারসহ
- ব্যাকআপ/রিস্টোর (JSON ফাইল)
- ডার্ক মোড / লাইট মোড
- সম্পূর্ণ অফলাইন — ইন্টারনেট লাগে না

---

## 🛠️ ডেভেলপারদের জন্য (প্রযুক্তিগত তথ্য)

**প্রযুক্তি:** HTML5, CSS3, Vanilla JavaScript (ES6+), Capacitor, IndexedDB — কোনো frontend framework ব্যবহার করা হয়নি।

### Requirements
- Node.js ≥ 18 এবং npm
- Android build-এর জন্য: JDK 17, Android SDK (অথবা এই রিপোর GitHub Actions ব্যবহার করুন)

### Local development (web app হিসেবে)
```bash
npx serve www
# অথবা
python3 -m http.server 8080 --directory www
```

### GitHub setup
```bash
git init
git add .
git commit -m "Initial commit: shop accounting app"
git branch -M main
git remote add origin https://github.com/<your-username>/<your-repo>.git
git push -u origin main
```

### Capacitor setup (local machine)
```bash
npm install
npx cap add android
npx cap sync android
```

### Android build (local machine)
```bash
npx cap open android      # Android Studio-তে খুলবে
# অথবা কমান্ড লাইনে:
cd android
./gradlew assembleDebug
```

### GitHub Actions দিয়ে build ও রিলিজ
`main`/`master`-এ push করলে বা Actions ট্যাব থেকে ম্যানুয়ালি রান করলে workflow স্বয়ংক্রিয়ভাবে:
1. একটি debug APK build করে (`android-icon-assets/`-এর কাস্টম আইকনসহ)
2. `shop-accounting-debug-apk` নামে Actions artifact হিসেবে আপলোড করে
3. `latest` ট্যাগে একটি GitHub **Release** publish/আপডেট করে এবং সেখানে APK যুক্ত করে — যাতে সাধারণ ব্যবহারকারীরা কোনো GitHub অ্যাকাউন্ট ছাড়াই Releases পেজ থেকে সরাসরি ডাউনলোড করতে পারেন

### App icon পরিবর্তন
`android-icon-assets/mipmap-*/` ফোল্ডারে নতুন `ic_launcher.png` ও `ic_launcher_round.png` (একই সাইজ বজায় রেখে) বসিয়ে দিলেই পরবর্তী build-এ নতুন আইকন প্রয়োগ হবে।

### Release signing (Play Store-এর জন্য signed build)
1. `keytool -genkey -v -keystore release-key.keystore -alias shopapp -keyalg RSA -keysize 2048 -validity 10000`
2. `android/app/build.gradle`-এ `signingConfigs` যোগ করুন (keystore ফাইল **কখনো** repo-তে কমিট করবেন না)
3. GitHub Actions দিয়ে চাইলে keystore base64 করে Secrets-এ রাখুন এবং workflow-তে ডিকোড ধাপ যোগ করে `./gradlew bundleRelease`/`assembleRelease` চালান

### Troubleshooting
- **Setup Android SDK ব্যর্থ ("tools" package not found)** → workflow-তে `packages:` স্পষ্টভাবে দেওয়া আছে (`platform-tools build-tools;34.0.0 platforms;android-34`), legacy `tools` প্যাকেজ চাওয়া হচ্ছে না তা নিশ্চিত করুন
- **Gradle build ব্যর্থ** → JDK 17 ও `chmod +x android/gradlew` ঠিক আছে কিনা দেখুন
- **অ্যাপ খুললে সাদা স্ক্রিন** → `npx cap sync android` চালিয়েছেন কিনা, `capacitor.config.json`-এ `webDir: "www"` ঠিক আছে কিনা যাচাই করুন
- **Release publish ব্যর্থ (permission denied)** → workflow ফাইলে `permissions: contents: write` আছে কিনা নিশ্চিত করুন

### Product decisions (সংক্ষেপে)
- মুদ্রার হিসাব float সমস্যা এড়াতে internally পয়সা (১ টাকা = ১০০ পয়সা) হিসেবে integer-এ রাখা হয়
- ক্রয়ের সময় পণ্যের cost price "latest cost" পদ্ধতিতে আপডেট হয় — ছোট দোকানের জন্য সহজ ও যথেষ্ট
- ডেটা লস সম্পর্কিত প্রতিটি সিদ্ধান্তে (রিসেট/ইম্পোর্ট) দুই-ধাপ নিশ্চিতকরণ রাখা হয়েছে

### Security notes
এটি একটি local-first অ্যাপ — কোনো ব্যাকএন্ড সার্ভার নেই। সব ডেটা শুধু ডিভাইসে থাকে। ইনপুট sanitize করা হয় এবং কোথাও `eval()` ব্যবহার করা হয়নি।

---

## 📝 রিপোজিটরি বিবরণ (GitHub Description) ও Topics

**Description:**
> ছোট দোকানের জন্য সম্পূর্ণ অফলাইন হিসাব-রক্ষণ Android অ্যাপ — বিক্রয়, ক্রয়, খরচ, লাভ-ক্ষতি, বাকি হিসাব ও স্টক ব্যবস্থাপনা। HTML5, CSS3, Vanilla JavaScript ও Capacitor দিয়ে তৈরি, সম্পূর্ণ অফলাইন-first।

**Topics:** `shop-management` `accounting-app` `inventory-management` `pos-app` `capacitor` `android-app` `offline-first` `indexeddb` `vanilla-javascript` `small-business`

(GitHub-এর Topics ফিল্ড শুধু ইংরেজি হরফ/সংখ্যা/হাইফেন গ্রহণ করে, তাই এগুলো ইংরেজিতে দেওয়া — বাংলা বিবরণ উপরে দেওয়া হলো)
