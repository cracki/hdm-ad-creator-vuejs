import { useMutation, useQuery, useQueryClient } from '@tanstack/vue-query'
import { computed, type Ref } from 'vue'
import { fullFunnelApi } from './api'
import type { FullFunnelPayload } from './types'

export function useRunFullFunnel() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (payload: FullFunnelPayload) => fullFunnelApi.run(payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['campaigns'] })
      queryClient.invalidateQueries({ queryKey: ['full-funnel', 'history'] })
    },
  })
}

export function useFullFunnelHistory() {
  return useQuery({
    queryKey: ['full-funnel', 'history'],
    queryFn: () => fullFunnelApi.history().then(r => r.data),
  })
}

export function useFullFunnelHistoryDetail(uuid: Ref<string>) {
  return useQuery({
    queryKey: ['full-funnel', 'history', uuid],
    queryFn: () => fullFunnelApi.historyDetail(uuid.value).then(r => r.data),
    enabled: computed(() => !!uuid.value),
  })
}
