import { describe, it, expect, vi, beforeEach } from 'vitest'
import { mount, flushPromises } from '@vue/test-utils'
import { createPinia } from 'pinia'
import { createRouter, createMemoryHistory, type Router } from 'vue-router'
import { VueQueryPlugin } from '@tanstack/vue-query'

/**
 * QA4-img5 (FE): the sidebar credits widget must show the REAL usage from
 * /credits/summary/ and fall back to the static text when the API fails.
 */

vi.mock('@/shared/api/credits', () => ({
  getCreditsSummary: vi.fn(),
}))

import Sidebar from './Sidebar.vue'
import { getCreditsSummary } from '@/shared/api/credits'
import { useI18n } from '@/shared/utils/i18n'

let router: Router

async function mountSidebar() {
  router = createRouter({
    history: createMemoryHistory(),
    routes: [{ path: '/:pathMatch(.*)*', component: { template: '<div />' } }],
  })
  await router.push('/dashboard')
  await router.isReady()

  return mount(Sidebar, {
    global: {
      plugins: [
        createPinia(),
        router,
        [
          VueQueryPlugin,
          {
            queryClientConfig: {
              defaultOptions: { queries: { retry: false, gcTime: 0 } },
            },
          },
        ],
      ],
    },
  })
}

describe('Sidebar — real AI credits display (QA4-img5)', () => {
  const { setLang } = useI18n()

  beforeEach(() => {
    vi.clearAllMocks()
    setLang('en')
  })

  it('renders "1,234 / 25,000 used" from the credits summary API', async () => {
    vi.mocked(getCreditsSummary).mockResolvedValue({ used_month: 1234, quota_month: 25000 })

    const wrapper = await mountSidebar()
    await flushPromises()
    await flushPromises()

    const usage = wrapper.find('[data-tour="credits-bar"] [data-testid="credits-usage"]')
    expect(usage.exists()).toBe(true)
    expect(usage.text()).toBe('1,234 / 25,000 used')
  })

  it('shows only the used number when the quota is null (unlimited)', async () => {
    vi.mocked(getCreditsSummary).mockResolvedValue({ used_month: 1234, quota_month: null })

    const wrapper = await mountSidebar()
    await flushPromises()
    await flushPromises()

    expect(wrapper.find('[data-tour="credits-bar"] [data-testid="credits-usage"]').text())
      .toBe('1,234 used')
  })

  it('falls back to the static display when the summary fetch fails', async () => {
    vi.mocked(getCreditsSummary).mockRejectedValue(new Error('network down'))

    const wrapper = await mountSidebar()
    await flushPromises()
    await flushPromises()

    expect(wrapper.find('[data-tour="credits-bar"] [data-testid="credits-usage"]').text())
      .toBe('12,480 / 25,000 used')
  })

  it('shows the build-version badge', async () => {
    vi.mocked(getCreditsSummary).mockResolvedValue({ used_month: 0, quota_month: 25000 })

    const wrapper = await mountSidebar()
    await flushPromises()

    const badge = wrapper.find('[data-testid="app-version"]')
    expect(badge.exists()).toBe(true)
    expect(badge.text().length).toBeGreaterThan(0)
  })
})
