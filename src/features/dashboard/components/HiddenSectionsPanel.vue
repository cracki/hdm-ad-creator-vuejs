<script setup lang="ts">
import { Plus, Eye } from 'lucide-vue-next'
import { useI18n } from '@/shared/utils/i18n'
import type { WidgetId } from '../types'
import { WIDGET_TITLES } from '../types'

const props = defineProps<{
  hiddenWidgets: WidgetId[]
}>()

const emit = defineEmits<{
  show: [id: WidgetId]
}>()

const { t } = useI18n()
</script>

<template>
  <div v-if="hiddenWidgets.length > 0" class="mb-4">
    <button
      class="inline-flex items-center gap-2 px-3 py-1.5 rounded-full surface-card text-xs font-medium text-muted-foreground hover:text-foreground hover:border-primary/40 transition cursor-pointer"
      data-loc="dashboard.hidden-panel-toggle"
      @click="undefined"
    >
      <Plus class="h-3.5 w-3.5" />
      {{ hiddenWidgets.length }} {{ t('dashboard.hiddenSections' as any) }}
    </button>
    <div class="flex flex-wrap gap-2 mt-2">
      <button
        v-for="id in hiddenWidgets"
        :key="id"
        class="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg surface-card text-xs font-medium hover:border-primary/40 transition cursor-pointer"
        @click="emit('show', id)"
      >
        <Eye class="h-3 w-3 text-muted-foreground" />
        {{ t(WIDGET_TITLES[id] as any) }}
      </button>
    </div>
  </div>
</template>
