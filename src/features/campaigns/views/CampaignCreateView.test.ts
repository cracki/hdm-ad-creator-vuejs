import { describe, it, expect, vi, beforeEach } from 'vitest'
import { mount, flushPromises, type VueWrapper } from '@vue/test-utils'
import { createRouter, createMemoryHistory, type Router } from 'vue-router'
import { VueQueryPlugin, QueryClient } from '@tanstack/vue-query'
import CampaignCreateView from './CampaignCreateView.vue'
import { brandsApi } from '@/features/brands/api'
import { campaignsApi } from '@/features/campaigns/api'

vi.mock('@/features/brands/api', () => ({
  brandsApi: {
    list: vi.fn(),
    get: vi.fn(),
    create: vi.fn(),
    update: vi.fn(),
    delete: vi.fn(),
    listIndustries: vi.fn().mockResolvedValue({ data: [] }),
    scanWebsite: vi.fn(),
    listServices: vi.fn(),
    listAssets: vi.fn().mockResolvedValue({ data: [] }),
    listSocialMedia: vi.fn().mockResolvedValue({ data: [] }),
    uploadAsset: vi.fn(),
    createSocialMedia: vi.fn(),
    updateSocialMedia: vi.fn(),
    deleteSocialMedia: vi.fn(),
    logoAnalysis: vi.fn(),
  },
}))

vi.mock('@/features/campaigns/api', () => ({
  campaignsApi: {
    create: vi.fn(),
  },
}))

const brands = [
  { brand_uuid: 'b1', website_url: 'https://lumen.test', company_name: 'Lumen', selected_industry: null, selected_industry_id: null, location: null, brand_color: null, created_at: '', updated_at: '' },
  { brand_uuid: 'b2', website_url: 'https://acme.test', company_name: 'Acme', selected_industry: null, selected_industry_id: null, location: null, brand_color: null, created_at: '', updated_at: '' },
]

const services = [
  { name: 'Web Design', score: 88, classification: 'core', recommendation: null, source: 'scraped' as const },
  { name: 'SEO', score: 64, classification: null, recommendation: null, source: 'brand_analysis' as const },
]

let router: Router
let queryClient: QueryClient

async function mountView(): Promise<VueWrapper> {
  const wrapper = mount(CampaignCreateView, {
    global: {
      plugins: [
        router,
        [VueQueryPlugin, { queryClient }],
      ],
      stubs: { Topbar: true },
    },
  })
  await flushPromises()
  return wrapper
}

describe('CampaignCreateView — service selection (F14)', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    router = createRouter({
      history: createMemoryHistory(),
      routes: [
        { path: '/', component: CampaignCreateView },
        { path: '/brands/new', component: { template: '<div />' } },
        { path: '/campaigns/:campaignUuid', component: { template: '<div />' } },
      ],
    })
    queryClient = new QueryClient({
      defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
    })
    vi.mocked(brandsApi.list).mockResolvedValue({ data: brands as never })
    vi.mocked(brandsApi.listServices).mockResolvedValue({
      data: { success: true, services },
    })
    vi.mocked(campaignsApi.create).mockResolvedValue({
      data: { campaign_uuid: 'c1' } as never,
    })
  })

  it('persists selected services in context_payload.selected_services on create', async () => {
    const wrapper = await mountView()

    // Pick the first brand (2 brands -> selection UI is visible)
    await wrapper.findAll('[data-loc="campaigns.create.brand-select"]')[0].trigger('click')
    await flushPromises()

    // Detected services render as selectable chips; select the first one
    const chips = wrapper.findAll('[data-testid="service-chip"]')
    expect(chips.length).toBe(2)
    await chips[0].trigger('click')

    // Add a custom service too
    await wrapper.find('[data-testid="service-add-input"]').setValue('Branding')
    await wrapper.find('[data-testid="service-add-btn"]').trigger('click')

    await wrapper.find('[data-loc="campaigns.create.create-btn"]').trigger('click')
    await flushPromises()

    expect(campaignsApi.create).toHaveBeenCalledTimes(1)
    expect(vi.mocked(campaignsApi.create).mock.calls[0][0]).toEqual({
      brand_uuid: 'b1',
      name: undefined,
      context_payload: { selected_services: ['Web Design', 'Branding'] },
    })
  })

  it('omits context_payload when no services are selected', async () => {
    const wrapper = await mountView()

    await wrapper.findAll('[data-loc="campaigns.create.brand-select"]')[0].trigger('click')
    await flushPromises()
    await wrapper.find('[data-loc="campaigns.create.create-btn"]').trigger('click')
    await flushPromises()

    expect(vi.mocked(campaignsApi.create).mock.calls[0][0]).toEqual({
      brand_uuid: 'b1',
      name: undefined,
    })
  })
})
