<script setup lang="ts">
import { computed, ref, onMounted, onUnmounted, watch } from 'vue'
import { Loader2 } from 'lucide-vue-next'
import { useVisualSettings } from '@/shared/composables/useVisualSettings'
import { useTheme } from '@/shared/composables/useTheme'
import lottie from 'lottie-web'
import aiLoadingData from '@/assets/AI-Loading.json'

const props = withDefaults(defineProps<{
  message: string
  description?: string
  size?: 'sm' | 'md' | 'lg'
}>(), { size: 'md' })

const { settings } = useVisualSettings()
const { resolved } = useTheme()

const reducedMotion = computed(() => settings.value.reducedMotion)
const isLight = computed(() => resolved.value === 'light')
const containerRef = ref<HTMLDivElement>()

const sizeMap = { sm: '80px', md: '140px', lg: '200px' }
const sizePx = computed(() => sizeMap[props.size])

let anim: ReturnType<typeof lottie.loadAnimation> | null = null

function initAnimation() {
  if (!containerRef.value || reducedMotion.value) return
  anim?.destroy()
  anim = lottie.loadAnimation({
    container: containerRef.value,
    renderer: 'svg',
    loop: true,
    autoplay: true,
    animationData: aiLoadingData,
  })
}

onMounted(initAnimation)

watch(reducedMotion, (val) => {
  if (!val) initAnimation()
  else { anim?.destroy(); anim = null }
})

onUnmounted(() => { anim?.destroy(); anim = null })
</script>

<template>
  <div class="flex flex-col items-center justify-center text-center gap-4 py-4">
    <div
      ref="containerRef"
      :style="{ width: sizePx, height: sizePx, maxWidth: sizePx, maxHeight: sizePx }"
      class="relative mx-auto"
      :class="{ 'lottie-light-adjust': isLight && !reducedMotion }"
    >
      <Loader2
        v-if="reducedMotion"
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
