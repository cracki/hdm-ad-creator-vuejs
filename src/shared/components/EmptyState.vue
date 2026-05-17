<script setup lang="ts">
import type { Component } from 'vue'

withDefaults(defineProps<{
  icon?: Component
  title: string
  description?: string
  actionLabel?: string
  showAction?: boolean
}>(), {
  showAction: false,
  actionLabel: '',
  description: '',
})

defineEmits<{ action: [] }>()
</script>

<template>
  <div class="max-w-md mx-auto text-center surface-card p-6 sm:p-10 mt-12">
    <div
      v-if="icon"
      class="h-12 w-12 rounded-xl bg-[image:var(--gradient-brand)] grid place-items-center mx-auto mb-4 shadow-[var(--shadow-glow)]"
    >
      <component :is="icon" class="h-5 w-5 text-primary-foreground" />
    </div>
    <h2 class="font-semibold mb-1">{{ title }}</h2>
    <p v-if="description" class="text-sm text-muted-foreground mb-5">{{ description }}</p>
    <button
      v-if="showAction && actionLabel"
      data-loc="empty-state.action-btn"
      class="h-10 px-5 rounded-lg bg-[image:var(--gradient-brand)] text-primary-foreground text-xs font-medium shadow-[var(--shadow-glow)] flex items-center gap-1.5 mx-auto"
      @click="$emit('action')"
    >
      {{ actionLabel }}
    </button>
  </div>
</template>
