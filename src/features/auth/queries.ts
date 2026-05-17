import { useMutation, useQueryClient } from '@tanstack/vue-query'
import { authApi } from './api'
import type { User } from './types'

export function useUpdateUser() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (payload: Partial<Pick<User, 'first_name' | 'last_name'>>) =>
      authApi.updateUser(payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['auth', 'user'] })
    },
  })
}
