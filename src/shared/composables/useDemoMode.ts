import { ref, readonly } from 'vue'

export interface DemoBrand {
  brand_uuid: string
  company_name: string
  website_url: string
  selected_industry: { industry_uuid: string; name: string } | null
  created_at: string
}

export interface DemoCampaign {
  campaign_uuid: string
  name: string
  status: string
  current_step: string
  brand: { company_name: string } | null
  created_at: string
}

export interface DemoAd {
  campaign_ad_uuid: string
  platform: string
  funnel_stage: string | null
  persona: string | null
  data: {
    headline: string
    primary_text: string
    description: string
    cta: string
  }
}

const DEMO_BRANDS: DemoBrand[] = [
  { brand_uuid: 'demo-1', company_name: 'GlowSkin Studio', website_url: 'https://glowskin.example.com', selected_industry: { industry_uuid: 'ind-1', name: 'Beauty' }, created_at: '2026-04-15T10:00:00Z' },
  { brand_uuid: 'demo-2', company_name: 'TechLaunch Pro', website_url: 'https://techlaunch.example.com', selected_industry: { industry_uuid: 'ind-2', name: 'SaaS' }, created_at: '2026-04-20T14:30:00Z' },
  { brand_uuid: 'demo-3', company_name: 'FreshBite Kitchen', website_url: 'https://freshbite.example.com', selected_industry: { industry_uuid: 'ind-3', name: 'F&B' }, created_at: '2026-05-01T09:00:00Z' },
]

const DEMO_CAMPAIGNS: DemoCampaign[] = [
  { campaign_uuid: 'demo-camp-1', name: 'Summer Glow Launch', status: 'in_progress', current_step: 'content_strategy', brand: { company_name: 'GlowSkin Studio' }, created_at: '2026-04-18T11:00:00Z' },
  { campaign_uuid: 'demo-camp-2', name: 'SaaS Product Launch Q2', status: 'completed', current_step: 'completed', brand: { company_name: 'TechLaunch Pro' }, created_at: '2026-04-25T15:00:00Z' },
]

const DEMO_ADS: Record<string, DemoAd[]> = {
  'demo-camp-1': [
    { campaign_ad_uuid: 'ad-1', platform: 'meta', funnel_stage: 'TOFU', persona: 'Busy Professionals', data: { headline: 'Glow in 5 Minutes', primary_text: 'Tired of 30-minute routines? GlowSkin gives you radiant skin in just 5 minutes with our AI-powered serum.', description: 'Try GlowSkin Studio — skincare simplified.', cta: 'Shop Now' } },
    { campaign_ad_uuid: 'ad-2', platform: 'meta', funnel_stage: 'MOFU', persona: 'Beauty Enthusiasts', data: { headline: 'See Real Results', primary_text: 'Join 10,000+ women who transformed their skin with GlowSkin. Before & after photos inside.', description: 'Real results. Real people.', cta: 'Learn More' } },
    { campaign_ad_uuid: 'ad-3', platform: 'google', funnel_stage: 'BOFU', persona: 'Price-Sensitive Shoppers', data: { headline: '50% Off First Order', primary_text: 'Your first GlowSkin serum at half price. No subscription required. Results guaranteed.', description: 'Limited time offer — claim yours today.', cta: 'Get Offer' } },
    { campaign_ad_uuid: 'ad-4', platform: 'linkedin', funnel_stage: 'TOFU', persona: 'Decision Makers', data: { headline: 'The Future of Skincare is Here', primary_text: 'AI-powered skincare isn\'t science fiction anymore. GlowSkin Studio uses machine learning to personalize your routine.', description: 'Innovation meets beauty.', cta: 'Discover More' } },
  ],
  'demo-camp-2': [
    { campaign_ad_uuid: 'ad-5', platform: 'google', funnel_stage: 'TOFU', persona: 'Startup Founders', data: { headline: 'Launch Faster with TechLaunch', primary_text: 'Go from idea to market in weeks, not months. TechLaunch Pro handles your entire product launch pipeline.', description: 'The smarter way to launch SaaS.', cta: 'Start Free Trial' } },
    { campaign_ad_uuid: 'ad-6', platform: 'linkedin', funnel_stage: 'BOFU', persona: 'CTOs', data: { headline: 'Trusted by 500+ SaaS Teams', primary_text: 'TechLaunch Pro has helped 500+ SaaS companies launch successfully. See our case studies.', description: 'Enterprise-ready launch platform.', cta: 'Book Demo' } },
  ],
}

const DEMO_MODE_KEY = 'hdm_demo_mode'

// Module-level singleton state — shared across all callers
const isDemo = ref(false)

// Initialize from localStorage on module load
try {
  if (typeof localStorage !== 'undefined' && localStorage.getItem(DEMO_MODE_KEY) === 'true') {
    isDemo.value = true
  }
} catch {}

export function useDemoMode() {
  function enable() {
    isDemo.value = true
    try { localStorage.setItem(DEMO_MODE_KEY, 'true') } catch {}
  }

  function disable() {
    isDemo.value = false
    try { localStorage.removeItem(DEMO_MODE_KEY) } catch {}
  }

  function getDemoBrands(): DemoBrand[] {
    return DEMO_BRANDS
  }

  function getDemoCampaigns(): DemoCampaign[] {
    return DEMO_CAMPAIGNS
  }

  function getDemoAds(campaignUuid: string): DemoAd[] {
    return DEMO_ADS[campaignUuid] ?? []
  }

  return {
    isDemo: readonly(isDemo),
    enable,
    disable,
    getDemoBrands,
    getDemoCampaigns,
    getDemoAds,
  }
}
