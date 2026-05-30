<script setup lang="ts">
import { computed } from 'vue'
import { GripVertical, X } from 'lucide-vue-next'
import { useI18n } from '@/shared/utils/i18n'
import type { WidgetId } from '../types'
import { WIDGET_TITLES } from '../types'

const props = defineProps<{
  widgetId: WidgetId
  editMode: boolean
}>()

const emit = defineEmits<{
  hide: [id: WidgetId]
}>()

const { t } = useI18n()
const title = computed(() => t(WIDGET_TITLES[props.widgetId] as any))
</script>

<template>
  <section
    class="relative surface-card rounded-xl overflow-hidden transition-all duration-300"
    :class="{
      'ring-2 ring-dashed ring-primary/30': editMode,
    }"
    :data-loc="`dashboard.section-${widgetId}`"
  >
    <!-- Header (visible in edit mode or on hover) -->
    <div
      class="flex items-center gap-2 px-4 py-2 border-b border-overlay-subtle transition-opacity duration-200"
      :class="{
        'opacity-100': editMode,
        'opacity-0 hover:opacity-100 absolute inset-x-0 top-0 z-10 bg-surface/90 backdrop-blur-sm': !editMode,
      }"
    >
      <GripVertical
        v-if="editMode"
        class="h-4 w-4 text-muted-foreground cursor-grab active:cursor-grabbing shrink-0"
        data-drag-handle
      />
      <h3 class="text-sm font-semibold flex-1 truncate">{{ title }}</h3>
      <button
        v-if="editMode"
        class="h-6 w-6 rounded-md grid place-items-center hover:bg-destructive/10 text-muted-foreground hover:text-destructive transition-colors"
        :title="t('dashboard.hideSection' as any)"
        @click="emit('hide', widgetId)"
      >
        <X class="h-3.5 w-3.5" />
      </button>
    </div>

    <!-- Content -->
    <div class="p-4 sm:p-5">
      <slot />
    </div>
  </section>
</template>
