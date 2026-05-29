<script setup lang="ts">
import { Rocket, Sparkles, Lock, Check } from 'lucide-vue-next'

defineProps<{
  variant: 'welcome' | 'empty' | 'blocked' | 'completed'
  icon?: unknown
}>()
</script>

<template>
  <div class="relative h-28 w-28 mx-auto mb-4 grid place-items-center">
    <!-- Welcome: concentric rings -->
    <template v-if="variant === 'welcome'">
      <div class="absolute inset-0 rounded-full border-2 border-primary/20 animate-[pulse-ring_2s_ease-out_infinite]" />
      <div class="absolute inset-2 rounded-full border-2 border-primary/15 animate-[pulse-ring_2s_ease-out_0.6s_infinite]" />
      <div class="absolute inset-4 rounded-full border-2 border-primary/10 animate-[pulse-ring_2s_ease-out_1.2s_infinite]" />
      <div class="h-12 w-12 rounded-xl bg-[image:var(--gradient-brand)] grid place-items-center shadow-[var(--shadow-glow)] animate-float relative z-10">
        <component :is="icon ?? Rocket" class="h-5 w-5 text-primary-foreground" />
      </div>
    </template>

    <!-- Empty: subtle floating icon -->
    <template v-else-if="variant === 'empty'">
      <div class="absolute inset-2 rounded-full bg-overlay-subtle/50" />
      <div class="h-12 w-12 rounded-xl bg-[image:var(--gradient-brand)] grid place-items-center shadow-[var(--shadow-glow)] animate-float relative z-10">
        <component :is="icon ?? Sparkles" class="h-5 w-5 text-primary-foreground" />
      </div>
    </template>

    <!-- Blocked: pulsing lock -->
    <template v-else-if="variant === 'blocked'">
      <div class="absolute inset-2 rounded-full bg-accent-amber/10 animate-pulse-glow" />
      <div class="h-12 w-12 rounded-xl bg-accent-amber/20 border border-accent-amber/30 grid place-items-center relative z-10">
        <Lock class="h-5 w-5 text-accent-amber" />
      </div>
    </template>

    <!-- Completed: animated checkmark -->
    <template v-else-if="variant === 'completed'">
      <div class="absolute inset-2 rounded-full bg-success/10" />
      <div class="h-12 w-12 rounded-xl bg-success/20 border border-success/30 grid place-items-center relative z-10 animate-[bounce-in_0.5s_cubic-bezier(0.34,1.56,0.64,1)_both]">
        <Check class="h-5 w-5 text-success" />
      </div>
    </template>
  </div>
</template>
