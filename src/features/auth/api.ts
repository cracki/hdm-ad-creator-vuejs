import apiClient from '@/shared/api/client'
import type { AuthTokens, LoginPayload, RegisterPayload, GoogleLoginPayload, User } from './types'

export const authApi = {
  login(payload: LoginPayload): Promise<{ data: AuthTokens }> {
    return apiClient.post('/auth/token/', payload)
  },

  register(payload: RegisterPayload): Promise<{ data: User }> {
    return apiClient.post('/auth/register/', payload)
  },

  refreshToken(refresh: string): Promise<{ data: AuthTokens }> {
    return apiClient.post('/auth/token/refresh/', { refresh })
  },

  getUser(): Promise<{ data: User }> {
    return apiClient.get('/auth/user/')
  },

  googleLogin(payload: GoogleLoginPayload): Promise<{ data: AuthTokens }> {
    return apiClient.post('/auth/google/', payload)
  },

  updateUser(payload: Partial<Pick<User, 'first_name' | 'last_name'>>): Promise<{ data: User }> {
    return apiClient.put('/auth/user/', payload)
  },
}
