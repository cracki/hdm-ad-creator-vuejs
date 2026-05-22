<script setup lang="ts">
import { computed } from 'vue'
import Topbar from '@/layout/Topbar.vue'
import { useI18n } from '@/shared/utils/i18n'
import { useVisualSettings, type FontSizeLevel, type ContrastLevel } from '@/shared/composables/useVisualSettings'
import { RotateCcw, Type, Eye, Sparkles, Minimize, Accessibility } from 'lucide-vue-next'

const { t } = useI18n()
const { settings, setFontSize, setContrast, setFocusMode, setReducedMotion, setDyslexiaFont, resetAll } = useVisualSettings()

const fontSizes = computed<{ value: FontSizeLevel; label: string; preview: string }[]>(() => [
  { value: 'small', label: t('vsettings.fontSize.small'), preview: 'A' },
  { value: 'default', label: t('vsettings.fontSize.default'), preview: 'A' },
  { value: 'large', label: t('vsettings.fontSize.large'), preview: 'A' },
])

const contrastLevels = computed<{ value: ContrastLevel; label: string }[]>(() => [
  { value: 'default', label: t('vsettings.contrast.default') },
  { value: 'enhanced', label: t('vsettings.contrast.enhanced') },
  { value: 'maximum', label: t('vsettings.contrast.maximum') },
])
</script>

<template>
  <Topbar :title="t('nav.settings')" />
  <main class="flex-1 p-4 sm:p-6 overflow-y-auto">
    <div class="max-w-2xl mx-auto space-y-6 animate-[fade-up_0.4s_ease-out]">

      <p class="text-sm text-muted-foreground">{{ t('vsettings.description') }}</p>

      <!-- Typography -->
      <section class="surface-card p-4 sm:p-6 space-y-5">
        <div class="flex items-center gap-2.5">
          <div class="h-8 w-8 rounded-lg bg-primary/10 grid place-items-center">
            <Type class="h-4 w-4 text-primary" />
          </div>
          <h2 class="text-sm font-semibold">{{ t('vsettings.typography') }}</h2>
        </div>

        <!-- Font Size -->
        <div class="space-y-2.5">
          <span class="text-xs font-medium text-muted-foreground">{{ t('vsettings.fontSize') }}</span>
          <div class="flex gap-1 sm:gap-1.5 p-1 rounded-lg bg-overlay-subtle border border-border/60">
            <button
              v-for="opt in fontSizes"
              :key="opt.value"
              :class="[
                'flex-1 flex items-center justify-center gap-1 sm:gap-1.5 py-2 rounded-md text-xs font-medium transition focus-visible:outline-2 focus-visible:outline-primary focus-visible:outline-offset-1',
                settings.fontSize === opt.value
                  ? 'bg-overlay-medium text-foreground shadow-sm'
                  : 'text-muted-foreground hover:text-foreground',
              ]"
              :data-loc="`settings.font-size.${opt.value}`"
              @click="setFontSize(opt.value)"
            >
              <span :class="opt.value === 'small' ? 'text-[10px]' : opt.value === 'large' ? 'text-base' : 'text-xs'" class="font-bold">{{ opt.preview }}</span>
              <span class="sr-only sm:not-sr-only">{{ opt.label }}</span>
            </button>
          </div>
        </div>

        <!-- Dyslexia Font -->
        <div class="flex items-center justify-between gap-3 sm:gap-4">
          <div class="flex items-center gap-2.5 sm:gap-3 min-w-0">
            <div class="h-8 w-8 rounded-lg bg-accent-amber/10 grid place-items-center shrink-0">
              <Accessibility class="h-4 w-4 text-accent-amber" />
            </div>
            <div class="min-w-0">
              <div class="text-sm font-medium">{{ t('vsettings.dyslexiaFont') }}</div>
              <div class="text-[11px] text-muted-foreground line-clamp-2">{{ t('vsettings.dyslexiaFontDesc') }}</div>
            </div>
          </div>
          <button
            role="switch"
            :aria-checked="settings.dyslexiaFont"
            :data-loc="'settings.dyslexia-font'"
            :class="[
              'relative h-6 w-11 rounded-full transition-colors shrink-0 cursor-pointer focus-visible:outline-2 focus-visible:outline-primary focus-visible:outline-offset-2',
              settings.dyslexiaFont ? 'bg-primary' : 'bg-overlay-medium',
            ]"
            @click="setDyslexiaFont(!settings.dyslexiaFont)"
          >
            <span
              :class="[
                'absolute top-0.5 h-5 w-5 rounded-full bg-white shadow transition-transform',
                settings.dyslexiaFont ? 'start-[22px]' : 'start-0.5',
              ]"
            />
          </button>
        </div>
      </section>

      <!-- Readability -->
      <section class="surface-card p-4 sm:p-6 space-y-5">
        <div class="flex items-center gap-2.5">
          <div class="h-8 w-8 rounded-lg bg-accent-cyan/10 grid place-items-center">
            <Eye class="h-4 w-4 text-accent-cyan" />
          </div>
          <h2 class="text-sm font-semibold">{{ t('vsettings.readability') }}</h2>
        </div>

        <!-- Text Contrast -->
        <div class="space-y-2.5">
          <span class="text-xs font-medium text-muted-foreground">{{ t('vsettings.contrast') }}</span>
          <div class="flex gap-1 sm:gap-1.5 p-1 rounded-lg bg-overlay-subtle border border-border/60">
            <button
              v-for="opt in contrastLevels"
              :key="opt.value"
              :class="[
                'flex-1 py-2 rounded-md text-xs font-medium transition focus-visible:outline-2 focus-visible:outline-primary focus-visible:outline-offset-1',
                settings.contrast === opt.value
                  ? 'bg-overlay-medium text-foreground shadow-sm'
                  : 'text-muted-foreground hover:text-foreground',
              ]"
              :data-loc="`settings.contrast.${opt.value}`"
              @click="setContrast(opt.value)"
            >
              {{ opt.label }}
            </button>
          </div>
        </div>
      </section>

      <!-- Display -->
      <section class="surface-card p-4 sm:p-6 space-y-5">
        <div class="flex items-center gap-2.5">
          <div class="h-8 w-8 rounded-lg bg-accent-magenta/10 grid place-items-center">
            <Sparkles class="h-4 w-4 text-accent-magenta" />
          </div>
          <h2 class="text-sm font-semibold">{{ t('vsettings.display') }}</h2>
        </div>

        <!-- Focus Mode -->
        <div class="flex items-center justify-between gap-3 sm:gap-4">
          <div class="flex items-center gap-2.5 sm:gap-3 min-w-0">
            <Minimize class="h-4 w-4 text-muted-foreground shrink-0" />
            <div class="min-w-0">
              <div class="text-sm font-medium">{{ t('vsettings.focusMode') }}</div>
              <div class="text-[11px] text-muted-foreground line-clamp-2">{{ t('vsettings.focusModeDesc') }}</div>
            </div>
          </div>
          <button
            role="switch"
            :aria-checked="settings.focusMode"
            :data-loc="'settings.focus-mode'"
            :class="[
              'relative h-6 w-11 rounded-full transition-colors shrink-0 cursor-pointer focus-visible:outline-2 focus-visible:outline-primary focus-visible:outline-offset-2',
              settings.focusMode ? 'bg-primary' : 'bg-overlay-medium',
            ]"
            @click="setFocusMode(!settings.focusMode)"
          >
            <span
              :class="[
                'absolute top-0.5 h-5 w-5 rounded-full bg-white shadow transition-transform',
                settings.focusMode ? 'start-[22px]' : 'start-0.5',
              ]"
            />
          </button>
        </div>

        <!-- Reduced Motion -->
        <div class="flex items-center justify-between gap-3 sm:gap-4">
          <div class="flex items-center gap-2.5 sm:gap-3 min-w-0">
            <Minimize class="h-4 w-4 text-muted-foreground shrink-0" />
            <div class="min-w-0">
              <div class="text-sm font-medium">{{ t('vsettings.reducedMotion') }}</div>
              <div class="text-[11px] text-muted-foreground line-clamp-2">{{ t('vsettings.reducedMotionDesc') }}</div>
            </div>
          </div>
          <button
            role="switch"
            :aria-checked="settings.reducedMotion"
            :data-loc="'settings.reduced-motion'"
            :class="[
              'relative h-6 w-11 rounded-full transition-colors shrink-0 cursor-pointer focus-visible:outline-2 focus-visible:outline-primary focus-visible:outline-offset-2',
              settings.reducedMotion ? 'bg-primary' : 'bg-overlay-medium',
            ]"
            @click="setReducedMotion(!settings.reducedMotion)"
          >
            <span
              :class="[
                'absolute top-0.5 h-5 w-5 rounded-full bg-white shadow transition-transform',
                settings.reducedMotion ? 'start-[22px]' : 'start-0.5',
              ]"
            />
          </button>
        </div>
      </section>

      <!-- Reset -->
      <div class="flex justify-center pt-2 pb-4">
        <button
          class="flex items-center gap-2 px-4 py-2.5 text-xs text-muted-foreground hover:text-destructive rounded-lg hover:bg-destructive/5 transition"
          data-loc="settings.reset"
          @click="resetAll"
        >
          <RotateCcw class="h-3.5 w-3.5" />
          {{ t('vsettings.reset') }}
        </button>
      </div>

    </div>
  </main>
</template>
