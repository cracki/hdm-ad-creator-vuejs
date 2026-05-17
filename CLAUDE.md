# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Development Commands

```bash
npm install
npm run dev          # Vite dev server on port 3000, proxies /api to localhost:8000
npm run build        # vue-tsc type-check + vite build
npm run preview      # preview production build
```

- API base URL: `VITE_API_URL` env var (defaults to `http://localhost:8000`)
- Path alias: `@` → `./src` (configured in both `vite.config.ts` and `tsconfig.app.json`)
- Regenerate API types: `npx openapi-typescript http://localhost:8000/api/v1/schema/ -o src/shared/api/sdk.ts`

## Architecture

Vue 3 + TypeScript SPA using Composition API (`<script setup>`), Pinia for state, TanStack Vue Query for server state, and Tailwind CSS v4 for styling.

### Directory Layout

```
src/
  features/              # Feature-sliced design — each feature is self-contained
    <feature>/
      views/             # Route-level Vue components
      components/        # Feature-specific components
      api.ts             # Axios API calls for this feature
      queries.ts         # TanStack Vue Query hooks (useQuery/useMutation)
      types.ts           # TypeScript interfaces
      schemas.ts         # Zod validation schemas
      machines/          # State machines (campaign wizard)
  shared/
    api/
      client.ts          # Axios instance with JWT interceptors (access/refresh token rotation)
      sdk.ts             # API type re-exports (auto-generated from OpenAPI schema)
    composables/         # Reusable Vue composables
    components/          # Shared UI components
    utils/               # i18n, CSV export, sanitization, constants
    schemas/             # Shared Zod schemas (pagination, UUID)
    types/               # Shared type definitions
  infrastructure/
    router/              # Vue Router config with auth guards
    operations/          # Global operation tracking (dedup long-running tasks)
    monitoring/          # Sentry setup
    pwa.ts               # Service worker registration
  layout/                # App shell: sidebar, topbar, mobile nav
  main.ts                # App bootstrap (Pinia, Vue Query, router, fonts)
  styles.css             # Tailwind v4 config with CSS custom properties theme
```

### Feature Modules

Nine features under `src/features/`:

| Feature | Purpose |
|---------|---------|
| `auth` | Login, register, Google OAuth, profile. Pinia store (`useAuthStore`) manages JWT tokens. |
| `brands` | Brand CRUD, asset management, full analysis workflow |
| `campaigns` | Campaign CRUD, per-step workflow (segmentation, PPC viability, funnel, content strategy, ads strategy, ad generation, visuals, review) |
| `wizard` | 10-step campaign wizard combining all campaign steps into guided flow |
| `fullFunnel` | Full funnel launcher view |
| `market` | Content intelligence (hooks, gaps, matrix, top-performing) |
| `adLibrary` | Ad library browser and generation runs |
| `scenarioVariants` | Scenario variant matrix runs |
| `competitors` | Competitor management and social media analysis |

### Data Flow Pattern

Each feature follows the same layered pattern:

1. **`api.ts`** — Plain functions calling `apiClient` (Axios). Accept `AbortSignal` for cancellation.
2. **`queries.ts`** — TanStack Vue Query wrappers. Query keys follow `['feature', ...identifiers]` convention. Mutations invalidate related queries on success.
3. **`views/*.vue`** — Import from `queries.ts`, use composables for complex logic.

### Authentication

- `useAuthStore` (Pinia) stores access token in memory, refresh token in `sessionStorage` (base64-encoded)
- `apiClient` interceptors auto-attach `Authorization: Bearer` header and handle 401 with transparent token refresh
- Router guard in `infrastructure/router/index.ts` checks `requiresAuth` / `guest` meta

### Long-Running Operations

- `useJobTracker` composable: starts a job, then polls with exponential backoff (2s → 10s cap, max 300 attempts). Used for brand analysis runs.
- `useAsyncOperation` composable: wraps one-shot API calls with loading/error state, abort controller, and 5-minute timeout. Used for campaign step execution.
- `operationManager`: singleton tracking active operations by key to prevent duplicate submissions.

### Campaign Wizard State Machine

`campaignWizard.ts` implements a 10-step wizard with:
- `isStepCompleted()` checks campaign boolean flags (`segmentation_completed`, etc.) and `context_payload.selected_platforms`
- Navigation only allowed to steps where all preceding steps are complete
- `useCampaignWizard` composable provides reactive step state, progress, and navigation

### Internationalization

- Custom `useI18n()` composable (not vue-i18n). Three languages: English (en), Arabic (ar), Farsi (fa).
- RTL/LTR direction set on `<html>` element via `document.documentElement.dir`
- Translation keys and strings in `shared/utils/translations.ts`
- Font packages: Inter (EN), Vazirmatn (FA), Space Grotesk (headings), JetBrains Mono (monospace)

### API Type Regeneration

`src/shared/api/sdk.ts` re-exports types from feature modules. When the Django backend is running, regenerate from OpenAPI schema:
```bash
npx openapi-typescript http://localhost:8000/api/v1/schema/ -o src/shared/api/sdk.ts
```

### TypeScript Conventions

- `noUnusedLocals` and `noUnusedParameters` enabled — no unused imports
- `erasableSyntaxOnly` enabled — use `type` imports, no `enum`/`namespace` declarations
- Zod schemas in each feature's `schemas.ts` validate API responses at query boundaries
- `useNormalizeResponse` composable handles LLM response key aliasing (LLM providers return inconsistent JSON keys)

### Build

- Vite with manual chunk splitting for vendor libraries (vendor-vue, vendor-query, vendor-vueuse, vendor-ui, vendor-other)
- Target: `esnext`
- Tailwind CSS v4 via `@tailwindcss/vite` plugin
