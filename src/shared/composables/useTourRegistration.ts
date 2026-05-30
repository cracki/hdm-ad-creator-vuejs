import { onMounted, onUnmounted } from 'vue'
import { useRoute } from 'vue-router'
import { useProductTour } from './useProductTour'
import type { TourDefinition } from './useProductTour'

export function useTourRegistration(tourDef: TourDefinition) {
  const { registerTour, unregisterTour, autoStartForRoute, startTour } = useProductTour()
  const route = useRoute()

  onMounted(() => {
    registerTour(tourDef)
    if (tourDef.autoStartOnFirstVisit) {
      autoStartForRoute(route.name as string)
    }
  })

  onUnmounted(() => {
    unregisterTour(tourDef.id)
  })

  return { startTour: () => startTour(tourDef.id) }
}
