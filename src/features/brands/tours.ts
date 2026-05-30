import type { TourDefinition } from '@/shared/composables/useProductTour'

export const brandsListTour: TourDefinition = {
  id: 'brands-list',
  routeNames: ['brands'],
  autoStartOnFirstVisit: true,
  autoStartDelay: 1200,
  steps: [
    {
      target: '[data-tour="brands.list.search-input"]',
      titleKey: 'tour.brandsList.searchTitle',
      descriptionKey: 'tour.brandsList.searchDesc',
      position: 'bottom',
    },
    {
      target: '[data-tour="brands.list.new-brand-btn"]',
      titleKey: 'tour.brandsList.newBrandTitle',
      descriptionKey: 'tour.brandsList.newBrandDesc',
      position: 'bottom',
    },
    {
      target: '[data-tour="brands.list.brands-grid"]',
      titleKey: 'tour.brandsList.gridTitle',
      descriptionKey: 'tour.brandsList.gridDesc',
      position: 'top',
    },
  ],
}

export const brandDetailTour: TourDefinition = {
  id: 'brand-detail',
  routeNames: ['brand-detail'],
  autoStartOnFirstVisit: true,
  autoStartDelay: 1200,
  steps: [
    {
      target: '[data-tour="brands.detail.header"]',
      titleKey: 'tour.brandDetail.headerTitle',
      descriptionKey: 'tour.brandDetail.headerDesc',
      position: 'bottom',
    },
    {
      target: '[data-tour="brands.detail.analysis-btn"]',
      titleKey: 'tour.brandDetail.analysisTitle',
      descriptionKey: 'tour.brandDetail.analysisDesc',
      position: 'bottom',
    },
  ],
}

export const brandAnalysisTour: TourDefinition = {
  id: 'brand-analysis',
  routeNames: ['brand-analysis', 'brand-analysis-run'],
  autoStartOnFirstVisit: true,
  autoStartDelay: 1500,
  steps: [
    {
      target: '[data-tour="brands.analysis.type-selector"]',
      titleKey: 'tour.brandAnalysis.typeTitle',
      descriptionKey: 'tour.brandAnalysis.typeDesc',
      position: 'bottom',
    },
    {
      target: '[data-tour="brands.analysis.start-btn"]',
      titleKey: 'tour.brandAnalysis.runTitle',
      descriptionKey: 'tour.brandAnalysis.runDesc',
      position: 'bottom',
    },
    {
      target: '[data-tour="brands.analysis.results"]',
      titleKey: 'tour.brandAnalysis.resultsTitle',
      descriptionKey: 'tour.brandAnalysis.resultsDesc',
      position: 'top',
      waitFor: 3000,
    },
  ],
}
