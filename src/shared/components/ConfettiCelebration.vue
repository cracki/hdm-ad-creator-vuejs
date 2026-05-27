<script setup lang="ts">
import { computed, ref, onMounted, onUnmounted, watch } from 'vue'
import { useConfetti } from '@/shared/composables/useConfetti'
import { useVisualSettings } from '@/shared/composables/useVisualSettings'
import lottie from 'lottie-web'
import confettiData from '@/assets/Confetti.json'

const { active, dismiss } = useConfetti()
const { settings } = useVisualSettings()

const reducedMotion = computed(() => settings.value.reducedMotion)
const visible = computed(() => active.value && !reducedMotion.value)
const containerRef = ref<HTMLDivElement>()

let anim: ReturnType<typeof lottie.loadAnimation> | null = null

function initAnimation() {
  if (!containerRef.value) return
  anim?.destroy()
  anim = lottie.loadAnimation({
    container: containerRef.value,
    renderer: 'svg',
    loop: false,
    autoplay: true,
    animationData: confettiData,
  })
  anim.addEventListener('complete', onComplete)
}

function cleanupAnimation() {
  if (anim) {
    anim.removeEventListener('complete', onComplete)
    anim.destroy()
    anim = null
  }
}

function onComplete() {
  cleanupAnimation()
  dismiss()
}

onMounted(() => {
  if (visible.value) initAnimation()
})

watch(visible, (val) => {
  if (val) initAnimation()
  else cleanupAnimation()
}, { flush: 'post' })

onUnmounted(cleanupAnimation)
</script>

<template>
  <Teleport to="body">
    <Transition name="confetti">
      <div
        v-if="visible"
        class="fixed inset-0 z-[99] pointer-events-none flex items-start justify-center pt-[10vh]"
      >
        <div
          ref="containerRef"
          style="width: 100%; max-width: 600px; height: 60vh"
        />
      </div>
    </Transition>
  </Teleport>
</template>

<style>
.confetti-enter-active {
  transition: opacity 0.3s ease-out;
}
.confetti-leave-active {
  transition: opacity 0.5s ease-in;
}
.confetti-enter-from,
.confetti-leave-to {
  opacity: 0;
}
</style>
