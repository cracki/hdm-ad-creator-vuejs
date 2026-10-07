import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import type { User, AuthTokens } from './types'
import { authApi } from './api'
import { AUTH_TOKENS_KEY } from '@/shared/utils/constants'

function encodeToken(token: string): string {
  try {
    return btoa(encodeURIComponent(token))
  } catch {
    return token
  }
}

function decodeToken(encoded: string): string {
  try {
    return decodeURIComponent(atob(encoded))
  } catch {
    return encoded
  }
}

function getStoredRefresh(): string | null {
  try {
    const stored = sessionStorage.getItem(AUTH_TOKENS_KEY)
    return stored ? decodeToken(stored) : null
  } catch {
    return null
  }
}

function storeRefresh(refresh: string) {
  try {
    sessionStorage.setItem(AUTH_TOKENS_KEY, encodeToken(refresh))
  } catch {}
}

function clearStoredRefresh() {
  try {
    sessionStorage.removeItem(AUTH_TOKENS_KEY)
  } catch {}
}

/**
 * Module-level single-flight refresh (QA4-P0). The backend rotates and
 * blacklists refresh tokens, so concurrent refresh calls would 401 the second
 * one and deadlock the API client's 401 interceptor. initAuth (router guard),
 * the interceptor and any caller must share ONE refresh promise.
 */
let refreshInFlight: Promise<string> | null = null

/**
 * Single-flight init: concurrent router-guard invocations must not run the
 * refresh + fetchUser sequence twice.
 */
let initInFlight: Promise<void> | null = null

export const useAuthStore = defineStore('auth', () => {
  const accessToken = ref<string | null>(null)
  const user = ref<User | null>(null)
  const isInitialized = ref(false)

  const isAuthenticated = computed(() => !!accessToken.value && !!user.value)

  function setTokens(tokens: AuthTokens) {
    accessToken.value = tokens.access
    storeRefresh(tokens.refresh)
  }

  async function login(email: string, password: string) {
    const { data } = await authApi.login({ email, password })
    setTokens(data)
    await fetchUser()
  }

  async function register(payload: { email: string; password: string; first_name?: string; last_name?: string }) {
    await authApi.register(payload)
    await login(payload.email, payload.password)
  }

  async function googleLogin(idToken: string) {
    const { data } = await authApi.googleLogin({ id_token: idToken })
    setTokens(data)
    await fetchUser()
  }

  async function fetchUser() {
    const { data } = await authApi.getUser()
    user.value = data
  }

  async function requestNewAccessToken(): Promise<string> {
    const refresh = getStoredRefresh()
    if (!refresh) throw new Error('No refresh token')
    const { data } = await authApi.refreshToken(refresh)
    setTokens(data)
    return data.access
  }

  /** Single-flight: concurrent callers share one in-flight refresh. */
  function refreshAccessToken(): Promise<string> {
    if (!refreshInFlight) {
      refreshInFlight = requestNewAccessToken().finally(() => {
        refreshInFlight = null
      })
    }
    return refreshInFlight
  }

  function logout() {
    accessToken.value = null
    user.value = null
    clearStoredRefresh()
  }

  async function runInitAuth() {
    const refresh = getStoredRefresh()
    if (!refresh) {
      isInitialized.value = true
      return
    }
    try {
      await refreshAccessToken()
      await fetchUser()
    } catch {
      logout()
    }
    isInitialized.value = true
  }

  /** Single-flight so concurrent guard navigations share one init sequence. */
  function initAuth(): Promise<void> {
    if (!initInFlight) {
      initInFlight = runInitAuth().finally(() => {
        initInFlight = null
      })
    }
    return initInFlight
  }

  return {
    accessToken,
    user,
    isInitialized,
    isAuthenticated,
    login,
    register,
    googleLogin,
    logout,
    initAuth,
    refreshAccessToken,
    fetchUser,
  }
})
