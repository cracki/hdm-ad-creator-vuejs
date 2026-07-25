<script setup lang="ts">
import { Info } from 'lucide-vue-next'

withDefaults(defineProps<{ text: string; label?: string }>(), { label: 'More information' })
</script>

<template>
  <span class="relative inline-flex group align-middle">
    <button
      type="button"
      :aria-label="label"
      class="text-muted-foreground/70 hover:text-foreground transition focus:outline-none focus-visible:ring-2 focus-visible:ring-primary/40 rounded-full inline-flex"
    >
      <Info class="h-3.5 w-3.5" />
    </button>
    <span
      role="tooltip"
      data-testid="info-tooltip-text"
      class="pointer-events-none absolute bottom-full left-1/2 -translate-x-1/2 mb-1.5 z-20 w-48 rounded-lg bg-overlay-strong border border-border/40 text-foreground text-[11px] leading-relaxed p-2 shadow-lg opacity-0 invisible group-hover:opacity-100 group-hover:visible group-focus-within:opacity-100 group-focus-within:visible transition"
    >
      {{ text }}
    </span>
  </span>
</template>
