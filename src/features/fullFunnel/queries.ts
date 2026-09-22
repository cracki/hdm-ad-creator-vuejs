import { useMutation, useQuery, useQueryClient } from '@tanstack/vue-query'
import { computed, type Ref } from 'vue'
import { fullFunnelApi } from './api'
import type { FullFunnelPayload, FullFunnelGenerateVisualsPayload } from './types'

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

/** POST /campaigns/full-funnel/{uuid}/generate-visuals/ — image rendering (F2). */
export function useGenerateFullFunnelVisuals(uuid: Ref<string>) {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (payload: FullFunnelGenerateVisualsPayload) =>
      fullFunnelApi.generateVisuals(uuid.value, payload),
    onSuccess: () => {
      // The run GET returns visual_concepts enriched with image_url/visual_status.
      queryClient.invalidateQueries({ queryKey: ['full-funnel', 'history'] })
      queryClient.invalidateQueries({ queryKey: ['full-funnel', 'history', uuid] })
    },
  })
}
