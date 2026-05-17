import { useMutation, useQueryClient } from '@tanstack/vue-query'
import { fullFunnelApi } from './api'
import type { FullFunnelPayload } from './types'

export function useRunFullFunnel() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (payload: FullFunnelPayload) => fullFunnelApi.run(payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['campaigns'] })
    },
  })
}
