# দোকান হিসাব (Shop Accounting)

ছোট দোকানের জন্য সম্পূর্ণ **অফলাইন** হিসাব-রক্ষণ Android অ্যাপ — বিক্রয়, ক্রয়, খরচ, লাভ-ক্ষতি, বাকি/ধার, কাস্টমার-সাপ্লায়ার হিসাব, স্টক ও রিপোর্ট। শুধু **HTML5 + CSS3 + Vanilla JavaScript + Capacitor + IndexedDB** দিয়ে তৈরি — কোনো frontend framework নেই।

## Features
- ড্যাশবোর্ড: আজকের বিক্রি/খরচ/লাভ, মোট পাওনা/দেনা, স্টক মূল্য, সাম্প্রতিক লেনদেন
- বিক্রয় ও ক্রয়: একাধিক পণ্য, ছাড়, বাকি হিসাব — সেভ করলেই স্টক ও পার্টির হিসাব স্বয়ংক্রিয়ভাবে আপডেট হয়
- খরচ: ক্যাটাগরি-ভিত্তিক (দোকান ভাড়া, বিদ্যুৎ, কর্মচারী, পরিবহন, খাবার, অন্যান্য)
- কাস্টমার ও সাপ্লায়ার: প্রোফাইল, পাওনা/দেনা ব্যালেন্স, পূর্ণ লেনদেন ইতিহাস
- পণ্য/স্টক: ক্রয়-বিক্রয় মূল্য, স্বয়ংক্রিয় স্টক আপডেট, কম-স্টক সতর্কতা
- পেমেন্ট: কাস্টমার ও সাপ্লায়ার পেমেন্ট আলাদাভাবে রেকর্ড
- রিপোর্ট: আজ / গত ৭ দিন / এই মাস / কাস্টম তারিখ
- কেন্দ্রীয় লেনদেন ইতিহাস — সার্চ ও ফিল্টার সহ
- ব্যাকআপ: JSON export/import, নিশ্চিতকরণসহ ফুল রিসেট
- ডার্ক/লাইট মোড, বাংলা টাকার ফরম্যাট (৳), সম্পূর্ণ অফলাইন-first

## Requirements
- Node.js ≥ 18 এবং npm
- Android build-এর জন্য: JDK 17, Android Studio / Android SDK (অথবা GitHub Actions ব্যবহার করুন, নিচে দেখুন)

## Local development (as a web app)
কোনো build step লাগে না — এটি খাঁটি static HTML/CSS/JS।
```bash
# প্রজেক্ট ফোল্ডারে গিয়ে যেকোনো static server চালান, যেমন:
npx serve www
# অথবা
python3 -m http.server 8080 --directory www
```
ব্রাউজারে `http://localhost:8080` (বা serve-এর দেখানো ঠিকানা) খুলুন। Chrome DevTools → Toggle device toolbar দিয়ে মোবাইল ভিউ দেখুন।

## GitHub setup
```bash
git init
git add .
git commit -m "Initial commit: shop accounting app"
git branch -M main
git remote add origin https://github.com/<your-username>/<your-repo>.git
git push -u origin main
```

## Capacitor setup (local machine)
```bash
npm install
npx cap add android      # Android platform তৈরি করে (একবারই)
npx cap sync android      # www/ ফোল্ডারের পরিবর্তন Android প্রজেক্টে কপি করে
```
কোনো কোড পরিবর্তনের পর সবসময় `npx cap sync android` চালাবেন।

## Android build (local machine)
```bash
npx cap open android      # Android Studio-তে খুলবে — সেখান থেকে Run/Build করুন
# অথবা কমান্ড লাইনে:
cd android
./gradlew assembleDebug   # Debug APK: android/app/build/outputs/apk/debug/
```

## GitHub Actions দিয়ে build
`.github/workflows/android.yml` push করলে বা GitHub-এর Actions ট্যাব থেকে ম্যানুয়ালি রান করলে স্বয়ংক্রিয়ভাবে একটি **debug APK** build হয় (কোনো signing secret ছাড়াই)।

**APK কোথায় পাওয়া যাবে:** GitHub repo → **Actions** ট্যাব → সংশ্লিষ্ট workflow run → **Artifacts** সেকশন → `shop-accounting-debug-apk` ডাউনলোড করুন।

## Backup / Restore
অ্যাপের **সেটিংস** পেজ থেকে:
- **এক্সপোর্ট**: পুরো ডেটাবেস একটি `.json` ফাইল হিসেবে ডাউনলোড হয়
- **ইম্পোর্ট**: `.json` ব্যাকআপ ফাইল বেছে নিলে নিশ্চিতকরণের পর বর্তমান ডেটা প্রতিস্থাপিত হয়
- **রিসেট**: দুই ধাপে নিশ্চিতকরণের পর সব ডেটা মুছে যায় (এটি ফেরানো যায় না — আগে ব্যাকআপ নিন)

নিয়মিত ব্যাকআপ নেওয়ার অভ্যাস রাখুন, কারণ সব ডেটা শুধু ডিভাইসের IndexedDB-তে সংরক্ষিত থাকে।

## Release signing (production APK/AAB)
Play Store-এ দেওয়ার জন্য signed release লাগবে:
1. `keytool -genkey -v -keystore release-key.keystore -alias shopapp -keyalg RSA -keysize 2048 -validity 10000`
2. `android/app/build.gradle`-এ `signingConfigs` যোগ করুন এবং `release-key.keystore` পাথ দিন (keystore ফাইলটি **কখনো** repo-তে কমিট করবেন না)
3. GitHub Actions দিয়ে signed build চাইলে keystore-কে base64 করে GitHub Secrets-এ (`KEYSTORE_BASE64`, `KEYSTORE_PASSWORD`, `KEY_ALIAS`, `KEY_PASSWORD`) রাখুন এবং workflow-তে একটি ধাপ যোগ করুন যা secret ডিকোড করে ফাইল তৈরি করবে, তারপর `./gradlew bundleRelease` বা `assembleRelease` চালান
4. AAB ফাইল পাবেন `android/app/build/outputs/bundle/release/` এ

## Troubleshooting
- **`npx cap add android` এ error** → আগে `npm install` চালিয়েছেন কিনা এবং Node ≥ 18 কিনা যাচাই করুন
- **Gradle build ব্যর্থ** → JDK 17 ব্যবহার করছেন কিনা, এবং `android/gradlew`-এর execute permission (`chmod +x android/gradlew`) আছে কিনা দেখুন
- **অ্যাপ খুললে সাদা স্ক্রিন** → `npx cap sync android` চালিয়েছেন কিনা নিশ্চিত করুন; `capacitor.config.json`-এ `webDir: "www"` ঠিক আছে কিনা দেখুন
- **ডেটা হারিয়ে গেছে মনে হচ্ছে** → ব্রাউজার/অ্যাপ ডেটা ক্লিয়ার করলে IndexedDB মুছে যায়; নিয়মিত এক্সপোর্ট ব্যাকআপ রাখুন
- **GitHub Actions-এ build সময় বেশি লাগছে** → প্রথম রান-এ Android SDK ডাউনলোড হওয়ায় স্বাভাবিক দেরি হয়; পরবর্তী রানে caching সাহায্য করবে (workflow-তে ক্যাশ যোগ করে অপ্টিমাইজ করা যায়)

## Product decisions (সংক্ষেপে)
- মুদ্রার হিসাব float সমস্যা এড়াতে internally পয়সা (১ টাকা = ১০০ পয়সা) হিসেবে integer-এ রাখা হয়
- ক্রয়ের সময় পণ্যের cost price "latest cost" পদ্ধতিতে আপডেট হয় (weighted-average নয়) — ছোট দোকানের জন্য সহজ ও যথেষ্ট
- ব্যাকআপ/রিস্টোর ও ডেটা লস সম্পর্কিত কোনো সিদ্ধান্তে দুই-ধাপ নিশ্চিতকরণ রাখা হয়েছে

## Security notes
এটি একটি local-first অ্যাপ — কোনো ব্যাকএন্ড সার্ভার নেই। সব ডেটা শুধু ডিভাইসে থাকে, তাই ডিভাইস হারালে/রিসেট হলে ব্যাকআপ ছাড়া ডেটা পুনরুদ্ধার সম্ভব নয়। ইনপুট sanitize করা হয় ও `eval()` কোথাও ব্যবহার করা হয়নি।
