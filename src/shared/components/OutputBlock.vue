<script setup lang="ts">
import { Check, X, Pencil, Sparkles } from 'lucide-vue-next'

withDefaults(
  defineProps<{
    title?: string
    approveLabel?: string
    rejectLabel?: string
    editLabel?: string
    refineLabel?: string
  }>(),
  {
    approveLabel: 'Approve',
    rejectLabel: 'Reject',
    editLabel: 'Edit',
    refineLabel: 'Refine',
  },
)

const emit = defineEmits<{ approve: []; reject: []; edit: []; refine: [] }>()
</script>

<template>
  <div class="surface-card overflow-hidden">
    <div v-if="title" class="px-5 py-3 border-b border-border/30">
      <div data-testid="output-title" class="text-sm font-semibold">{{ title }}</div>
    </div>
    <div class="p-5">
      <slot />
    </div>
    <div class="flex flex-wrap items-center gap-2 px-5 py-3 border-t border-border/30 bg-overlay-subtle">
      <button
        data-testid="output-approve"
        class="h-8 px-3 rounded-lg bg-[image:var(--gradient-brand)] text-primary-foreground text-xs font-medium flex items-center gap-1.5"
        @click="emit('approve')"
      >
        <Check class="h-3.5 w-3.5" /> {{ approveLabel }}
      </button>
      <button
        data-testid="output-reject"
        class="h-8 px-3 rounded-lg border border-border/60 text-xs flex items-center gap-1.5 hover:bg-overlay-subtle transition"
        @click="emit('reject')"
      >
        <X class="h-3.5 w-3.5" /> {{ rejectLabel }}
      </button>
      <button
        data-testid="output-edit"
        class="h-8 px-3 rounded-lg border border-border/60 text-xs flex items-center gap-1.5 hover:bg-overlay-subtle transition"
        @click="emit('edit')"
      >
        <Pencil class="h-3.5 w-3.5" /> {{ editLabel }}
      </button>
      <button
        data-testid="output-refine"
        class="h-8 px-3 rounded-lg border border-border/60 text-xs flex items-center gap-1.5 hover:bg-overlay-subtle transition"
        @click="emit('refine')"
      >
        <Sparkles class="h-3.5 w-3.5" /> {{ refineLabel }}
      </button>
    </div>
  </div>
</template>
