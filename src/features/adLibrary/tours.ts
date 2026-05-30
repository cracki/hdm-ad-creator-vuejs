import type { TourDefinition } from '@/shared/composables/useProductTour'

export const adLibraryBrowserTour: TourDefinition = {
  id: 'ad-library-browser',
  routeNames: ['ad-library'],
  autoStartOnFirstVisit: true,
  autoStartDelay: 1200,
  steps: [
    {
      target: '[data-tour="adlib.browser.angles"]',
      titleKey: 'tour.adLibrary.anglesTitle',
      descriptionKey: 'tour.adLibrary.anglesDesc',
      position: 'bottom',
    },
    {
      target: '[data-tour="adlib.browser.platforms"]',
      titleKey: 'tour.adLibrary.platformsTitle',
      descriptionKey: 'tour.adLibrary.platformsDesc',
      position: 'bottom',
    },
    {
      target: '[data-tour="adlib.browser.new-gen-btn"]',
      titleKey: 'tour.adLibrary.generateTitle',
      descriptionKey: 'tour.adLibrary.generateDesc',
      position: 'bottom',
    },
    {
      target: '[data-tour="adlib.browser.results"]',
      titleKey: 'tour.adLibrary.resultsTitle',
      descriptionKey: 'tour.adLibrary.resultsDesc',
      position: 'top',
    },
  ],
}
