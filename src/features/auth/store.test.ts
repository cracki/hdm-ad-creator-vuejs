import { describe, it, expect, vi, beforeEach } from 'vitest'
import { createPinia, setActivePinia } from 'pinia'

/**
 * QA4-P0: the module-level single-flight refresh guard. The backend rotates +
 * blacklists refresh tokens, so concurrent refreshes (router guard's initAuth
 * racing an API 401 interceptor refresh) would 401 the second call.
 */

const mocks = vi.hoisted(() => ({
  refreshToken: vi.fn(),
  getUser: vi.fn(),
}))

vi.mock('@/features/auth/api', () => ({
  authApi: {
    login: vi.fn(),
    register: vi.fn(),
    googleLogin: vi.fn(),
    refreshToken: mocks.refreshToken,
    getUser: mocks.getUser,
    updateUser: vi.fn(),
  },
}))

import { useAuthStore } from './store'
import { AUTH_TOKENS_KEY } from '@/shared/utils/constants'

function seedRefreshToken(value = 'refresh-token-1') {
  sessionStorage.setItem(AUTH_TOKENS_KEY, btoa(encodeURIComponent(value)))
}

beforeEach(() => {
  vi.clearAllMocks()
  sessionStorage.clear()
  setActivePinia(createPinia())
})

describe('auth store — single-flight refresh (QA4-P0)', () => {
  it('concurrent initAuth + refreshAccessToken share ONE authApi.refreshToken call', async () => {
    seedRefreshToken()
    mocks.refreshToken.mockResolvedValue({
      data: { access: 'new-access', refresh: 'refresh-token-2' },
    })
    mocks.getUser.mockResolvedValue({ data: { email: 'user@test.dev' } })

    const store = useAuthStore()
    await Promise.all([store.initAuth(), store.refreshAccessToken()])

    expect(mocks.refreshToken).toHaveBeenCalledTimes(1)
    expect(store.accessToken).toBe('new-access')
    expect(store.isInitialized).toBe(true)
  })

  it('clears the in-flight guard after a failure so a later refresh can retry', async () => {
    seedRefreshToken()
    mocks.refreshToken
      .mockRejectedValueOnce(new Error('refresh blacklisted'))
      .mockResolvedValueOnce({ data: { access: 'recovered-access', refresh: 'refresh-token-3' } })

    const store = useAuthStore()

    await expect(store.refreshAccessToken()).rejects.toThrow('refresh blacklisted')
    await expect(store.refreshAccessToken()).resolves.toBe('recovered-access')

    expect(mocks.refreshToken).toHaveBeenCalledTimes(2)
  })

  it('initAuth logs out and clears the stored refresh token when refresh fails', async () => {
    seedRefreshToken()
    mocks.refreshToken.mockRejectedValue(new Error('refresh blacklisted'))

    const store = useAuthStore()
    await store.initAuth()

    expect(store.accessToken).toBeNull()
    expect(store.user).toBeNull()
    expect(sessionStorage.getItem(AUTH_TOKENS_KEY)).toBeNull()
    expect(store.isInitialized).toBe(true)
  })
})
