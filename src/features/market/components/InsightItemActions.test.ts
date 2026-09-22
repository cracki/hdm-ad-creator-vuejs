import { describe, it, expect, vi, beforeEach } from 'vitest'
import { mount, flushPromises, type VueWrapper } from '@vue/test-utils'
import { ref } from 'vue'
import InsightItemActions from './InsightItemActions.vue'
import { appendContentInsight, isInsightSaved, buildInsightBrief, insightBriefFilename, CONTENT_INSIGHTS_CAP } from '../insights'
import type { Campaign } from '@/features/campaigns/types'

// ── Pure helpers (merge / cap rules) ──────────────────────

describe('insights helpers', () => {
  it('appendContentInsight merges without clobbering other context_payload keys', () => {
    const patch = appendContentInsight(
      { target_market: { country: 'Oman' }, content_insights: [{ source: 'market', view: 'hooks', title: 'old', snippet: '', added_at: 'x' }] },
      { view: 'gaps', title: 'AI tutors', snippet: 'Underserved' },
    )
    expect(patch.context_payload.target_market).toEqual({ country: 'Oman' })
    const list = patch.context_payload.content_insights as Array<Record<string, unknown>>
    expect(list).toHaveLength(2)
    expect(list[1]).toMatchObject({ source: 'market', view: 'gaps', title: 'AI tutors', snippet: 'Underserved' })
    expect(typeof list[1].added_at).toBe('string')
  })

  it('appendContentInsight starts a fresh list when none exists and caps at 20 keeping the newest', () => {
    expect((appendContentInsight({}, { view: 'hooks', title: 'h', snippet: '' }).context_payload.content_insights as unknown[])).toHaveLength(1)

    const full = Object.fromEntries(
      Array.from({ length: CONTENT_INSIGHTS_CAP }, (_, i) => [i, { source: 'market', view: 'gaps', title: `t${i}`, snippet: '', added_at: '' }]),
    )
    const patch = appendContentInsight({ content_insights: Object.values(full) }, { view: 'gaps', title: 'newest', snippet: '' })
    const list = patch.context_payload.content_insights as Array<Record<string, unknown>>
    expect(list).toHaveLength(CONTENT_INSIGHTS_CAP)
    expect(list[0].title).toBe('t1') // oldest dropped
    expect(list[list.length - 1].title).toBe('newest')
  })

  it('isInsightSaved detects a saved insight by view + title', () => {
    const ctx = { content_insights: [{ source: 'market', view: 'gaps', title: 'AI tutors', snippet: '', added_at: '' }] }
    expect(isInsightSaved(ctx, 'gaps', 'AI tutors')).toBe(true)
    expect(isInsightSaved(ctx, 'hooks', 'AI tutors')).toBe(false)
    expect(isInsightSaved({}, 'gaps', 'AI tutors')).toBe(false)
  })

  it('brief builder + filename', () => {
    const md = buildInsightBrief({ view: 'gaps', title: 'AI tutors', snippet: 'Underserved topic', angle: 'Comparison guide' })
    expect(md).toContain('# AI tutors')
    expect(md).toContain('Underserved topic')
    expect(md).toContain('Comparison guide')
    expect(insightBriefFilename('AI Tutors: Pricing!')).toMatch(/^content-brief-ai-tutors-pricing\.md$/)
    expect(insightBriefFilename('!!!')).toBe('content-brief-insight.md')
  })
})

// ── Component behaviour ───────────────────────────────────

const updateMutate = vi.fn()

vi.mock('@/features/campaigns/queries', () => ({
  useCampaigns: vi.fn(),
  useUpdateCampaign: vi.fn(),
}))

import { useCampaigns, useUpdateCampaign } from '@/features/campaigns/queries'
import { triggerDownload } from '@/shared/utils/download'

vi.mock('@/shared/utils/download', () => ({
  triggerDownload: vi.fn(),
}))

function buildCampaign(overrides: Partial<Campaign> = {}): Campaign {
  return {
    campaign_uuid: 'c1',
    brand: null,
    name: 'Summer Launch',
    status: 'in_progress',
    current_step: 'segmentation',
    language: 'en',
    total_budget: null,
    currency: 'USD',
    segmentation_completed: false,
    ppc_viability_completed: false,
    funnel_completed: false,
    content_strategy_completed: false,
    meta_ads_completed: false,
    google_ads_completed: false,
    linkedin_ads_completed: false,
    context_payload: {},
    summary: {},
    steps_count: 0,
    created_at: '',
    updated_at: '',
    ...overrides,
  } as Campaign
}

function mountActions(): VueWrapper {
  return mount(InsightItemActions, {
    props: { view: 'gaps' as const, title: 'AI tutors', snippet: 'Underserved topic with high demand' },
  })
}

describe('InsightItemActions — Add to Campaign', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    vi.mocked(useCampaigns).mockReturnValue({
      data: ref([
        buildCampaign({
          campaign_uuid: 'c1',
          name: 'Summer Launch',
          // Existing keys must survive the merge.
          context_payload: { target_market: { country: 'Oman' }, content_insights: [{ source: 'market', view: 'hooks', title: 'old hook', snippet: '', added_at: 'x' }] },
        }),
        buildCampaign({ campaign_uuid: 'c2', name: 'Winter Push' }),
      ]),
      isLoading: ref(false),
    } as never)
    vi.mocked(useUpdateCampaign).mockReturnValue({
      mutate: updateMutate,
      isPending: ref(false),
    } as never)
  })

  it('PATCHes the chosen campaign with a merged (not clobbered) content_insights list', async () => {
    const wrapper = mountActions()

    await wrapper.find('[data-testid="insight-add-btn"]').trigger('click')
    expect(wrapper.find('[data-testid="insight-campaign-modal"]').exists()).toBe(true)

    const options = wrapper.findAll('[data-testid="insight-campaign-option"]')
    expect(options).toHaveLength(2)
    expect(wrapper.text()).toContain('Summer Launch')

    await options[0].trigger('click')

    expect(updateMutate).toHaveBeenCalledTimes(1)
    const call = updateMutate.mock.calls[0][0]
    expect(call.uuid).toBe('c1')
    const ctx = call.payload.context_payload
    // Merge, not clobber: unrelated keys survive.
    expect(ctx.target_market).toEqual({ country: 'Oman' })
    // Append: the previous insight stays, the new one is added last.
    expect(ctx.content_insights).toHaveLength(2)
    expect(ctx.content_insights[0]).toMatchObject({ source: 'market', view: 'hooks', title: 'old hook' })
    expect(ctx.content_insights[1]).toMatchObject({ source: 'market', view: 'gaps', title: 'AI tutors', snippet: 'Underserved topic with high demand' })
    expect(typeof ctx.content_insights[1].added_at).toBe('string')
  })

  it('shows the success toast/badge after the PATCH succeeds', async () => {
    const wrapper = mountActions()

    await wrapper.find('[data-testid="insight-add-btn"]').trigger('click')
    await wrapper.findAll('[data-testid="insight-campaign-option"]')[0].trigger('click')

    // Simulate the real mutation wrapper invoking onSuccess.
    updateMutate.mock.calls[0][1].onSuccess()
    await flushPromises()

    expect(wrapper.find('[data-testid="insight-added-badge"]').exists()).toBe(true)
    expect(wrapper.find('[data-testid="insight-campaign-modal"]').exists()).toBe(false)
  })
})

describe('InsightItemActions — Generate Brief', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    vi.mocked(useCampaigns).mockReturnValue({ data: ref([]), isLoading: ref(false) } as never)
    vi.mocked(useUpdateCampaign).mockReturnValue({ mutate: updateMutate, isPending: ref(false) } as never)
  })

  it('renders the print-friendly brief with title, insight and angle, and copies it', async () => {
    const writeText = vi.fn().mockResolvedValue(undefined)
    Object.defineProperty(navigator, 'clipboard', { value: { writeText }, configurable: true })

    const wrapper = mountActions()

    await wrapper.find('[data-testid="insight-brief-btn"]').trigger('click')
    const modal = wrapper.find('[data-testid="insight-brief-modal"]')
    expect(modal.exists()).toBe(true)
    expect(wrapper.find('[data-testid="insight-brief-title"]').text()).toBe('AI tutors')
    expect(wrapper.find('[data-testid="insight-brief-summary"]').text()).toBe('Underserved topic with high demand')

    await wrapper.find('[data-testid="insight-brief-copy"]').trigger('click')
    await flushPromises()

    expect(writeText).toHaveBeenCalledTimes(1)
    expect(writeText.mock.calls[0][0]).toContain('# AI tutors')
    expect(wrapper.text()).toContain('Copied')
  })

  it('downloads the brief as a .md file', async () => {
    const wrapper = mountActions()

    await wrapper.find('[data-testid="insight-brief-btn"]').trigger('click')
    await wrapper.find('[data-testid="insight-brief-download"]').trigger('click')

    expect(vi.mocked(triggerDownload)).toHaveBeenCalledTimes(1)
    const [blob, filename] = vi.mocked(triggerDownload).mock.calls[0]
    expect(filename).toBe('content-brief-ai-tutors.md')
    expect(blob).toBeInstanceOf(Blob)
  })
})
