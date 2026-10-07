import { describe, it, expect, beforeEach, afterEach } from 'vitest'
import { mount } from '@vue/test-utils'
import AdsStrategyRenderer from './AdsStrategyRenderer.vue'
import { useI18n } from '@/shared/utils/i18n'

/**
 * QA4-new4: the TARGETING section must render for every funnel campaign.
 * The backend guarantees a `targeting` object ({ audience_summary,
 * age_range, locations, interests, exclusions }) on every entry — Google
 * campaigns carry ONLY `targeting`, while Meta also carries a legacy
 * `audience` that can be thin/empty (`audience: {}`). The section must
 * show a structured view of whichever source has real content, and stay
 * hidden when there is none.
 */

/** Shape produced by the backend `targeting` object. */
const targeting = {
  audience_summary: 'Urban professionals interested in wellness',
  age_range: '28-45',
  locations: ['Dubai', 'Abu Dhabi'],
  interests: ['fitness', 'wellness'],
  exclusions: ['existing customers'],
}

const metaLikePayload = {
  campaign_overview: { total_campaigns: 1 },
  funnel_campaigns: [
    {
      funnel_stage: 'tofu',
      campaign_name: 'Awareness — Meta',
      audience: {},
      targeting,
    },
  ],
}

const googleLikePayload = {
  campaign_overview: { total_campaigns: 1 },
  funnel_campaigns: [
    {
      funnel_stage: 'bofu',
      campaign_name: 'Search — Google',
      targeting,
    },
  ],
}

/** What useNormalizeResponse (ads-strategy) yields for the Meta payload:
 * `audience` is aliased onto the empty `audience_targeting`, and the
 * unknown `targeting` key passes through untouched. */
const normalizedMetaPayload = {
  campaign_overview: { total_campaigns: 1 },
  funnel_campaigns: [
    {
      funnel_stage: 'tofu',
      campaign_name: 'Awareness — Meta',
      audience_targeting: {},
      targeting,
    },
  ],
}

describe('AdsStrategyRenderer — targeting section (QA4-new4)', () => {
  const { setLang } = useI18n()

  beforeEach(() => setLang('en'))
  afterEach(() => setLang('en'))

  it('renders the structured targeting view for a Meta-like payload (empty audience + full targeting)', () => {
    const wrapper = mount(AdsStrategyRenderer, { props: { data: metaLikePayload } })

    const section = wrapper.find('[data-testid="camp-targeting"]')
    expect(section.exists()).toBe(true)
    expect(section.text()).toContain('Targeting')
    expect(wrapper.find('[data-testid="targeting-summary"]').text())
      .toContain('Urban professionals interested in wellness')
    expect(wrapper.find('[data-testid="targeting-locations"]').text())
      .toContain('Dubai, Abu Dhabi')
    expect(wrapper.find('[data-testid="targeting-interests"]').text())
      .toContain('fitness, wellness')
    expect(wrapper.find('[data-testid="targeting-age-range"]').text())
      .toContain('28-45')
    expect(wrapper.find('[data-testid="targeting-exclusions"]').text())
      .toContain('existing customers')
  })

  it('renders the same structured view for a Google-like payload (targeting only)', () => {
    const wrapper = mount(AdsStrategyRenderer, { props: { data: googleLikePayload } })

    const section = wrapper.find('[data-testid="camp-targeting"]')
    expect(section.exists()).toBe(true)
    expect(wrapper.find('[data-testid="targeting-summary"]').text())
      .toContain('Urban professionals interested in wellness')
    expect(wrapper.find('[data-testid="targeting-locations"]').text())
      .toContain('Dubai, Abu Dhabi')
  })

  it('renders the targeting view for the normalized Meta payload (empty aliased audience_targeting + passthrough targeting)', () => {
    const wrapper = mount(AdsStrategyRenderer, { props: { data: normalizedMetaPayload } })

    expect(wrapper.find('[data-testid="camp-targeting"]').exists()).toBe(true)
    expect(wrapper.find('[data-testid="targeting-summary"]').text())
      .toContain('Urban professionals interested in wellness')
  })

  it('skips empty labeled rows in the targeting view', () => {
    const wrapper = mount(AdsStrategyRenderer, {
      props: {
        data: {
          funnel_campaigns: [
            { funnel_stage: 'tofu', targeting: { ...targeting, age_range: '', interests: [], exclusions: [] } },
          ],
        },
      },
    })

    expect(wrapper.find('[data-testid="camp-targeting"]').exists()).toBe(true)
    expect(wrapper.find('[data-testid="targeting-age-range"]').exists()).toBe(false)
    expect(wrapper.find('[data-testid="targeting-interests"]').exists()).toBe(false)
    expect(wrapper.find('[data-testid="targeting-exclusions"]').exists()).toBe(false)
    expect(wrapper.find('[data-testid="targeting-locations"]').exists()).toBe(true)
  })

  it('hides the section entirely when a campaign has no audience/targeting data', () => {
    const wrapper = mount(AdsStrategyRenderer, {
      props: {
        data: {
          funnel_campaigns: [{ funnel_stage: 'tofu', campaign_name: 'Bare campaign' }],
        },
      },
    })

    expect(wrapper.find('[data-testid="camp-targeting"]').exists()).toBe(false)
    expect(wrapper.text()).not.toContain('Urban professionals')
  })

  it('does not render a labeled section with an empty body for a thin audience alone', () => {
    const wrapper = mount(AdsStrategyRenderer, {
      props: {
        data: {
          funnel_campaigns: [{ funnel_stage: 'tofu', audience: {} }],
        },
      },
    })

    expect(wrapper.find('[data-testid="camp-targeting"]').exists()).toBe(false)
  })

  it('still renders the legacy audience shape (type + details + exclusions)', () => {
    const wrapper = mount(AdsStrategyRenderer, {
      props: {
        data: {
          funnel_campaigns: [
            {
              funnel_stage: 'mofu',
              audience: { type: 'Custom audience', details: ['lookalike 1%'], exclusions: ['purchasers'] },
            },
          ],
        },
      },
    })

    const section = wrapper.find('[data-testid="camp-targeting"]')
    expect(section.exists()).toBe(true)
    expect(section.text()).toContain('Custom audience')
    expect(section.text()).toContain('lookalike 1%')
    expect(section.text()).toContain('Exclusions')
    expect(section.text()).toContain('purchasers')
    // Legacy shape never renders the structured targeting rows
    expect(wrapper.find('[data-testid="targeting-summary"]').exists()).toBe(false)
  })

  it('still renders the LinkedIn audience_targeting approach', () => {
    const wrapper = mount(AdsStrategyRenderer, {
      props: {
        data: {
          funnel_campaigns: [
            { funnel_stage: 'bofu', audience_targeting: { targeting_approach: 'Job-title targeting on LinkedIn' } },
          ],
        },
      },
    })

    const section = wrapper.find('[data-testid="camp-targeting"]')
    expect(section.exists()).toBe(true)
    expect(section.text()).toContain('Job-title targeting on LinkedIn')
  })
})
