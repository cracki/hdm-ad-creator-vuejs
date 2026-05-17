# HDM Ad Creator

AI-powered advertising platform for creating, managing, and optimizing digital ad campaigns. Built as a Vue 3 SPA that connects to a Django REST API backend.

## Features

- **Brand Management** — Create brands, upload assets, run AI-powered brand analysis
- **Campaign Wizard** — 10-step guided workflow: audience segmentation, PPC viability, funnel design, content strategy, platform selection, ad generation, visual creation, and export
- **Market Intelligence** — Content hooks, gaps analysis, content matrix, and top-performing content discovery
- **Ad Library** — Browse, generate, and review AI-generated ad copy
- **Scenario Variants** — Generate and compare scenario variant matrices for campaigns
- **Competitor Analysis** — Track competitors and run social media audits
- **Full Funnel Launcher** — End-to-end funnel execution from a single view
- **Multi-language** — English, Arabic (RTL), and Farsi (RTL) support
- **PWA** — Installable as a progressive web app with offline-capable service worker

## Tech Stack

| Layer | Technology |
|-------|-----------|
| Framework | Vue 3 + TypeScript (Composition API, `<script setup>`) |
| State | Pinia (client state) + TanStack Vue Query (server state) |
| Styling | Tailwind CSS v4 |
| Routing | Vue Router 4 with auth guards |
| Validation | Zod schemas at API boundaries |
| HTTP | Axios with JWT interceptors (access/refresh rotation) |
| Build | Vite 8 with manual chunk splitting |
| Icons | Lucide Vue |

## Getting Started

### Prerequisites

- Node.js 20+
- Backend API running (defaults to `http://localhost:8000`)

### Install & Run

```bash
npm install
npm run dev
```

Opens on `http://localhost:3000` with API requests proxied to `localhost:8000`.

### Build for Production

```bash
npm run build    # type-check + vite build
npm run preview  # preview production build locally
```

### Environment

Create a `.env` file:

```
VITE_API_URL=http://localhost:8000
```

### API Type Regeneration

When the backend is running:

```bash
npx openapi-typescript http://localhost:8000/api/v1/schema/ -o src/shared/api/sdk.ts
```

## Project Structure

```
src/
  features/              # Feature-sliced design
    auth/                #   Login, register, OAuth, profile
    brands/              #   Brand CRUD, assets, analysis
    campaigns/           #   Campaign steps & management
    wizard/              #   10-step campaign wizard
    fullFunnel/          #   Full funnel launcher
    market/              #   Market intelligence
    adLibrary/           #   Ad library browser & generation
    scenarioVariants/    #   Scenario variant matrices
    competitors/         #   Competitor tracking & social audit
  shared/
    api/                 #   Axios client, auto-generated types
    composables/         #   Reusable Vue composables
    components/          #   Shared UI components & renderers
    utils/               #   i18n, CSV export, constants
    schemas/             #   Shared Zod schemas
  infrastructure/
    router/              #   Routes & auth guards
    operations/          #   Long-running operation tracking
    monitoring/          #   Sentry integration
  layout/                #   App shell (sidebar, topbar, mobile nav)
```

Each feature follows the same pattern: `api.ts` (Axios calls) → `queries.ts` (Vue Query hooks) → `views/` (route components), with `types.ts`, `schemas.ts`, and `components/` as needed.

## License

Proprietary
