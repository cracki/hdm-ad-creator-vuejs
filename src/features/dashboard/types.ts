export type WidgetId =
  | 'campaign-performance'
  | 'brand-health'
  | 'content-intelligence'
  | 'ad-generation'
  | 'activity-timeline'
  | 'quick-actions'

export interface DashboardLayout {
  order: WidgetId[]
  hidden: WidgetId[]
}

export const DEFAULT_LAYOUT: DashboardLayout = {
  order: [
    'campaign-performance',
    'brand-health',
    'content-intelligence',
    'ad-generation',
    'activity-timeline',
    'quick-actions',
  ],
  hidden: [],
}

export const WIDGET_TITLES: Record<WidgetId, string> = {
  'campaign-performance': 'dashboard.sections.campaignPerformance',
  'brand-health': 'dashboard.sections.brandHealth',
  'content-intelligence': 'dashboard.sections.contentIntelligence',
  'ad-generation': 'dashboard.sections.adGeneration',
  'activity-timeline': 'dashboard.sections.activityTimeline',
  'quick-actions': 'dashboard.sections.quickActions',
}

export interface DashboardStats {
  brands: number
  activeCampaigns: number
  completedCampaigns: number
  totalCampaigns: number
  brandGrowthLast7d: number
  brandGrowthPrev7d: number
}
