import { describe, it, expect, vi, beforeEach } from 'vitest'
import { mount, flushPromises } from '@vue/test-utils'
import ServiceSelector from './ServiceSelector.vue'
import { brandsApi } from '@/features/brands/api'

vi.mock('@/features/brands/api', () => ({
  brandsApi: { checkServiceRelatedness: vi.fn() },
}))

const services = [
  { name: 'Web Design', score: 88, classification: 'core', recommendation: null, source: 'scraped' },
  { name: 'SEO', score: 64, classification: null, recommendation: 'Boost content', source: 'brand_analysis' },
  { name: 'Consulting', score: null, classification: null, recommendation: null, source: 'ppc_viability' },
]

function mountSelector(modelValue: string[] = [], props: Record<string, unknown> = {}) {
  return mount(ServiceSelector, {
    props: { modelValue, services, ...props },
  })
}

function emittedNames(wrapper: ReturnType<typeof mountSelector>): string[][] {
  return wrapper.emitted('update:modelValue')!.map((args) => args[0] as string[])
}

describe('ServiceSelector', () => {
  it('renders a chip per service and shows score badges only when scored', () => {
    const wrapper = mountSelector()
    const chips = wrapper.findAll('[data-testid="service-chip"]')
    expect(chips.map((c) => c.text())).toEqual(['Web Design88', 'SEO64', 'Consulting'])
    expect(wrapper.findAll('[data-testid="service-score"]').length).toBe(2)
  })

  it('marks chips included in modelValue as selected', () => {
    const wrapper = mountSelector(['SEO'])
    const chips = wrapper.findAll('[data-testid="service-chip"]')
    expect(chips[0].attributes('data-selected')).toBe('false')
    expect(chips[1].attributes('data-selected')).toBe('true')
  })

  it('emits update:modelValue with the service name on select and deselect', async () => {
    const wrapper = mountSelector(['SEO'])
    await wrapper.findAll('[data-testid="service-chip"]')[0].trigger('click')
    expect(emittedNames(wrapper).at(-1)).toEqual(['SEO', 'Web Design'])

    // parent applies the emitted selection, then toggling the same chip deselects it
    await wrapper.setProps({ modelValue: ['SEO', 'Web Design'] })
    await wrapper.findAll('[data-testid="service-chip"]')[0].trigger('click')
    expect(emittedNames(wrapper).at(-1)).toEqual(['SEO'])
  })

  it('adds a new service via the inline input and includes it in the emitted value', async () => {
    const wrapper = mountSelector(['Web Design'])
    await wrapper.find('[data-testid="service-add-input"]').setValue('Branding')
    await wrapper.find('[data-testid="service-add-btn"]').trigger('click')

    expect(emittedNames(wrapper).at(-1)).toEqual(['Web Design', 'Branding'])
    // the custom service renders as a chip afterwards
    const chipTexts = wrapper.findAll('[data-testid="service-chip"]').map((c) => c.text())
    expect(chipTexts.some((text) => text.includes('Branding'))).toBe(true)
  })

  it('does not duplicate a service that is already selected', async () => {
    const wrapper = mountSelector(['SEO'])
    await wrapper.find('[data-testid="service-add-input"]').setValue('SEO')
    await wrapper.find('[data-testid="service-add-btn"]').trigger('click')

    const emissions = wrapper.emitted('update:modelValue')
    expect(emissions).toBeUndefined()
  })

  it('shows a localized empty state when no services exist', () => {
    const wrapper = mount(ServiceSelector, { props: { modelValue: [], services: [] } })
    expect(wrapper.find('[data-testid="service-empty"]').exists()).toBe(true)
    expect(wrapper.findAll('[data-testid="service-chip"]').length).toBe(0)
  })

  it('ignores interaction while disabled', async () => {
    const wrapper = mountSelector([], { disabled: true })
    await wrapper.findAll('[data-testid="service-chip"]')[0].trigger('click')
    await wrapper.find('[data-testid="service-add-input"]').setValue('X')
    await wrapper.find('[data-testid="service-add-btn"]').trigger('click')
    expect(wrapper.emitted('update:modelValue')).toBeUndefined()
  })
})

// ── Relatedness check (QA round 3 fix 1) ──

describe('ServiceSelector — unrelated-service warning', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('warns on an unrelated custom service and force-adds on the second submit', async () => {
    vi.mocked(brandsApi.checkServiceRelatedness).mockResolvedValue({
      data: { related: false, reason: 'not found on website or analysis' },
    })
    const wrapper = mountSelector([], { brandUuid: 'b1' })

    await wrapper.find('[data-testid="service-add-input"]').setValue('Car Tyre Replacement')
    await wrapper.find('[data-testid="service-add-btn"]').trigger('click')
    await flushPromises()

    // First submit: checked against the brand, warned, NOT added.
    expect(brandsApi.checkServiceRelatedness).toHaveBeenCalledWith('b1', 'Car Tyre Replacement')
    expect(wrapper.emitted('update:modelValue')).toBeUndefined()
    const warning = wrapper.find('[data-testid="service-warning"]')
    expect(warning.exists()).toBe(true)
    expect(warning.text()).toContain("wasn't found")

    // Second submit: force-add without another check call.
    await wrapper.find('[data-testid="service-add-btn"]').trigger('click')
    await flushPromises()

    expect(emittedNames(wrapper).at(-1)).toEqual(['Car Tyre Replacement'])
    expect(brandsApi.checkServiceRelatedness).toHaveBeenCalledTimes(1)
    expect(wrapper.find('[data-testid="service-warning"]').exists()).toBe(false)
  })

  it('adds a related custom service immediately with no warning', async () => {
    vi.mocked(brandsApi.checkServiceRelatedness).mockResolvedValue({
      data: { related: true },
    })
    const wrapper = mountSelector([], { brandUuid: 'b1' })

    await wrapper.find('[data-testid="service-add-input"]').setValue('Life Coaching')
    await wrapper.find('[data-testid="service-add-btn"]').trigger('click')
    await flushPromises()

    expect(emittedNames(wrapper).at(-1)).toEqual(['Life Coaching'])
    expect(wrapper.find('[data-testid="service-warning"]').exists()).toBe(false)
  })

  it('does not check services that are already suggested for the brand', async () => {
    vi.mocked(brandsApi.checkServiceRelatedness).mockResolvedValue({
      data: { related: false },
    })
    const wrapper = mountSelector([], { brandUuid: 'b1' })

    await wrapper.find('[data-testid="service-add-input"]').setValue('SEO')
    await wrapper.find('[data-testid="service-add-btn"]').trigger('click')
    await flushPromises()

    expect(brandsApi.checkServiceRelatedness).not.toHaveBeenCalled()
    expect(wrapper.find('[data-testid="service-warning"]').exists()).toBe(false)
  })

  it('skips the check entirely when no brand context is known', async () => {
    const wrapper = mountSelector()

    await wrapper.find('[data-testid="service-add-input"]').setValue('Branding')
    await wrapper.find('[data-testid="service-add-btn"]').trigger('click')
    await flushPromises()

    expect(brandsApi.checkServiceRelatedness).not.toHaveBeenCalled()
    expect(emittedNames(wrapper).at(-1)).toEqual(['Branding'])
  })
})

// ── QA4 (client test-4 bug 2): rapid Enter merged two services into one label ──

describe('ServiceSelector — quick-add merge guard (QA4)', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('clears the input immediately on submit so a second Enter cannot merge two services', async () => {
    let resolveCheck: (value: { data: { related: boolean } }) => void = () => {}
    let firstCall = true
    vi.mocked(brandsApi.checkServiceRelatedness).mockImplementation(() => {
      if (firstCall) {
        firstCall = false
        return new Promise((resolve) => { resolveCheck = resolve })
      }
      return Promise.resolve({ data: { related: true } })
    })
    const wrapper = mountSelector([], { brandUuid: 'b1' })
    const field = wrapper.find('[data-testid="service-add-input"]')

    await field.setValue('AC Cleaning')
    await field.trigger('keydown.enter')
    // while the check is in flight the input must already be empty and locked
    expect((field.element as HTMLInputElement).value).toBe('')
    expect((field.element as HTMLInputElement).disabled).toBe(true)

    resolveCheck({ data: { related: true } })
    await flushPromises()

    // the user now types the second service fresh (the stale text is gone)
    await field.setValue('Handyman Services')
    await field.trigger('keydown.enter')
    await flushPromises()

    const chipTexts = wrapper.findAll('[data-testid="service-chip"]').map((c) => c.text())
    expect(chipTexts.some((text) => text.includes('AC Cleaning'))).toBe(true)
    expect(chipTexts.some((text) => text.includes('Handyman Services'))).toBe(true)
    expect(chipTexts.some((text) => text.includes('AC CleaningHandyman Services'))).toBe(false)
  })

  it('blocks re-entry while a relatedness check is pending (no second submit mid-check)', async () => {
    let resolveCheck: (value: { data: { related: boolean } }) => void = () => {}
    vi.mocked(brandsApi.checkServiceRelatedness).mockImplementation(
      () => new Promise((resolve) => { resolveCheck = resolve }),
    )
    const wrapper = mountSelector([], { brandUuid: 'b1' })

    await wrapper.find('[data-testid="service-add-input"]').setValue('AC Cleaning')
    await wrapper.find('[data-testid="service-add-input"]').trigger('keydown.enter')
    // second Enter while pending must be a no-op
    await wrapper.find('[data-testid="service-add-input"]').trigger('keydown.enter')

    resolveCheck({ data: { related: true } })
    await flushPromises()

    expect(brandsApi.checkServiceRelatedness).toHaveBeenCalledTimes(1)
    expect(emittedNames(wrapper)?.length ?? 0).toBeLessThanOrEqual(1)
  })

  it('restores the typed name when the check warns, so the force-add second submit still works', async () => {
    vi.mocked(brandsApi.checkServiceRelatedness).mockResolvedValue({
      data: { related: false },
    })
    const wrapper = mountSelector([], { brandUuid: 'b1' })
    const field = wrapper.find('[data-testid="service-add-input"]')

    await field.setValue('Car Engine Repair')
    await field.trigger('keydown.enter')
    await flushPromises()

    expect(wrapper.find('[data-testid="service-warning"]').exists()).toBe(true)
    expect((field.element as HTMLInputElement).value).toBe('Car Engine Repair')

    await field.trigger('keydown.enter')
    await flushPromises()

    expect(emittedNames(wrapper).at(-1)).toEqual(['Car Engine Repair'])
    expect(brandsApi.checkServiceRelatedness).toHaveBeenCalledTimes(1)
  })
})
