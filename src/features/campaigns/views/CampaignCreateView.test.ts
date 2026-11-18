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
    checkServiceRelatedness: vi.fn().mockResolvedValue({ data: { related: true } }),
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

    // FA-17: trusted suggestion chips now render PRE-SELECTED (the helper
    // copy says "deselect what you don't want") — scraped rows stay
    // filtered out, only the brand_analysis row survives.
    const chips = wrapper.findAll('[data-testid="service-chip"]')
    expect(chips.length).toBe(1)
    expect(chips[0].text()).toContain('SEO')

    // Add a custom service too; it joins the preselected one.
    await wrapper.find('[data-testid="service-add-input"]').setValue('Branding')
    await wrapper.find('[data-testid="service-add-btn"]').trigger('click')
    await flushPromises()

    await wrapper.find('[data-loc="campaigns.create.create-btn"]').trigger('click')
    await flushPromises()

    expect(campaignsApi.create).toHaveBeenCalledTimes(1)
    expect(vi.mocked(campaignsApi.create).mock.calls[0][0]).toEqual({
      brand_uuid: 'b1',
      name: undefined,
      language: 'en',
      context_payload: { selected_services: ['SEO', 'Branding'] },
    })
  })

  it('resets custom-added service names when switching brands', async () => {
    const wrapper = await mountView()

    // Brand A: add a custom service alongside the detected ones
    await wrapper.findAll('[data-loc="campaigns.create.brand-select"]')[0].trigger('click')
    await flushPromises()
    await wrapper.find('[data-testid="service-add-input"]').setValue('Branding')
    await wrapper.find('[data-testid="service-add-btn"]').trigger('click')
    await flushPromises()
    expect(wrapper.findAll('[data-testid="service-chip"]').length).toBe(2) // 1 trusted + 1 custom

    // Switch to brand B: the custom chip must not leak into the new brand
    await wrapper.findAll('[data-loc="campaigns.create.brand-select"]')[1].trigger('click')
    await flushPromises()

    const chips = wrapper.findAll('[data-testid="service-chip"]')
    expect(chips.length).toBe(1)
    expect(chips.some((c) => c.text().includes('Branding'))).toBe(false)
  })

  it('persists an explicit empty selection after the user deselects the preselected chip', async () => {
    const wrapper = await mountView()

    await wrapper.findAll('[data-loc="campaigns.create.brand-select"]')[0].trigger('click')
    await flushPromises()

    // FA-17/FA-51: chips start selected; deselecting everything is a
    // deliberate act and MUST be persisted as an explicit empty list
    // (never omitted), so downstream PPC fails loudly instead of
    // silently analyzing the whole brand catalog.
    const chips = wrapper.findAll('[data-testid="service-chip"]')
    expect(chips.length).toBe(1)
    await chips[0].trigger('click')

    await wrapper.find('[data-loc="campaigns.create.create-btn"]').trigger('click')
    await flushPromises()

    expect(vi.mocked(campaignsApi.create).mock.calls[0][0]).toEqual({
      brand_uuid: 'b1',
      name: undefined,
      language: 'en',
      context_payload: { selected_services: [] },
    })
  })
})

describe('CampaignCreateView — total budget + currency (F16)', () => {
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

  it('includes total_budget and currency in the create payload when set', async () => {
    const wrapper = await mountView()

    await wrapper.findAll('[data-loc="campaigns.create.brand-select"]')[0].trigger('click')
    await flushPromises()

    await wrapper.find('[data-testid="budget-amount-input"]').setValue('5000')
    await wrapper.find('[data-testid="currency-select"]').setValue('AED')

    await wrapper.find('[data-loc="campaigns.create.create-btn"]').trigger('click')
    await flushPromises()

    expect(campaignsApi.create).toHaveBeenCalledTimes(1)
    expect(vi.mocked(campaignsApi.create).mock.calls[0][0]).toEqual({
      brand_uuid: 'b1',
      name: undefined,
      language: 'en',
      total_budget: 5000,
      currency: 'AED',
      // FA-17: the preselected suggestion rides along in the payload.
      context_payload: { selected_services: ['SEO'] },
    })
  })

  it('defaults the currency to USD when only the amount is set', async () => {
    const wrapper = await mountView()

    await wrapper.findAll('[data-loc="campaigns.create.brand-select"]')[0].trigger('click')
    await flushPromises()

    await wrapper.find('[data-testid="budget-amount-input"]').setValue('250')

    await wrapper.find('[data-loc="campaigns.create.create-btn"]').trigger('click')
    await flushPromises()

    const payload = vi.mocked(campaignsApi.create).mock.calls[0][0]
    expect(payload.total_budget).toBe(250)
    expect(payload.currency).toBe('USD')
  })

  it('omits budget fields when the amount is empty or non-positive', async () => {
    const wrapper = await mountView()

    await wrapper.findAll('[data-loc="campaigns.create.brand-select"]')[0].trigger('click')
    await flushPromises()

    // Empty amount
    await wrapper.find('[data-loc="campaigns.create.create-btn"]').trigger('click')
    await flushPromises()
    let payload = vi.mocked(campaignsApi.create).mock.calls[0][0]
    expect('total_budget' in payload).toBe(false)
    expect('currency' in payload).toBe(false)

    // Zero amount — backend requires decimal > 0, so it must not be sent
    await wrapper.find('[data-testid="budget-amount-input"]').setValue('0')
    await wrapper.find('[data-loc="campaigns.create.create-btn"]').trigger('click')
    await flushPromises()
    payload = vi.mocked(campaignsApi.create).mock.calls[1][0]
    expect('total_budget' in payload).toBe(false)
    expect('currency' in payload).toBe(false)
  })
})

describe('CampaignCreateView — campaign language (F22)', () => {
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

  it('defaults to English and includes language in the create payload', async () => {
    const wrapper = await mountView()

    const select = wrapper.find('[data-testid="campaign-language-select"]')
    expect(select.exists()).toBe(true)
    expect((select.element as HTMLSelectElement).value).toBe('en')

    await wrapper.findAll('[data-loc="campaigns.create.brand-select"]')[0].trigger('click')
    await flushPromises()
    await wrapper.find('[data-loc="campaigns.create.create-btn"]').trigger('click')
    await flushPromises()

    expect(vi.mocked(campaignsApi.create).mock.calls[0][0].language).toBe('en')
  })

  it('sends the chosen language with its native-name label', async () => {
    const wrapper = await mountView()

    // Options render LANGS native names (LangSwitch-style)
    const optionTexts = wrapper.findAll('[data-testid="campaign-language-select"] option').map((o) => o.text())
    expect(optionTexts).toEqual(['English', 'العربية', 'فارسی'])

    await wrapper.find('[data-testid="campaign-language-select"]').setValue('fa')
    await wrapper.findAll('[data-loc="campaigns.create.brand-select"]')[0].trigger('click')
    await flushPromises()
    await wrapper.find('[data-loc="campaigns.create.create-btn"]').trigger('click')
    await flushPromises()

    expect(vi.mocked(campaignsApi.create).mock.calls[0][0].language).toBe('fa')
  })
})

// ── Managed-first, capped service suggestions (QA round 3 fix 2) ──

describe('CampaignCreateView — service suggestions (QA r3 fix 2)', () => {
  const junkServices = Array.from({ length: 8 }, (_, i) => ({
    name: `Junk ${i + 1}`,
    score: 10 + i,
    classification: null,
    recommendation: null,
    source: 'scraped' as const,
  }))

  function setupCommon() {
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
    vi.mocked(brandsApi.checkServiceRelatedness).mockResolvedValue({ data: { related: true } })
    vi.mocked(campaignsApi.create).mockResolvedValue({ data: { campaign_uuid: 'c1' } as never })
  }

  it('suggests ONLY the brand managed services when present', async () => {
    setupCommon()
    vi.mocked(brandsApi.listServices).mockResolvedValue({
      data: { success: true, services: junkServices },
    })
    vi.mocked(brandsApi.list).mockResolvedValue({
      data: [
        { ...brands[0], services: [{ name: 'Coaching' }, { name: 'Mentorship' }] },
        brands[1],
      ] as never,
    })

    const wrapper = await mountView()
    await wrapper.findAll('[data-loc="campaigns.create.brand-select"]')[0].trigger('click')
    await flushPromises()

    const chipTexts = wrapper.findAll('[data-testid="service-chip"]').map((c) => c.text())
    expect(chipTexts).toEqual(['Coaching', 'Mentorship'])
    // no capped fallback -> no show-more toggle
    expect(wrapper.find('[data-testid="services-show-more"]').exists()).toBe(false)
  })

  it('caps the fallback suggestions at 6 with a show-more toggle', async () => {
    setupCommon()
    vi.mocked(brandsApi.listServices).mockResolvedValue({
      data: { success: true, services: junkServices },
    })

    const wrapper = await mountView()
    await wrapper.findAll('[data-loc="campaigns.create.brand-select"]')[0].trigger('click')
    await flushPromises()

    expect(wrapper.findAll('[data-testid="service-chip"]').length).toBe(6)
    expect(wrapper.find('[data-testid="services-show-more"]').exists()).toBe(true)

    await wrapper.find('[data-testid="services-show-more"]').trigger('click')
    await flushPromises()
    expect(wrapper.findAll('[data-testid="service-chip"]').length).toBe(8)
  })
})

// ── QA6-jadid6(b): suggestions include the brand_analysis courses ──
describe('CampaignCreateView — QA6-jadid6 service suggestions', () => {
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
    vi.mocked(brandsApi.checkServiceRelatedness).mockResolvedValue({ data: { related: true } })
    vi.mocked(campaignsApi.create).mockResolvedValue({
      data: { campaign_uuid: 'c1' } as never,
    })
  })

  it('suggests managed-first plus brand_analysis rows from the full services endpoint', async () => {
    // QA6 card: only the managed "Car Driving Lessons" appeared — the
    // analysis courses (Gold, Gold Excellence, Platinum) never did.
    vi.mocked(brandsApi.list).mockResolvedValue({
      data: [
        { ...brands[0], services: [{ name: 'Car Driving Lessons', source: 'manual' }] },
        brands[1],
      ] as never,
    })
    // The merged endpoint returns 'manual' rows too (ManagedBrandServiceSource);
    // cast through never — BrandServiceSource predates the merged contract.
    const qa6Services = [
      { name: 'Car Driving Lessons', score: null, classification: null, recommendation: null, source: 'manual' },
      { name: 'Gold Driving Course', score: 90, classification: 'core', recommendation: null, source: 'brand_analysis' },
      { name: 'Gold Excellence', score: 85, classification: null, recommendation: null, source: 'brand_analysis' },
      { name: 'Platinum Driving Course', score: 80, classification: null, recommendation: null, source: 'brand_analysis' },
      { name: '40% off', score: 99, classification: null, recommendation: null, source: 'scraped' },
    ]
    vi.mocked(brandsApi.listServices).mockResolvedValue({
      data: { success: true, services: qa6Services as never },
    })

    const wrapper = await mountView()
    await wrapper.findAll('[data-loc="campaigns.create.brand-select"]')[0].trigger('click')
    await flushPromises()

    const chipTexts = wrapper.findAll('[data-testid="service-chip"]').map((c) => c.text())
    // Managed row leads (deduped against the endpoint's manual row); the
    // brand_analysis courses follow by score (chip text appends the score);
    // the scraped promo is out.
    expect(chipTexts.length).toBe(4)
    expect(chipTexts[0]).toBe('Car Driving Lessons')
    expect(chipTexts[1]).toContain('Gold Driving Course')
    expect(chipTexts[2]).toContain('Gold Excellence')
    expect(chipTexts[3]).toContain('Platinum Driving Course')
    expect(chipTexts.join('|')).not.toContain('40% off')
    expect(wrapper.find('[data-testid="services-show-more"]').exists()).toBe(false)
  })

  it('caps the combined trusted list at 12 with a show-more toggle', async () => {
    const many = Array.from({ length: 15 }, (_, i) => ({
      name: `Course ${i + 1}`,
      score: 90 - i,
      classification: null,
      recommendation: null,
      source: 'brand_analysis' as const,
    }))
    vi.mocked(brandsApi.listServices).mockResolvedValue({
      data: { success: true, services: many },
    })

    const wrapper = await mountView()
    await wrapper.findAll('[data-loc="campaigns.create.brand-select"]')[0].trigger('click')
    await flushPromises()

    expect(wrapper.findAll('[data-testid="service-chip"]').length).toBe(12)
    expect(wrapper.find('[data-testid="services-show-more"]').exists()).toBe(true)

    await wrapper.find('[data-testid="services-show-more"]').trigger('click')
    await flushPromises()
    expect(wrapper.findAll('[data-testid="service-chip"]').length).toBe(15)
  })
})

describe('CampaignCreateView — FA-15 brand-derived defaults', () => {
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
    vi.mocked(brandsApi.listServices).mockResolvedValue({
      data: { success: true, services: [] },
    })
    vi.mocked(campaignsApi.create).mockResolvedValue({
      data: { campaign_uuid: 'c1' } as never,
    })
  })

  it('defaults language and currency from the selected Persian/Iranian brand', async () => {
    vi.mocked(brandsApi.list).mockResolvedValue({
      data: [
        {
          ...brands[0],
          detected_language: 'fa',
          detected_country: 'Iran',
        },
      ] as never,
    })
    const wrapper = await mountView()

    // Single brand -> auto-selected; defaults follow the brand, not 'en'/USD.
    await flushPromises()
    const langSelect = wrapper.find('[data-testid="campaign-language-select"]')
    expect((langSelect.element as HTMLSelectElement).value).toBe('fa')
    const currencySelect = wrapper.find('[data-testid="currency-select"]')
    expect((currencySelect.element as HTMLSelectElement).value).toBe('IRT')
  })

  it('keeps English/USD when the brand exposes no detection fields', async () => {
    vi.mocked(brandsApi.list).mockResolvedValue({ data: brands as never })
    const wrapper = await mountView()
    await flushPromises()
    const langSelect = wrapper.find('[data-testid="campaign-language-select"]')
    expect((langSelect.element as HTMLSelectElement).value).toBe('en')
    const currencySelect = wrapper.find('[data-testid="currency-select"]')
    expect((currencySelect.element as HTMLSelectElement).value).toBe('USD')
  })
})
