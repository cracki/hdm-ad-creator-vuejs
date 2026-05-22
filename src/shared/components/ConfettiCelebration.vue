<script setup lang="ts">
import { computed } from 'vue'
import { DotLottieVue } from '@lottiefiles/dotlottie-vue'
import { useConfetti } from '@/shared/composables/useConfetti'
import { useVisualSettings } from '@/shared/composables/useVisualSettings'
import confettiSrc from '@/assets/Confetti-Effects.lottie?url'

const { active, dismiss } = useConfetti()
const { settings } = useVisualSettings()

const reducedMotion = computed(() => settings.value.reducedMotion)
const visible = computed(() => active.value && !reducedMotion.value)

function onComplete() {
  dismiss()
}
</script>

<template>
  <Teleport to="body">
    <Transition name="confetti">
      <div
        v-if="visible"
        class="fixed inset-0 z-[99] pointer-events-none flex items-start justify-center pt-[10vh]"
      >
        <DotLottieVue
          autoplay
          :loop="false"
          :src="confettiSrc"
          background-color="transparent"
          style="width: 100%; max-width: 600px; height: 60vh"
          @complete="onComplete"
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
