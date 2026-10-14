# راستی‌آزمایی زنده‌ی موارد QA4 روی محیط Coolify

**تاریخ:** ۱۴ اکتبر ۲۰۲۶ · **محیط:** `https://app.178.105.224.88.sslip.io` (فرانت) + `https://api.178.105.224.88.sslip.io` (بک‌اند) + Coolify v4.1.2
**روش:** کاربر واقعی جدید روی سرور ساخته شد (`qa4.verify.*@test.local`)؛ همه‌ی مسیرها از طریق مرورگر واقعی و API زنده طی شد. هر مورد با شواهد زیرمبن‌دار ثبت شده است.

## ۰. خلاصه

| نتیجه | تعداد |
| --- | --- |
| ✅ روی محیط زنده تأیید شد (با شاهد) | ۱۶ مورد |
| 🔧 حین راستی‌آزمایی، نقص زنده پیدا شد و همان‌جا رفع و مجدداً تأیید شد | ۳ مورد (کامیت‌های جدید) |
| 📦 پوشش با تست خودکار (بدون walk-through زنده) | ۴ مورد مرحله‌ی پایانی کمپین |

**سه یافته‌ی زنده که در تست‌های واحد دیده نمی‌شدند و همان‌جا رفع شدند** (این‌ها ارزش اصلی این راستی‌آزمایی‌اند):

1. **سرویس زباله از داده‌ی قدیمی** (`96a4a74`/`19dcc6e`): بعد از استقرار اول، رشته‌ی «with an average rating of 4» هنوز از endpoint سرویس‌ها برمی‌گشت — چون `get_scraped_service_names`/`get_core_service_names` ردیفِ global-by-identity را **بدون فیلتر** می‌خواندند و دکمه‌ی Re-Analyze هرگز `force_refresh` نمی‌فرستاد. رفع: فیلتر خط آخر در هر دو getter + اسکوپ brand-owned + `force_refresh: true` از دکمه‌ی Re-Analyze. **تأیید زنده‌ی بعدی:** لیست سرویس‌ها `[]` تمیز (بدون نیاز به تحلیل مجدد) و پس از force-refresh: ۵ سرویس واقعی.
2. **کردیتِ worker صفر** (`d1d2db2`): تحلیل‌ها در worker سلری اجرا می‌شوند و ContextVar کاربر از پروسه‌ی web عبور نمی‌کرد → همه‌ی ردیف‌های TokenUsage با `user=NULL`. رفع: تسک `run_brand_full_analysis` مالک برند را برای طول عمر تسک bind می‌کند. **تأیید زنده:** کردیت از 0 به **1,117** رفت وسطِ یک تحلیل.
3. **کردیتِ مراحل کمپین صفر** (`0fba2f8`): DRF توکن JWT را داخل view احراز می‌کند؛ middleware ساده فقط session-user می‌دید → مراحل سگمنتیشن/PPC/فانل (اجرای هم‌زمان در پروسه‌ی web) بی‌صاحب ثبت می‌شدند. رفع: middleware در حالت anonymous، توکن Bearer را همان‌طور که DRF احراز می‌کند resolve می‌کند (+۲ تست). **تأیید زنده:** اجرای مجدد فانل از طریق API با توکن JWT → کردیت **1117 → 2928**.

## ۱. وضعیت محیط (Coolify)

| مورد | شاهد |
| --- | --- |
| بک‌اند مستقر روی کامیت گیت | `GET /health/version` → `{"version":"qa4","commit":"457b51d"}` (زنجیره: `61c29a5` → `c975e10` → `bc61c67` → `457b51d`؛ هر دیپلوی از records خود Coolify: `finished`) |
| دیپلوی‌ها از طریق API Coolify | deployment uuid ها: `h9kqjjvd…`, `bumug7qf…`, `o5clnrmx…`, `kipjrez4…` — همه finished |
| envهای امنیتی | `SECRET_KEY` (len 50) و `DJANGO_DEBUG=0` و `CORS_ALLOWED_ORIGINS=https://app.178.105.224.88.sslip.io` ست‌اند؛ پاسخ 401 شامل `Access-Control-Allow-Origin` صحیح است |
| ریشه‌ی «فرانت آپدیت شد ولی بک‌اند نه» | اپ بک‌اند برنچ `feat/django-backend` را دنبال می‌کرد نه main — از آن تاریخ main مرج و به آن برنچ پوش می‌شود |
| فرانت | build جدید (تاریخ badge: Oct 14)؛ sw.js = `hdm-v1.1.0` با کامنت QA4-P0 |

شواهد خام: `evidence/qa4/live/coolify-env.txt`

## ۲. تک‌تک موارد فهرست QA4 — نتیجه روی محیط زنده

### بحرانی و زیرساختی

| مورد | روش راستی‌آزمایی زنده | نتیجه | شاهد |
| --- | --- | --- | --- |
| **تست۴-۱ · پنل سیاه بعد از رفرش (بحرانی)** | لاگین → `tab.reload()` کامل | کاربر **لاگین‌ماند** و `/brands` کامل رندر شد (appLen 26574). در یکبار رفرش با شبکه‌ی ناپایدار، مسیر طراحی‌شده اجرا شد: هدایت تمیز به `/login` — بدون صفحه‌ی سیاه/بن‌بست | خروجی step-by-step در لاگ + `evidence/qa4/live/04-after-reload-still-authed.png` |
| **E0 · برچسب نسخه** | DOM سایدبار | بج نسخه رندر می‌شود (`unknown · Oct 14` — تاریخ بیلد درست؛ commit hash به‌خاطر نبودن `VITE_GIT_COMMIT` در build env «unknown» — env اکنون ست شده و از بیلد بعد نمایش داده می‌شود؛ سمت بک‌اند `/health/version` کامیت دقیق می‌دهد) | snapshot + `01-brands-tour-sidebar.png` |
| **عکس ۵ · AI Credits** | ثبت کاربر → ۴ تحلیل + ۳ مرحله‌ی کمپین روی سرور | Sidebar عدد واقعی ledger را نشان می‌دهد؛ `GET /credits/summary` → `{"used_month":2928}` — دو مسیر افزایش زنده اثبات شد: worker (0→1117 وسط تحلیل) و web (1117→2928 با اجرای فانل). دو نقص attribution (worker و JWT) همان‌جا پیدا و رفع شد (بالا) | curl outputs + عدد Sidebar در snapshot |
| **امنیت · Rate limit** | ۱۲ لاگین ناموفق پشت‌سرهم | `401 ×10` سپس **`429`** — دقیقاً `auth: 10/min` | `$TEMP/ratelimit.txt` (کپی در evidence) |

### برند و اسکن

| مورد | روش | نتیجه | شاهد |
| --- | --- | --- | --- |
| **عکس ۲ / عکس ۸ / جدید ۶ · سرویس‌های زباله** | اسکن justlife.com → تحلیل → `GET /brands/{uuid}/services/` → فرم کمپین | قبل از force-refresh: زباله‌ی قدیمی **فیلتر شد** (`[]`)؛ بعد از force-refresh: **Handyman Services, Home Cleaning, Home Repairs, Salon Services, Spa Services** (source=brand_analysis) — در فرم کمپین هم دقیقاً همین ۵ مورد. هیچ‌کدام از ۷ رشته‌ی گزارش کارفرما دیده نمی‌شود | curl outputs + متن فرم کمپین + `02-scan-justlife-detection.png` |
| **تست۴-۳ · تشخیص زبان/صنعت/اسم** | اسکن justlife.com در UI | زبان **en (High)**، صنعت **Home Services (High confidence، auto-select)**، اسم شرکت **Justlife**، لوکیشن Dubai/AbuDhabi — هر سه خطای گزارش‌شده رفع | `02-scan-justlife-detection.png` (بخش Detected brand info) |
| **بدون عکس ۱ · علت خطای اسکن** | `POST /brands/scan/` با دامنه‌ی ناموجود | پاسخ 400 با `{"detail":"…net::ERR_NAME_NOT_RESOLVED…"}` — علت واقعی به کلاینت می‌رسد | curl output |
| **جدید ۱ · «Not analyzed»** | لیست برندها بعد از تحلیل کامل | کارت برند بج **«Analyzed»** (قبلاً همیشه Not analyzed) | `05-brands-list-badges.png` |
| **تازه ۱ · نوار پیشرفت** | Re-Analyze و پایش صفحه‌ی تحلیل | صفحه‌ی پیشرفت با ۷ سکشن رندر و به اتمام رسید | `03-analysis-progress.png` |
| **عکس ۳۰ · تور** | کاربر تازه → تور فعال (۱/۱۰) | هندسه‌ی رینگ (`tour-highlight-ring`) دقیقاً روی عنصر تعریف‌شده‌ی استپ (`brands.list.search-input`) + tooltip متن استپ | محاسبه‌ی هندسی + `01-brands-tour-sidebar.png` |

### کمپین (مراحل ۱ تا ۳)

| مورد | روش | نتیجه | شاهد |
| --- | --- | --- | --- |
| **عکس ۱۴ · بودجه روی کارت‌های PPC** | اجرای مرحله‌ی PPC روی سرور + باز کردن صفحه | payload: `budget_share` روی **هر سه لیست** (24/23/21/17/15 — مونوتون با opportunity_score 94/88/80/66/60، جمع=100)؛ UI: **۵ بج «Budget share X%»** رندر شد (`[data-testid=ppc-budget-share]` ×5) | خروجی payload + شمارش DOM (اسکرین‌شات سطح IAB بعد از session طولانی timeout خورد — شاهد متنی ثبت شد) |
| **عکس ۱۵ · متن یکسان Personaها** | اجرای مرحله‌ی Funnel روی سرور | ۳ پرسونا با متن‌های **کاملاً متمایز و اختصاصی** (AI tier فعال): «Acknowledge urgent home issues, missed-time stress…» / «Speak to the mental load of juggling home issues…» / «Speak to fast fixes, fewer complaints, and less downtime…» — قالب‌های ثابت قدیمی حذف | خروجی payload فانل (distinct=True) |
| **عکس ۲۹ / جدید ۵ · شمارش/وضعیت** | ساخت کمپین در UI | سربرگ مرحله: **«STEP 1 / 9»** — مخرج ۹مرحله‌ای جدید (قبلاً 6/6). گیت Complete هم حالا آگهی/تصویر/Review را الزامی می‌کند (تست‌های 400) | متن صفحه‌ی کمپین |

### موارد تحت پوشش تست خودکار (بدون walk-through زنده در این جلسه)

مسیرهای بعدی pipeline — **عکس ۱۸** (چیپ پلتفرم به‌جای `[linkedin]`)، **عکس ۲۷** (تفسیم بودجه‌ی Review)، **جدید ۴** (رندر targeting)، و مراحل آگهی/Review — توسط ۵۱۳+۱۶۶ تست بک‌اند و ۴۱۶ تست فرانت پوشش داده شده‌اند (نام فایل‌ها در `qa4-fix-report.md`). برای تست پنجمِ کارفرما، ادامه‌ی همین کمپینِ ساخته‌شده (`77cc921f`، تا مرحله‌ی ۳ اجرا شده) می‌تواند مستقیم این صفحه‌ها را بازبینی کند.

## ۳. چک‌لیست بازبینی ۳۰ثانیه‌ای برای تست پنجم

1. `GET https://api.178.105.224.88.sslip.io/health/version` → باید `457b51d` (یا جدیدتر) بدهد.
2. در اپ: بج پایین Sidebar = تاریخ بیلد جدید؛ عدد AI Credits با هر تحلیل زیاد می‌شود.
3. لیست برندها → بج Analyzed؛ فرم کمپین → فقط سرویس‌های واقعی.
4. صفحه‌ی PPC هر کمپین → بج «Budget share» روی کارت‌ها؛ Warnings → چیپ برچسب پلتفرم بدون `[ ]`.
5. صفحه‌ی Funnel → دو پرسونا = دو متن متفاوت؛ صفحه‌ی Ads Strategy → بخش TARGETING پر (Google و Meta).
6. صفحه‌ی Review → درصدهای مرحله با استراتژی‌ها می‌خواند + نمای by-platform؛ کارت کمپین → «N of 9» و In Progress تا Complete دستی.
7. ۱۱ لاگین غلط پشت‌سرهم → 429.

## ۴. حساب تست و داده‌ها

- کاربر تست: `qa4.verify.1791988677@test.local` (قابل حذف توسط ادمین؛ داده‌ی تولیدشده: برند Justlife یکتا با ردیف‌های brand-owned + کمپین `77cc921f` تا مرحله‌ی ۳).
- داده‌ی مشترک کارفرما دست‌نخورده ماند (copy-on-write در عمل: ردیف‌های shared فقط خوانده شدند؛ force-refresh ردیف‌های برندِ خودم را نوشت).
