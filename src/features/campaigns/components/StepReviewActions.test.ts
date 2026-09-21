import { describe, it, expect, vi, beforeEach } from 'vitest'
import { mount, flushPromises, type VueWrapper } from '@vue/test-utils'
import { VueQueryPlugin } from '@tanstack/vue-query'
import StepReviewActions from './StepReviewActions.vue'

// The bar's mutations go through queries.ts → campaignsApi; mocking the api
// module keeps the real query hooks (loading state, invalidation) exercised.
vi.mock('../api', () => ({
  campaignsApi: {
    approveStep: vi.fn(),
    reviewStep: vi.fn(),
  },
}))

import { campaignsApi } from '../api'

function mountBar(
  props: Record<string, unknown> = {},
  runStep?: (feedback: string) => Promise<unknown>,
): VueWrapper {
  return mount(StepReviewActions, {
    props: {
      campaignUuid: 'c1',
      stepType: 'segmentation',
      runStep,
      ...props,
    },
    global: { plugins: [VueQueryPlugin] },
  })
}

describe('StepReviewActions — approve', () => {
  beforeEach(() => vi.clearAllMocks())

  it('calls the advancing approve endpoint and emits approved', async () => {
    vi.mocked(campaignsApi.approveStep).mockResolvedValue({
      data: { success: true, campaign: {} as never, step: {} as never },
    } as never)

    const wrapper = mountBar()
    await wrapper.find('[data-testid="step-approve"]').trigger('click')
    await flushPromises()

    expect(campaignsApi.approveStep).toHaveBeenCalledWith('c1', 'segmentation')
    expect(wrapper.emitted('approved')).toBeTruthy()
  })
})

describe('StepReviewActions — reject flow', () => {
  beforeEach(() => vi.clearAllMocks())

  it('requires a reason before submitting', async () => {
    const wrapper = mountBar()
    await wrapper.find('[data-testid="step-reject"]').trigger('click')

    expect(wrapper.find('[data-testid="reject-modal"]').exists()).toBe(true)

    await wrapper.find('[data-testid="reject-confirm-btn"]').trigger('click')
    expect(wrapper.find('[data-testid="reject-reason-error"]').exists()).toBe(true)
    expect(campaignsApi.reviewStep).not.toHaveBeenCalled()
  })

  it('submits the rejected decision with the category-prefilled reason', async () => {
    vi.mocked(campaignsApi.reviewStep).mockResolvedValue({
      data: { success: true, step: { review_status: 'rejected', reject_reason: 'Wrong audience' } as never },
    } as never)

    const wrapper = mountBar()
    await wrapper.find('[data-testid="step-reject"]').trigger('click')
    await wrapper.find('[data-testid="reject-category-audience"]').trigger('click')

    const textarea = wrapper.find('[data-testid="reject-reason-input"]').element as HTMLTextAreaElement
    expect(textarea.value).toBe('Wrong audience')

    await wrapper.find('[data-testid="reject-confirm-btn"]').trigger('click')
    await flushPromises()

    expect(campaignsApi.reviewStep).toHaveBeenCalledWith('c1', 'segmentation', {
      decision: 'rejected',
      reject_reason: 'Wrong audience',
    })
    expect(wrapper.emitted('rejected')).toBeTruthy()
    expect(wrapper.find('[data-testid="reject-modal"]').exists()).toBe(false)
  })
})

describe('StepReviewActions — refine flow', () => {
  beforeEach(() => vi.clearAllMocks())

  it('requires feedback, then re-runs the step with it and emits refined', async () => {
    const runStep = vi.fn().mockResolvedValue({})
    const wrapper = mountBar({}, runStep)

    await wrapper.find('[data-testid="step-refine"]').trigger('click')
    expect(wrapper.find('[data-testid="refine-modal"]').exists()).toBe(true)

    // Empty feedback is blocked.
    await wrapper.find('[data-testid="refine-confirm-btn"]').trigger('click')
    expect(wrapper.find('[data-testid="refine-feedback-error"]').exists()).toBe(true)
    expect(runStep).not.toHaveBeenCalled()

    await wrapper.find('[data-testid="refine-feedback-input"]').setValue('Focus on budget shoppers')
    await wrapper.find('[data-testid="refine-confirm-btn"]').trigger('click')
    await flushPromises()

    expect(runStep).toHaveBeenCalledWith('Focus on budget shoppers')
    expect(wrapper.emitted('refined')).toBeTruthy()
    expect(wrapper.find('[data-testid="refine-modal"]').exists()).toBe(false)
  })

  it('hides the refine action when no runStep is provided', () => {
    const wrapper = mountBar()
    expect(wrapper.find('[data-testid="step-refine"]').exists()).toBe(false)
  })
})

describe('StepReviewActions — review state restored from latest_steps', () => {
  beforeEach(() => vi.clearAllMocks())

  it('shows the approved badge for an approved step', () => {
    const wrapper = mountBar({ reviewStatus: 'approved' })
    expect(wrapper.find('[data-testid="step-status-approved"]').exists()).toBe(true)
    expect(wrapper.find('[data-testid="step-status-rejected"]').exists()).toBe(false)
  })

  it('shows the rejected badge and expands the persisted reason', async () => {
    const wrapper = mountBar({ reviewStatus: 'rejected', rejectReason: 'Wrong tone' })

    await wrapper.find('[data-testid="step-status-rejected"]').trigger('click')
    const reason = wrapper.find('[data-testid="step-reject-reason"]')
    expect(reason.exists()).toBe(true)
    expect(reason.text()).toBe('Wrong tone')
  })

  it('shows no badge for an unreviewed step', () => {
    const wrapper = mountBar({ reviewStatus: '' })
    expect(wrapper.find('[data-testid="step-status-approved"]').exists()).toBe(false)
    expect(wrapper.find('[data-testid="step-status-rejected"]').exists()).toBe(false)
  })
})
