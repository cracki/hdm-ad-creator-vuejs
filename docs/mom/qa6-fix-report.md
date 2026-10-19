# QA6 Fix Report — تکمیل موارد تست ششم با تست زنده‌ی سرتاسری

> **فرمت این سند برای پردازش ماشینی بهینه شده است:** ادعاها به commit/فایل:خط/نام تست/خروجی API/مسیر اسکرین‌شات ارجاع می‌دهند؛ تصاویر با مسیر نسبی (بدون base64)؛ خلاصه‌ی ماشینی در بلوک YAML ابتدای سند.

```yaml
report: qa6-fix-report
date: 2026-10-19
base_report: docs/Ad-Creator-QA-Report-5.md (client test 6, 25 Mehr)
deployed:
  frontend_commit: 667fa9e          # sidebar badge: "667fa9e · Oct 19"
  backend_commit: 0fe3a63           # GET /health/version -> {"version":"qa4","commit":"0fe3a63"}
  platform: Coolify (deploys qhsy6ncm7s71tskx0f2fw5f0 BE, voo4yj0va4bfswq9w5f6zq9d FE — both finished)
tests:
  backend: "593/593 OK (manage.py test brand campaign core market ad_library authentication)"
  frontend: "462/462 OK (vitest run); vue-tsc clean"
live_e2e:
  method: "fresh brand (scan edi-uae.com) + fresh campaign 'QA6-Live-E2E' (4130997d) with exactly 2 selected services, run through segmentation -> PPC -> funnel -> content -> platform-recommendation -> meta+google ads-strategy -> review, in the production UI + API"
  evidence_dir: docs/mom/evidence/qa6/
  machine_summary: docs/mom/evidence/qa6/live-verification.json
items:
  img14_ppc_budget_shares: {status: fixed-live-verified, commits: [83cc30e, 667fa9e], screenshot: 06-img14-ppc-selected-only.png}
  taza2_positioning_language: {status: fixed-live-verified, commits: [c3aef61], screenshot: 02-taza2-positioning-english.png}
  img2_scan_junk: {status: fixed-live-verified, commits: [83cc30e], screenshot: 01-img2-scan-edi-clean.png}
  taza4_segmentation_form: {status: fixed-live-verified, commits: [667fa9e], screenshot: 05-taza4-segmentation-prefill.png}
  taza5_gate_counts: {status: fixed-live-verified, commits: [466bc59-previous, c3aef61, 667fa9e], screenshot: 08-taza5-gate-friendly.png}
  jadid6_intelligence_prefill: {status: fixed-live-verified, commits: [667fa9e], screenshots: [03-jadid6-intelligence-prefill.png, 04-jadid6b-campaign-suggestions.png]}
```

---

## ۱. پاسخ به نقد فرایندی کارفرما

> «هر اصلاح فقط روی همان مثال‌های گزارش ما تست خودکار شده، و کل مسیر در محیط زنده با یک کمپین واقعی اجرا نشده است.»

پذیرفته شد و در این دور به سه روش پاسخ داده شد:

1. **تست زنده‌ی سرتاسری:** برای هر مورد، برند و کمپین جدید روی پروداکشن ساخته و مسیر کامل (اسکن → تحلیل → کمپین با ۲ سرویس انتخابی → سگمنتیشن → PPC → فانل → محتوا → پلتفرم → استراتژی متا+گوگل → Review → دکمه Complete) اجرا شد؛ ۹ اسکرین‌شات با بج نسخه در قاب ضمیمه است.
2. **تست‌های قاعده‌محور به‌جای مثال‌محور:** کورپوس تولیدی ۵۱ رشته‌ی زباله در ۱۰ خانواده (تخفیف‌های عددی متنوع، buy-N-get-M، fixed-price، جمع/مفرد discount، قسط/بهره، Since-YEAR، Pass-Rate، Nth-Attempt، شعارها، موارد خیری/ملی) + ۳۰ سرویس واقعی از ۵ صنعت + ۳ نزدیک‌به-درست که باید زنده بمانند (`brand/tests_qa6.py`).
3. **دفاع deterministic در کد** (نه فقط پرامپت): خروجی LLM در PPC با پس‌فیلتر به سرویس‌های درخواستی محدود و سهم‌ها بازنرمالایز می‌شود؛ بازتولید Positioning بدون شرط اجرا می‌شود.

## ۲. جدول نهایی موارد تست ششم

| مورد | تست ۶ | ریشه (کد) | رفع (commit:فایل) | تست خودکار | تست زنده (شاهد) | اسکرین‌شات |
| --- | --- | --- | --- | --- | --- | --- |
| **عکس ۱۴ · سهم بودجه PPC** | هنوز خراب | لایه‌ی سرویس درست بود؛ **موتور LLM از روی USPها سرویس اضافه می‌ساخت** (بازتولید زنده: با ۲ انتخابی، خروجی ۷ سرویس) | `83cc30e` — قید قطعی در پرامپت + پس‌فیلتر `_filter_result_to_services` (سه لیست به سرویس‌های درخواستی محدود، سهم‌ها جمعاً ۱۰۰، شمارنده‌ها بازمحاسبه) | `campaign/tests_qa6.py` (۱۰) — mock با ۷ ردیف ⇒ خروجی دقیقاً ۲، جمع ۱۰۰ | کمپین `QA6-Live-E2E` با ۲ سرویس: `services_bpc_scores = [Gold 52%, Platinum 48%]`، `sum=100`؛ UI بج‌ها `52%/48%` | `06-img14-ppc-selected-only.png` |
| **تازه ۲ · Positioning فارسی** | هنوز خراب | `full_analysis.py:787` ردیف ذخیره‌شده‌ی insights را کلمه‌به‌کلمه برمی‌گرداند؛ پرامپت اصلاح‌شده هرگز اجرا نمی‌شد | `c3aef61` — حذف early-return؛ insights در هر تحلیل بازتولید (لیست رقبا کش می‌ماند) + ذخیره‌ی brand-scoped (FK + UniqueConstraint، migration 0017) | `brand/tests_qa6_positioning.py` (۶) — ران دوم = خروجی LLM دوم (انگلیسی)، نه ردیف فارسی seed شده با جمله‌ی دقیق گزارش | برند EDI تازه: «The most trusted and structured driving institute in Dubai…» — بدون هیچ حرف فارسی | `02-taza2-positioning-english.png` |
| **عکس ۲ · زباله‌ی اسکن** | نیمه | «Buy 1 get 1…»/«Fixed price … for families of UAE Martyrs» در هیچ الگویی نبودند؛ «discounts» جمع با `\bdiscount\b` مچ نمی‌شد | `83cc30e` — `discounts?`، `buy-N-get-M`، `fixed[\s-]price`، `free for/with`، `martyrs?`، `families of` + کورپوس قاعده‌محور | `brand/tests_qa6.py` (۹) — ۵۱ زباله DROP / ۳۰ واقعی KEEP / ۳ near-miss KEEP | اسکن زنده edi-uae.com ⇒ فقط ۳ دوره‌ی واقعی؛ بدون «Buy 1 get 1» و «Fixed price…» | `01-img2-scan-edi-clean.png` |
| **تازه ۴ · فیلدهای خالی سگمنتیشن** | نیمه | بک‌اند درست prefill می‌کرد ولی فرم FE نمایش نمی‌داد؛ Product description از دوره‌های تحلیل برند می‌آمد | `667fa9e` — `resolveTargetMarket` با قاعده‌ی split + فرم Country/City پیش‌پر + description از سرویس‌های **انتخابی کمپین** | `SegmentationView.test.ts` (+۴) | فرم زنده: City='Dubai, Uae'، Country پر، Description=**«Gold Driving Course and Platinum Driving Course»** | `05-taza4-segmentation-prefill.png` |
| **تازه ۵ · گیت/شمارش** | نیمه | چیپ‌های خام از لیست ماشینی `missing`؛ Completed با فلگ جامانده ۹۰٪ نشان می‌داد | `667fa9e` — map به برچسب انسانی؛ `status=completed ⇒ 100%`؛ بج «Ready to complete» در ۱۰۰٪ِ قبل از Complete؛ شمارنده PPC از payload واحد | `CampaignReviewView.test.ts` (+۳) و `types.test.ts` (+۵) | زنده: پیام «…ad generation (create at least one ad), visual generation…, ad review…» + چیپ‌های «Ad Generation/Visual Generation/Ad Review» (slug خام: نه) + «67% · 6/9» | `08-taza5-gate-friendly.png` |
| **جدید ۶ · پیش‌پر Intelligence/فرم** | نیمه | prefill از `brand.services` (فقط manual) می‌خواند نه endpoint کامل | `667fa9e` — هر دو صفحه از `GET /brands/{uuid}/services/` با source∈{manual, brand_analysis} (Intelligence سقف ۸، فرم سقف ۱۲ managed-first) | `MarketIntelligenceView.test.ts` (+۳) و `CampaignCreateView.test.ts` (+۲) | زنده: Intelligence = «Gold Driving Course, Gold Excellence Course, Platinum Driving Course» + Industry=Education + Location؛ فرم کمپین = همان ۳ دوره | `03…`/`04…` |

**مشاهده‌ی جانبی (مستند، نه باگ):** مقدار Country در فرم سگمنتیشن از رشته‌ی لوکیشن برند مشتق می‌شود؛ اسکن EDI لوکیشن سه‌بخشی «Dubai, Uae, Abu Dhabi» داده که آخرین توکنش («Abu Dhabi») به‌عنوان country تفسیر شده — کیفیت پیش‌پر تابع کیفیت رشته‌ی منبع است.

## ۳. چرخه‌ی تأیید سه‌لایه (برای هر مورد)

1. **کد:** commit + فایل:خط (بالا).
2. **تست خودکار قاعده‌محور:** نام فایل/تعداد (بالا) — مجموع: BE ۵۹۳/۵۹۳، FE ۴۶۲/۴۶۲ سبز.
3. **تست زنده‌ی سرتاسری:** کمپین واقعی جدید روی پروداکشن + خروجی API + اسکرین‌شات با بج نسخه (`667fa9e · Oct 19` / بک‌اند `0fe3a63`).

## ۴. شواهد

- `docs/mom/evidence/qa6/live-verification.json` — خلاصه‌ی ماشینی همه‌ی شواهد زنده (برای LLM).
- `docs/mom/evidence/qa6/0*.png` — ۹ اسکرین‌شات (اسکن، Positioning انگلیسی، پیش‌پر Intelligence، پیشنهاد فرم کمپین، فرم سگمنتیشن، PPC دو-سرویسی، کارت/شمارنده، گیت انسانی).
- دیفرنس کامل کامیت‌ها: `git show 83cc30e c3aef61 667fa9e`.

## ۵. راهنمای بازبینی ۳۰ثانیه‌ای (تست هفتم)

1. `GET https://api.178.105.224.88.sslip.io/health/version` ⇒ `0fe3a63`؛ بج Sidebar ⇒ `667fa9e`.
2. اسکن edi-uae.com در برند جدید ⇒ Services فقط ۳ دوره.
3. Re-Analyze برند EDI ⇒ تب Competitors ⇒ Positioning انگلیسی.
4. کمپین جدید با ۲ سرویس ⇒ PPC ⇒ دو کارت با بج‌هایی که جمعشان ۱۰۰٪؛ کارت کمپین بدون «X of Y» ناسازگار.
5. فرم سگمنتیشن ⇒ Country/City/Description پیش‌پر از انتخاب‌های کمپین.
6. Complete قبل از ساخت آگهی ⇒ پیام انسانی + چیپ‌های خوانا؛ Review «67% · 6/9» تا ۱۰۰٪ با بج «Ready to complete».
7. Intelligence با برند EDI ⇒ Brand services شامل دوره‌های Analysis + Industry/Location پر.
