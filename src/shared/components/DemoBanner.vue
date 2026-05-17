<script setup lang="ts">
import { Eye, X } from 'lucide-vue-next'
import { useI18n } from '@/shared/utils/i18n'
import { useDemoMode } from '@/shared/composables/useDemoMode'

const { isDemo, disable } = useDemoMode()
const { t } = useI18n()
</script>

<template>
  <div
    v-if="isDemo"
    class="fixed top-0 inset-x-0 z-50 h-10 flex items-center justify-center gap-3 bg-[image:var(--gradient-brand)] text-primary-foreground text-xs font-medium"
  >
    <Eye class="h-3.5 w-3.5" />
    <span>{{ t('demo.banner') }}</span>
    <button
      data-loc="demo-banner.exit-btn"
      class="h-6 px-3 rounded-md bg-white/20 hover:bg-white/30 text-xs font-medium transition"
      @click="disable"
    >
      {{ t('demo.exit') }}
    </button>
    <button data-loc="demo-banner.close-btn" class="absolute end-3 h-6 w-6 grid place-items-center rounded-md hover:bg-white/20 transition" @click="disable">
      <X class="h-3.5 w-3.5" />
    </button>
  </div>
</template>
