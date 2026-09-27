import type { TourDefinition } from '@/shared/composables/useProductTour'
import { tourTargetExists } from '@/shared/composables/useProductTour'

export const marketIntelligenceTour: TourDefinition = {
  id: 'market-intelligence',
  routeNames: ['market-intelligence'],
  autoStartOnFirstVisit: true,
  autoStartDelay: 1200,
  steps: [
    {
      // QA fix 4: "Select Brand" must highlight the brand <select> input —
      // when the form is hidden (user is viewing a past run) the step is
      // skipped instead of highlighting whatever else is on the page.
      target: '[data-tour="market.intel.brand-select"]',
      titleKey: 'tour.marketIntel.brandTitle',
      descriptionKey: 'tour.marketIntel.brandDesc',
      position: 'bottom',
      beforeShow: () => tourTargetExists('[data-tour="market.intel.brand-select"]'),
    },
    {
      target: '[data-tour="market.intel.form"]',
      titleKey: 'tour.marketIntel.formTitle',
      descriptionKey: 'tour.marketIntel.formDesc',
      position: 'bottom',
      beforeShow: () => tourTargetExists('[data-tour="market.intel.form"]'),
    },
    {
      target: '[data-tour="market.intel.run-btn"]',
      titleKey: 'tour.marketIntel.runTitle',
      descriptionKey: 'tour.marketIntel.runDesc',
      position: 'bottom',
      beforeShow: () => tourTargetExists('[data-tour="market.intel.run-btn"]'),
    },
    {
      // Results only exist after a run — skip the step until they do.
      target: '[data-tour="market.intel.results"]',
      titleKey: 'tour.marketIntel.resultsTitle',
      descriptionKey: 'tour.marketIntel.resultsDesc',
      position: 'top',
      waitFor: 3000,
      beforeShow: () => tourTargetExists('[data-tour="market.intel.results"]'),
    },
  ],
}
