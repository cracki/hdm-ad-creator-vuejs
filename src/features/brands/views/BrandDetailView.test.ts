import { describe, it, expect, vi, beforeEach } from 'vitest'
import { mount } from '@vue/test-utils'
import { createRouter, createMemoryHistory, type Router } from 'vue-router'
import { ref } from 'vue'
import BrandDetailView from './BrandDetailView.vue'
import type { Brand, BrandService } from '../types'

vi.mock('@/features/brands/queries', () => ({
  useBrand: vi.fn(),
  useAnalysisRuns: vi.fn(),
  useBrandServices: vi.fn(),
  useDeleteBrand: vi.fn(),
}))

import { useBrand, useAnalysisRuns, useBrandServices, useDeleteBrand } from '@/features/brands/queries'

function buildBrand(overrides: Partial<Brand> = {}): Brand {
  return {
    brand_uuid: 'b1',
    website_url: 'https://lumen.test',
    company_name: 'Lumen Skincare',
    selected_industry: { industry_uuid: 'i1', name: 'Beauty' },
    selected_industry_id: 'i1',
    location: 'Dubai, UAE',
    brand_color: null,
    created_at: '2026-01-01T00:00:00Z',
    updated_at: '2026-01-02T00:00:00Z',
    ...overrides,
  } as Brand
}

function buildService(overrides: Partial<BrandService> = {}): BrandService {
  return {
    name: 'Facials',
    score: null,
    classification: null,
    recommendation: null,
    source: 'scraped',
    ...overrides,
  }
}

let router: Router

async function mountView() {
  return mount(BrandDetailView, {
    global: {
      plugins: [router],
      stubs: { Topbar: true, Breadcrumb: true, ConfirmDialog: true, GuidedAction: true },
    },
  })
}

describe('BrandDetailView — services & location (QA photo 5)', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    router = createRouter({
      history: createMemoryHistory(),
      routes: [
        { path: '/', component: BrandDetailView },
        { path: '/brands/:brandUuid', name: 'brand-detail', component: BrandDetailView },
        { path: '/brands', component: { template: '<div />' } },
      ],
    })
    vi.mocked(useBrand).mockReturnValue({
      data: ref(buildBrand()),
      isLoading: ref(false),
    } as never)
    vi.mocked(useAnalysisRuns).mockReturnValue({
      data: ref([]),
    } as never)
    vi.mocked(useBrandServices).mockReturnValue({
      data: ref([]),
    } as never)
    vi.mocked(useDeleteBrand).mockReturnValue({ mutateAsync: vi.fn() } as never)
  })

  it('renders the merged services list as chips', async () => {
    vi.mocked(useBrandServices).mockReturnValue({
      data: ref([
        buildService({ name: 'Facials', source: 'scraped' }),
        buildService({ name: 'Botox', source: 'brand_analysis' }),
        buildService({ name: 'Laser Hair Removal', source: 'ppc_viability' }),
      ]),
    } as never)

    const wrapper = await mountView()

    const card = wrapper.find('[data-testid="brand-services-card"]')
    expect(card.exists()).toBe(true)
    const chips = wrapper.findAll('[data-testid="brand-service-chip"]')
    expect(chips.length).toBe(3)
    expect(chips.map((c) => c.text())).toEqual(['Facials', 'Botox', 'Laser Hair Removal'])
  })

  it('renders the location row when the brand has one', async () => {
    const wrapper = await mountView()

    const loc = wrapper.find('[data-testid="brand-location"]')
    expect(loc.exists()).toBe(true)
    expect(loc.text()).toContain('Dubai, UAE')
  })

  it('hides the services card and location row when absent', async () => {
    vi.mocked(useBrand).mockReturnValue({
      data: ref(buildBrand({ location: null })),
      isLoading: ref(false),
    } as never)

    const wrapper = await mountView()

    expect(wrapper.find('[data-testid="brand-services-card"]').exists()).toBe(false)
    expect(wrapper.find('[data-testid="brand-location"]').exists()).toBe(false)
  })
})
