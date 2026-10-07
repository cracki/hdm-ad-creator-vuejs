import axios from 'axios'
import type { AxiosInstance, InternalAxiosRequestConfig, AxiosResponse, AxiosError } from 'axios'
import { useAuthStore } from '@/features/auth/store'

const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:8000'

/**
 * Path of the JWT refresh endpoint (see src/features/auth/api.ts).
 *
 * QA4-P0 deadlock: a 401 returned by THIS endpoint must never trigger (or
 * await) another refresh. Previously the refresh request itself 401'd,
 * re-entered the response interceptor and awaited the still-pending refresh
 * promise — a circular await that never settled, so logout never ran and the
 * panel went black with the token still in sessionStorage.
 */
export const REFRESH_URL_PATH = '/auth/token/refresh/'

function isRefreshRequest(config?: InternalAxiosRequestConfig | null): boolean {
  return !!config?.url?.includes(REFRESH_URL_PATH)
}

function forceLogoutAndRedirect(): void {
  const auth = useAuthStore()
  auth.logout()
  window.location.href = '/login'
}

const apiClient: AxiosInstance = axios.create({
  baseURL: `${API_BASE_URL}/api/v1`,
  timeout: 60_000,
  headers: { 'Content-Type': 'application/json' },
})

export function withSignal(signal: AbortSignal) {
  return { signal }
}

apiClient.interceptors.request.use((config: InternalAxiosRequestConfig) => {
  const auth = useAuthStore()
  if (auth.accessToken) {
    config.headers.Authorization = `Bearer ${auth.accessToken}`
  }
  return config
})

apiClient.interceptors.response.use(
  (response: AxiosResponse) => response,
  async (error: AxiosError & { config?: InternalAxiosRequestConfig & { _retry?: boolean } }) => {
    const originalRequest = error.config

    // 1) The failed request IS the refresh call itself: the refresh token is
    //    dead (rotated/blacklisted). Log out immediately — never call or await
    //    another refresh here, otherwise this interceptor waits on its own
    //    pending refresh and deadlocks.
    if (error.response?.status === 401 && isRefreshRequest(originalRequest)) {
      forceLogoutAndRedirect()
      return Promise.reject(error)
    }

    // 2) Regular request: refresh once and retry. The single-flight guard
    //    lives in the auth store (module-level promise), so concurrent 401s
    //    here and the router guard's initAuth() share ONE refresh call.
    if (error.response?.status === 401 && originalRequest && !originalRequest._retry) {
      originalRequest._retry = true
      const auth = useAuthStore()
      try {
        const newToken = await auth.refreshAccessToken()
        originalRequest.headers.Authorization = `Bearer ${newToken}`
        return apiClient(originalRequest)
      } catch {
        forceLogoutAndRedirect()
        return Promise.reject(error)
      }
    }

    return Promise.reject(error)
  },
)

export { apiClient }
export default apiClient
