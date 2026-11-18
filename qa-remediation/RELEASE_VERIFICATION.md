# RELEASE VERIFICATION — QA7 remediation session (2026-11-18)

## Commits produced by this session

- **Frontend** `ad-creator-vue` (branch `main`): see `git log` —
  `fix(qa7): …` commit created this session (SHA recorded below after
  commit).
- **Backend** `ad_creator` (branch `main`, django-backend/): same.

## Deployed environment status — NOT UPDATED (BLOCKED)

- Deployed FE: https://app.178.105.224.88.sslip.io (build unknown to this
  session; QA7 last observed `667fa9e`).
- Deployed BE: https://api.178.105.224.88.sslip.io →
  `{"version":"qa4","commit":"0fe3a63","build_at":null}` (checked this
  session, unchanged).
- **This session has no Coolify/deploy credentials.** None of the fixes in
  ROOT_CAUSE_REPORT.md are live on the deployed environment. Deploying
  requires: backend rebuild+release from the new `ad_creator@main`, then
  the frontend build with `VITE_GIT_COMMIT` set, then a `/health/version`
  check against the new SHA. Until then every fixed item is
  **IMPLEMENTED / NOT LIVE-VERIFIED** with respect to the client-visible
  environment.

## Local verification performed instead (what "green" means here)

1. Full backend suite (650 tests) against embedded PostgreSQL 18 — result
   in `EVIDENCE/be-final-suite.txt`.
2. Full frontend suite (Vitest) — result in `EVIDENCE/fe-final-suite.txt`.
3. Real-browser E2E against the local full stack (Django 5.2 + Vite dev),
   with real scrapes of dubaidrivingcenter.net, fitnessfirstme.com and
   karnameh.com — artifacts under `EVIDENCE/` (`e2e-scan-*.json`,
   `e2e-karnameh-brand-api.json`, `e2e-campaign-api.json`,
   `django-e2e.log`).
4. LLM stages verified up to the honest boundary: without
   `OPENAI_API_KEY` the API fails with "OPENAI_API_KEY is required for
   LLMHandler." — no silent fallback, no fake success.

## Cache / service-worker checks

- Unchanged from QA6 state (nginx `no-store` shell, SW `hdm-v1.2.0`,
  self-healing stale-chunk recovery in `dynamicImportRecovery.ts`). The
  deployed environment still needs the post-deploy re-check with an
  existing session (BLOCKED: no deploy).

## Rollback notes

- Backend: all changes are additive Python + ONE idempotent data
  migration (`brand/migrations/0018_qa7_industries.py`, get_or_create of
  4 rows; reverse deletes only those 4). `git revert` of the qa7 commit is
  a complete rollback.
- Frontend: pure source changes; revert the commit.
- No production data was touched by this session (local embedded PG +
  local test DBs only).

## Remaining blockers (honest)

| Blocker | Requirement |
|---|---|
| Deploy access (Coolify) | Release FE+BE, then re-run the QA7/Persian scenarios against the deployed SHAs |
| OPENAI_API_KEY (+ Serper) | Live LLM-stage verification (segmentation→complete, brand analysis language, ad copy fa, visuals) |
| Test account credentials for the deployed env | Client-flow retest without creating arbitrary prod data |
| Server logs | FA-09/QA7#4 stage-timing analysis |
