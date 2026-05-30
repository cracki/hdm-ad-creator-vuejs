import type { TourDefinition } from '@/shared/composables/useProductTour'

export const campaignsListTour: TourDefinition = {
  id: 'campaigns-list',
  routeNames: ['campaigns'],
  autoStartOnFirstVisit: true,
  autoStartDelay: 1200,
  steps: [
    {
      target: '[data-tour="campaigns.list.search-input"]',
      titleKey: 'tour.campaignsList.searchTitle',
      descriptionKey: 'tour.campaignsList.searchDesc',
      position: 'bottom',
    },
    {
      target: '[data-tour="campaigns.list.new-campaign-btn"]',
      titleKey: 'tour.campaignsList.newCampaignTitle',
      descriptionKey: 'tour.campaignsList.newCampaignDesc',
      position: 'bottom',
    },
    {
      target: '[data-tour="campaigns.list.campaigns-grid"]',
      titleKey: 'tour.campaignsList.gridTitle',
      descriptionKey: 'tour.campaignsList.gridDesc',
      position: 'top',
    },
  ],
}

export const campaignDetailTour: TourDefinition = {
  id: 'campaign-detail',
  routeNames: ['campaign-detail'],
  autoStartOnFirstVisit: true,
  autoStartDelay: 1500,
  steps: [
    {
      target: '[data-tour="campaigns.detail.header"]',
      titleKey: 'tour.campaignDetail.overviewTitle',
      descriptionKey: 'tour.campaignDetail.overviewDesc',
      position: 'bottom',
    },
    {
      target: '[data-tour="campaigns.detail.steps"]',
      titleKey: 'tour.campaignDetail.stepsTitle',
      descriptionKey: 'tour.campaignDetail.stepsDesc',
      position: 'bottom',
    },
    {
      target: '[data-tour="campaigns.detail.continue-btn"]',
      titleKey: 'tour.campaignDetail.continueTitle',
      descriptionKey: 'tour.campaignDetail.continueDesc',
      position: 'bottom',
    },
  ],
}
