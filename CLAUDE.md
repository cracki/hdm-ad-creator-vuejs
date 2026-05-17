# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Development Commands

```bash
npm install
npm run dev          # Vite dev server on port 3000, proxies /api to localhost:8000
npm run build        # vue-tsc -b type-check + vite build
npm run preview      # preview production build
```

- API base URL: `VITE_API_URL` env var (defaults to `http://localhost:8000`)
- Path alias: `@` → `./src` (configured in both `vite.config.ts` and `tsconfig.app.json`)
- Regenerate API types: `npx openapi-typescript http://localhost:8000/api/v1/schema/ -o src/shared/api/sdk.ts`

## Technology Stack

| Category | Technology | Version |
|----------|-----------|---------|
| Framework | Vue 3 (Composition API, `<script setup>`) | 3.5.x |
| Language | TypeScript (~6.0, strict) | erasableSyntaxOnly, noUnusedLocals, noUnusedParameters |
| State | Pinia | 3.0.x |
| Server State | TanStack Vue Query | 5.100.x |
| Routing | Vue Router | 4.6.x |
| HTTP | Axios | 1.16.x |
| Styling | Tailwind CSS v4 + tw-animate-css | 4.2.x |
| Validation | Zod | 4.4.x |
| Sanitization | DOMPurify | 3.4.x |
| Icons | Lucide Vue Next | 1.0.x |
| Utilities | VueUse | 14.3.x |
| Build | Vite | 8.0.x |

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
    composables/         # 13 reusable Vue composables
    components/          # 16 shared UI components
      renderers/         # 7 specialized content renderers
    utils/               # i18n, CSV export, download, sanitization, constants
    schemas/             # Shared Zod schemas (pagination, UUID)
    types/               # Shared type definitions
  infrastructure/
    router/              # Vue Router config with auth guards
    operations/          # Global operation tracking (dedup long-running tasks)
    monitoring/          # Sentry setup
    pwa.ts               # Service worker registration
  layout/                # App shell: AppLayout, Sidebar, Topbar, MobileBottomNav, Logo, LangSwitch
  main.ts                # App bootstrap (Pinia, Vue Query, router, fonts)
  styles.css             # Tailwind v4 config with CSS custom properties theme (dark mode, OKLCH colors)
```

### Feature Modules

Nine features under `src/features/`:

| Feature | Purpose | Key Views |
|---------|---------|-----------|
| `auth` | Login, register, Google OAuth, profile. Pinia store (`useAuthStore`) manages JWT tokens. | LoginView, RegisterView, ProfileView, DashboardPlaceholder |
| `brands` | Brand CRUD, asset management, full analysis workflow | BrandListView, BrandDetailView, BrandCreateView, BrandAnalysisView, BrandAnalysisHistoryView, BrandAssetsView |
| `campaigns` | Campaign CRUD, per-step workflow (segmentation, PPC viability, funnel, content strategy, ads strategy, ad generation, visuals, review) | 11 views covering each campaign step |
| `wizard` | 10-step campaign wizard combining all campaign steps into guided flow | WizardView |
| `fullFunnel` | Full funnel launcher view | FullFunnelLauncherView |
| `market` | Content intelligence (hooks, gaps, matrix, top-performing) | MarketIntelligenceView, MarketHooksView, MarketGapsView, MarketMatrixView, MarketTopPerformingView |
| `adLibrary` | Ad library browser and generation runs | AdLibraryBrowserView, AdLibraryGenerateView, AdLibraryRunDetailView |
| `scenarioVariants` | Scenario variant matrix runs | ScenarioVariantsView, ScenarioMatrixView |
| `competitors` | Competitor management and social media analysis | CompetitorManagementView, SocialAnalysisView, SocialAuditView |

### Shared Composables (src/shared/composables/)

| Composable | Purpose |
|------------|---------|
| `useAsyncOperation` | One-shot API calls with loading/error state, abort controller, 5-min timeout |
| `useJobTracker` | Long-running job polling with exponential backoff (2s→10s cap, max 300 attempts) |
| `useGoogleAuth` | Google OAuth flow handling |
| `useBrandScore` | Brand score calculation and display |
| `useDemoMode` | Demo mode toggle |
| `useProductTour` | Guided product tour |
| `useMoodBoard` | Mood board management |
| `useToast` | Toast notification system |
| `useOnlineStatus` | Online/offline detection |
| `useNormalizeResponse` | LLM response key aliasing (providers return inconsistent JSON keys) |
| `useAutoSelectBrand` | Auto brand selection logic |
| `useMobileDrawer` | Mobile drawer state |
| `usePageActions` | Page-level action management |

### Shared Components (src/shared/components/)

**UI Components**: AdCopyEditor, AdPreview, BrandScoreGauge, Breadcrumb, ConfirmDialog, CreativeBriefBuilder, DemoBanner, EmptyState, ErrorBoundary, MoodBoard, PersonaMapper, ProductTourOverlay, SkeletonLoader, ToastNotification, VirtualScroll, AnalysisPayloadRenderer

**Content Renderers** (src/shared/components/renderers/): AdsStrategyRenderer, AnalysisPayloadRenderer, ContentGapsRenderer, ContentMatrixRenderer, IntelligenceSummaryRenderer, SegmentDeepResearchRenderer, TopPerformingContentRenderer

### Data Flow Pattern

Each feature follows the same layered pattern:

1. **`api.ts`** — Plain functions calling `apiClient` (Axios). Accept `AbortSignal` for cancellation.
2. **`queries.ts`** — TanStack Vue Query wrappers. Query keys follow `['feature', ...identifiers]` convention. Mutations invalidate related queries on success.
3. **`views/*.vue`** — Import from `queries.ts`, use composables for complex logic.

### Authentication

- `useAuthStore` (Pinia) stores access token in memory, refresh token in `sessionStorage` (base64-encoded)
- `apiClient` interceptors auto-attach `Authorization: Bearer` header and handle 401 with transparent token refresh
- Router guard in `infrastructure/router/index.ts` checks `requiresAuth` / `guest` meta

### Vue Query Configuration

Default options (set in `main.ts`):
- `staleTime`: 30 seconds
- `gcTime`: 5 minutes
- `retry`: 2
- `refetchOnWindowFocus`: false

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
- Translation keys and strings in `shared/utils/translations.ts` (~97KB)
- Font packages: Inter (EN), Vazirmatn (FA), Space Grotesk (headings), JetBrains Mono (monospace)

### Styling & Theme

- Tailwind CSS v4 with `@tailwindcss/vite` plugin
- Dark mode by default (`.dark` class on root)
- OKLCH color system with custom CSS properties
- Custom brand colors: primary (purple 295), accent-cyan, accent-magenta, accent-amber
- Custom animations: shimmer, float, pulse-glow, aurora, fade-up, scale-in
- Border radius tokens: sm/md/lg/xl/2xl/3xl based on `--radius` (0.875rem)

### API Type Regeneration

`src/shared/api/sdk.ts` re-exports types from feature modules. When the Django backend is running, regenerate from OpenAPI schema:
```bash
npx openapi-typescript http://localhost:8000/api/v1/schema/ -o src/shared/api/sdk.ts
```

### TypeScript Conventions

- `noUnusedLocals` and `noUnusedParameters` enabled — no unused imports
- `erasableSyntaxOnly` enabled — use `type` imports, no `enum`/`namespace` declarations
- `noFallthroughCasesInSwitch` enabled
- Zod schemas in each feature's `schemas.ts` validate API responses at query boundaries
- `useNormalizeResponse` composable handles LLM response key aliasing (LLM providers return inconsistent JSON keys)

### Element Locator System (`data-loc`)

All interactive/prominent UI elements have `data-loc` attributes for easy identification via browser DevTools. When the user references a `data-loc` value, use `grep` to find the exact file and line.

**Naming convention**: `data-loc="{feature}.{view}.{element}"` — all lowercase, hyphenated words.

| Scope | Pattern | Examples |
|-------|---------|---------|
| Layout | `{component}.{element}` | `sidebar.nav-brands`, `topbar.search-input`, `bottom-nav.dashboard` |
| Feature views | `{feature}.{view}.{element}` | `brands.list.search`, `campaigns.segmentation.run-btn`, `auth.login.signin-btn` |
| Shared components | `{component}.{element}` | `ad-copy-editor.reset-btn`, `confirm-dialog.confirm-btn` |

**How to use**: User inspects element in DevTools, finds `data-loc="brands.list.search"`, tells you: "at `brands.list.search`, change X". You grep for `data-loc="brands.list.search"` to locate the exact file and line.

### Build

- Vite 8 with manual chunk splitting:
  - `vendor-vue`: vue, vue-router, pinia
  - `vendor-query`: @tanstack, axios
  - `vendor-vueuse`: @vueuse/core
  - `vendor-ui`: lucide-vue-next, dompurify, zod, tw-animate-css
  - `vendor-other`: remaining node_modules
- Target: `esnext`
- Sourcemaps: disabled in production
- Proxy: `/api` → `http://localhost:8000`

## Session Guidelines

- Trust the architecture documented above — don't re-explore unless the task requires it
- When asked to modify a feature, go directly to the relevant feature directory under `src/features/`
- Follow the existing patterns (`api.ts` → `queries.ts` → `views/*.vue`) without re-verifying
- Don't launch Explore/Plan agents to "understand the codebase" — the structure is documented here
- Only read files that are directly relevant to the specific task being performed
- If the user's request is clear and matches documented patterns, implement directly without planning
