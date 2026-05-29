<script setup lang="ts">
import { Check } from 'lucide-vue-next'

defineProps<{
  index: number
  title: string
  description?: string
  completed?: boolean
}>()
</script>

<template>
  <div class="flex items-start gap-3 py-2">
    <div
      class="h-6 w-6 rounded-full grid place-items-center shrink-0 text-xs font-bold transition-colors"
      :class="completed
        ? 'bg-success/15 border border-success/40 text-success'
        : 'bg-overlay-subtle border border-border/60 text-muted-foreground'"
    >
      <Check v-if="completed" class="h-3 w-3" />
      <span v-else>{{ index }}</span>
    </div>
    <div class="min-w-0">
      <div class="text-sm font-medium leading-snug">{{ title }}</div>
      <div v-if="description" class="text-xs text-muted-foreground mt-0.5">{{ description }}</div>
    </div>
  </div>
</template>
