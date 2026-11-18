# TEST PLAN — QA7 remediation verification

## Environment

- Backend: `ad_creator/django-backend`, Python 3.10 venv (`.venv`), Django 5.2.
- Database for full runs: embedded PostgreSQL 18 on `127.0.0.1:5433`
  (`ad_creator` DB, UTF8). SQLite fallback
  (`configuration/local_test_settings.py`) works for SimpleTestCase-only
  modules but cannot run migrations (ArrayField is Postgres-only).
- Frontend: `ad-creator-vue`, Node 22, Vitest 4 + jsdom.

## Commands (exact, reproducible)

Backend (from `django-backend/`):

```bash
DJANGO_DEBUG=1 SECRET_KEY=t \
POSTGRES_HOST=127.0.0.1 POSTGRES_PORT=5433 POSTGRES_DB=ad_creator \
POSTGRES_USER=postgres POSTGRES_PASSWORD=postgres \
DJANGO_SETTINGS_MODULE=configuration.settings \
.venv/Scripts/python.exe manage.py test --noinput
```

Frontend (from `ad-creator-vue/`): `npm run test:run`

Local full-stack E2E (used this session):

```bash
# backend (127.0.0.1:8000) with the embedded PG env above, SECRET_KEY=local-dev-e2e
# frontend: VITE_API_URL=http://127.0.0.1:8000 npx vite --port 5173
```

## New regression suites (this session)

| Module | Covers | Tests |
|---|---|---|
| `core/tests_qa7_junk.py` | FA-06 structural junk EN+FA, survivors, mixed lists | 12 |
| `brand/tests_qa7_detection.py` | FA-01/02/03/04/05/07/19 | 22 |
| `campaign/tests_qa7_budget.py` | FA-23 platform shares over selected set | 6 |
| `campaign/tests_qa7_localization.py` | FA-10/27/28/29 | 13 |
| FE `CampaignCreateView.test.ts` (extended) | FA-15/17 (+ legacy guards) | 14 total |
| FE `AdGenerationView.test.ts` (extended) | FA-21/26 | 6 total |
| FE `types.test.ts` (extended) | FA-07/19 FE split | 57 total |
| Updated: `campaign/tests_qa5.py` | FA-51 contract (empty selection = error) | — |
| Updated: 4 FE suites | canonical UAE / stage-budget label | — |

## Scope matrix exercised

- Brands: karnameh.com (fa, auto), fitnessfirstme.com (en, gym),
  dubaidrivingcenter.net (en, education), payamgostar/hostiran/raykanet/
  moble-massage strings (unit-level).
- Languages: en + fa (ar at prompt/unit level).
- Currencies: USD default, IRT/AED/SAR/TRY country defaults.
- Selections: preselected chips, deselect-all → explicit [],
  legacy no-selection fallback, 1/2/3-platform share normalization.
- Live flows: login → brand scan (3 sites) → brand create (scheme-less
  URL, empty industry) → campaign create (fa, Persian services) →
  segmentation prefill + validation errors (location required → LLM key
  boundary).

## Results (see EVIDENCE/)

- Backend full suite: recorded verbatim in `EVIDENCE/be-final-suite.txt`.
- Frontend full suite: recorded verbatim in `EVIDENCE/fe-final-suite.txt`.
- E2E API artifacts: `EVIDENCE/e2e-*.json`, `EVIDENCE/django-e2e.log`.

## Not testable in this environment (BLOCKED)

- All LLM-dependent stages without `OPENAI_API_KEY` (segmentation onward,
  brand analysis, ad/visual generation) — the local E2E stops at the
  honest "OPENAI_API_KEY is required" error.
- Deployed-environment verification (staging URL /health/version SHA
  check, cache/SW behavior post-deploy) — no deploy access.
- Screenshot capture: the in-app browser screenshot surface timed out
  repeatedly in this environment; DOM snapshots + API payloads are the
  recorded evidence instead (no fabricated images).
