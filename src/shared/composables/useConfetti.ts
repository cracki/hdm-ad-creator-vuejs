import { ref } from 'vue'

const active = ref(false)
let dismissTimer: ReturnType<typeof setTimeout> | undefined

export function useConfetti() {
  function trigger() {
    clearTimeout(dismissTimer)
    active.value = true
    dismissTimer = setTimeout(() => {
      active.value = false
    }, 3500)
  }

  function dismiss() {
    clearTimeout(dismissTimer)
    active.value = false
  }

  return { active, trigger, dismiss }
}
