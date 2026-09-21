import { describe, it, expect } from 'vitest'
import { mount } from '@vue/test-utils'
import Step1BrandIntelligence from './Step1BrandIntelligence.vue'
import type { Campaign, BrandContext } from '@/features/campaigns/types'

function buildCampaign(brandContext: BrandContext | null): Campaign {
  return {
    campaign_uuid: 'c1',
    brand: {
      brand_uuid: 'b1',
      company_name: 'Lumen',
      website_url: 'https://lumen.test',
      location: null,
      selected_industry: null,
    },
    name: 'Summer Launch',
    status: 'in_progress',
    current_step: 'segmentation',
    language: 'en',
    total_budget: null,
    currency: 'USD',
    segmentation_completed: false,
    ppc_viability_completed: false,
    funnel_completed: false,
    content_strategy_completed: false,
    meta_ads_completed: false,
    google_ads_completed: false,
    linkedin_ads_completed: false,
    context_payload: {},
    brand_context: brandContext,
    summary: {},
    steps_count: 0,
    created_at: '',
    updated_at: '',
  } as Campaign
}

const available: BrandContext = {
  available: true,
  audience_summary: { primary: { summary: 'Trend buyer' } },
  personas: [{ segment: 'primary', summary: 'Trend buyer' }],
  services: ['SEO'],
}

function mountStep(campaign: Campaign) {
  return mount(Step1BrandIntelligence, {
    props: { campaign, campaignUuid: 'c1' },
  })
}

describe('Step1BrandIntelligence — reused brand analysis (M-H8)', () => {
  it('shows the "Reused from Brand Analysis" section when brand_context is available', () => {
    const wrapper = mountStep(buildCampaign(available))

    expect(wrapper.find('[data-testid="wizard-brand-context"]').exists()).toBe(true)
    expect(wrapper.find('[data-testid="brand-context-panel"]').exists()).toBe(true)
    expect(wrapper.text()).toContain('Trend buyer')
    expect(wrapper.text()).toContain('SEO')
  })

  it('hides the section when brand_context is unavailable or missing', () => {
    expect(mountStep(buildCampaign({ ...available, available: false })).find('[data-testid="wizard-brand-context"]').exists()).toBe(false)
    expect(mountStep(buildCampaign(null)).find('[data-testid="wizard-brand-context"]').exists()).toBe(false)
  })
})
