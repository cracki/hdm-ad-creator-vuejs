<script setup lang="ts">
import { Lightbulb } from 'lucide-vue-next'
import { useDashboardInsights } from '../composables/useDashboardInsights'

const { currentMessage } = useDashboardInsights()
</script>

<template>
  <div
    v-if="currentMessage"
    class="surface-card p-3 sm:p-4 mb-6 flex items-center gap-3 border-s-4 border-s-accent-amber"
    data-loc="dashboard.ai-insight"
  >
    <div class="h-8 w-8 rounded-lg bg-accent-amber/15 grid place-items-center shrink-0">
      <Lightbulb class="h-4 w-4 text-accent-amber" />
    </div>
    <p class="text-sm text-muted-foreground flex-1">{{ currentMessage }}</p>
  </div>
</template>
