import { describe, it, expect, vi, beforeEach } from 'vitest'
import { mount, flushPromises, type VueWrapper } from '@vue/test-utils'
import { createRouter, createMemoryHistory, type Router } from 'vue-router'
import { ref } from 'vue'
import { VueQueryPlugin } from '@tanstack/vue-query'
import PPCViabilityView from './PPCViabilityView.vue'
import type { Campaign } from '../types'

// Real vue-query + mocked api: the run/refine path must invalidate the
// campaigns query so the page updates without a manual browser refresh.
vi.mock('../api', () => ({
  campaignsApi: {
    get: vi.fn(),
    runPPCViability: vi.fn(),
    approveStep: vi.fn(),
    reviewStep: vi.fn(),
  },
}))

// The services computed prefers the brand-services endpoint; keep it empty so
// the step payload (latest_steps / fresh run) is what renders.
vi.mock('@/features/brands/queries', () => ({
  useBrandServices: () => ({ data: ref([]) }),
}))

// lottie-web crashes at import time in jsdom
vi.mock('@/shared/components/AiLoadingAnimation.vue', () => ({
  default: { name: 'AiLoadingAnimation', template: '<div />' },
}))

import { campaignsApi } from '../api'

function buildCampaign(overrides: Partial<Campaign> = {}): Campaign {
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
    current_step: 'ppc_viability',
    language: 'en',
    total_budget: null,
    currency: 'USD',
    segmentation_completed: true,
    ppc_viability_completed: false,
    funnel_completed: false,
    content_strategy_completed: false,
    meta_ads_completed: false,
    google_ads_completed: false,
    linkedin_ads_completed: false,
    context_payload: {},
    summary: {},
    steps_count: 1,
    created_at: '',
    updated_at: '',
    ...overrides,
  } as Campaign
}

function ppcStep(services: Array<Record<string, unknown>>, reviewStatus = 'rejected') {
  return {
    status: 'completed',
    review_status: reviewStatus,
    reject_reason: 'Too generic',
    response_payload: {
      brand_trust_analysis: { services_bpc_scores: services },
    },
  }
}

let router: Router

async function mountView(): Promise<VueWrapper> {
  router = createRouter({
    history: createMemoryHistory(),
    routes: [
      { path: '/campaigns/:campaignUuid/ppc-viability', component: PPCViabilityView },
      { path: '/campaigns/:campaignUuid/funnel', component: { template: '<div />' } },
      { path: '/campaigns/:campaignUuid', component: { template: '<div />' } },
    ],
  })
  router.push('/campaigns/c1/ppc-viability')
  await router.isReady()

  const wrapper = mount(PPCViabilityView, {
    global: {
      plugins: [router, VueQueryPlugin],
      stubs: { Topbar: true, StepExportButton: true, ErrorState: true },
    },
  })
  await flushPromises()
  return wrapper
}

describe('PPCViabilityView — live update after run/refine (MOM)', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('renders results from latest_steps and replaces them with the refine response without a reload', async () => {
    vi.mocked(campaignsApi.get).mockResolvedValue({
      data: buildCampaign({
        latest_steps: {
          ppc_viability: ppcStep([{ service: 'Old Service', bpc_score: 42, classification: 'Mixed', reasoning: 'Old reasoning' }]),
        },
      } as unknown as Campaign),
    } as never)

    const wrapper = await mountView()
    expect(wrapper.text()).toContain('Old Service')
    const getCallsBeforeRun = vi.mocked(campaignsApi.get).mock.calls.length

    // Refine: the reject reason is already persisted; run the refine flow.
    vi.mocked(campaignsApi.runPPCViability).mockResolvedValue({
      data: {
        step: ppcStep(
          [{ service: 'Refined Service', bpc_score: 88, classification: 'Performance-Friendly', reasoning: 'Sharper reasoning' }],
          '',
        ) as never,
      },
    } as never)

    await wrapper.find('[data-testid="step-refine"]').trigger('click')
    await wrapper.find('[data-testid="refine-feedback-input"]').setValue('Be more specific per service')
    await wrapper.find('[data-testid="refine-confirm-btn"]').trigger('click')
    await flushPromises()
    await flushPromises()

    // The displayed payload is the fresh refine response, not the stale one.
    expect(wrapper.text()).toContain('Refined Service')
    expect(wrapper.text()).not.toContain('Old Service')

    // The campaigns query was invalidated → refetched without a reload.
    expect(vi.mocked(campaignsApi.get).mock.calls.length).toBeGreaterThan(getCallsBeforeRun)
    expect(campaignsApi.runPPCViability).toHaveBeenCalledWith('c1', {
      refinement_feedback: 'Be more specific per service',
    })
  })
})

// ── Expandable service cards (MOM 11.2) ──

describe('PPCViabilityView — expandable service cards', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    vi.mocked(campaignsApi.get).mockResolvedValue({
      data: buildCampaign({
        latest_steps: {
          ppc_viability: {
            status: 'completed',
            response_payload: {
              brand_trust_analysis: {
                services_bpc_scores: [
                  { service: 'Implants', bpc_score: 72, classification: 'Mixed', reasoning: 'Trust-driven consideration' },
                ],
              },
              strategic_prioritization: {
                ppc_blueprints: [
                  {
                    service: 'Implants',
                    priority: '1',
                    key_platforms: ['Google Ads', 'Meta'],
                    campaign_objective: 'Lead generation',
                    unique_value_proposition: 'Painless same-day implants',
                    key_risk: 'Long consideration cycle',
                  },
                ],
              },
            },
          },
        },
      } as unknown as Campaign),
    } as never)
  })

  it('is collapsed by default and expands on click, revealing the payload details', async () => {
    const wrapper = await mountView()

    const card = wrapper.find('[data-testid="ppc-service-card"]')
    expect(card.exists()).toBe(true)
    expect(wrapper.find('[data-testid="ppc-service-details-0"]').exists()).toBe(false)

    await wrapper.find('[data-testid="ppc-service-toggle-0"]').trigger('click')
    const details = wrapper.find('[data-testid="ppc-service-details-0"]')
    expect(details.exists()).toBe(true)
    // Blueprint fields merged into the service card (defensive read).
    expect(details.text()).toContain('Trust-driven consideration')
    expect(details.text()).toContain('Google Ads, Meta')
    expect(details.text()).toContain('Lead generation')
    expect(details.text()).toContain('Painless same-day implants')
    expect(details.text()).toContain('Long consideration cycle')

    // Collapses again on a second click.
    await wrapper.find('[data-testid="ppc-service-toggle-0"]').trigger('click')
    expect(wrapper.find('[data-testid="ppc-service-details-0"]').exists()).toBe(false)
  })
})

// ── Selected-only primary cards + count truth (QA round 3 fix 4) ──

describe('PPCViabilityView — selected-only primary cards (QA r3 fix 4)', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    // 3 analyzed rows in the run payload; the endpoint (brand total) is
    // deliberately larger so a brand-count-based header would lie.
    vi.mocked(campaignsApi.get).mockResolvedValue({
      data: buildCampaign({
        context_payload: { selected_services: ['Consulting'] },
        latest_steps: {
          ppc_viability: {
            status: 'completed',
            response_payload: {
              brand_trust_analysis: {
                services_bpc_scores: [
                  { service: 'Implants', bpc_score: 72, classification: 'Mixed', reasoning: 'Trust-driven consideration' },
                  { service: 'Landing Pages', bpc_score: 40 },
                  { service: 'Consulting', bpc_score: 55 },
                ],
              },
            },
          },
        },
      } as unknown as Campaign),
    } as never)
  })

  it('shows ONLY the selected service as the primary card; others stay collapsed', async () => {
    const wrapper = await mountView()

    const cards = wrapper.findAll('[data-testid="ppc-service-card"]')
    expect(cards).toHaveLength(1)
    expect(wrapper.find('[data-testid="ppc-service-name"]').text()).toBe('Consulting')

    // Other analyzed services are behind the collapsed toggle.
    expect(wrapper.find('[data-testid="ppc-other-services"]').exists()).toBe(false)
    await wrapper.find('[data-testid="ppc-other-services-toggle"]').trigger('click')
    expect(wrapper.findAll('[data-testid="ppc-other-services"] [data-testid="ppc-service-card"]')).toHaveLength(2)
  })

  it('counts the analyzed rows, not the brand total service count', async () => {
    const wrapper = await mountView()

    // Selected (1) + other analyzed (2) = 3 rows actually analyzed.
    expect(wrapper.find('[data-testid="ppc-analyzed-count"]').text()).toContain('3')
  })
})
