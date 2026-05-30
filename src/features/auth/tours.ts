import type { TourDefinition } from '@/shared/composables/useProductTour'

const isDesktop = () => window.innerWidth >= 1024
const isMobile = () => window.innerWidth < 1024

export const welcomeTour: TourDefinition = {
  id: 'welcome',
  routeNames: ['__welcome__'],
  autoStartOnFirstVisit: true,
  autoStartDelay: 1500,
  steps: [
    {
      target: '[data-tour="sidebar-brands"]',
      titleKey: 'tour.welcome.brandsTitle',
      descriptionKey: 'tour.welcome.brandsDesc',
      position: 'end',
      beforeShow: isDesktop,
    },
    {
      target: '[data-tour="sidebar-campaigns"]',
      titleKey: 'tour.welcome.campaignsTitle',
      descriptionKey: 'tour.welcome.campaignsDesc',
      position: 'end',
      beforeShow: isDesktop,
    },
    {
      target: '[data-tour="sidebar-intelligence"]',
      titleKey: 'tour.welcome.intelTitle',
      descriptionKey: 'tour.welcome.intelDesc',
      position: 'end',
      beforeShow: isDesktop,
    },
    {
      target: '[data-tour="credits-bar"]',
      titleKey: 'tour.welcome.creditsTitle',
      descriptionKey: 'tour.welcome.creditsDesc',
      position: 'end',
      beforeShow: isDesktop,
    },
    {
      target: '[data-tour="topbar-search"]',
      titleKey: 'tour.welcome.searchTitle',
      descriptionKey: 'tour.welcome.searchDesc',
      position: 'bottom',
      beforeShow: isDesktop,
    },
    // Mobile bottom nav items
    {
      target: '[data-tour="bottom-nav-dashboard"]',
      titleKey: 'tour.welcome.dashboardTitle',
      descriptionKey: 'tour.welcome.dashboardDesc',
      position: 'top',
      beforeShow: isMobile,
    },
    {
      target: '[data-tour="bottom-nav-brands"]',
      titleKey: 'tour.welcome.brandsTitle',
      descriptionKey: 'tour.welcome.brandsMobileDesc',
      position: 'top',
      beforeShow: isMobile,
    },
    {
      target: '[data-tour="bottom-nav-campaigns"]',
      titleKey: 'tour.welcome.campaignsTitle',
      descriptionKey: 'tour.welcome.campaignsMobileDesc',
      position: 'top',
      beforeShow: isMobile,
    },
    {
      target: '[data-tour="bottom-nav-market"]',
      titleKey: 'tour.welcome.intelTitle',
      descriptionKey: 'tour.welcome.intelMobileDesc',
      position: 'top',
      beforeShow: isMobile,
    },
    {
      target: '[data-tour="bottom-nav-ad-library"]',
      titleKey: 'tour.welcome.adLibTitle',
      descriptionKey: 'tour.welcome.adLibDesc',
      position: 'top',
      beforeShow: isMobile,
    },
  ],
}
