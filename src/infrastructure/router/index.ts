import { createRouter, createWebHistory, type RouteRecordRaw } from 'vue-router'
import { useAuthStore } from '@/features/auth/store'
import { shouldRecover, hasRecoveryAttempted, markRecoveryAttempt, clearRecoveryFlag } from '@/shared/utils/dynamicImportRecovery'

const routes: RouteRecordRaw[] = [
  {
    path: '/login',
    name: 'login',
    component: () => import('@/features/auth/views/LoginView.vue'),
    meta: { guest: true },
  },
  {
    path: '/register',
    name: 'register',
    component: () => import('@/features/auth/views/RegisterView.vue'),
    meta: { guest: true },
  },
  {
    path: '/',
    component: () => import('@/layout/AppLayout.vue'),
    meta: { requiresAuth: true },
    children: [
      {
        path: '',
        redirect: '/dashboard',
      },
      {
        path: 'dashboard',
        name: 'dashboard',
        component: () => import('@/features/dashboard/views/DashboardView.vue'),
      },
      {
        path: 'brands',
        name: 'brands',
        component: () => import('@/features/brands/views/BrandListView.vue'),
      },
      {
        path: 'brands/new',
        name: 'brand-new',
        component: () => import('@/features/brands/views/BrandCreateView.vue'),
      },
      {
        path: 'brands/:brandUuid',
        name: 'brand-detail',
        component: () => import('@/features/brands/views/BrandDetailView.vue'),
      },
      {
        path: 'brands/:brandUuid/edit',
        name: 'brand-edit',
        component: () => import('@/features/brands/views/BrandCreateView.vue'),
      },
      {
        path: 'brands/:brandUuid/analysis',
        name: 'brand-analysis',
        component: () => import('@/features/brands/views/BrandAnalysisView.vue'),
      },
      {
        path: 'brands/:brandUuid/analysis/:runUuid',
        name: 'brand-analysis-run',
        component: () => import('@/features/brands/views/BrandAnalysisView.vue'),
      },
      {
        path: 'brands/:brandUuid/analysis/history',
        name: 'brand-analysis-history',
        component: () => import('@/features/brands/views/BrandAnalysisHistoryView.vue'),
      },
      {
        path: 'campaigns',
        name: 'campaigns',
        component: () => import('@/features/campaigns/views/CampaignListView.vue'),
      },
      {
        path: 'campaigns/new',
        name: 'campaign-new',
        component: () => import('@/features/campaigns/views/CampaignCreateView.vue'),
      },
      {
        path: 'campaigns/full-funnel',
        name: 'full-funnel',
        component: () => import('@/features/fullFunnel/views/FullFunnelLauncherView.vue'),
      },
      {
        path: 'campaigns/full-funnel/history',
        name: 'full-funnel-history',
        component: () => import('@/features/fullFunnel/views/FullFunnelHistoryView.vue'),
      },
      {
        path: 'campaigns/full-funnel/history/:campaignUuid',
        name: 'full-funnel-history-detail',
        component: () => import('@/features/fullFunnel/views/FullFunnelHistoryDetailView.vue'),
      },
      {
        path: 'campaigns/:campaignUuid',
        name: 'campaign-detail',
        component: () => import('@/features/campaigns/views/CampaignDetailView.vue'),
      },
      {
        path: 'campaigns/:campaignUuid/segmentation',
        name: 'campaign-segmentation',
        component: () => import('@/features/campaigns/views/SegmentationView.vue'),
      },
      {
        path: 'campaigns/:campaignUuid/ppc-viability',
        name: 'campaign-ppc-viability',
        component: () => import('@/features/campaigns/views/PPCViabilityView.vue'),
      },
      {
        path: 'campaigns/:campaignUuid/funnel',
        name: 'campaign-funnel',
        component: () => import('@/features/campaigns/views/FunnelView.vue'),
      },
      {
        path: 'campaigns/:campaignUuid/content',
        name: 'campaign-content',
        component: () => import('@/features/campaigns/views/ContentStrategyView.vue'),
      },
      {
        path: 'campaigns/:campaignUuid/platform',
        name: 'campaign-platform',
        component: () => import('@/features/campaigns/views/PlatformSelectionView.vue'),
      },
      {
        path: 'campaigns/:campaignUuid/ads-strategy',
        name: 'campaign-ads-strategy',
        component: () => import('@/features/campaigns/views/AdsStrategyView.vue'),
      },
      {
        path: 'campaigns/:campaignUuid/generate-ads',
        name: 'campaign-generate-ads',
        component: () => import('@/features/campaigns/views/AdGenerationView.vue'),
      },
      {
        path: 'campaigns/:campaignUuid/visuals',
        name: 'campaign-visuals',
        component: () => import('@/features/campaigns/views/VisualGenerationView.vue'),
      },
      {
        path: 'campaigns/:campaignUuid/review',
        name: 'campaign-review',
        component: () => import('@/features/campaigns/views/CampaignReviewView.vue'),
      },
      {
        path: 'campaigns/:campaignUuid/wizard',
        name: 'campaign-wizard',
        component: () => import('@/features/wizard/views/WizardView.vue'),
      },
      {
        path: 'campaigns/:campaignUuid/wizard/:stepNumber',
        name: 'campaign-wizard-step',
        component: () => import('@/features/wizard/views/WizardView.vue'),
      },

      // Market Intelligence
      {
        path: 'market/intelligence',
        name: 'market-intelligence',
        component: () => import('@/features/market/views/MarketIntelligenceView.vue'),
      },
      {
        path: 'market/hooks',
        name: 'market-hooks',
        component: () => import('@/features/market/views/MarketHooksView.vue'),
      },
      {
        path: 'market/gaps',
        name: 'market-gaps',
        component: () => import('@/features/market/views/MarketGapsView.vue'),
      },
      {
        path: 'market/matrix',
        name: 'market-matrix',
        component: () => import('@/features/market/views/MarketMatrixView.vue'),
      },
      {
        path: 'market/top-performing',
        name: 'market-top-performing',
        component: () => import('@/features/market/views/MarketTopPerformingView.vue'),
      },

      // Ad Library
      {
        path: 'ad-library',
        name: 'ad-library',
        component: () => import('@/features/adLibrary/views/AdLibraryBrowserView.vue'),
      },
      {
        path: 'ad-library/generate',
        name: 'ad-library-generate',
        component: () => import('@/features/adLibrary/views/AdLibraryGenerateView.vue'),
      },
      {
        path: 'ad-library/runs/:runUuid',
        name: 'ad-library-run',
        component: () => import('@/features/adLibrary/views/AdLibraryRunDetailView.vue'),
      },

      // Scenario Variants
      {
        path: 'scenario-variants',
        name: 'scenario-variants',
        component: () => import('@/features/scenarioVariants/views/ScenarioVariantsView.vue'),
      },
      {
        path: 'campaigns/:campaignUuid/scenario-matrix',
        name: 'campaign-scenario-matrix',
        component: () => import('@/features/scenarioVariants/views/ScenarioMatrixView.vue'),
      },
      {
        path: 'campaigns/:campaignUuid/scenario-matrix/:runUuid',
        name: 'campaign-scenario-matrix-run',
        component: () => import('@/features/scenarioVariants/views/ScenarioMatrixView.vue'),
      },

      // Competitors & Social Media (Phase 8)
      {
        path: 'brands/:brandUuid/competitors',
        name: 'brand-competitors',
        component: () => import('@/features/competitors/views/CompetitorManagementView.vue'),
      },
      {
        path: 'brands/:brandUuid/social',
        name: 'brand-social',
        component: () => import('@/features/competitors/views/SocialAnalysisView.vue'),
      },
      {
        path: 'brands/:brandUuid/social/audit',
        name: 'brand-social-audit',
        component: () => import('@/features/competitors/views/SocialAuditView.vue'),
      },
      {
        path: 'brands/:brandUuid/assets',
        name: 'brand-assets',
        component: () => import('@/features/brands/views/BrandAssetsView.vue'),
      },
      {
        path: 'profile',
        name: 'profile',
        component: () => import('@/features/auth/views/ProfileView.vue'),
      },
      {
        path: 'settings',
        name: 'settings',
        component: () => import('@/features/auth/views/SettingsView.vue'),
      },
    ],
  },
]

const router = createRouter({
  history: createWebHistory(),
  routes,
})

router.beforeEach(async (to, _from, next) => {
  const auth = useAuthStore()

  if (!auth.isInitialized) {
    await auth.initAuth()
  }

  if (to.meta.requiresAuth && !auth.isAuthenticated) {
    return next({ name: 'login', query: { redirect: to.fullPath } })
  }

  if (to.meta.guest && auth.isAuthenticated) {
    return next({ name: 'brands' })
  }

  next()
})

// QA5: after a deploy the old hashed chunks are gone from the server, so
// browsers running a stale service worker / cached shell fail lazy route
// loads ("Failed to fetch dynamically imported module"). Self-heal ONCE per
// session: unregister every service worker, wipe the cache storage, reload.
// If the reload already happened this session, let the error surface instead
// of looping (logged; there is no dedicated error route).
router.onError((error) => {
  if (!shouldRecover(error)) {
    console.error('[router] navigation error:', error)
    return
  }
  if (hasRecoveryAttempted()) {
    // Recovery reload already issued this session — surfacing the error
    // beats looping forever on a genuinely broken deployment.
    console.error('[router] dynamic-import recovery already attempted this session; not reloading again:', error)
    return
  }
  markRecoveryAttempt()
  const purge: Promise<unknown>[] = []
  if (typeof navigator !== 'undefined' && navigator.serviceWorker) {
    purge.push(
      navigator.serviceWorker
        .getRegistrations()
        .then((registrations) => Promise.all(registrations.map((r) => r.unregister()))),
    )
  }
  if (typeof caches !== 'undefined') {
    purge.push(caches.keys().then((keys) => Promise.all(keys.map((key) => caches.delete(key)))))
  }
  Promise.all(purge).catch(() => undefined).finally(() => window.location.reload())
})

// Successful navigation proves the app loaded fine — clear the one-time
// recovery guard so a FUTURE deploy can also self-heal in this session.
router.afterEach(() => {
  clearRecoveryFlag()
})

document.addEventListener('mouseover', (e) => {
  const anchor = (e.target as HTMLElement).closest('a')
  if (anchor) {
    const href = anchor.getAttribute('href')
    if (href && href.startsWith('/')) {
      const resolved = router.resolve(href)
      if (resolved.matched.length) {
        for (const m of resolved.matched) {
          const comp = m.components?.default
          if (typeof comp === 'function') {
            (comp as () => Promise<unknown>)().catch(() => {})
          }
        }
      }
    }
  }
})

export default router
