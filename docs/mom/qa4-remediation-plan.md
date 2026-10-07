# پلن جامع رفع موارد تست چهارم Ad Creator (QA4)

**تاریخ تهیه:** ۷ اکتبر ۲۰۲۶ · **مبنای راستی‌آزمایی:** بررسی مستقیم کد فرانت و بک‌اند در همین تاریخ
**ورودی:** `Ad-Creator-QA-Report.md` (تست چهارم — ۱۲ مهر ۱۴۰۵، برندهای RenoFit UAE و Justlife)

---

## ۰. خلاصه مدیریتی

تست چهارم: **۱۶ مورد درست شد، ۴ نیمه، ۱۰ هنوز خراب، ۲ بررسی‌نشده + ۳ مشکل تازه (یکی بحرانی)**.

راستی‌آزمایی امروز نشان داد که **تمام ادعاهای فنی کارفرما در کد صحت دارد** — ریشه هر مورد با مسیر فایل و شماره خط پیدا شده است. همچنین نکته‌ی سرخط گزارش («فرانت در گیت نیست») الان برطرف شده است و برای اثبات ماندگاری آن، مکانیزم «برچسب نسخه» به پلن اضافه شده است.

نکته‌ی کلیدی درباره‌ی گیت:

| ادعای گزارش | وضعیت واقعی امروز |
| --- | --- |
| «فرانت در main حدود ۴ ماه قدیمی است» | درست بود **در زمان بررسی کارفرما** (کامیت b6ffc8c ریپوی بک‌اند که کپی فرانتِ قدیمی داشت). فرانت اصلی در ریپوی `hdm-ad-creator-vuejs` از ۱ اکتبر به‌روز است (main = `2ebf850`) و کپی آن داخل ریپوی بک‌اند امروز با کامیت `1e2b2da` ("Update Front") سینک شد. **اما سروری که کارفرما تست کرده، فرانت جدید را هنوز دریافت نکرده** — علائم گزارش (حالت «Not analyzed» ثابت، Targeting خالی، تگ خام و…) دقیقاً با فرانتِ قبل از ۱ اکتبر می‌خواند. |
| بک‌اند گیت = سرور | بک‌اند جنگو در `ad_creator/django-backend` روی main است؛ باید در استقرار بعدی شماره نسخه‌ی بک‌اند هم قابل مشاهده شود. |

**نتیجه‌ی عملیاتی:** بخشی از موارد «هنوز خراب» (به‌ویژه عکس ۲۷) احتمالاً با فرانتِ موجود اصلاح شده ولی **استقرار نشده**. بنابراین فاز ۰ پلن = «استقرار نسخه‌ی فعلی + برچسب نسخه + تست دوباره» قبل از هر کدنویسی جدید، تا موارد واقعاً باز از «استقرارنشده» تفکیک شوند.

---

## ۱. پروتکل شواهد (برای هر مورد، بدون استثنا)

دلیل اصلی نارضایگی بازبینی قبلی، نبودِ شواهد قابل راستی‌آزمایی بود. از این پس **هیچ موردی بسته نمی‌شود مگر با هر ۵ شاهد زیر**:

۱. **شاهد کد — کامیت اختصاصی:** هر مورد یک یا چند کامیت با پیام استاندارد `fix(qa4-<شناسه>): خلاصه` (مثلاً `fix(qa4-img2): …`). در گزارش رفع، هش کامیت + مسیر فایل + شماره خطِ قبل و بعد می‌آید.
۲. **شاهد سورس:** در گزارش رفع، تکه‌کد «قبل» و «بعد» از همان فایل‌هایی که کارفرما در گزارشش اسم برده (`scraper.py`, `text_utils.py`, `client.ts`, …) قرار می‌گیرد تا بازبین خودش مسیر را دنبال کند.
۳. **شاهد تست خودکار:** هر اصلاح حداقل یک تست (pytest برای بک‌اند، vitest برای فرانت) با نام تستِ اشاره‌شده در گزارش + خروجی سبز اجرا.
۴. **شاهد بصری — روی سرور واقعی:** اسکرین‌شات از `https://app.178.105.224.88.sslip.io` با URL نوار آدرس و **برچسب نسخه در تصویر**، در پوشه‌ی `docs/mom/evidence/qa4/<شناسه>/` و embed شده در گزارش رفع.
۵. **راهنمای بازبینی ۳۰ ثانیه‌ای:** برای هر مورد یک خط: «با این آدرس و این قدم، این خروجی را باید ببینید».

### مکانیزم برچسب نسخه (پیش‌نیاز فاز ۰)

- **فرانت:** کامپایل زمان build، هش کامیت و تاریخ را inject می‌کند؛ نشان دادن آن در گوشه‌ی Sidebar (مثل `v1.4.2 · 2ebf850`).
- **بک‌اند:** endpoint بدون احراز هویت `GET /health/version` که `{version, commit, build_at}` برمی‌گرداند.
- **سند استقرار:** چک‌لیست استقرار در گزارش رفع: «کامیت FE main → سینک به ریپوی استقرار (`Update Front`) → build → deploy → تطبیق برچسب روی سرور با گیت». از این پس کارفرما با یک نگاه تأیید می‌کند سرور همان کدی را اجرا می‌کند که گزارش ادعا می‌کند.

### ساختار فولدر شواهد

```
docs/mom/
├── qa4-remediation-plan.md          ← همین فایل (پلن)
├── qa4-fix-report.md / .html        ← گزارش رفع نهایی (خروجی فازها)
└── evidence/qa4/
    ├── P0-refresh/  ├── P1-img2/  ├── P1-new1/  …
    │   ├── 01-before.png  02-after.png  03-server-url.png
    │   └── test-output.txt
```

---

## ۲. نقشه‌ی ریپوها (مرجع همه‌ی مسیرها)

| جزء | مسیر محلی | ریپوی گیت |
| --- | --- | --- |
| فرانت (Vue 3 + Vite) | `C:\laragon\www\ad-creator-vue` | `github.com/cracki/hdm-ad-creator-vuejs` (main = `2ebf850`) |
| بک‌اند (Django) | `C:\laragon\www\ad_creator\django-backend` | `ad_creator` (main، آخرین: `1e2b2da`) |
| کپی فرانت برای استقرار | `C:\laragon\www\ad_creator\ad-creator-vue` | داخل ریپوی `ad_creator` — پس از هر merge فرانت باید سینک و کامیت شود |

> مسیرهایی که کارفرما در گزارش آورده (مثل `core/utils/scraper.py`) نسبت به ریشه‌ی `django-backend/` است.

---

## ۳. جدول وضعیت — همه‌ی موارد باز تست چهارم

| شناسه | مورد | تأیید در کد | ریشه (خلاصه) | فاز |
| --- | --- | --- | --- | --- |
| P0 | 🚨 بعد از رفرش، کل پنل سیاه می‌شود | ✅ تأیید | حلقه‌ی بی‌پایان refresh در `client.ts` + توکن refresh یک‌بارمصرفِ ۱روزه + کش index.html در Service Worker | ۰ |
| E0 | نبود شاهد «نسخه‌ی مستقر» | — | برچسب نسخه FE/BE وجود ندارد | ۰ |
| img2 / img8 / new6 | متن خطای AI به‌عنوان سرویس/USP (و پیشنهاد فرم کمپین و پیش‌پر Intelligence) | ✅ تأیید (سه سایت تستی بازتولید شد) | استراتژی «هر تیتر داخل کارت» در اسکرپر + معافیت هر متنی با کلمه‌ی service از فیلتر + ادغام `usp_list` در services بدون فیلتر | ۱ |
| new1 | برند بعد از تحلیل «Not analyzed» | ✅ تأیید (دو طرفه) | FE متن را هاردکد کرده؛ BE وضعیت را فقط از آخرین run می‌گیرد | ۱ |
| new4 | Targeting در Ads Strategy خالی | ✅ تأیید | BE زیر کلید `targeting` می‌فرستد، FE فقط `audience`/`audience_targeting` می‌خواند | ۱ |
| N1 | اسکن دلیل خطا را نمی‌گوید | ✅ تأیید | BE خطا را به‌صورت آرایه‌ی خام برمی‌گرداند، FE کلید دیگری می‌خواهد؛ در اسکرپر کد HTTP با پیام Playwright جایگزین می‌شود | ۱ |
| img14 | بودجه (budget_share) روی کارت‌های PPC نیست | ✅ تأیید | BE فقط به `services_bpc_scores` اضافه می‌کند نه ranking/blueprint؛ FE هم اصلاً رندرش نمی‌کند؛ وزن‌دهی `bpc_score` برعکسِ انتظار | ۲ |
| img27 | تقسیم بودجه‌ی Review با Strategyها نمی‌خواند | 🟡 اصلاح FE موجود (dc2ccec) ولی مشکوک به fallback | `getStrategyBudgetSplit` شکل payload را درست unwrap نمی‌کند → بازگشت null → تقسیم مساوی | ۲ |
| img29 / new5 | کمپین نیمه‌کاره «Completed / ۱۰۰٪ / 6 of 6» | ✅ تأیید | تکمیل خودکار در `ads_strategy.py:392-400` هنوز هست؛ شرط تکمیل آگهی/تصویر/Review را چک نمی‌کند (اصلاً step نیستند) | ۲ |
| img18 | تگ خام [linkedin] / [meta] در Warnings | ✅ تأیید | FE خودش اسلاگ را داخل کروشه رندر می‌کند؛ پاک‌کننده‌ی BE فقط تگ lowercase را می‌گیرد و کلیدواژه Exact Match گوگل را هم می‌کشد | ۲ |
| new3 | تشخیص زبان/صنعت/اسم شرکت در اسکن اشتباه | ✅ تأیید | یک حرف عربی ⇒ «ar»؛ صنعت substring بدون دسته Home Services؛ اسم شرکت از تکه‌ی اول title؛ پس از rescan فیلد پر قبلی آپدیت نمی‌شود (قانون «فقط خالی را پر کن») | ۳ |
| تازه۱ | نوار پیشرفت روی «Website scan» گیر می‌کند | ✅ تأیید (ریشه پیدا شد) | بعد از retry، view همان run قدیمی را نمایش می‌دهد (invalidate اشتباه + عدم navigate به run جدید) | ۳ |
| img15 | Funnel: متن همه‌ی Personaها قالب ثابت | ✅ تأیید | سه جمله در `smart_funnel_engine.py:492/508/520` هاردکد؛ AI متنی نمی‌نویسد؛ تست هم قالب را assert می‌کند | ۳ |
| img30 | Tour عنصر اشتباه را هایلایت می‌کند | 🟡 بخشی | سلکتورها اختصاصی‌اند؛ نقاط ضعف: انتظار ثابت 300ms و تک‌تلاش waitForElement → رینگ کهنه/جای غلط | ۳ |
| img31 | Content Intelligence: Actionها نیستند | ✅ تأیید | کامپوننت `InsightItemActions` فقط در ۴ ویو مستعمل استفاده شده، نه در رندررهای تب‌های /market/intelligence | ۴ (نیازمند تأیید محصول) |
| img5 | AI Credits کم نمی‌شود | ✅ تأیید | شمارش فقط in-memory در `llm_handler.py`؛ هیچ مدل/اندپوینت کردیت وجود ندارد؛ عدد ۱۲,۴۸۰ سمت کلاینت هاردکد است | ۴ |
| SEC | امنیت (SECRET_KEY، DEBUG، CORS، Rate limit، دسترسی پیش‌فرض) | ✅ تأیید (همه) | `configuration/settings.py:32-58, 195-200, 229-236` | ۴ |
| MOM | بندهای نیمه‌کاره/انجام‌نشده MOM | ✅ تأیید | داده‌ی سایت مشترک بین کاربران، payload خام در API، اعتبارسنجی آپلود، error handler استاندارد و… | ۵ |

---

## ۴. فاز ۰ — بحرانی و پیش‌نیازها (روز ۱)

### P0 · رفرش صفحه ⇒ پنل سیاه (بحرانی)

**ریشه — تأییدشده با کد:**

- `src/shared/api/client.ts:31-46`: درخواستِ خودِ `/auth/token/refresh/` از interceptor مستثنا نیست. وقتی refresh با ۴۰۱ پاسخ می‌شود، interceptor همان درخواست refresh را دوباره وارد چرخه می‌کند و روی `refreshPromise` **خودِ در حال انتظار** await می‌زند → بن‌بست دائمی؛ شاخه‌ی `catch { auth.logout(); window.location.href='/login' }` هیچ‌وقت اجرا نمی‌شود:
  ```ts
  if (!refreshPromise) {
    refreshPromise = auth.refreshAccessToken().finally(() => { refreshPromise = null })
  }
  const newToken = await refreshPromise   // ← روی 401 خودِ refresh، هرگز settle نمی‌شود
  ```
- `src/features/auth/store.ts:32-36`: توکن refresh در `sessionStorage` می‌ماند و پاک‌کردنش فقط در `logout()` است که اجرا نمی‌شود → حتی `/login` گیر می‌کند.
- `src/infrastructure/router/index.ts:257`: `initAuth()` در هر رفرش، refresh را **خارج از** گارد single-flight صدا می‌زند → دو درخواست همزمان (دو ۴۰۱ دیده‌شده در گزارش).
- بک‌اند `configuration/settings.py:229-236`: `REFRESH_TOKEN_LIFETIME: 1 روز` + `ROTATE_REFRESH_TOKENS: True` + `BLACKLIST_AFTER_ROTATION: True` ⇒ توکن refresh یک‌بارمصرف است؛ رفرشِ دو تب/دو درخواست، دومی را ۴۰۱ می‌کند.
- `public/sw.js:2-5, 23-40`: `index.html` از قبل کش شده و fetch handler برای همه‌ی GETهای غیر `/api/` **cache-first** است ⇒ حتی ناوبری به `/login` هم پوسته‌ی سیاهِ کش‌شده را سرو می‌کند.

**اصلاح:**

1. **FE — `client.ts`:** درخواست‌های مسیر `/auth/token/` را از interceptor مستثنا کن (`error.config.url` چک شود)؛ در ۴۰۱ِ خودِ refresh، بدون awaitِ داخلی: پاک‌کردن توکن‌ها + هدایت به `/login`؛ گارد single-flight با یک promise مشترک بماند ولی مسیر خطا هرگز روی خودش await نکند.
2. **FE — `router/index.ts`:** `initAuth` از همان مسیر single-flight استفاده کند (نه صدا زدن مستقیم refresh) تا در هر رفرش فقط یک درخواست refresh برود.
3. **FE — `store.ts`:** در خطای refresh (۴۰۱/400)، پاک‌سازی فوری `sessionStorage` قبل از redirect.
4. **FE — `sw.js`:** برای navigations و `index.html` رفتار network-first (با fallback به کش فقط در offline) + افزایش شماره‌ی نسخه‌ی کش برای باطل‌کردن پوسته‌ی قدیمی.
5. **BE — `settings.py`:** `REFRESH_TOKEN_LIFETIME` به ۷ روز (قابل‌تداخل با SEC-4).

**معیار پذیرش:** با توکن منقضی/چرخیده، هر رفرش در هر صفحه کاربر را تمیز به `/login` می‌برد؛ بدون صفحه‌ی سیاه؛ بدون درخواست refresh معلق. تست: دو تب، رفرش وسط refresh، رفرش پشت‌سرهم.

**شواهد:** دیفرنس `client.ts`/`store.ts`/`sw.js`/`settings.py` + تست vitest جدید (interceptor: 401-on-refresh → redirect، بدون لوپ) + ویدئو/دو اسکرین‌شات از سرور (رفرش → login، و حالت عادی) + `GET /health/version` در تصویر.

### E0 · برچسب نسخه فرانت و بک‌اند

- FE: `vite.config.ts` با `define` هش کامیت و تاریخ build را inject کند؛ نمایش در Sidebar footer.
- BE: `GET /health/version` (بدون auth) با خواندن فایل `VERSION`/متغیر محیط که در استقرار پر می‌شود.
- شواهد: اسکرین‌شات برچسب روی سرور + خروجی endpoint + چک‌لیست استقرار.

### استقرار نسخه‌ی فعلی + تست تفکیکی (قبل از کدنویسی فازهای بعد)

فرانتِ main (شامل اصلاحات ۱ اکتبر مثل dc2ccec) روی سرور مستقر شود؛ مواردی که فقط به‌خاطر فرانتِ قدیمی خراب دیده شده بودند (احتمالاً عکس ۲۷) دوباره تست و در جدول وضعیت به‌روزرسانی شوند. خروجی: جدول «قبل/بعد استقرار» در گزارش رفع.

---

## ۵. فاز ۱ — زنجیره‌ی داده‌ی برند: سرویس‌ها، وضعیت، خطای اسکن (روز ۲–۳)

### P1-a · img2 + img8 + new6 — سرویس‌های زباله (سه سطح، یک ریشه)

**ریشه — تأییدشده (فیلتر به‌صورت عملی روی همین رشته‌های گزارش اجرا شد و همه را نگه داشت):**

- `core/utils/scraper.py:1043-1051` (استراتژی ۳): تیترِ هر element با کلاس card/box/item/block/feature/icon-box ⇒ سرویس؛ همین «Sign in or register»، «Reset password»، «Villas» و تیتر بلاگ را می‌سازد. حذف ناحیه‌های زباله (`_strip_junk_regions:664-707`) فقط blockquote/figure/footer را می‌گیرد — nav/form/header را نه.
- `brand/text_utils.py:25-83`: هر رشته‌ای که کلمه‌ی service/care/class/package/… داشته باشد (`_has_service_indicator:81-83`) از **همه‌ی** چک‌های زباله معاف است. اجرای واقعی فیلتر روی رشته‌های QA: «with an average rating of 4»، «Book home services in less than 60 seconds»، «Sign in or register»، «renovation company in Dubai»، «Villas»، «7 Warning Signs Your Dubai Property» — **همه عبور کردند.**
- `brand/services/builder.py:524-528`: `services = merge_service_names(website_data.services, brand_core.usp_list, …)` — ۵ جمله‌ی USP اجباریِ LLM (`brand_core_analyzer.py:960-966, 1136`) عملاً سرویس حساب می‌شوند.
- `brand/services/brand_services.py:106-135`: `get_core_service_names` خودِ `usp_list` را برمی‌گرداند و `get_merged_service_names` بدون هیچ فیلتری؛ مصرف‌کنندگان بدون فیلتر: `brand/views.py:708-724`، `campaign/services/ads_strategy.py:197`، `content_strategy.py:171`، `ppc_viability.py:162` ⇒ عکس ۸ و پیش‌پرِ Intelligence (new6).

**اصلاح (سه‌لایه‌ی واقعی این‌بار):**

1. **خروجی AI:** پرامپت `brand_core_analyzer.py` فیلد مستقل `services` بگیرد (لیست سرویس‌های واقعی، جدا از USP)؛ پارسر و مدل هم متناسب شوند. `builder.py` و `brand_services.py` دیگر `usp_list` را داخل services ادغام/برنمی‌گردانند.
2. **فیلتر متن:** `text_utils.py` به‌جای معافیت با کلمه‌ی service: بلک‌لیست الگوهای ورود/ثبت‌نام/CTA (sign in, register, reset password, get started, learn more…)، الگوی تیتر بلاگ (شروع با عدد + Warning/Signs/Tips…)، حذف جملات USP-مانند (طول > X کلمه + افعال بازاریابی)، سقف تعداد کلمات سرویس (۲–۶ کلمه). معافیتِ کلمه‌ی service حذف یا محدود شود به رشته‌های کوتاه.
3. **اسکرپر:** در `_strip_junk_regions` حذف `nav, form, header, button, [role=button], [role=navigation]` و در استراتژی card، کارت‌هایی که فقط لینک/فرم دارند رد شوند.
4. **اعمال فیلتر روی همه‌ی مسیرهای ارائه:** `get_merged_service_names` خودش فیلتر نهایی را اجرا کند (نقطه‌ی واحد) + `GET /brands/{uuid}/services/`.
5. **داده‌ی قدیمی:** اسکنِ قبل از ساخت brand بی‌حافظه است (stateless)؛ برای برندهای موجود دکمه‌ی Re-analyze با `force_refresh` (که هست: `full_analysis.py:343-390`) به‌عنوان راهنمای بازبینی ذکر شود.

**معیار پذیرش:** rescan + re-analyze برای justlife.com، ms-realestate.ae و RenoFit ⇒ هیچ‌کدام از ۷ رشته‌ی گزارش‌شده در هیچ سطحی (Overview، فرم کمپین، Intelligence، PPC) نیست؛ سرویس‌های واقعی (نظافت، کولر، تعمیرات برای Justlife) حاضرند.

**شواهد:** تست pytest با دقیقاً ۷ رشته‌ی گزارش کارفرما (assert → رد) + تست فیکسچر اسکرپر + اسکرین‌شات قبل/بعد هر سه برند + کامیت‌های جدا برای هر لایه.

### P1-b · new1 — «Not analyzed» بعد از تحلیل موفق

**ریشه:** دو طرفه. FE: `BrandListView.vue:249-252` بج را بدون شرط و با متن ثابت رندر می‌کند (`t('status.notAnalyzed')`). BE: `brand/serializers.py:123-131` وضعیت را فقط از آخرین run می‌گیرد ⇒ یک run صف‌شده/ناموفق جدید، تحلیل کامل قبلی را می‌پوشاند.

**اصلاح:** BE فیلد `has_completed_analysis` (وجود حداقل یک run موفق) به سریالایزر اضافه شود. FE بج وضعیت را از `analysis_status` + `has_completed_analysis` بسازد: Not analyzed / Analyzing… / Analyzed / Failed — با رنگ متمایز.

**شواهد:** اسکرین‌شات لیست برندها با ۳ وضعیت مختلف (جدید تحلیل‌شده، در حال تحلیل، بدون تحلیل) + تست سریالایزر + تست کامپوننت FE.

### P1-c · new4 — Targeting خالی در Ads Strategy

**ریشه:** BE (`ads_strategy_engine.py:547-604, 604`) داده را تضمین‌شده زیر `camp["targeting"]` می‌گذارد (audience_summary, age_range, locations, interests, exclusions)؛ FE (`AdsStrategyRenderer.vue:148-159`) فقط `camp.audience ?? camp.audience_targeting` را می‌خواند و `useNormalizeResponse.ts:16` هم `targeting` را alias نکرده. برای Google اصلاً کلید audience در اسکیما نیست.

**اصلاح (سمت FE — تمیزترین مسیر):** رندرر زنجیره‌ی `camp.audience ?? camp.audience_targeting ?? camp.targeting` را بخواند و برای `targeting` رندر ساختاریافته داشته باشد (خلاصه مخاطب، سن، لوکیشن، علایق، استثناها). تست FE با payload واقعی Meta و Google.

**شواهد:** اسکرین‌شاد هر ۵ کمپین Meta + Google با بخش TARGETING پر + دیفرنس رندرر + تست.

### P1-d · N1 — پیام خطای اسکن بدون علت

**ریشه:** BE علت را می‌سازد (`auto_scan_engine.py:128-174` — timeout، HTTP status، سایت JS) ولی `brand/views.py:179-180` آن را با `ValidationError(str(exc))` برمی‌گرداند که DRF تبدیلش می‌کند به **آرایه‌ی JSON خام** در بدنه‌ی پاسخ؛ FE (`BrandCreateView.vue:203-209`) دنبال `detail`/`message`/`website_url` می‌گردد → پیام عمومی. در اسکرپر، مسیر Playwright (`scraper.py:378-390`) کد HTTP واقعی را از دست می‌دهد (`page.goto` روی 404 خطا نمی‌دهد و status چک نمی‌شود).

**اصلاح:**

1. BE: در همان view، خطا را ساختاریافته برگرداند: `raise ValidationError({"detail": str(exc)})` — و به‌عنوان راه مادر، DRF `EXCEPTION_HANDLER` استاندارد (بند MOM «پیام خطای استاندارد») که خروجی همه‌ی خطاها را `{"detail": …}` یکدست کند.
2. اسکرپر: status پاسخ `page.goto` چک شود و در پیام خطا بیاید؛ `net::ERR_NAME_NOT_RESOLVED` به «دامنه یافت نشد» ترجمه شود.
3. FE: پیام `detail` را همان‌جا که هست نمایش دهد (آماده است) + حالت آرایه‌ی خام هم defensive هندل شود.

**شواهد:** اسکرین‌شات با دامنه‌ی ناموجود (پیام DNS)، سایتی timeout، و سایت 404 — هر سه با پیام اختصاصی + تست pytest روی شکل پاسخ + تست FE.

---

## ۶. فاز ۲ — بودجه، وضعیت کمپین و برچسب‌ها (روز ۴–۵)

### P2-a · img14 — budget_share روی کارت‌های PPC

**ریشه:** BE `ppc_viability_engine.py:336-353` سهم بودجه را فقط به `brand_trust_analysis.services_bpc_scores` می‌چسباند؛ `ppc_opportunity_ranking` و `ppc_blueprints` (که منبع کارت‌های FE هستند: `types.ts:463-476`) فیلد را ندارند. وزن‌دهی با `bpc_score` است نه `opportunity_score`. FE هم `PpcServiceCard.vue:39-42` و `ppcServiceDetailRows (types.ts:427-446)` هیچ رندری برای budget_share ندارد.

**اصلاح:**

1. BE: budget_share به **هر سه** لیست اضافه شود؛ وزن‌دهی بر اساس `opportunity_score` (طبق پیشنهاد بازبین) با نرمال‌سازی قطعی و جمع ۱۰۰ (همان تابع `normalize_allocation`).
2. FE: بج سهم بودجه روی سربرگ هر کارت انتخابی + سطر «سهم بودجه» در جزئیات باز‌شده.

**معیار پذیرش:** جمع سهم‌ها = ۱۰۰٪؛ سرویس با opportunity بالاتر سهم بیشتر؛ بج روی کارت دیده می‌شود.

**شواهد:** اسکرین‌شات کارت باز‌شده (همان URL گزارش: `/campaigns/…/ppc-viability`) + تست pytest (جمع=۱۰۰، مونوتون بودن نسبت به opportunity) + تست FE بج.

### P2-b · img27 — تقسیم بودجه‌ی Review

**ریشه:** اصلاح FE (کامیت `dc2ccec` — «review budget split unified with actual ads strategies») در main موجود است ولی `getStrategyBudgetSplit` (`types.ts:~684-740`) `strategy.response_payload.funnel_campaigns` را مستقیم می‌خواند؛ در مصرف‌کننده‌های دیگر payload با لایه‌ی `data` اضافه unwrap می‌شود (`props.data?.data ?? props.data`). اگر `funnel_campaigns` زیر لایه‌ی دیگری باشد، همه‌ی پلتفرم‌ها skip و تابع null برمی‌گرداند → fallback به `campaign.summary.funnel` → همان 34/33/33. هیچ تجمیع سمت BE وجود ندارد (تأیید شد) ولی با FE فعلی لازم نیست.

**اصلاح:** بازبینی payload واقعی استقرارشده (نمونه‌ی JSON در evidence ذخیره شود) + unwrap تطبیقی در `getStrategyBudgetSplit` (پشتیبانی از `response_payload` و `response_payload.data` و کلیدهای per-platform) + تست با payload واقعی. نمای «بر اساس پلتفرم» از `budget_share` پلتفرم‌ریکیومندیشن (موجود در `platform_recommendation_engine.py:362-383`) تغذیه می‌شود.

**معیار پذیرش:** Review همان درصدهای استراتژی‌ها را نشان دهد (مثال بازبین: BoFu حدود ۶۳٪ Meta، ۶۵٪ Google) + نمای by-platform قابل مشاهده.

**شواهد:** اسکرین‌شات Review کنار Ads Strategy (مقایسه‌ی اعداد در یک تصویر) + payload نمونه + تست FE.

### P2-c · img29 + new5 — Completed / ۱۰۰٪ / 6 of 6 در میانه‌ی کار

**ریشه:** تکمیل خودکار هنوز هست: `campaign/services/ads_strategy.py:392-400` بعد از اتمام استراتژیِ آخرین پلتفرم، وضعیت را COMPLETED می‌کند (گِرد بر اساس `get_completion_error`)؛ شرط تکمیل (`completion.py:21-26, 130-143`) فقط ۴ استپ پایه + فلگ‌های پلتفرم را چک می‌کند — آگهی/تصویر/Review اصلاً از نوع step نیستند (`models.py:23-30` فقط ۷ نوع دارد). FE هم مخرج شمارش را همان ۴+پلتفرم می‌گیرد (`types.ts:365-387`).

**اصلاح:**

1. BE: بلوک تکمیل خودکار (`ads_strategy.py:392-400`) حذف شود — فقط دکمه‌ی Complete کمپین را COMPLETED کند (عین خواسته‌ی بازبین).
2. BE: به شرط تکمیل و شمارش پیشرفت، سه مرحله‌ی «ساخت آگهی، تصویر، Review» اضافه شود — دو گزینه: فلگ‌های جدید در مدل (نیاز migration و backfill برای کمپین‌های موجود) یا محاسبه‌ی مشتق از وجود آگهی ذخیره‌شده/تصویر/تأیید Review. گزینه‌ی مشتق توصیه می‌شود (بدون migration) و در گزارش رفع مستند می‌شود.
3. FE: `getCampaignStepCounts` مخرج را ۹گانه کند (۴ پایه + پلتفرم‌ها + آگهی/تصویر/Review) تا «6 of 9» و درصد واقعی نمایش داده شود.

**معیار پذیرش:** کمپین در مرحله‌ی ۶–۷ ⇒ بج In Progress، درصد واقعی (مثلاً ۶ از ۹)؛ بعد از زدن Complete ⇒ Completed.

**شواهد:** اسکرین‌شات کارت کمپین در همان وضعیت گزارش (مرحله ۶/۷) قبل/بعد + تست pytest (اتمام استراتژی ⇒ status = IN_PROGRESS) + تست FE شمارش.

### P2-d · img18 — تگ‌های خام [linkedin] / [meta]

**ریشه:** FE `PlatformRecommendationSummary.vue:93-95` خودش `w.platform` را داخل کروشه رندر می‌کند: `<template v-if="w.platform">[{{ w.platform }}] </template>`. پاک‌کننده‌ی BE (`campaign/text_utils.py:15`، `_BRACKET_TAG_RE = r"\[[a-z_]+\]"`) فقط تگ lowercase را می‌گیرد (`[Meta]` رد می‌شود) و چون `ads_strategy_engine.py:445, 829-842` کل خروجی را بازگشتی پاک می‌کند، کلیدواژه‌ی Exact Match گوگل مثل `[plumber]` هم قربانی می‌شود.

**اصلاح:**

1. FE: به‌جای کروشه، چیپ برچسب با نام بومی‌شده‌ی پلتفرم (استفاده از همان map برچسب پلتفرم موجود در `CampaignListView.vue:55-59`).
2. BE: پاک‌کننده whitelist‌ای شود — فقط تگ‌های پلتفرم شناخته‌شده و case-insensitive حذف شوند ([meta],[google],[linkedin],[facebook],[instagram],[tiktok],[youtube],[x])؛ و sanitizer روی `ad_groups[].keywords` اعمال نشود تا Exact Match گوگل سالم بماند.

**شواهد:** اسکرین‌شات Warnings با برچسب جدید + اسکرین‌شات Keywords گوگل با `[plumber]` دست‌نخورده + تست هر دو.

---

## ۷. فاز ۳ — کیفیت محتوا و تشخیص اسکن (روز ۶–۸)

### P3-a · new3 — تشخیص زبان / صنعت / اسم شرکت + نگه‌داشتن اسم قبلی در rescan

**ریشه:**

- زبان: `scraper.py:1258-1266` — یک حرف عربی در full_text ⇒ «ar»؛ `html lang` هیچ‌جا خوانده نمی‌شود (`auto_scan_engine.py:284-293` og:locale را ترجیح می‌دهد ولی justlife احتمالاً og:locale عربی/بدون آن دارد و به هیوریستیک می‌رسد).
- صنعت: `scraper.py:1406` امتیازدهی substring («spa» در «space»)؛ دسته‌ی Home Services وجود ندارد؛ BE هرگز confidence «high» برای صنعت نمی‌دهد (`auto_scan_engine.py:349-364` فقط exact ⇒ medium) — و فرانت بعد از کامیت `0b1cecb` فقط high را auto-select می‌کند ⇒ الان هیچ‌چیز خودکار انتخاب نمی‌شود (بی‌ضرر ولی کاندیدای غلط هنوز تولید می‌شود).
- اسم شرکت: `auto_scan_engine.py:209-210` `_clean_title` تکه‌ی اول title («Renovation company in Dubai»)؛ og:site_name اولویت دارد ولی این سایت نداشت؛ چکِ شباهت با دامنه وجود ندارد.
- rescan: FE `BrandCreateView.vue:217-224` فقط فیلد خالیِ ویرایش‌نشده را پر می‌کند ⇒ مقدار اسکن قبلی برای همیشه می‌ماند.

**اصلاح:**

1. زبان: تگ `lang` از `<html>` + نسبت کاراکترهای عربی به کل حروف (آستانه مثلاً ۲۵–۳۰٪) به‌جای «وجود یک حرف»؛ ترکیب: og:locale > html lang > نسبت اسکریپت.
2. صنعت: تطبیق whole-word (`\b`) به‌جای substring؛ افزودن دسته‌ی Home Services (cleaning, AC, handyman, maintenance, repair…)؛ BE فقط با امتیاز بالای آستانه confidence=high بدهد تا auto-select فرانت درست کار کند.
3. اسم شرکت: بین تکه‌های title (شکستن روی |، –، —، ·) تکه‌ای که بیشترین تطابق را با توکن‌های دامنه دارد انتخاب شود (renofit.com ⇒ «Renofit»، نه «Renovation company in Dubai»).
4. rescan (FE): تفکیک «پرشده توسط اسکن» از «ویرایش‌شده توسط کاربر»: rescan فقط مقادیر scan-ی را با اسکن جدید جایگزین کند و دستِ کاربر را نپوشد (`scanFilledFields` set).

**شواهد:** تست pytest: justlife ⇒ en + صنعت مناسب؛ title تستی RenoFit ⇒ «Renofit»؛ تست FE rescan؛ اسکرین‌شات هر دو برند قبل/بعد.

### P3-b · تازه۱ — نوار پیشرفت گیر «Website scan»

**ریشه (پیدا شد):** در `BrandAnalysisView.vue:81, 115-118`، `runData = existingRun ?? tracker.data`؛ بعد از retry، کشِ `['brands', uuid, 'analysis-runs', runUuid]` باطل نمی‌شود (`queries.ts:93-96` فقط کلید لیست را invalidate می‌کند) و route هم به run جدید نمی‌رود ⇒ همان run قدیمی با sections_status گیرکرده رندر می‌شود. به‌علاوه هیچ timeout‌ای برای سکشن stuck در running نیست.

**اصلاح:** FE: بعد از شروع موفق تحلیل، `router.replace` به run جدید + invalidate کلید run قبلی/جدید + reset وضعیت سکشن‌ها در شروع retry + سقف زمانی برای سکشن running (بعد از N دقیقه: «در حال پردازش…» به‌جای قفل روی یک مرحله). BE: در شروع run جدید، sections_status تازه ساخته شود (بررسی و در صورت لزوم reset در `workflow.py`).

**شواهد:** ویدئو کوتاه یا دو اسکرین‌شات: retry روی برند مشکل‌دار ⇒ نوار از نو حرکت می‌کند + تست کامپوننت.

### P3-c · img15 — متن قالبی یکسان برای همه‌ی Personaها

**ریشه:** `smart_funnel_engine.py:486-528` — سه جمله‌ی ثابت در خطوط ۴۹۲، ۵۰۸، ۵۲۰ (فقط اسم/درد/persona جایگزین می‌شود)؛ تست هم قالب را assert می‌کند (`tests.py:2258-2270`)؛ تست differentiation (2383+) فقط نابرابری متنی را چک می‌کند و با جایگزینی اسم پاس می‌شود.

**اصلاح (طبق پیشنهاد بازبین — گزینه‌ی اول):** تولید متن هر مرحله با LLM از دردها/انگیزه‌های خود persona (یک فراخوان batch برای هر persona؛ خروجی ساختاریافته: headline_angle, body_approach, cta) + **fallback قطعی**: ۳–۴ قالب متفاوت برای هر مرحله با چرخش بر اساس ایندکس persona (برای نبودِ AI/هزینه). تست‌ها به‌روز شوند: «متن یک persona شامل درد اختصاصی خودش باشد» و «متن دو persona در یک مرحله یکسان نباشد» (نسخه‌ی سخت‌گیرانه، بدون اتکا به اسم).

**معیار پذیرش:** دو persona در TOFU دو متن متفاوتِ اختصاصی ببینند؛ هیچ‌کدام با سه قالب قدیمی برابر نباشد (در حالت AI) — و در حالت fallback، قالب‌ها بین personaها بچرخند.

**شواهد:** اسکرین‌شات دو کارت persona کنار هم + تست‌های جدید + نمونه‌ی JSON خروجی.

### P3-d · img30 — Tour (بررسی‌نشده در تست۴)

**وضعیت کد:** سلکتورها اختصاصی `[data-tour=…]` هستند و مشکوک به «عنصر غلط» نیستند؛ اما `ProductTourOverlay.vue:59-67` بعد از انتظار ثابت ۳۰۰ms اندازه می‌گیرد و `waitForElement` (خطوط 22-34) تک‌تلاش است ⇒ رینگ کهنه/جابه‌جا در layout shift دیرهنگام؛ هدفِ hidden (مثل topbar-search در موبایل) مستطیل صفر می‌دهد.

**اصلاح:** حلقه‌ی صبر مبتنی بر rAF/بازآزمایش (تا timeout) + سنجش مجدد روی resize/scroll + چک visibility (offsetParent/rect>0) قبل از نمایش. سپس با کاربر تازه (پاک‌کردن `localStorage['hdm_tour_completed']`) همه‌ی مراحل دسکتاپ+موبایل اسکرین‌شات شود — کل جریان تور در evidence.

---

## ۸. فاز ۴ — Actionهای Intelligence، AI Credits و امنیت (روز ۹–۱۱)

### P4-a · img31 — اکشن‌های Content Intelligence ⚠️ نیازمند تأیید محصول

**کد:** کامپوننت آماده `InsightItemActions.vue` («Add to Campaign» + «Generate Brief») فقط در ۴ ویوی مستقل (`MarketGapsView.vue:191` و…) استفاده شده؛ چهار رندرر تب‌های `/market/intelligence` (`ContentOpportunitiesRenderer`, `ContentGapsRenderer`, `ContentMatrixRenderer`, `TopPerformingContentRenderer`) هیچ اکشنی ندارند. طبق گزارش، مستندات تیم این را «blocked — نیاز به تصمیم محصول» گذاشته بود.

**پیشنهاد برای تأیید (پیش‌فرض قابل‌اجرا):** هر آیتم در هر ۴ تب: **Add to Campaign** (انتخاب کمپین + افزودن به‌عنوان نوت/بریف) + **Generate Brief** (پرامپت آماده برای کپی/دانلود) + **Copy**. Approve/Reject برای همین نسخه لازم نیست (معنایش در این سطح روشن نیست) — در گزارش رفع صریحاً «تصمیم محصول گرفته شد: X» نوشته می‌شود تا بحث بسته شود.

**شواهد:** اسکرین‌شات هر تب با دکمه‌ها + جریان Add-to-Campaign تا دیده‌شدن نتیجه در کمپین.

### P4-b · img5 — AI Credits

**ریشه:** شمارش توکن فقط in-memory در `core/services/llm_handler.py:38, 115-116, 190-191`؛ هیچ مدل DB/اندپوینت/سیاستی وجود ندارد؛ عدد نمایشی FE (۱۲,۴۸۰) هاردکد کلاینت است. فراخوان‌های LLM متمرکزند (همه از `LLMHandler` استفاده می‌کنند) ⇒ نقطه‌ی واحد برای ثبت.

**اصلاح:** مدل `TokenUsage` (user FK، feature/endpoint، model، prompt/completion/total tokens، estimated_cost، created_at) + ثبت در مسیرهای `_call_openai`/`_call_openai_vision` (کاربر از contextvar/پارامتر) + اندپوینت `GET /credits/summary` (مصرف امروز/ماه، باقیمانده بر اساس سقف) + FE: اتصال ویجت credits-bar به API واقعی. سقف ماهانه ⇒ تصمیم محصول (پیش‌فرض قابل‌تنظیم در settings).

**شواهد:** اسکرین‌شات قبل/بعد از یک تحلیل (عدد کم شده) + رکوردهای TokenUsage در admin + تست pytest (فراخوانی mock ⇒ رکورد ثبت).

### P4-c · SEC — بسته‌ی امنیتی

**تأیید همه‌ی موارد در `configuration/settings.py`:**

| مورد | شواهد کد | اصلاح |
| --- | --- | --- |
| SECRET_KEY پیش‌فرض داخل کد | خطوط 32-35 | در نبود env و `DEBUG=False` ⇒ fail-fast (اجرا نشود) |
| DEBUG پیش‌فرض روشن | خطوط 38-43 (`"1"` پیش‌فرض) | پیش‌فرض False؛ در prod حتماً env |
| CORS باز به همه | خطوط 56-58 `CORS_ALLOW_ALL_ORIGINS=True` | `CORS_ALLOWED_ORIGINS` از env |
| بدون permission پیش‌فرض | `REST_FRAMEWORK` خطوط 195-200 | `DEFAULT_PERMISSION_CLASSES=[IsAuthenticated]` + بازبینی ویوهای AllowAny |
| بدون rate limit | هیچ throttle ای در کل اپ نیست | `DEFAULT_THROTTLE_CLASSES` + ScopedRateThrottle روی login/register (مثلاً 5/min) و اندپوینت‌های AI (سهمیه‌ی ساعتی/روزانه per-user) |
| refresh token یک‌بارمصرف ۱روزه | خطوط 229-236 | `REFRESH_TOKEN_LIFETIME=7d` (هم‌راستا با P0) |

**شواهد:** خروجی 429 روی تست brute-force لاگین (اسکرین‌شات) + دیفرنس settings + چک‌لیست env سرور + تأیید `/health/version` بعد از استقرار.

---

## ۹. فاز ۵ — بندهای MOM نیمه‌کاره/انجام‌نشده (روز ۱۲+)

| بند | شواهد کد (تأییدشده) | اصلاح |
| --- | --- | --- |
| داده‌ی سایت مشترک بین کاربران / بازنویسی تحلیل | `brand/models.py:114` (`normalized_website_url` unique و global)، `BrandWebsiteData:347-380` و `BrandCoreAnalysis:783-815` بدون FK کاربر؛ `full_analysis.py:343+` آخرین scrape هر کسی را برمی‌دارد و force-refresh همان ردیف مشترک را overwrite می‌کند | scope داده به brand/created_by (copy-on-write یا FK) + migration برای ردیف‌های موجود |
| payload خام در API | `ad_library/serializers.py:27-47` (`request_payload/input_snapshot/response_payload`)؛ `market/serializers.py:22-39` + لو رفتن `str(exc)` در `market/views.py:112,171,223,275,326` | whitelist خروجی (summary) + پیام خطای عمومی |
| اعتبارسنجی آپلود | `brand/serializers.py:287` FileField بدون چک؛ `_apply_file_metadata:307-320` | whitelist نوع MIME/پسوند + سقف حجم |
| پیام خطای استاندارد | بدون `EXCEPTION_HANDLER` (`settings.py:195-200`)؛ کلاس‌های خطا در `core/exceptions.py` بلااستفاده | هندلر سراسری `{"detail": …}` (هم‌راستا با P1-d) |
| نرمال‌سازی دامنه | هست (`models.py:116-138`)؛ نقص: رد localhost/IP/داخل‌شبکه و path | افزودن validator |
| Audit Log، ورود از Excel، بودجه‌ی محتوا/Creative، چندزبانه‌ی برند، بازار هدف در تحلیل رقبا | غیبت تأیید شد | بک‌لاگ با تأیید محصول (ترتیب پیشنهادی: Audit → Excel → بقیه) |

---

## ۱۰. ترتیب اجرا، برآورد و وابستگی‌ها

| فاز | محتوا | برآورد | وابستگی |
| --- | --- | --- | --- |
| ۰ | P0 رفرش + E0 برچسب نسخه + استقرار FE فعلی و تست تفکیکی | ۱ روز | — |
| ۱ | P1-a سرویس‌ها (۳ لایه) · P1-b Not analyzed · P1-c Targeting · P1-d خطای اسکن | ۲–۳ روز | فاز ۰ (برچسب نسخه برای شواهد) |
| ۲ | P2-a PPC budget · P2-b Review split · P2-c Completed/پیشرفت · P2-d تگ‌ها | ۲ روز | فاز ۰ |
| ۳ | P3-a تشخیص اسکن · P3-b نوار پیشرفت · P3-c متن فانل · P3-d تور | ۳ روز | P1-a برای تست روی داده‌ی تمیز |
| ۴ | P4-a اکشن‌ها (نیازمند تأیید محصول) · P4-b کردیت · P4-c امنیت | ۳ روز | P4-b به فاز ۰ (user context) وصل است |
| ۵ | بندهای MOM (جدول بالا) | ۳–۵ روز | تصمیم محصول برای بک‌لاگ |

**دو تصمیمی که از کارفرما/محصول لازم است (در گزارش رفع صریح می‌شود):**
1. P4-a — مجموعه‌ی اکشن‌های Content Intelligence (پیش‌فرض پیشنهادی: Add to Campaign + Generate Brief + Copy).
2. P4-b — سقف/سیاست AI Credits (پیش‌فرض: قابل‌تنظیم در settings، بدون hard-limit در نسخه‌ی اول).

بقیه‌ی موارد بدون تصمیم‌گیری قابل اجرا هستند؛ جایی که گزارش بازبین «یا/یا» گفته (متن فانل: AI یا قالب‌ها؛ وزن PPC: opportunity_score)، گزینه‌ی پیشنهادی خودِ او انتخاب شده است.

---

## ۱۱. تعریف انجام‌شدگی (DoD) — چک‌لیست هر مورد قبل از علامت زدن ✅

- [ ] کامیت(های) `fix(qa4-<id>)` روی main (FE و/یا BE) + سینک کپی فرانت به ریپوی استقرار
- [ ] تست خودکار سبز (نام تست در گزارش) — `pytest` بک‌اند و `vitest` فرانت
- [ ] استقرار روی سرور + تطبیق برچسب نسخه با گیت
- [ ] اسکرین‌شات(ها) از URL واقعی در `docs/mom/evidence/qa4/<id>/` + embed در گزارش رفع
- [ ] تکه‌کد قبل/بعد با مسیر و شماره خط در گزارش رفع
- [ ] راهنمای بازبینی ۳۰ ثانیه‌ای («آدرس + قدم + خروجی مورد انتظار»)
- [ ] به‌روزرسانی جدول وضعیت (بخش ۳) — وضعیت جدید با ذکر شاهد

## ۱۲. گزارش خروجی نهایی

`docs/mom/qa4-fix-report.md` (و نسخه‌ی HTML مثل قبلی‌ها) با ساختار: جدول وضعیت به‌روزشده (همان قالب فهرست تب ۲ کارفرما: مورد / تست سوم / تست چهارم / تست پنجم + شاهد) → برای هر مورد: ادعا، ریشه (کد)، تغییر (کامیت + کد قبل/بعد)، تست، شواهد بصری، راهنمای بازبینی. عنوان‌بندی مطابق بخش‌بندی گزارش کارفرما (بخش ۱ تا ۵ + امنیت + بندهای MOM) تا تطبیق یک‌به‌یک ممکن باشد.
