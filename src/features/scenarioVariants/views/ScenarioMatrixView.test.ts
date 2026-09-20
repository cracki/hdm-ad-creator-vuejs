import { describe, it, expect, vi, beforeEach } from 'vitest'
import { mount, flushPromises, type VueWrapper } from '@vue/test-utils'
import { createRouter, createMemoryHistory, type Router } from 'vue-router'
import { ref } from 'vue'
import ScenarioMatrixView from './ScenarioMatrixView.vue'
import { scenarioVariantsApi } from '../api'

vi.mock('../api', () => ({
  scenarioVariantsApi: {
    startCampaignMatrix: vi.fn(),
    getMatrixRunState: vi.fn(),
    getMatrixRunVariants: vi.fn(),
    generateMatrixRunVisuals: vi.fn(),
  },
}))

vi.mock('@/features/campaigns/queries', () => ({
  useCampaign: vi.fn(),
}))

// AiLoadingAnimation pulls in lottie-web, which crashes at import time in jsdom
vi.mock('@/shared/components/AiLoadingAnimation.vue', () => ({
  default: { name: 'AiLoadingAnimation', template: '<div />' },
}))

import { useCampaign } from '@/features/campaigns/queries'

function buildVariant(overrides: Record<string, unknown> = {}) {
  return {
    scenario_variant_uuid: 'sv-1',
    run: 'run-1',
    variant_type: 'regular',
    platform: 'meta',
    audience: 'Young Professionals',
    style: 'minimal',
    ad_format: 'single_image',
    framework_id: null,
    framework_name: null,
    sort_order: 0,
    data: {
      headline: 'Shine bright',
      body: 'A calm routine',
      cta: 'Learn more',
      image_prompt: 'A serene product shot',
    },
    ...overrides,
  }
}

function buildRun() {
  return {
    scenario_variant_run_uuid: 'run-1',
    campaign: 'c1',
    brand: 'b1',
    entrypoint_type: 'campaign_matrix',
    status: 'completed',
    scenario: 'promotional',
    request_payload: {},
    input_snapshot: {},
    result_summary: {},
    matrix_rows_snapshot: [],
    started_at: null,
    completed_at: null,
    error_message: null,
    created_at: '',
    updated_at: '',
  }
}

let router: Router

async function mountView(): Promise<VueWrapper> {
  const wrapper = mount(ScenarioMatrixView, {
    global: {
      plugins: [router],
      stubs: { Topbar: true, AiLoadingAnimation: true },
    },
  })
  await flushPromises()
  await flushPromises()
  return wrapper
}

describe('ScenarioMatrixView — variant image generation (F2)', () => {
  beforeEach(async () => {
    vi.clearAllMocks()
    router = createRouter({
      history: createMemoryHistory(),
      routes: [
        { path: '/', component: ScenarioMatrixView },
        { path: '/campaigns/:campaignUuid', component: { template: '<div />' } },
        { path: '/campaigns/:campaignUuid/scenario-matrix/:runUuid', component: ScenarioMatrixView },
      ],
    })
    await router.push('/campaigns/c1/scenario-matrix/run-1')
    vi.mocked(useCampaign).mockReturnValue({
      data: ref({
        campaign_uuid: 'c1',
        name: 'Summer Launch',
        language: 'en',
        status: 'in_progress',
        current_step: 'meta_ads',
        total_budget: null,
        currency: 'USD',
        segmentation_completed: true,
        ppc_viability_completed: true,
        funnel_completed: true,
        content_strategy_completed: true,
        meta_ads_completed: true,
        google_ads_completed: false,
        linkedin_ads_completed: false,
        context_payload: {},
        summary: {},
        steps_count: 0,
        created_at: '',
        updated_at: '',
      }),
      isLoading: ref(false),
    } as never)
    vi.mocked(scenarioVariantsApi.getMatrixRunState).mockResolvedValue({
      data: buildRun() as never,
    })
  })

  it('renders images persisted on the variant data (data.image_url restore)', async () => {
    vi.mocked(scenarioVariantsApi.getMatrixRunVariants).mockResolvedValue({
      data: [
        buildVariant({
          scenario_variant_uuid: 'sv-1',
          data: {
            headline: 'Shine bright',
            image_prompt: 'A serene product shot',
            image_url: 'http://localhost:8000/media/variants/sv-1.png',
            visual_status: 'completed',
          },
        }),
        buildVariant({
          scenario_variant_uuid: 'sv-2',
          sort_order: 1,
          data: {
            headline: 'Glow more',
            image_prompt: 'A warm evening shot',
            visual_status: 'failed',
            visual_error: 'render blew up',
          },
        }),
      ] as never,
    })

    const wrapper = await mountView()

    const img = wrapper.find('[data-testid="variant-image"]')
    expect(img.exists()).toBe(true)
    expect(img.attributes('src')).toBe('http://localhost:8000/media/variants/sv-1.png')
    // Failed render shows the retry affordance instead of an image
    expect(wrapper.find('[data-testid="variant-visual-failed"]').exists()).toBe(true)
  })

  it('calls the run-level generate-visuals endpoint for the whole run', async () => {
    vi.mocked(scenarioVariantsApi.getMatrixRunVariants).mockResolvedValue({
      data: [buildVariant()] as never,
    })
    vi.mocked(scenarioVariantsApi.generateMatrixRunVisuals).mockResolvedValue({
      data: {
        success: true,
        generated_count: 1,
        results: [
          {
            scenario_variant_uuid: 'sv-1',
            image_url: 'http://localhost:8000/media/variants/sv-1-new.png',
            revised_prompt: null,
            success: true,
            visual_status: 'completed',
            error: null,
          },
        ],
      },
    })

    const wrapper = await mountView()

    await wrapper.find('[data-testid="variant-generate-images-btn"]').trigger('click')
    await flushPromises()

    expect(scenarioVariantsApi.generateMatrixRunVisuals).toHaveBeenCalledWith('c1', 'run-1', {})
    const img = wrapper.find('[data-testid="variant-image"]')
    expect(img.exists()).toBe(true)
    expect(img.attributes('src')).toBe('http://localhost:8000/media/variants/sv-1-new.png')
  })

  it('retries a failed variant with only that variant_uuid subset', async () => {
    vi.mocked(scenarioVariantsApi.getMatrixRunVariants).mockResolvedValue({
      data: [
        buildVariant({
          data: { headline: 'Shine bright', visual_status: 'failed' },
        }),
      ] as never,
    })
    vi.mocked(scenarioVariantsApi.generateMatrixRunVisuals).mockResolvedValue({
      data: {
        success: true,
        generated_count: 0,
        results: [
          {
            scenario_variant_uuid: 'sv-1',
            image_url: null,
            revised_prompt: null,
            success: false,
            visual_status: 'failed',
            error: 'still broken',
          },
        ],
      },
    })

    const wrapper = await mountView()

    await wrapper.find('[data-testid="variant-visual-retry-btn"]').trigger('click')
    await flushPromises()

    expect(scenarioVariantsApi.generateMatrixRunVisuals).toHaveBeenCalledWith('c1', 'run-1', {
      variant_uuids: ['sv-1'],
    })
  })
})
