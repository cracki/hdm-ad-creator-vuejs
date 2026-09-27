import { describe, it, expect, beforeEach, afterEach } from 'vitest'
import { mount } from '@vue/test-utils'
import AnalysisPayloadRenderer from './AnalysisPayloadRenderer.vue'
import { useI18n } from '@/shared/utils/i18n'

/**
 * QA fix 1 (MOM §4.4): the generic payload renderer must never show raw DB
 * field names, internal keys, placeholder values or empty values.
 */
const socialInsightsPayload = {
  company_name: 'Lumen Skincare',
  industry: 'beauty',
  usp_list: ['Clean formulas', 'Dermatologist tested'],
  target_audience: {
    primary: {
      demographics: { age_range: '25-45', gender: 'all' },
      interests: ['skincare', 'wellness'],
    },
  },
  brand_voice: { tone: 'warm', keywords: ['reassuring'] },
  data_source: 'AI inference based on profile metadata',
  // Internal / useless entries that must vanish
  is_real_data: false,
  platforms_missing: ['tiktok'],
  content_hash: 'abc123',
  task_id: 'task-9',
  _cache: { a: 1 },
  raw_scrape: '<html/>',
  schema_version: 2,
  // Placeholder + empty values
  secondary_audience: 'unknown',
  location_field: 'N/A',
  empty_list: [],
  empty_object: {},
  blank: '',
  nothing: null,
  fallback_usps: ['Limited website content - unable to extract specific USPs'],
}

describe('AnalysisPayloadRenderer — humanized labels (QA fix 1)', () => {
  const { setLang } = useI18n()

  beforeEach(() => setLang('en'))
  afterEach(() => setLang('en'))

  it('maps known raw keys to human labels instead of snake_case names', () => {
    const wrapper = mount(AnalysisPayloadRenderer, { props: { data: socialInsightsPayload } })
    const text = wrapper.text()

    expect(text).toContain('Unique selling points')
    expect(text).toContain('Target audience')
    expect(text).toContain('Brand voice')
    expect(text).toContain('Source')

    // Raw key names never render
    expect(text).not.toContain('usp_list')
    expect(text).not.toContain('target_audience')
    expect(text).not.toContain('brand_voice')
    expect(text).not.toContain('data_source')
  })

  it('localizes labels for the active locale', () => {
    setLang('fa')
    const wrapper = mount(AnalysisPayloadRenderer, { props: { data: socialInsightsPayload } })
    const text = wrapper.text()

    expect(text).toContain('مخاطب هدف')
    expect(text).toContain('مزیت‌های منحصربه‌فرد')
    expect(text).not.toContain('Target audience')
  })

  it('prettifies unknown keys as a Title-Case fallback', () => {
    const wrapper = mount(AnalysisPayloadRenderer, {
      props: { data: { custom_shipping_policy: 'Ships worldwide' } },
    })
    expect(wrapper.text()).toContain('Custom Shipping Policy')
    expect(wrapper.text()).not.toContain('custom_shipping_policy')
  })

  it('hides internal/debug keys entirely', () => {
    const wrapper = mount(AnalysisPayloadRenderer, { props: { data: socialInsightsPayload } })
    const text = wrapper.text()

    expect(text).not.toContain('Is real data')
    expect(text).not.toContain('real data')
    expect(text).not.toContain('Platforms missing')
    expect(text).not.toContain('tiktok')
    expect(text).not.toContain('content_hash')
    expect(text).not.toContain('abc123')
    expect(text).not.toContain('task-9')
    expect(text).not.toContain('Cache')
    expect(text).not.toContain('raw_scrape')
    expect(text).not.toContain('Schema')
  })

  it('hides placeholder and empty values', () => {
    const wrapper = mount(AnalysisPayloadRenderer, { props: { data: socialInsightsPayload } })
    const text = wrapper.text()

    expect(text).not.toContain('unknown')
    expect(text).not.toContain('N/A')
    expect(text).not.toContain('Limited website content')
    expect(text).not.toContain('None')
    // The sections carrying only placeholder/empty data disappear as a whole
    expect(text).not.toContain('Fallback Usps')
    expect(text).not.toContain('Empty List')
    expect(text).not.toContain('Empty Object')
    expect(text).not.toContain('Blank')
  })

  it('applies the same map to nested keys', () => {
    const wrapper = mount(AnalysisPayloadRenderer, { props: { data: socialInsightsPayload } })
    const text = wrapper.text()

    expect(text).toContain('Tone')
    expect(text).toContain('Keywords')
    expect(text).toContain('Age range')
    expect(text).toContain('Interests')
    expect(text).toContain('Primary audience')
  })

  it('renders nothing when every entry is hidden', () => {
    const wrapper = mount(AnalysisPayloadRenderer, {
      props: { data: { is_real_data: false, empty: [], note: 'unknown' } },
    })
    expect(wrapper.find('*').exists()).toBe(false)
  })
})
