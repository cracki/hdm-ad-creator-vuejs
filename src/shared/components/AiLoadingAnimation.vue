<script setup lang="ts">
import { computed } from 'vue'
import { DotLottieVue } from '@lottiefiles/dotlottie-vue'
import { Loader2 } from 'lucide-vue-next'
import { useVisualSettings } from '@/shared/composables/useVisualSettings'
import { useTheme } from '@/shared/composables/useTheme'
import aiLoadingSrc from '@/assets/AI-Loading.lottie?url'

const props = withDefaults(defineProps<{
  message: string
  description?: string
  size?: 'sm' | 'md' | 'lg'
}>(), { size: 'md' })

const { settings } = useVisualSettings()
const { resolved } = useTheme()

const reducedMotion = computed(() => settings.value.reducedMotion)
const isLight = computed(() => resolved.value === 'light')

const sizeMap = { sm: '80px', md: '140px', lg: '200px' }
const sizePx = computed(() => sizeMap[props.size])
</script>

<template>
  <div class="flex flex-col items-center justify-center text-center gap-4 py-4">
    <div
      :style="{ width: sizePx, height: sizePx, maxWidth: sizePx, maxHeight: sizePx }"
      class="relative mx-auto"
      :class="{ 'lottie-light-adjust': isLight && !reducedMotion }"
    >
      <DotLottieVue
        v-if="!reducedMotion"
        autoplay
        loop
        :src="aiLoadingSrc"
        background-color="transparent"
        class="w-full h-full"
      />
      <Loader2
        v-else
        class="h-8 w-8 animate-spin text-primary absolute inset-0 m-auto"
      />
    </div>
    <div>
      <div class="text-sm font-medium">{{ message }}</div>
      <div v-if="description" class="text-xs text-muted-foreground mt-1">{{ description }}</div>
    </div>
  </div>
</template>

<style scoped>
.lottie-light-adjust {
  filter: brightness(0.85) contrast(1.1);
}
</style>
