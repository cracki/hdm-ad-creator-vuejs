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

  async function refreshAccessToken(): Promise<string> {
    const refresh = getStoredRefresh()
    if (!refresh) throw new Error('No refresh token')
    const { data } = await authApi.refreshToken(refresh)
    setTokens(data)
    return data.access
  }

  function logout() {
    accessToken.value = null
    user.value = null
    clearStoredRefresh()
  }

  async function initAuth() {
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
