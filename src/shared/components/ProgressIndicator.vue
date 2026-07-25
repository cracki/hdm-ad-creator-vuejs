<script setup lang="ts">
import { computed } from 'vue'
import { Check, X, Loader2 } from 'lucide-vue-next'

const props = withDefaults(
  defineProps<{
    stages: string[]
    currentIndex: number
    status?: 'running' | 'completed' | 'failed'
  }>(),
  { status: 'running' },
)

function stateFor(i: number): 'completed' | 'current' | 'upcoming' | 'failed' {
  if (props.status === 'completed') return 'completed'
  if (props.status === 'failed') {
    if (i < props.currentIndex) return 'completed'
    if (i === props.currentIndex) return 'failed'
    return 'upcoming'
  }
  if (i < props.currentIndex) return 'completed'
  if (i === props.currentIndex) return 'current'
  return 'upcoming'
}

const items = computed(() => props.stages.map((label, i) => ({ label, state: stateFor(i) })))
</script>

<template>
  <ol class="flex flex-wrap items-center gap-x-3 gap-y-2">
    <li
      v-for="(item, i) in items"
      :key="i"
      data-testid="progress-stage"
      :data-state="item.state"
      class="flex items-center gap-1.5 text-[11px]"
    >
      <span
        :class="[
          'h-4 w-4 rounded-full grid place-items-center shrink-0 border',
          item.state === 'completed' ? 'bg-success/15 border-success/50 text-success' :
          item.state === 'current' ? 'bg-primary/15 border-primary/50 text-primary' :
          item.state === 'failed' ? 'bg-destructive/15 border-destructive/50 text-destructive' :
          'bg-overlay-subtle border-border/50 text-muted-foreground',
        ]"
      >
        <Check v-if="item.state === 'completed'" class="h-2.5 w-2.5" />
        <X v-else-if="item.state === 'failed'" class="h-2.5 w-2.5" />
        <Loader2 v-else-if="item.state === 'current'" class="h-2.5 w-2.5 animate-spin" />
      </span>
      <span :class="item.state === 'upcoming' ? 'text-muted-foreground/60' : 'text-muted-foreground'">
        {{ item.label }}
      </span>
    </li>
  </ol>
</template>
