import { describe, it, expect, vi, beforeEach } from 'vitest'
import { mount, flushPromises, type VueWrapper } from '@vue/test-utils'
import { ref } from 'vue'
import MarketIntelligenceView from './MarketIntelligenceView.vue'
import type { Brand } from '@/features/brands/types'

vi.mock('@/features/brands/queries', () => ({
  useBrands: vi.fn(),
  useBrandServices: vi.fn(),
}))

vi.mock('../queries', () => ({
  useRunContentIntelligence: vi.fn(),
  useContentIntelligenceHistory: vi.fn(),
}))

vi.mock('@/shared/composables/useAutoSelectBrand', () => ({
  useAutoSelectBrand: vi.fn(),
}))

vi.mock('@/shared/composables/useTourRegistration', () => ({
  useTourRegistration: vi.fn(),
}))

vi.mock('@/shared/composables/useConfetti', () => ({
  useConfetti: vi.fn(() => ({ trigger: vi.fn() })),
}))

vi.mock('@/shared/utils/exportMarket', () => ({
  exportIntelligencePDF: vi.fn(),
  exportIntelligencePPTX: vi.fn(),
  exportIntelligenceXLSX: vi.fn(),
}))

// lottie-web crashes at import time in jsdom
vi.mock('@/shared/components/AiLoadingAnimation.vue', () => ({
  default: { name: 'AiLoadingAnimation', template: '<div />' },
}))

import { useBrands, useBrandServices } from '@/features/brands/queries'
import { useRunContentIntelligence, useContentIntelligenceHistory } from '../queries'

function buildBrand(overrides: Partial<Brand> = {}): Brand {
  return {
    brand_uuid: 'b1',
    website_url: 'https://shine.test',
    company_name: 'Shine Co',
    selected_industry: { industry_uuid: 'ind-1', name: 'Home Services' },
    selected_industry_id: 'ind-1',
    location: 'Dubai, United Arab Emirates',
    brand_color: null,
    created_at: '',
    updated_at: '',
    ...overrides,
  } as Brand
}

async function mountView(brands: Brand[], detectedServices: unknown[]): Promise<VueWrapper> {
  vi.mocked(useBrands).mockReturnValue({ data: ref(brands) } as never)
  vi.mocked(useBrandServices).mockReturnValue({ data: ref(detectedServices) } as never)
  vi.mocked(useRunContentIntelligence).mockReturnValue({ mutateAsync: vi.fn() } as never)
  vi.mocked(useContentIntelligenceHistory).mockReturnValue({
    data: ref([]),
    isLoading: ref(false),
  } as never)

  const wrapper = mount(MarketIntelligenceView, {
    global: {
      stubs: { Topbar: true, GuidedAction: true, MarketHistoryList: true, AiLoadingAnimation: true },
    },
  })
  await flushPromises()
  return wrapper
}

function fieldValue(wrapper: VueWrapper, dataLoc: string): string {
  return (wrapper.find(`[data-loc="${dataLoc}"]`).element as HTMLInputElement).value
}

// ── Brand-selection prefill (QA5-taza5) ──
describe('MarketIntelligenceView — brand prefill (QA5-taza5)', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('prefills services from manual/brand_analysis rows only, plus industry + location from the brand', async () => {
    const wrapper = await mountView(
      [
        buildBrand({
          services: [
            { name: 'Home Cleaning', source: 'brand_analysis' },
            { name: '40% off', source: 'scraped' },
            { name: 'SEO', source: 'manual' },
          ],
        }),
      ],
      [
        { name: 'Home Cleaning', source: 'brand_analysis', score: 80, classification: null, recommendation: null },
        { name: '40% off', source: 'scraped', score: null, classification: null, recommendation: null },
        { name: 'SEO', source: 'manual', score: null, classification: null, recommendation: null },
      ],
    )

    await wrapper.find('[data-loc="market.intel.brand-select"]').setValue('b1')
    await flushPromises()

    // Scraped junk ("40% off") must stay out.
    expect(fieldValue(wrapper, 'market.intel.brand-services-input')).toBe('Home Cleaning, SEO')
    expect(fieldValue(wrapper, 'market.intel.industry-input')).toBe('Home Services')
    expect(fieldValue(wrapper, 'market.intel.location-input')).toBe('Dubai, United Arab Emirates')
    wrapper.unmount()
  })

  it('caps the prefill at 8 trusted services', async () => {
    const detected = Array.from({ length: 10 }, (_, i) => ({
      name: `Service ${i + 1}`,
      source: i % 2 === 0 ? 'manual' : 'brand_analysis',
    }))
    const wrapper = await mountView([buildBrand()], detected)

    await wrapper.find('[data-loc="market.intel.brand-select"]').setValue('b1')
    await flushPromises()

    const value = fieldValue(wrapper, 'market.intel.brand-services-input')
    expect(value.split(', ')).toHaveLength(8)
    expect(value).toBe('Service 1, Service 2, Service 3, Service 4, Service 5, Service 6, Service 7, Service 8')
    wrapper.unmount()
  })

  it('leaves the services field empty when every row is untrusted junk', async () => {
    const wrapper = await mountView(
      [
        buildBrand({
          selected_industry: null,
          location: null,
          services: [{ name: '40% off', source: 'scraped' }],
        }),
      ],
      [
        { name: '40% off', source: 'scraped' },
        { name: 'Free quote!', source: 'ppc_viability' },
      ],
    )

    await wrapper.find('[data-loc="market.intel.brand-select"]').setValue('b1')
    await flushPromises()

    expect(fieldValue(wrapper, 'market.intel.brand-services-input')).toBe('')
    expect(fieldValue(wrapper, 'market.intel.industry-input')).toBe('')
    expect(fieldValue(wrapper, 'market.intel.location-input')).toBe('')
    wrapper.unmount()
  })

  it('re-prefills from the newly selected brand when the brand is switched', async () => {
    const wrapper = await mountView(
      [
        buildBrand({
          services: [{ name: 'Home Cleaning', source: 'brand_analysis' }],
        }),
        buildBrand({
          brand_uuid: 'b2',
          company_name: 'Roof Pros',
          selected_industry: { industry_uuid: 'ind-2', name: 'Construction' },
          location: 'Muscat, Oman',
          services: [{ name: 'Roof Repair', source: 'manual' }],
        }),
      ],
      [{ name: 'Home Cleaning', source: 'brand_analysis' }],
    )

    const select = wrapper.find('[data-loc="market.intel.brand-select"]')
    await select.setValue('b1')
    await flushPromises()
    expect(fieldValue(wrapper, 'market.intel.brand-services-input')).toBe('Home Cleaning')
    expect(fieldValue(wrapper, 'market.intel.industry-input')).toBe('Home Services')

    await select.setValue('b2')
    await flushPromises()

    expect(fieldValue(wrapper, 'market.intel.brand-services-input')).toBe('Roof Repair')
    expect(fieldValue(wrapper, 'market.intel.industry-input')).toBe('Construction')
    expect(fieldValue(wrapper, 'market.intel.location-input')).toBe('Muscat, Oman')
    wrapper.unmount()
  })
})
