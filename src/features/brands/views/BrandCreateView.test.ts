import { describe, it, expect, vi, beforeEach } from 'vitest'
import { mount, flushPromises, type VueWrapper } from '@vue/test-utils'
import { createRouter, createMemoryHistory, type Router } from 'vue-router'
import { VueQueryPlugin, QueryClient } from '@tanstack/vue-query'
import BrandCreateView from './BrandCreateView.vue'
import { brandsApi } from '@/features/brands/api'
import type { BrandScanResult, Brand, ManagedBrandService } from '../types'

vi.mock('@/features/brands/api', () => ({
  brandsApi: {
    list: vi.fn(),
    get: vi.fn(),
    create: vi.fn(),
    update: vi.fn(),
    delete: vi.fn(),
    listIndustries: vi.fn(),
    scanWebsite: vi.fn(),
    listServices: vi.fn(),
    listManagedServices: vi.fn(),
    createManagedService: vi.fn(),
    updateManagedService: vi.fn(),
    deleteManagedService: vi.fn(),
    listAssets: vi.fn().mockResolvedValue({ data: [] }),
    listSocialMedia: vi.fn().mockResolvedValue({ data: [] }),
    uploadAsset: vi.fn(),
    createSocialMedia: vi.fn().mockResolvedValue({ data: {} }),
    updateSocialMedia: vi.fn(),
    deleteSocialMedia: vi.fn(),
    logoAnalysis: vi.fn(),
    startAnalysis: vi.fn(),
  },
}))

const scanResponse: { data: BrandScanResult } = {
  data: {
    success: true,
    detected: {
      company_name: { value: 'Lumen Skincare', confidence: 'high', source: 'og_site_name' },
      industry: {
        value: [
          { industry_uuid: 'ind-1', name: 'Beauty', confidence: 'high', source: 'meta_description' },
          { industry_uuid: 'ind-2', name: 'Fitness', confidence: 'low', source: 'page_text' },
        ],
        confidence: 'high',
        source: 'meta_description',
      },
      brand_colors: { value: ['#EC4899', '#A855F7'], confidence: 'medium', source: 'logo_palette' },
      logo_url: { value: 'https://lumen.test/logo.png', confidence: 'high', source: 'og_image' },
      services: { value: ['Facials', 'Botox'], confidence: 'medium', source: 'page_text' },
      social_profiles: { value: [{ platform: 'instagram', url: 'https://instagram.com/lumen' }], confidence: 'high', source: 'schema_org_sameAs' },
      language: { value: 'en', confidence: 'high', source: 'html_lang' },
      location: { value: 'Dubai, UAE', confidence: 'medium', source: 'address_schema' },
    },
    warnings: ['No logo or Open Graph image was found; brand colors were not extracted.'],
  },
}

/** A scan payload identical to `scanResponse` but with a different company name. */
function scanWithCompany(name: string): { data: BrandScanResult } {
  return {
    data: {
      success: true,
      detected: {
        ...scanResponse.data.detected,
        company_name: { value: name, confidence: 'high', source: 'og_site_name' },
      },
      warnings: [],
    },
  }
}

let router: Router
let queryClient: QueryClient

async function mountView() {
  return mount(BrandCreateView, {
    global: {
      plugins: [
        router,
        [VueQueryPlugin, { queryClient }],
      ],
      stubs: { Topbar: true },
    },
  })
}

function inputByPlaceholder(wrapper: VueWrapper, placeholder: string) {
  return wrapper.find(`input[placeholder="${placeholder}"]`)
}

async function advanceToReview(wrapper: VueWrapper) {
  await wrapper.find('[data-loc="brands.create.continue-btn"]').trigger('click')
  await wrapper.find('[data-loc="brands.create.continue-btn"]').trigger('click')
  await flushPromises()
}

describe('BrandCreateView — website auto-scan (F18)', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    router = createRouter({
      history: createMemoryHistory(),
      routes: [
        { path: '/', name: 'brand-create', component: BrandCreateView },
        { path: '/brands', component: { template: '<div />' } },
        { path: '/brands/:brandUuid/analysis', name: 'brand-analysis', component: { template: '<div />' } },
        { path: '/brands/:brandUuid/analysis/:runUuid', name: 'brand-analysis-run', component: { template: '<div />' } },
      ],
    })
    queryClient = new QueryClient({
      defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
    })
    vi.mocked(brandsApi.listIndustries).mockResolvedValue({
      data: [
        { industry_uuid: 'ind-1', name: 'Beauty' },
        { industry_uuid: 'ind-2', name: 'Fitness' },
      ],
    })
    vi.mocked(brandsApi.create).mockResolvedValue({
      data: {
        brand_uuid: 'b1', website_url: '', company_name: '', selected_industry: null,
        selected_industry_id: null, location: null, brand_color: null, created_at: '', updated_at: '',
      },
    })
    vi.mocked(brandsApi.createSocialMedia).mockResolvedValue({ data: {} as never })
    vi.mocked(brandsApi.startAnalysis).mockResolvedValue({
      data: { analysis_run_uuid: 'run-1', status: 'pending' } as never,
    })
  })

  it('calls the scan API with the entered URL, prefills fields, and renders confidence badges', async () => {
    vi.mocked(brandsApi.scanWebsite).mockResolvedValue(scanResponse)
    const wrapper = await mountView()
    await flushPromises() // let industries query resolve

    await wrapper.find('[data-testid="website-url-input"]').setValue('https://lumen.test')
    await wrapper.find('[data-testid="scan-button"]').trigger('click')
    await flushPromises()

    expect(brandsApi.scanWebsite).toHaveBeenCalledWith({ website_url: 'https://lumen.test' })

    // Prefill (only non-null detected values)
    expect((wrapper.find('[data-testid="company-input"]').element as HTMLInputElement).value).toBe('Lumen Skincare')
    expect((inputByPlaceholder(wrapper, 'Dubai, UAE').element as HTMLInputElement).value).toBe('Dubai, UAE')

    // Best industry candidate auto-selected from the industries list
    expect((wrapper.find('select[data-loc="brands.create.industry-dropdown"]').element as HTMLSelectElement).value).toBe('ind-1')

    // Confidence badges + candidate chips + warnings render
    expect(wrapper.findAll('[data-testid="scan-confidence-badge"]').length).toBeGreaterThanOrEqual(3)
    expect(wrapper.findAll('[data-testid="industry-candidate"]').length).toBe(2)
    expect(wrapper.findAll('[data-testid="scan-warning"]').length).toBe(1)

    // Selecting a candidate chip updates the industry
    await wrapper.findAll('[data-testid="industry-candidate"]')[1].trigger('click')
    expect((wrapper.find('select[data-loc="brands.create.industry-dropdown"]').element as HTMLSelectElement).value).toBe('ind-2')

    // Brand color lives on step 2 — prefilled from the first detected color
    await wrapper.find('[data-loc="brands.create.continue-btn"]').trigger('click')
    await flushPromises()
    expect((inputByPlaceholder(wrapper, '#A855F7').element as HTMLInputElement).value).toBe('#EC4899')
  })

  it('never clobbers user input: typed fields survive the scan, untouched empty fields get prefilled', async () => {
    vi.mocked(brandsApi.scanWebsite).mockResolvedValue(scanResponse)
    const wrapper = await mountView()
    await flushPromises()

    await wrapper.find('[data-testid="website-url-input"]').setValue('https://lumen.test')
    // User typed a company name — must be preserved
    await wrapper.find('[data-testid="company-input"]').setValue('My Own Company')
    // User typed a location and then cleared it — still counts as touched
    await inputByPlaceholder(wrapper, 'Dubai, UAE').setValue('Berlin')
    await inputByPlaceholder(wrapper, 'Dubai, UAE').setValue('')
    await wrapper.find('[data-testid="scan-button"]').trigger('click')
    await flushPromises()

    // Typed company name survives; touched-then-cleared location stays empty
    expect((wrapper.find('[data-testid="company-input"]').element as HTMLInputElement).value).toBe('My Own Company')
    expect((inputByPlaceholder(wrapper, 'Dubai, UAE').element as HTMLInputElement).value).toBe('')

    // Untouched empty fields are still prefilled (brand color lives on step 2)
    await wrapper.find('[data-loc="brands.create.continue-btn"]').trigger('click')
    await flushPromises()
    expect((inputByPlaceholder(wrapper, '#A855F7').element as HTMLInputElement).value).toBe('#EC4899')
  })

  it('does not auto-submit after a scan — submit requires the review step', async () => {
    vi.mocked(brandsApi.scanWebsite).mockResolvedValue(scanResponse)
    const wrapper = await mountView()
    await flushPromises()

    await wrapper.find('[data-testid="website-url-input"]').setValue('https://lumen.test')
    await wrapper.find('[data-testid="scan-button"]').trigger('click')
    await flushPromises()

    expect(brandsApi.create).not.toHaveBeenCalled()
    expect(wrapper.find('[data-loc="brands.create.start-btn"]').exists()).toBe(false)
  })

  it('shows a localized error surface when the scan request fails', async () => {
    vi.mocked(brandsApi.scanWebsite).mockRejectedValue({
      response: { data: { website_url: ['Enter a valid URL.'] } },
    })
    const wrapper = await mountView()
    await flushPromises()

    await wrapper.find('[data-testid="website-url-input"]').setValue('not-a-url')
    await wrapper.find('[data-testid="scan-button"]').trigger('click')
    await flushPromises()

    expect(wrapper.find('[data-testid="scan-error"]').exists()).toBe(true)
    expect(wrapper.find('[data-testid="scan-error"]').text()).toContain('Enter a valid URL.')
  })

  it('shows the backend {"detail": ...} reason verbatim when the scan fails (QA4-N1)', async () => {
    vi.mocked(brandsApi.scanWebsite).mockRejectedValue({
      response: { status: 400, data: { detail: 'The website responded with HTTP 404' } },
    })
    const wrapper = await mountView()
    await flushPromises()

    await wrapper.find('[data-testid="website-url-input"]').setValue('https://lumen.test')
    await wrapper.find('[data-testid="scan-button"]').trigger('click')
    await flushPromises()

    expect(wrapper.find('[data-testid="scan-error"]').exists()).toBe(true)
    expect(wrapper.find('[data-testid="scan-error"]').text()).toContain('The website responded with HTTP 404')
  })

  it('falls back to the first entry of a legacy bare-array error body (QA4-N1)', async () => {
    vi.mocked(brandsApi.scanWebsite).mockRejectedValue({
      response: { status: 400, data: ['Could not scan…'] },
    })
    const wrapper = await mountView()
    await flushPromises()

    await wrapper.find('[data-testid="website-url-input"]').setValue('https://lumen.test')
    await wrapper.find('[data-testid="scan-button"]').trigger('click')
    await flushPromises()

    expect(wrapper.find('[data-testid="scan-error"]').exists()).toBe(true)
    expect(wrapper.find('[data-testid="scan-error"]').text()).toContain('Could not scan…')
  })

  it('a rescan replaces a scan-filled company name instead of discarding it (QA4-new3e)', async () => {
    vi.mocked(brandsApi.scanWebsite)
      .mockResolvedValueOnce(scanWithCompany('Alpha'))
      .mockResolvedValueOnce(scanWithCompany('Beta'))
    const wrapper = await mountView()
    await flushPromises()

    await wrapper.find('[data-testid="website-url-input"]').setValue('https://lumen.test')
    await wrapper.find('[data-testid="scan-button"]').trigger('click')
    await flushPromises()
    expect((wrapper.find('[data-testid="company-input"]').element as HTMLInputElement).value).toBe('Alpha')

    await wrapper.find('[data-testid="scan-button"]').trigger('click')
    await flushPromises()
    expect((wrapper.find('[data-testid="company-input"]').element as HTMLInputElement).value).toBe('Beta')
  })

  it('a rescan never overwrites a user-edited company name (QA4-new3e)', async () => {
    vi.mocked(brandsApi.scanWebsite)
      .mockResolvedValueOnce(scanWithCompany('Alpha'))
      .mockResolvedValueOnce(scanWithCompany('Delta'))
    const wrapper = await mountView()
    await flushPromises()

    await wrapper.find('[data-testid="website-url-input"]').setValue('https://lumen.test')
    await wrapper.find('[data-testid="scan-button"]').trigger('click')
    await flushPromises()
    expect((wrapper.find('[data-testid="company-input"]').element as HTMLInputElement).value).toBe('Alpha')

    // User replaces the scan prefill with their own text — it must win forever
    await wrapper.find('[data-testid="company-input"]').setValue('Gamma')
    await wrapper.find('[data-testid="scan-button"]').trigger('click')
    await flushPromises()
    expect((wrapper.find('[data-testid="company-input"]').element as HTMLInputElement).value).toBe('Gamma')
  })

  it('includes location and brand_color in the create payload (drop-field fix)', async () => {
    vi.mocked(brandsApi.scanWebsite).mockResolvedValue(scanResponse)
    const wrapper = await mountView()
    await flushPromises()

    await wrapper.find('[data-testid="website-url-input"]').setValue('https://lumen.test')
    await wrapper.find('[data-testid="scan-button"]').trigger('click')
    await flushPromises()
    await advanceToReview(wrapper)

    await wrapper.find('[data-loc="brands.create.start-btn"]').trigger('click')
    await flushPromises()

    expect(brandsApi.create).toHaveBeenCalledTimes(1)
    const payload = vi.mocked(brandsApi.create).mock.calls[0][0]
    expect(payload).toMatchObject({
      website_url: 'https://lumen.test',
      company_name: 'Lumen Skincare',
      selected_industry_id: 'ind-1',
      location: 'Dubai, UAE',
      brand_color: '#EC4899',
    })
  })

  it('create submit starts the analysis and navigates to the run tracker (QA fix 5)', async () => {
    vi.mocked(brandsApi.scanWebsite).mockResolvedValue(scanResponse)
    const wrapper = await mountView()
    await flushPromises()

    await wrapper.find('[data-testid="website-url-input"]').setValue('https://lumen.test')
    await wrapper.find('[data-testid="scan-button"]').trigger('click')
    await flushPromises()
    await advanceToReview(wrapper)

    await wrapper.find('[data-loc="brands.create.start-btn"]').trigger('click')
    await flushPromises()

    // One action: create → start analysis → land on the analysis run view
    expect(brandsApi.create).toHaveBeenCalledTimes(1)
    expect(brandsApi.startAnalysis).toHaveBeenCalledTimes(1)
    expect(brandsApi.startAnalysis).toHaveBeenCalledWith('b1', {})
    expect(router.currentRoute.value.path).toBe('/brands/b1/analysis/run-1')
  })

  it('falls back to the analysis start screen when starting the analysis fails', async () => {
    vi.mocked(brandsApi.scanWebsite).mockResolvedValue(scanResponse)
    vi.mocked(brandsApi.startAnalysis).mockRejectedValue(new Error('boom'))
    const wrapper = await mountView()
    await flushPromises()

    await wrapper.find('[data-testid="website-url-input"]').setValue('https://lumen.test')
    await wrapper.find('[data-testid="scan-button"]').trigger('click')
    await flushPromises()
    await advanceToReview(wrapper)

    await wrapper.find('[data-loc="brands.create.start-btn"]').trigger('click')
    await flushPromises()

    // The brand is saved; the user lands on the analysis page to retry manually
    expect(brandsApi.create).toHaveBeenCalledTimes(1)
    expect(router.currentRoute.value.path).toBe('/brands/b1/analysis')
  })
})

function buildExistingBrand(): Brand {
  return {
    brand_uuid: 'b1',
    website_url: 'https://lumen.test',
    company_name: 'Lumen Skincare',
    selected_industry: { industry_uuid: 'ind-1', name: 'Beauty' },
    selected_industry_id: 'ind-1',
    location: 'Dubai, UAE',
    brand_color: '#EC4899',
    created_at: '2026-01-01T00:00:00Z',
    updated_at: '2026-01-02T00:00:00Z',
  }
}

function buildManagedService(overrides: Partial<ManagedBrandService> = {}): ManagedBrandService {
  return {
    service_uuid: 'svc-1',
    name: 'Facials',
    source: 'scraped',
    created_at: '2026-01-01T00:00:00Z',
    ...overrides,
  }
}

describe('BrandCreateView — edit mode (QA Fix 4)', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    router = createRouter({
      history: createMemoryHistory(),
      routes: [
        { path: '/', name: 'brand-create', component: BrandCreateView },
        { path: '/brands', component: { template: '<div />' } },
        { path: '/brands/:brandUuid/edit', name: 'brand-edit', component: BrandCreateView },
      ],
    })
    queryClient = new QueryClient({
      defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
    })
    vi.mocked(brandsApi.get).mockResolvedValue({ data: buildExistingBrand() })
    vi.mocked(brandsApi.listIndustries).mockResolvedValue({
      data: [
        { industry_uuid: 'ind-1', name: 'Beauty' },
        { industry_uuid: 'ind-2', name: 'Fitness' },
      ],
    })
    vi.mocked(brandsApi.update).mockResolvedValue({ data: buildExistingBrand() })
    vi.mocked(brandsApi.listManagedServices).mockResolvedValue({
      data: {
        success: true,
        services: [
          buildManagedService({ service_uuid: 'svc-1', name: 'Facials', source: 'scraped' }),
          buildManagedService({ service_uuid: 'svc-2', name: 'Consultation', source: 'manual' }),
        ],
      },
    })
    vi.mocked(brandsApi.createManagedService).mockResolvedValue({
      data: { success: true, service: buildManagedService({ service_uuid: 'svc-3', name: 'Teeth Whitening', source: 'manual' }) },
    })
  })

  async function mountEditView() {
    await router.push('/brands/b1/edit')
    const wrapper = mount(BrandCreateView, {
      global: {
        plugins: [router, [VueQueryPlugin, { queryClient }]],
        stubs: {
          Topbar: { props: ['title', 'subtitle'], template: '<header><div data-testid="page-title">{{ title }}</div><div data-testid="page-subtitle">{{ subtitle }}</div></header>' },
        },
      },
    })
    await flushPromises()
    return wrapper
  }

  it('labels the page "Edit Brand" instead of "Create Brand"', async () => {
    const wrapper = await mountEditView()

    expect(wrapper.find('[data-testid="page-title"]').text()).toBe('Edit Brand')
    expect(wrapper.find('[data-testid="page-title"]').text()).not.toBe('Create Brand')
  })

  it('labels the final action "Save Changes" in edit mode', async () => {
    const wrapper = await mountEditView()

    await wrapper.find('[data-loc="brands.create.continue-btn"]').trigger('click')
    await wrapper.find('[data-loc="brands.create.continue-btn"]').trigger('click')
    await flushPromises()

    expect(wrapper.find('[data-loc="brands.create.start-btn"]').text()).toContain('Save Changes')
  })

  it('lists managed services with name and source badge', async () => {
    const wrapper = await mountEditView()

    const items = wrapper.findAll('[data-testid="brand-service-item"]')
    expect(items.length).toBe(2)
    expect(items[0].find('[data-testid="brand-service-name"]').text()).toBe('Facials')
    expect(items[0].find('[data-testid="brand-service-source"]').text()).toBe('Scanned')
    expect(items[1].find('[data-testid="brand-service-name"]').text()).toBe('Consultation')
    expect(items[1].find('[data-testid="brand-service-source"]').text()).toBe('Manual')
  })

  it('POSTs the trimmed name when adding a service', async () => {
    const wrapper = await mountEditView()

    await wrapper.find('[data-testid="brand-service-add-input"]').setValue('  Teeth Whitening  ')
    await wrapper.find('[data-testid="brand-service-add-btn"]').trigger('click')
    await flushPromises()

    expect(brandsApi.createManagedService).toHaveBeenCalledWith('b1', { name: 'Teeth Whitening' })
  })

  it('calls the delete endpoint with the service uuid', async () => {
    const wrapper = await mountEditView()

    await wrapper.findAll('[data-testid="brand-service-delete-btn"]')[0].trigger('click')
    await flushPromises()

    expect(brandsApi.deleteManagedService).toHaveBeenCalledWith('b1', 'svc-1')
  })

  it('does not render the services manager in create mode', async () => {
    await router.push('/')
    const wrapper = mount(BrandCreateView, {
      global: {
        plugins: [router, [VueQueryPlugin, { queryClient }]],
        stubs: { Topbar: true },
      },
    })
    await flushPromises()

    expect(wrapper.find('[data-testid="brand-services-manager"]').exists()).toBe(false)
    expect(brandsApi.listManagedServices).not.toHaveBeenCalled()
  })
})
