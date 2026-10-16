import { describe, it, expect, vi, beforeEach } from 'vitest'
import { mount, flushPromises } from '@vue/test-utils'
import { VueQueryPlugin, QueryClient } from '@tanstack/vue-query'
import BrandServicesManager from './BrandServicesManager.vue'

// Real vue-query + mocked api client: the create/delete mutations must
// invalidate BOTH the managed and the merged services queries (QA r3 fix 5).
vi.mock('@/shared/api/client', () => ({
  default: { get: vi.fn(), post: vi.fn(), delete: vi.fn() },
}))

import apiClient from '@/shared/api/client'

const managed = [
  { service_uuid: 'bs-1', name: 'Coaching', source: 'manual' },
]
const merged = [
  { name: 'Web Design', score: 90, classification: null, recommendation: null, source: 'scraped' },
  { name: 'SEO', score: 60, classification: null, recommendation: null, source: 'brand_analysis' },
  { name: 'Manually Added', score: null, classification: null, recommendation: null, source: 'manual' },
]

let queryClient: QueryClient

function mountManager() {
  return mount(BrandServicesManager, {
    props: { brandUuid: 'b1' },
    global: {
      plugins: [[VueQueryPlugin, { queryClient }]],
    },
  })
}

describe('BrandServicesManager — detected services section (QA r3 fix 5)', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    queryClient = new QueryClient({
      defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
    })
    vi.mocked(apiClient.get).mockImplementation((url: string) => {
      if (String(url).includes('/services/manage/')) {
        return Promise.resolve({ data: managed })
      }
      return Promise.resolve({ data: { success: true, services: merged } })
    })
  })

  it('renders the scanned/analysis services as read-only chips (minus manual ones)', async () => {
    const wrapper = await mountManager()
    await flushPromises()

    expect(wrapper.find('[data-testid="brand-services-detected"]').exists()).toBe(true)
    const chips = wrapper.findAll('[data-testid="brand-service-detected-chip"]')
    expect(chips.map((c) => c.text())).toEqual(['Web DesignScanned', 'SEOAnalysis'])
    // Managed rows still render in the editable section.
    expect(wrapper.find('[data-testid="brand-service-name"]').text()).toBe('Coaching')
  })

  it('hides the detected section when the scan found nothing', async () => {
    vi.mocked(apiClient.get).mockImplementation((url: string) => {
      if (String(url).includes('/services/manage/')) {
        return Promise.resolve({ data: managed })
      }
      return Promise.resolve({ data: { success: true, services: [] } })
    })
    const wrapper = await mountManager()
    await flushPromises()

    expect(wrapper.find('[data-testid="brand-services-detected"]').exists()).toBe(false)
  })
})

describe('BrandServicesManager — Enter-to-add (QA5 تست۴-۲)', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    queryClient = new QueryClient({
      defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
    })
    vi.mocked(apiClient.get).mockImplementation((url: string) => {
      if (String(url).includes('/services/manage/')) {
        return Promise.resolve({ data: managed })
      }
      return Promise.resolve({ data: { success: true, services: merged } })
    })
  })

  function postCalls(urlPart: string) {
    return vi.mocked(apiClient.post).mock.calls.filter((c) => String(c[0]).includes(urlPart))
  }

  it('pressing Enter adds the service through the exact same check→create flow as the Add button', async () => {
    vi.mocked(apiClient.post).mockImplementation((url: string) => {
      if (String(url).includes('/services/check/')) {
        return Promise.resolve({ data: { related: true } })
      }
      return Promise.resolve({
        data: { success: true, service: { service_uuid: 'bs-e1', name: 'Enter Service', source: 'manual' } },
      })
    })
    const wrapper = await mountManager()
    await flushPromises()

    const input = wrapper.find('[data-testid="brand-service-add-input"]')
    await input.setValue('  Enter Service  ')
    await input.trigger('keydown', { key: 'Enter' })
    await flushPromises()

    // Same path as the button: relatedness check first, then the trimmed create.
    expect(postCalls('/services/check/')).toHaveLength(1)
    expect(postCalls('/services/check/')[0]).toEqual(['/brands/b1/services/check/', { name: 'Enter Service' }])
    expect(postCalls('/services/manage/')).toHaveLength(1)
    expect(postCalls('/services/manage/')[0]).toEqual(['/brands/b1/services/manage/', { name: 'Enter Service' }])
    // Input clears only after the create succeeded.
    expect((input.element as HTMLInputElement).value).toBe('')
  })

  it('Enter runs the same validate flow as the button: unrelated service warns once, second Enter force-adds', async () => {
    vi.mocked(apiClient.post).mockImplementation((url: string) => {
      if (String(url).includes('/services/check/')) {
        return Promise.resolve({ data: { related: false, reason: 'not found' } })
      }
      return Promise.resolve({
        data: { success: true, service: { service_uuid: 'bs-e2', name: 'X', source: 'manual' } },
      })
    })
    const wrapper = await mountManager()
    await flushPromises()

    const input = wrapper.find('[data-testid="brand-service-add-input"]')
    await input.setValue('Car Tyre Replacement')
    await input.trigger('keydown', { key: 'Enter' })
    await flushPromises()

    // First Enter: warning, check only — nothing created, text preserved.
    expect(wrapper.find('[data-testid="service-warning"]').exists()).toBe(true)
    expect(postCalls('/services/manage/')).toHaveLength(0)
    expect((input.element as HTMLInputElement).value).toBe('Car Tyre Replacement')

    // Second Enter: force-add.
    await input.trigger('keydown', { key: 'Enter' })
    await flushPromises()
    expect(postCalls('/services/manage/')).toHaveLength(1)
    expect(postCalls('/services/manage/')[0]).toEqual(['/brands/b1/services/manage/', { name: 'Car Tyre Replacement' }])
    expect(wrapper.find('[data-testid="service-warning"]').exists()).toBe(false)
    expect((input.element as HTMLInputElement).value).toBe('')
  })

  it('Enter while the add flow is pending is ignored — no double add (check phase and create phase)', async () => {
    let resolveCheck!: (value: { data: { related: boolean } }) => void
    let resolveCreate!: (value: unknown) => void
    vi.mocked(apiClient.post).mockImplementation((url: string) => {
      if (String(url).includes('/services/check/')) {
        return new Promise((res) => { resolveCheck = res })
      }
      return new Promise((res) => { resolveCreate = res })
    })
    const wrapper = await mountManager()
    await flushPromises()

    const input = wrapper.find('[data-testid="brand-service-add-input"]')
    await input.setValue('Pending Service')
    await input.trigger('keydown', { key: 'Enter' })
    await flushPromises()

    // Check in flight. A second (and third) Enter must be ignored entirely.
    expect(postCalls('/services/check/')).toHaveLength(1)
    await input.trigger('keydown', { key: 'Enter' })
    await input.trigger('keydown', { key: 'Enter' })
    await flushPromises()
    expect(postCalls('/services/check/')).toHaveLength(1)
    expect(postCalls('/services/manage/')).toHaveLength(0)

    // Check resolves related → create starts. Enter during the create phase
    // must not fire a second create either.
    resolveCheck({ data: { related: true } })
    await flushPromises()
    expect(postCalls('/services/manage/')).toHaveLength(1)
    await input.trigger('keydown', { key: 'Enter' })
    await flushPromises()
    expect(postCalls('/services/manage/')).toHaveLength(1)

    resolveCreate({ data: { success: true, service: { service_uuid: 'bs-e3', name: 'Pending Service', source: 'manual' } } })
    await flushPromises()
    expect((input.element as HTMLInputElement).value).toBe('')
    expect(postCalls('/services/manage/')).toHaveLength(1)
  })
})

describe('BrandServicesManager — create invalidates both queries (QA r3 fix 5)', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    queryClient = new QueryClient({
      defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
    })
    vi.mocked(apiClient.get).mockImplementation((url: string) => {
      if (String(url).includes('/services/manage/')) {
        return Promise.resolve({ data: managed })
      }
      return Promise.resolve({ data: { success: true, services: merged } })
    })
    vi.mocked(apiClient.post).mockResolvedValue({
      data: { success: true, service: { service_uuid: 'bs-2', name: 'Coaching', source: 'manual' } },
    })
  })

  it('invalidates services-managed AND services after create', async () => {
    const invalidateSpy = vi.spyOn(queryClient, 'invalidateQueries')
    const wrapper = await mountManager()
    await flushPromises()

    await wrapper.find('[data-testid="brand-service-add-input"]').setValue('New Service')
    await wrapper.find('[data-testid="brand-service-add-btn"]').trigger('click')
    await flushPromises()

    expect(apiClient.post).toHaveBeenCalledWith('/brands/b1/services/manage/', { name: 'New Service' })
    const invalidatedKeys = invalidateSpy.mock.calls.map(
      (c) => ((c[0] as { queryKey?: readonly unknown[] } | undefined)?.queryKey ?? []),
    )
    expect(invalidatedKeys.some((k) => k[2] === 'services-managed')).toBe(true)
    expect(invalidatedKeys.some((k) => k[2] === 'services')).toBe(true)
  })

  it('warns (but still allows) adding a brand-unrelated service', async () => {
    // The check is a POST /services/check/; the create is POST /services/manage/.
    vi.mocked(apiClient.post).mockImplementation((url: string) => {
      if (String(url).includes('/services/check/')) {
        return Promise.resolve({ data: { related: false, reason: 'not found' } })
      }
      return Promise.resolve({
        data: { success: true, service: { service_uuid: 'bs-3', name: 'X', source: 'manual' } },
      })
    })
    vi.mocked(apiClient.get).mockImplementation((url: string) => {
      if (String(url).includes('/services/manage/')) {
        return Promise.resolve({ data: managed })
      }
      return Promise.resolve({ data: { success: true, services: merged } })
    })
    const wrapper = await mountManager()
    await flushPromises()

    await wrapper.find('[data-testid="brand-service-add-input"]').setValue('Car Tyre Replacement')
    await wrapper.find('[data-testid="brand-service-add-btn"]').trigger('click')
    await flushPromises()

    // First submit: warning, only the check call — no create yet.
    expect(wrapper.find('[data-testid="service-warning"]').exists()).toBe(true)
    expect(wrapper.find('[data-testid="service-warning"]').text()).toContain("wasn't found")
    expect(apiClient.post).toHaveBeenCalledTimes(1)
    expect(apiClient.post).toHaveBeenCalledWith('/brands/b1/services/check/', { name: 'Car Tyre Replacement' })

    // Second submit: force-add (check + create = 2 POSTs total).
    await wrapper.find('[data-testid="brand-service-add-btn"]').trigger('click')
    await flushPromises()
    expect(apiClient.post).toHaveBeenCalledTimes(2)
    expect(apiClient.post).toHaveBeenLastCalledWith('/brands/b1/services/manage/', { name: 'Car Tyre Replacement' })
    expect(wrapper.find('[data-testid="service-warning"]').exists()).toBe(false)
  })
})
