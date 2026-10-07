import { describe, it, expect, vi, beforeEach } from 'vitest'
import { AxiosError, type AxiosResponse, type InternalAxiosRequestConfig } from 'axios'

/**
 * QA4-P0 regression tests for the 401 handler in client.ts.
 *
 * The old implementation deadlocked: the refresh request's own 401 re-entered
 * the interceptor which awaited the still-pending refresh promise (circular
 * await), so logout never ran and the panel went black.
 */

const mockAuth = vi.hoisted(() => ({
  accessToken: 'stale-access-token' as string | null,
  logout: vi.fn(),
  refreshAccessToken: vi.fn(),
}))

vi.mock('@/features/auth/store', () => ({
  useAuthStore: vi.fn(() => mockAuth),
}))

import apiClient from '@/shared/api/client'

type Responder = (config: InternalAxiosRequestConfig) => { status: number; data?: unknown }

let respond: Responder
// Snapshots taken at adapter time — the retry mutates the original config
// object, so holding the reference would show the new token for both calls.
const seenRequests: { url: string; auth?: string }[] = []

// Minimal axios adapter: answers from `respond` and throws AxiosError with a
// response attached for non-2xx, mimicking the XHR adapter.
const adapter = vi.fn(async (config: InternalAxiosRequestConfig): Promise<AxiosResponse> => {
  seenRequests.push({ url: config.url ?? '', auth: authHeader(config) })
  const { status, data } = respond(config)
  const response: AxiosResponse = {
    data: data ?? {},
    status,
    statusText: status < 400 ? 'OK' : 'Error',
    headers: {},
    config,
  }
  if (status >= 400) {
    throw new AxiosError('Request failed', String(status), config, null, response)
  }
  return response
})

function authHeader(config: InternalAxiosRequestConfig | undefined): string | undefined {
  if (!config) return undefined
  const headers = config.headers as unknown as
    | { get?: (k: string) => string | undefined; Authorization?: string }
  return headers?.get ? headers.get('Authorization') : headers?.Authorization
}

beforeEach(() => {
  vi.clearAllMocks()
  seenRequests.length = 0
  mockAuth.accessToken = 'stale-access-token'
  apiClient.defaults.adapter = adapter
  // jsdom does not implement navigation; replace location so the redirect
  // performed by the interceptor can be asserted.
  Object.defineProperty(window, 'location', {
    value: { href: 'http://localhost:3000/dashboard' },
    writable: true,
    configurable: true,
  })
})

describe('apiClient 401 handling — refresh deadlock regression (QA4-P0)', () => {
  it('401 on the refresh endpoint itself logs out and redirects WITHOUT calling refreshAccessToken again', async () => {
    respond = () => ({ status: 401, data: { detail: 'token is invalid or expired' } })

    await expect(
      apiClient.post('/auth/token/refresh/', { refresh: 'stale-refresh' }),
    ).rejects.toMatchObject({ status: 401 })

    expect(mockAuth.refreshAccessToken).not.toHaveBeenCalled()
    expect(mockAuth.logout).toHaveBeenCalledTimes(1)
    expect(window.location.href).toBe('/login')
  })

  it('401 on a normal API + successful refresh retries the request once with the new token', async () => {
    let thingsCalls = 0
    respond = (config) => {
      if (config.url?.includes('/things/')) {
        thingsCalls += 1
        return thingsCalls === 1
          ? { status: 401, data: { detail: 'expired' } }
          : { status: 200, data: { ok: true } }
      }
      return { status: 401 }
    }
    // The real store persists the new tokens before returning the access token.
    mockAuth.refreshAccessToken.mockImplementation(async () => {
      mockAuth.accessToken = 'brand-new-token'
      return 'brand-new-token'
    })

    const res = await apiClient.get('/things/')

    expect(res.status).toBe(200)
    expect(mockAuth.refreshAccessToken).toHaveBeenCalledTimes(1)
    expect(thingsCalls).toBe(2)
    expect(seenRequests[0]).toMatchObject({ url: '/things/', auth: 'Bearer stale-access-token' })
    expect(seenRequests[1]).toMatchObject({ url: '/things/', auth: 'Bearer brand-new-token' })
  })

  it('401 on a normal API + failing refresh settles: logout + redirect + rejection (no infinite await)', async () => {
    // Reproduce the real shape of the deadlock: refreshAccessToken itself makes
    // the refresh call through apiClient, and the backend answers 401 —
    // previously this circularly awaited its own refresh promise forever.
    mockAuth.refreshAccessToken.mockImplementation(() =>
      apiClient.post('/auth/token/refresh/', { refresh: 'blacklisted' }).then((r) => r.data.access),
    )
    respond = (config) => {
      if (config.url?.includes('/auth/token/refresh/')) {
        return { status: 401, data: { detail: 'blacklisted' } }
      }
      return { status: 401, data: { detail: 'expired' } }
    }

    await expect(apiClient.get('/things/')).rejects.toMatchObject({ status: 401 })

    expect(mockAuth.logout).toHaveBeenCalled()
    expect(window.location.href).toBe('/login')
  }, 2000)
})
