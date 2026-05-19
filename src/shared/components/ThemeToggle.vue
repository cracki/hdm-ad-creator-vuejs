<script setup lang="ts">
import { Sun, Moon, Monitor } from 'lucide-vue-next'
import { useTheme, type ThemeMode } from '@/shared/composables/useTheme'

const { mode, setMode, cycle } = useTheme()

const options: { value: ThemeMode; icon: any; label: string }[] = [
  { value: 'auto', icon: Monitor, label: 'Auto' },
  { value: 'light', icon: Sun, label: 'Light' },
  { value: 'dark', icon: Moon, label: 'Dark' },
]
</script>

<template>
  <!-- Desktop: segmented control -->
  <div class="hidden sm:flex items-center gap-0.5 p-0.5 rounded-lg bg-overlay-subtle border border-border/60">
    <button
      v-for="opt in options"
      :key="opt.value"
      :aria-label="opt.label"
      :class="[
        'h-7 w-7 grid place-items-center rounded-md transition',
        mode === opt.value
          ? 'bg-overlay-medium text-foreground'
          : 'text-muted-foreground hover:text-foreground',
      ]"
      @click="setMode(opt.value)"
    >
      <component :is="opt.icon" class="h-3.5 w-3.5" />
    </button>
  </div>

  <!-- Mobile: single cycle button -->
  <button
    class="sm:hidden h-9 w-9 grid place-items-center rounded-lg hover:bg-overlay-light text-muted-foreground transition"
    aria-label="Toggle theme"
    @click="cycle"
  >
    <Sun v-if="mode === 'light'" class="h-4 w-4" />
    <Moon v-else-if="mode === 'dark'" class="h-4 w-4" />
    <Monitor v-else class="h-4 w-4" />
  </button>
</template>
