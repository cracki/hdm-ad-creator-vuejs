<script setup lang="ts">
import { ref, computed, onMounted, onUnmounted, defineAsyncComponent, type Component } from 'vue'
import { Settings, RotateCcw } from 'lucide-vue-next'
import draggable from 'vuedraggable'
import Topbar from '@/layout/Topbar.vue'
import { useI18n } from '@/shared/utils/i18n'
import { useToast } from '@/shared/composables/useToast'
import { useDashboardLayout } from '../composables/useDashboardLayout'
import type { WidgetId } from '../types'
import DashboardSectionWrapper from '../components/DashboardSectionWrapper.vue'
import DashboardHeroSection from '../components/DashboardHeroSection.vue'
import AIInsightBar from '../components/AIInsightBar.vue'
import HiddenSectionsPanel from '../components/HiddenSectionsPanel.vue'

const CampaignPerformanceSection = defineAsyncComponent(() => import('../components/CampaignPerformanceSection.vue'))
const BrandHealthSection = defineAsyncComponent(() => import('../components/BrandHealthSection.vue'))
const ContentIntelligenceSection = defineAsyncComponent(() => import('../components/ContentIntelligenceSection.vue'))
const AdGenerationSection = defineAsyncComponent(() => import('../components/AdGenerationSection.vue'))
const CompetitivePositioningMap = defineAsyncComponent(() => import('../components/CompetitivePositioningMap.vue'))
const ActivityTimeline = defineAsyncComponent(() => import('../components/ActivityTimeline.vue'))
const QuickActionsSection = defineAsyncComponent(() => import('../components/QuickActionsSection.vue'))

const { t } = useI18n()
const toast = useToast()
const {
  orderedWidgets,
  hiddenWidgets,
  hiddenCount,
  reorder,
  hide,
  show,
  reset,
} = useDashboardLayout()

const editMode = ref(false)
let editTimer: ReturnType<typeof setTimeout> | null = null

const WIDGET_COMPONENTS: Record<WidgetId, Component> = {
  'campaign-performance': CampaignPerformanceSection,
  'brand-health': BrandHealthSection,
  'content-intelligence': ContentIntelligenceSection,
  'ad-generation': AdGenerationSection,
  'competitive-map': CompetitivePositioningMap,
  'activity-timeline': ActivityTimeline,
  'quick-actions': QuickActionsSection,
}

const draggableList = computed({
  get: () => orderedWidgets.value as string[],
  set: (val: string[]) => reorder(val as WidgetId[]),
})

function toggleEditMode() {
  editMode.value = !editMode.value
  resetEditTimer()
}

function resetEditTimer() {
  if (editTimer) clearTimeout(editTimer)
  if (editMode.value) {
    editTimer = setTimeout(() => { editMode.value = false }, 30000)
  }
}

function handleReset() {
  reset()
  editMode.value = false
  toast.success(t('dashboard.resetSuccess' as any))
}

function handleHide(id: WidgetId) {
  hide(id)
}

function handleShow(id: WidgetId) {
  show(id)
}

onMounted(() => {
  document.addEventListener('click', onDocClick)
})

onUnmounted(() => {
  document.removeEventListener('click', onDocClick)
  if (editTimer) clearTimeout(editTimer)
})

function onDocClick(e: MouseEvent) {
  const target = e.target as HTMLElement
  if (editMode.value && !target.closest('[data-dashboard]')) {
    editMode.value = false
  }
}
</script>

<template>
  <Topbar
    :title="t('dashboard.title')"
    :subtitle="t('dashboard.subtitle')"
  >
    <template #actions>
      <div class="flex items-center gap-2" data-dashboard>
        <button
          class="h-8 px-3 rounded-lg text-xs font-medium flex items-center gap-1.5 transition-colors"
          :class="editMode ? 'bg-primary/15 text-primary' : 'surface-card text-muted-foreground hover:text-foreground'"
          @click="toggleEditMode"
        >
          <Settings class="h-3.5 w-3.5" />
          {{ t('dashboard.customize' as any) }}
        </button>
        <button
          v-if="editMode || hiddenCount > 0"
          class="h-8 px-3 rounded-lg text-xs font-medium flex items-center gap-1.5 surface-card text-muted-foreground hover:text-foreground transition-colors"
          @click="handleReset"
        >
          <RotateCcw class="h-3.5 w-3.5" />
          {{ t('dashboard.resetLayout' as any) }}
        </button>
      </div>
    </template>
  </Topbar>

  <main class="flex-1 p-4 sm:p-6 overflow-y-auto" data-dashboard>
    <!-- Hero Section (always visible, not draggable) -->
    <DashboardHeroSection />
    <AIInsightBar />

    <!-- Hidden Sections Recovery Panel -->
    <HiddenSectionsPanel
      :hidden-widgets="hiddenWidgets"
      @show="handleShow"
    />

    <!-- Draggable Widget Grid -->
    <draggable
      v-model="draggableList"
      :item-key="(item: string) => item"
      handle="[data-drag-handle]"
      class="space-y-4"
      ghost-class="opacity-30"
      :animation="200"
    >
      <template #item="{ element }">
        <DashboardSectionWrapper
          :widget-id="element as WidgetId"
          :edit-mode="editMode"
          @hide="handleHide"
        >
          <component
            :is="WIDGET_COMPONENTS[element as WidgetId]"
            v-if="WIDGET_COMPONENTS[element as WidgetId]"
          />
        </DashboardSectionWrapper>
      </template>
    </draggable>
  </main>
</template>
