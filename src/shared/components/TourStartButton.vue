<script setup lang="ts">
import { HelpCircle } from 'lucide-vue-next'
import { useProductTour } from '@/shared/composables/useProductTour'
import { useI18n } from '@/shared/utils/i18n'

defineProps<{ tourId: string }>()
const { startTour, isActive, activeTourId } = useProductTour()
const { t } = useI18n()
</script>

<template>
  <button
    class="h-8 w-8 grid place-items-center rounded-lg hover:bg-overlay-light text-muted-foreground hover:text-foreground transition"
    :class="{ 'text-primary': isActive && activeTourId === tourId }"
    :title="t('tour.startTour' as any)"
    @click="startTour(tourId)"
  >
    <HelpCircle class="h-4 w-4" />
  </button>
</template>
