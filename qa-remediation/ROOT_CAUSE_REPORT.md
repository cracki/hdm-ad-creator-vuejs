# ROOT CAUSE REPORT — HDM Ad Creator QA Remediation (QA7 cycle)

Date: 2026-11-18 · Author: QA remediation session
Baselines: FE `ad-creator-vue@main b3a190e` → this session's commits; BE `ad_creator/django-backend@main ed49cb0` → this session's commits. Deployed environment (unchanged, NOT updated by this session): app/api.178.105.224.88.sslip.io, BE `qa4 / 0fe3a63`.

## 1. Why previous fixes kept regressing (the systemic pattern)

The QA history shows one recurring failure mode, confirmed by reading the
QA4–QA6 diffs against the QA7 findings:

1. **Literal-example patching.** Each junk-filter round added the exact
   strings from the latest report (`text_patterns.py` contained the literal
   word "martyrs"). The next brand leaked new junk ("15 Min", "8 Swimming
   Pools") because the *shape* was never classified — only the words.
2. **Tests asserted the report's examples, not the contract.** QA6's
   automated tests passed on EDI strings while DDC/Fitness First failed
   with the same build (QA7 verdict: "each fix was tested only against
   our report's own examples").
3. **Fallbacks that hide FE data bugs.** PPC silently widened an empty
   selection to the whole brand catalog (QA6 "PPC Ready: 4 of 2"), so the
   FE's non-persisting chips were never surfaced as an error.
4. **Per-page budget arithmetic.** Each stage re-derived money numbers
   from different sources (recommendation rows, LLM strings, summaries),
   so totals disagreed across pages and unselected platforms kept shares.
5. **English-only defaults.** Language/currency/CTA/geo handling assumed
   English + Latin commas; Persian inputs took hidden code paths that no
   English-brand test exercised.

This session's fixes are structural (rules over words, contracts over
examples, single normalization points) and each carries cross-brand
regression tests (Persian + English + boundary survivors).

## 2. Verified root causes and fixes (this session)

### FA-06 junk services (P0) — `core/utils/text_patterns.py`, `brand/text_utils.py`
- **Root cause:** compiled literal blocklists (QA4–QA6 layers) + a
  person-name heuristic that ate legitimate B2B offerings ("Passive
  Network" is Title-Case 2 words with no service keyword).
- **Fix:** structural classifier `_looks_structural_junk` — duration-only
  chips, section headings (`Our …`), benefit headings, staff labels,
  count+plural facility lists, word+bare-number labels, terminal-question
  titles, trailing-colon labels, terminal-punctuated slogans, trial
  come-ons (number+duration+free), any `%`-bearing chip, Persian chrome
  (تماس با ما، تأیید امنیتی، امکان …), Persian semicolon slogans, and a
  Persian promo-dominance rule (≥50% promo-family words ⇒ junk) that keeps
  real installment-SALE offerings («فروش اقساطی صندلی ماساژور») alive.
  Added B2B indicator words (network/hosting/server/…) so legitimate
  Title-Case services survive the person-name check.
- **Tests:** `core/tests_qa7_junk.py` — every junk string ever reported
  (QA4 justlife/ms-realestate/renofit, QA5/QA6 edi, QA7 ddc/fitness,
  Persian didar/hostiran/payamgostar/moble) rejected; 30+ confirmed-real
  offerings survive; mixed-list snapshots.
- **Live evidence:** `EVIDENCE/e2e-scan-fitnessfirstme.com.json` — services
  `["Membership Plans","Training Programmes"]` only; all five QA7 junk
  items gone.

### FA-01 company name (P1) — `brand/engines/auto_scan_engine.py`
- **Root cause:** `_clean_title` split only on `|–·-`; Persian `؛`/`:` and
  Arabic `،` never split, so the full SEO title became the name; Latin-only
  token regex; local-SEO titles ("Gym near me") passed through.
- **Fix:** separators extended (`:؛،`), Persian token support in
  `_title_tokens`, local-SEO phrase trimming, emoji stripping (acts as a
  separator).
- **Tests:** `brand/tests_qa7_detection.py` (karnameh/didar/moble cases).
- **Live:** karnameh.com → «کارنامه»; fitnessfirstme.com → "Gym" (from
  "Gym near me"); dubaidrivingcenter.net → "Dubai Driving Center".

### FA-02 industry detection (P1) — `core/utils/scraper.py`
- **Root cause:** English-only keyword lists counted ambiguous single
  words equally ("training" flipped a gym to Education).
- **Fix:** Persian keywords for every category; phrase keywords with 3×
  weight ("personal training" ⇒ fitness, "آموزشگاه رانندگی" ⇒ education).
- **Live:** fitnessfirstme.com → **Fitness (high)** — was Education
  (QA7#7); dubaidrivingcenter.net → Education (high).

### FA-03 industry taxonomy (P1) — migration `brand/migrations/0018_qa7_industries.py`
- **Root cause:** no B2B categories; "Other" absent.
- **Fix:** seeds Construction & Manufacturing, IT & Network Services,
  Security & CCTV, Other (idempotent get_or_create).
- **Finding (operational):** the STANDARD industry rows exist only as
  production data, never in migrations — fresh environments boot with an
  empty picker. Seeding them broke 28 existing test fixtures
  (UniqueViolation), so the migration deliberately seeds only the four NEW
  rows; the standard-taxonomy seed is documented here as an ops follow-up.
- **Live:** all three QA7 brands saw the full list (locally seeded).

### FA-04 misleading duplicate-brand error (P1) — `brand/serializers.py`
- **Root cause:** `selected_industry` NOT NULL; ANY IntegrityError in
  `create()` was rewritten to "You already have a brand…".
- **Fix:** empty industry defaults to the "Other" row; IntegrityError is
  mapped to the duplicate message only when a duplicate actually exists;
  otherwise a field-accurate validation error.
- **Live:** brand created with empty industry → `selected_industry: "Other"`
  (`EVIDENCE/e2e-karnameh-brand-api.json`).

### FA-05 background colors as palette (P2) — `auto_scan_engine.py`
- **Root cause:** every logo palette swatch was returned with "high"
  confidence, including #f6f6f6-class page backgrounds.
- **Fix:** `_drop_background_colors` (relative luminance > 0.92 / < 0.06)
  drops chrome swatches; all-white palettes return a truthful warning and
  confidence drops to medium when filtering occurred.

### FA-07/FA-19 country-aware geo split (P1) — new `core/utils/geo.py`; FE `types.ts`
- **Root cause:** "last comma token = country" on both sides; Persian
  comma unsupported; GCC/MENA/city tokens promoted to country.
- **Fix:** shared alias table (EN/FA/ISO) on the BE (`split_location`)
  and mirrored in the FE (`splitLocationParts`); country stays empty when
  no token is a recognized country; segmentation service delegates.
- **Tests:** QA7#2 acceptance strings incl. "Dubai, Abu Dhabi" →
  country None; "تهران، ایران" → (تهران, Iran).

### FA-47 scheme-less URL (P1) — `brand/serializers.py`
- **Root cause:** scan normalized the URL but DRF's URLField rejected the
  raw scheme-less string at create (bare "Enter a valid URL.").
- **Fix:** `SchemeNormalizingURLField` prepends `https://` before URL
  validation.
- **Live:** reproduced the failure first, then created the brand from
  `karnameh.com` successfully.

### FA-10 analysis language (P0) — `brand/analyzers/brand_core_analyzer.py`, `audience_analyzer.py`
- **Root cause:** the core-analysis prompt hard-coded "You MUST respond in
  ENGLISH ONLY … translate and analyze in English"; only the competitor
  analyzer had the QA5 language directive.
- **Fix:** the directive is now derived from `website_data.language`
  (defaults to English). The audience analyzer gets the same directive,
  real location signals, and rules against "global"/undefined secondary.

### FA-15 brand-derived defaults (P1) — `BrandSerializer` + FE
- **Fix:** new read-only `detected_language` / `detected_country` on the
  brand payload; CampaignCreateView defaults language + currency from the
  selected brand (Iran→IRT, UAE→AED, …) unless the user has chosen.

### FA-16 currency gaps (P1)
- TRY added to the campaign currency list; the strategy prompt now spells
  out display names ("IRT = Iranian Toman (تومان) — never Rial (ریال)")
  so LLM prose stops printing ریال for toman budgets.

### FA-17/FA-50/FA-51 selection contract (P0) — FE `CampaignCreateView`, BE `ppc_viability.py`
- **Root cause (FE):** chips started unselected while the helper copy
  said "deselect what you don't want"; the empty selection then never
  reached `context_payload`.
- **Root cause (BE):** `_resolve_runtime_context` fell back from an
  empty/absent selection to the FULL brand catalog.
- **Fix:** chips pre-select all suggestions on load; the create payload
  always persists `selected_services` when suggestions exist (explicit
  `[]` after deselect-all); PPC honors a persisted selection STRICTLY —
  empty-after-filter raises "No services are selected…" instead of
  widening. Legacy campaigns (key absent) keep the old fallback.
  Product-description join is language-aware («و» for fa) and includes
  ALL selected services.
- **Live:** campaign API shows
  `selected_services: ["خرید و فروش خودرو","کارشناسی خودرو"]`; the
  segmentation form prefilled «خرید و فروش خودرو و کارشناسی خودرو».

### FA-23 platform budget share (P0) — `campaign/services/ads_strategy.py`
- **Root cause:** the strategy read the platform's RAW persisted
  `budget_share` — normalized over the AI's recommended set, which can
  include an unselected platform (google 53/linkedin 47 while the campaign
  selected google+meta).
- **Fix:** shares are re-normalized over the SELECTED set (recommended
  shares kept proportionally, missing ones default to equal-split, scaled
  to exactly 100; single selected platform = 100).
- **Tests:** `campaign/tests_qa7_budget.py` (رایکانت/کارنامه scenarios).

### FA-21 unselected personas in Ad Generation (P1) — FE `AdGenerationView.vue`
- **Root cause:** `personaObjects` built from every segment; the
  persisted `selected_personas` (which Funnel honors) was never read.
- **Fix:** picker + ads-fallback list filtered by `selected_personas`
  (empty/absent = all; name-shape mismatch degrades to full list).

### FA-26 hard-coded TOFU+Meta default (P1) — FE `AdGenerationView.vue`
- **Fix:** defaults derive from campaign state — top platform by persisted
  recommendation share (restricted to selected platforms) and the
  funnel stage the strategies weight most; user choice sticks.

### FA-27/FA-28/FA-29 ad copy language (P0) — `campaign/engines/ad_generation_engine.py`
- **Root cause:** fixed English CTA matrix + English angle-opener words
  (the source of «آنی…/فوری…» transliterations and "Tired of
  migration…" prefixes); no brand-name contract.
- **Fix:** per-language CTA matrices (en/fa/ar), native angle-opener
  rules + LANGUAGE PURITY block for non-English, deterministic
  post-generation sanitizer (drops Latin-only opener sentences, duplicated
  headline/CTA in body, prepends the exact brand name when missing),
  verbatim brand-name prompt rule.
- **Tests:** `campaign/tests_qa7_localization.py`.

### FA-33 RTL rendering (P1) — FE
- `dir="auto"` added to segmentation persona cards, platform
  recommendation summary/details/warnings, and ad preview copy blocks.

### FA-35 AI credits (P2) — FE `Sidebar.vue`
- 30s polling + focus refetch keeps the counter live; the no-quota branch
  is translated; NaN-guard formatting.

### FA-37 dashboard "Ada" (P2)
- The fabricated "Welcome back, Ada…" subtitle replaced with a neutral
  summary in en/fa/ar (the hero already greets by the real user name).

### MKT-02 fabricated login stats (P2) — FE `LoginView.vue`
- "2,140 active brands / 1.2M ads / 91 avg score" replaced with honest
  capability labels.

### QA7#3 intelligence prefill guard (P1) — FE `MarketIntelligenceView.vue`
- **Root cause:** watcher stopped on "field non-empty", so the early
  managed-only fill blocked the later fuller manual+analysis list.
- **Fix:** guard is now a `brandServicesTouched` flag set on user input.

### QA7-E2E segmentation crash (found live) — `campaign/services/segmentation.py`
- **Root cause:** `brand_porifle.to_analysis_dict()` without a None check
  500'd with a raw TypeError when the brand had no completed core
  analysis.
- **Fix:** degrade to a minimal brand profile (company/industry/services
  from the brand + selected services).
- **Live:** error changed from TypeError to the honest
  "OPENAI_API_KEY is required for LLMHandler." boundary.

## 3. Known non-fixes / deferred (with reasons)

- **FA-22 local ad platforms for Iran** — needs a product decision on the
  platform list (یکتانت/تپسل/دیوار/…); the backend platform choices are a
  schema change. A country-gated warning is implementable next.
- **FA-46 admin impersonation / forgot-password email** — security-sensitive
  scope; forgot-password needs an email backend decision.
- **FA-05 logo extraction breadth** (favicon/apple-touch-icon/logo-class
  images) — partially addressed (color filtering); full asset discovery
  remains open.
- **Standard industry seed** — see §2 FA-03 operational note.
- **Analysis sub-stage timings (FA-09/QA7#4)** — requires server-side log
  access on the deployed environment (BLOCKED locally).
