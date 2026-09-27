import { describe, it, expect, vi, beforeEach } from 'vitest'
import { mount, flushPromises, type VueWrapper } from '@vue/test-utils'
import { VueQueryPlugin } from '@tanstack/vue-query'
import AdReviewCard from './AdReviewCard.vue'
import type { CampaignAd } from '../types'

// The card's mutations go through queries.ts → campaignsApi; mocking the api
// module keeps the real query hooks (loading state, invalidation) exercised.
vi.mock('../api', () => ({
  campaignsApi: {
    reviewAd: vi.fn(),
    patchAd: vi.fn(),
    refineAd: vi.fn(),
  },
}))

import { campaignsApi } from '../api'

function buildAd(overrides: Partial<CampaignAd> = {}): CampaignAd {
  return {
    campaign_ad_uuid: 'ad-1',
    campaign: 'c1',
    platform: 'meta',
    funnel_stage: 'TOFU',
    persona: 'Anna',
    funnel_context: {},
    data: { headline: 'Old Headline', body: 'Old body copy', cta: 'Shop Now' },
    review_status: null,
    reject_reason: null,
    reviewed_at: null,
    created_at: '',
    updated_at: '',
    ...overrides,
  } as CampaignAd
}

function mountCard(ad: CampaignAd = buildAd()): VueWrapper {
  return mount(AdReviewCard, {
    props: { ad, campaignUuid: 'c1' },
    slots: { default: '<div data-testid="card-body">card body</div>' },
    global: { plugins: [VueQueryPlugin] },
  })
}

describe('AdReviewCard — approve', () => {
  beforeEach(() => vi.clearAllMocks())

  it('calls reviewAd with the approved decision payload and emits the fresh ad', async () => {
    const approved = buildAd({ review_status: 'approved' })
    vi.mocked(campaignsApi.reviewAd).mockResolvedValue({
      data: { success: true, ad: approved },
    } as never)

    const wrapper = mountCard()
    await wrapper.find('[data-testid="output-approve"]').trigger('click')
    await flushPromises()

    expect(campaignsApi.reviewAd).toHaveBeenCalledWith('c1', 'ad-1', { decision: 'approved' })
    const emitted = wrapper.emitted('updated')
    expect(emitted).toBeTruthy()
    expect(emitted![0][0]).toMatchObject({ campaign_ad_uuid: 'ad-1', review_status: 'approved' })
  })
})

describe('AdReviewCard — reject flow', () => {
  beforeEach(() => vi.clearAllMocks())

  it('requires a reason before submitting', async () => {
    const wrapper = mountCard()
    await wrapper.find('[data-testid="output-reject"]').trigger('click')

    expect(wrapper.find('[data-testid="reject-modal"]').exists()).toBe(true)

    await wrapper.find('[data-testid="reject-confirm-btn"]').trigger('click')
    expect(wrapper.find('[data-testid="reject-reason-error"]').exists()).toBe(true)
    expect(campaignsApi.reviewAd).not.toHaveBeenCalled()
  })

  it('prefills the reason from a quick-reason category and submits it', async () => {
    const rejected = buildAd({ review_status: 'rejected', reject_reason: 'Wrong audience' })
    vi.mocked(campaignsApi.reviewAd).mockResolvedValue({
      data: { success: true, ad: rejected },
    } as never)

    const wrapper = mountCard()
    await wrapper.find('[data-testid="output-reject"]').trigger('click')
    await wrapper.find('[data-testid="reject-category-audience"]').trigger('click')

    const textarea = wrapper.find('[data-testid="reject-reason-input"]').element as HTMLTextAreaElement
    expect(textarea.value).toBe('Wrong audience')

    await wrapper.find('[data-testid="reject-confirm-btn"]').trigger('click')
    await flushPromises()

    expect(campaignsApi.reviewAd).toHaveBeenCalledWith('c1', 'ad-1', {
      decision: 'rejected',
      reject_reason: 'Wrong audience',
    })
    expect(wrapper.emitted('updated')![0][0]).toMatchObject({ review_status: 'rejected' })
    expect(wrapper.find('[data-testid="reject-modal"]').exists()).toBe(false)
  })
})

describe('AdReviewCard — reject → refine handoff (MOM 16.2)', () => {
  beforeEach(() => vi.clearAllMocks())

  it('opens the refine sheet prefilled with the reject reason and submits it', async () => {
    const rejected = buildAd({ review_status: 'rejected', reject_reason: 'Wrong tone' })
    vi.mocked(campaignsApi.reviewAd).mockResolvedValue({
      data: { success: true, ad: rejected },
    } as never)
    const refined = buildAd({ data: { headline: 'New Headline', body: 'New body', cta: 'Learn More' } })
    vi.mocked(campaignsApi.refineAd).mockResolvedValue({
      data: { success: true, campaign: {} as never, ad: refined, ads: [refined] },
    } as never)

    const wrapper = mountCard()
    await wrapper.find('[data-testid="output-reject"]').trigger('click')
    await wrapper.find('[data-testid="reject-category-tone"]').trigger('click')
    await wrapper.find('[data-testid="reject-confirm-btn"]').trigger('click')
    await flushPromises()

    // The refine sheet auto-opens with the reason prefilled.
    expect(wrapper.find('[data-testid="refine-modal"]').exists()).toBe(true)
    const textarea = wrapper.find('[data-testid="refine-feedback-input"]').element as HTMLTextAreaElement
    expect(textarea.value).toBe('Wrong tone')

    await wrapper.find('[data-testid="refine-confirm-btn"]').trigger('click')
    await flushPromises()
    expect(campaignsApi.refineAd).toHaveBeenCalledWith('c1', 'ad-1', { feedback: 'Wrong tone' })
  })

  it('closing the auto-opened refine sheet does not refine the ad', async () => {
    const rejected = buildAd({ review_status: 'rejected', reject_reason: 'Wrong audience' })
    vi.mocked(campaignsApi.reviewAd).mockResolvedValue({
      data: { success: true, ad: rejected },
    } as never)

    const wrapper = mountCard()
    await wrapper.find('[data-testid="output-reject"]').trigger('click')
    await wrapper.find('[data-testid="reject-category-audience"]').trigger('click')
    await wrapper.find('[data-testid="reject-confirm-btn"]').trigger('click')
    await flushPromises()

    expect(wrapper.find('[data-testid="refine-modal"]').exists()).toBe(true)
    await wrapper.find('[data-testid="refine-cancel-btn"]').trigger('click')
    await flushPromises()

    expect(wrapper.find('[data-testid="refine-modal"]').exists()).toBe(false)
    expect(campaignsApi.refineAd).not.toHaveBeenCalled()
  })
})

describe('AdReviewCard — refine flow', () => {
  beforeEach(() => vi.clearAllMocks())

  it('requires feedback, then calls refineAd and emits the regenerated ad', async () => {
    const refined = buildAd({
      data: { headline: 'New Headline', body: 'New body', cta: 'Learn More' },
    })
    vi.mocked(campaignsApi.refineAd).mockResolvedValue({
      data: { success: true, campaign: {} as never, ad: refined, ads: [refined] },
    } as never)

    const wrapper = mountCard()
    await wrapper.find('[data-testid="output-refine"]').trigger('click')

    // Empty feedback is blocked.
    await wrapper.find('[data-testid="refine-confirm-btn"]').trigger('click')
    expect(wrapper.find('[data-testid="refine-feedback-error"]').exists()).toBe(true)
    expect(campaignsApi.refineAd).not.toHaveBeenCalled()

    await wrapper.find('[data-testid="refine-feedback-input"]').setValue('Make it shorter')
    await wrapper.find('[data-testid="refine-confirm-btn"]').trigger('click')
    await flushPromises()

    expect(campaignsApi.refineAd).toHaveBeenCalledWith('c1', 'ad-1', { feedback: 'Make it shorter' })
    const emitted = wrapper.emitted('updated')
    expect(emitted).toBeTruthy()
    expect(emitted![0][0]).toMatchObject({ campaign_ad_uuid: 'ad-1' })
    expect(wrapper.find('[data-testid="refine-modal"]').exists()).toBe(false)
  })
})

describe('AdReviewCard — manual edit flow', () => {
  beforeEach(() => vi.clearAllMocks())

  it('opens the AdCopyEditor in edit mode and PATCHes only changed fields on save', async () => {
    const patched = buildAd({ data: { headline: 'New Headline', body: 'Old body copy', cta: 'Shop Now' } })
    vi.mocked(campaignsApi.patchAd).mockResolvedValue({
      data: { success: true, ad: patched },
    } as never)

    const wrapper = mountCard()
    await wrapper.find('[data-testid="output-edit"]').trigger('click')

    const editor = wrapper.find('[data-testid="ad-edit-editor"]')
    expect(editor.exists()).toBe(true)
    expect(wrapper.find('[data-loc="ad-copy-editor.headline-input"]').exists()).toBe(true)

    await wrapper.find('[data-loc="ad-copy-editor.headline-input"]').setValue('New Headline')
    // Editor starts in edit mode → its toggle button is "Save".
    await wrapper.find('[data-loc="ad-copy-editor.toggle-edit-btn"]').trigger('click')
    await flushPromises()

    expect(campaignsApi.patchAd).toHaveBeenCalledWith('c1', 'ad-1', { headline: 'New Headline' })
    expect(wrapper.emitted('updated')![0][0]).toMatchObject({ campaign_ad_uuid: 'ad-1' })
  })

  it('sends no PATCH when nothing changed (editor reset)', async () => {
    const wrapper = mountCard()
    await wrapper.find('[data-testid="output-edit"]').trigger('click')

    // Reset emits update with the untouched ad — no field changed, no request.
    await wrapper.find('[data-loc="ad-copy-editor.reset-btn"]').trigger('click')
    await flushPromises()

    expect(campaignsApi.patchAd).not.toHaveBeenCalled()
  })
})

describe('AdReviewCard — review state restored from the API', () => {
  beforeEach(() => vi.clearAllMocks())

  it('shows the approved badge for an approved ad', () => {
    const wrapper = mountCard(buildAd({ review_status: 'approved' }))
    expect(wrapper.find('[data-testid="ad-status-approved"]').exists()).toBe(true)
    expect(wrapper.find('[data-testid="ad-status-rejected"]').exists()).toBe(false)
  })

  it('shows the rejected badge and expands the persisted reason', async () => {
    const wrapper = mountCard(
      buildAd({ review_status: 'rejected', reject_reason: 'Wrong tone' }),
    )
    expect(wrapper.find('[data-testid="ad-reject-reason"]').exists()).toBe(false)

    await wrapper.find('[data-testid="ad-status-rejected"]').trigger('click')
    const reason = wrapper.find('[data-testid="ad-reject-reason"]')
    expect(reason.exists()).toBe(true)
    expect(reason.text()).toBe('Wrong tone')
  })

  it('shows no badge for an unreviewed ad', () => {
    const wrapper = mountCard(buildAd())
    expect(wrapper.find('[data-testid="ad-status-approved"]').exists()).toBe(false)
    expect(wrapper.find('[data-testid="ad-status-rejected"]').exists()).toBe(false)
  })
})
