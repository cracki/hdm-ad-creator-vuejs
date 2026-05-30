import type { TourDefinition } from '@/shared/composables/useProductTour'

export const wizardTour: TourDefinition = {
  id: 'campaign-wizard',
  routeNames: ['campaign-wizard', 'campaign-wizard-step'],
  autoStartOnFirstVisit: true,
  autoStartDelay: 1500,
  steps: [
    {
      target: '[data-tour="wizard.progress-bar"]',
      titleKey: 'tour.wizard.progressTitle',
      descriptionKey: 'tour.wizard.progressDesc',
      position: 'bottom',
    },
    {
      target: '[data-tour="wizard.content"]',
      titleKey: 'tour.wizard.contentTitle',
      descriptionKey: 'tour.wizard.contentDesc',
      position: 'top',
    },
    {
      target: '[data-tour="wizard.continue-btn"]',
      titleKey: 'tour.wizard.navTitle',
      descriptionKey: 'tour.wizard.navDesc',
      position: 'top',
    },
  ],
}
