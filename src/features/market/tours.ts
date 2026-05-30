import type { TourDefinition } from '@/shared/composables/useProductTour'

export const marketIntelligenceTour: TourDefinition = {
  id: 'market-intelligence',
  routeNames: ['market-intelligence'],
  autoStartOnFirstVisit: true,
  autoStartDelay: 1200,
  steps: [
    {
      target: '[data-tour="market.intel.brand-select"]',
      titleKey: 'tour.marketIntel.brandTitle',
      descriptionKey: 'tour.marketIntel.brandDesc',
      position: 'bottom',
    },
    {
      target: '[data-tour="market.intel.form"]',
      titleKey: 'tour.marketIntel.formTitle',
      descriptionKey: 'tour.marketIntel.formDesc',
      position: 'bottom',
    },
    {
      target: '[data-tour="market.intel.run-btn"]',
      titleKey: 'tour.marketIntel.runTitle',
      descriptionKey: 'tour.marketIntel.runDesc',
      position: 'bottom',
    },
    {
      target: '[data-tour="market.intel.results"]',
      titleKey: 'tour.marketIntel.resultsTitle',
      descriptionKey: 'tour.marketIntel.resultsDesc',
      position: 'top',
      waitFor: 3000,
    },
  ],
}
