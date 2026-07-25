import { describe, it, expect } from 'vitest'
import { mount } from '@vue/test-utils'
import CountryCitySelect from './CountryCitySelect.vue'

type Model = { country: string; city: string }

const mountIt = (modelValue: Model) =>
  mount(CountryCitySelect, { props: { modelValue } })

describe('CountryCitySelect', () => {
  it('renders a country field and a city field', () => {
    const wrapper = mountIt({ country: '', city: '' })
    expect(wrapper.find('[data-testid="country-input"]').exists()).toBe(true)
    expect(wrapper.find('[data-testid="city-input"]').exists()).toBe(true)
  })

  it('filters country suggestions by the typed query', async () => {
    const wrapper = mountIt({ country: '', city: '' })
    await wrapper.find('[data-testid="country-input"]').setValue('United')
    const labels = wrapper.findAll('[data-testid="country-suggestion"]').map((n) => n.text())
    expect(labels).toEqual(expect.arrayContaining(['United Arab Emirates', 'United Kingdom', 'United States']))
    expect(labels).not.toContain('Iran')
  })

  it('emits update:modelValue with the selected country', async () => {
    const wrapper = mountIt({ country: '', city: '' })
    await wrapper.find('[data-testid="country-input"]').setValue('Oman')
    await wrapper.find('[data-testid="country-suggestion"]').trigger('click')
    const last = wrapper.emitted('update:modelValue')!.at(-1)![0] as Model
    expect(last.country).toBe('Oman')
  })

  it('emits update:modelValue with the typed city while preserving the country', async () => {
    const wrapper = mountIt({ country: 'Iran', city: '' })
    await wrapper.find('[data-testid="city-input"]').setValue('Tehran')
    const last = wrapper.emitted('update:modelValue')!.at(-1)![0] as Model
    expect(last.city).toBe('Tehran')
    expect(last.country).toBe('Iran')
  })
})
