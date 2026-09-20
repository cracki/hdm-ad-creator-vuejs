import { describe, it, expect, vi, beforeEach } from 'vitest'
import { mount, flushPromises, type VueWrapper } from '@vue/test-utils'
import { VueQueryPlugin, QueryClient } from '@tanstack/vue-query'
import FullFunnelCampaignDisplay from './FullFunnelCampaignDisplay.vue'
import { fullFunnelApi } from '../api'

vi.mock('../api', () => ({
  fullFunnelApi: {
    generateVisuals: vi.fn(),
  },
}))

function buildConcept(overrides: Record<string, unknown> = {}) {
  return {
    style: 'Minimal photography',
    mood: 'Calm',
    color_palette: ['#111', '#fff'],
    image_prompt: 'A wide serene shot of the product on stone',
    video_script: null,
    thumbnail_prompt: null,
    format: 'single_image',
    dimensions: { width: '1080', height: '1080', aspect_ratio: '1:1' },
    funnel_stage: 'tofu',
    visual_psychology: 'Curiosity',
    ad_headline: 'Meet your new ritual',
    platform: 'meta',
    ...overrides,
  }
}

let queryClient: QueryClient

async function mountDisplay(campaignData: Record<string, unknown>): Promise<VueWrapper> {
  const wrapper = mount(FullFunnelCampaignDisplay, {
    global: {
      plugins: [[VueQueryPlugin, { queryClient }]],
      stubs: { StepExportButton: true },
    },
    props: {
      campaignData,
      brandName: 'Lumen',
      selectedPlatforms: ['meta'],
      currency: 'USD',
      budget: 1000,
      duration: 30,
      selectedStages: ['tofu'],
      showBanner: false,
    },
  })
  await flushPromises()
  return wrapper
}

async function openVisualsTab(wrapper: VueWrapper) {
  const tabs = wrapper.findAll('[data-loc="funnel.tab-btn"]')
  // overview, ads, strategies, visuals, targeting, schedule
  await tabs[3].trigger('click')
  await flushPromises()
}

describe('FullFunnelCampaignDisplay — visual image generation (F2)', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    queryClient = new QueryClient({
      defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
    })
  })

  it('calls generate-visuals on "Generate images" and renders the enriched concepts', async () => {
    vi.mocked(fullFunnelApi.generateVisuals).mockResolvedValue({
      data: {
        success: true,
        generated_count: 1,
        results: [
          {
            concept_index: 0,
            image_url: 'http://localhost:8000/media/ff/concept-0.png',
            revised_prompt: null,
            success: true,
            visual_status: 'completed',
            error: null,
          },
          {
            concept_index: 1,
            image_url: null,
            revised_prompt: null,
            success: false,
            visual_status: 'failed',
            error: 'render blew up',
          },
        ],
      },
    })

    const wrapper = await mountDisplay({
      full_funnel_compaign_uuid: 'ff-1',
      visual_concepts: [buildConcept(), buildConcept({ funnel_stage: 'bofu' })],
    })
    await openVisualsTab(wrapper)

    await wrapper.find('[data-testid="funnel-generate-images-btn"]').trigger('click')
    await flushPromises()

    expect(fullFunnelApi.generateVisuals).toHaveBeenCalledTimes(1)
    expect(fullFunnelApi.generateVisuals).toHaveBeenCalledWith('ff-1', { aspect_ratio: '1:1' })

    const img = wrapper.find('[data-testid="funnel-concept-image"]')
    expect(img.exists()).toBe(true)
    expect(img.attributes('src')).toBe('http://localhost:8000/media/ff/concept-0.png')
    // Failed concept shows the failure block, not an image
    expect(wrapper.find('[data-testid="funnel-concept-failed"]').exists()).toBe(true)
  })

  it('retries a failed concept with only that concept index', async () => {
    vi.mocked(fullFunnelApi.generateVisuals)
      .mockResolvedValueOnce({
        data: {
          success: true,
          generated_count: 0,
          results: [
            {
              concept_index: 0,
              image_url: null,
              revised_prompt: null,
              success: false,
              visual_status: 'failed',
              error: 'render blew up',
            },
          ],
        },
      })
      .mockResolvedValueOnce({
        data: {
          success: true,
          generated_count: 1,
          results: [
            {
              concept_index: 0,
              image_url: 'http://localhost:8000/media/ff/concept-0-retry.png',
              revised_prompt: null,
              success: true,
              visual_status: 'completed',
              error: null,
            },
          ],
        },
      })

    const wrapper = await mountDisplay({
      full_funnel_compaign_uuid: 'ff-1',
      visual_concepts: [buildConcept()],
    })
    await openVisualsTab(wrapper)

    await wrapper.find('[data-testid="funnel-generate-images-btn"]').trigger('click')
    await flushPromises()

    await wrapper.find('[data-testid="funnel-concept-retry-btn"]').trigger('click')
    await flushPromises()

    expect(fullFunnelApi.generateVisuals).toHaveBeenLastCalledWith('ff-1', {
      concept_indexes: [0],
      aspect_ratio: '1:1',
    })
    const img = wrapper.find('[data-testid="funnel-concept-image"]')
    expect(img.attributes('src')).toBe('http://localhost:8000/media/ff/concept-0-retry.png')
  })

  it('renders images already persisted on the run (history detail restore)', async () => {
    const wrapper = await mountDisplay({
      full_funnel_compaign_uuid: 'ff-1',
      visual_concepts: [
        buildConcept({
          image_url: 'http://localhost:8000/media/ff/restored.png',
          visual_status: 'completed',
        }),
      ],
    })
    await openVisualsTab(wrapper)

    const img = wrapper.find('[data-testid="funnel-concept-image"]')
    expect(img.exists()).toBe(true)
    expect(img.attributes('src')).toBe('http://localhost:8000/media/ff/restored.png')
  })
})
