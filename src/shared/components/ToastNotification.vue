<script setup lang="ts">
import { CheckCircle2, XCircle, AlertTriangle, Info, X } from 'lucide-vue-next'
import { useToast, type ToastType } from '@/shared/composables/useToast'

const { toasts, remove } = useToast()

const iconMap: Record<ToastType, typeof CheckCircle2> = {
  success: CheckCircle2,
  error: XCircle,
  warning: AlertTriangle,
  info: Info,
}

const colorMap: Record<ToastType, string> = {
  success: 'border-success/40 text-success',
  error: 'border-destructive/40 text-destructive',
  warning: 'border-warning/40 text-warning',
  info: 'border-info/40 text-info',
}
</script>

<template>
  <Teleport to="body">
    <div role="status" aria-live="polite" class="fixed top-4 end-4 z-[100] flex flex-col gap-2 max-w-sm w-full pointer-events-none">
      <TransitionGroup name="toast">
        <div
          v-for="toast in toasts"
          :key="toast.id"
          class="surface-card px-4 py-3 flex items-start gap-3 pointer-events-auto animate-scale-in"
          :class="colorMap[toast.type]"
        >
          <component :is="iconMap[toast.type]" class="h-4.5 w-4.5 shrink-0 mt-0.5" />
          <p class="flex-1 text-sm text-foreground leading-snug">{{ toast.message }}</p>
          <button
            data-loc="toast-notification.close-btn"
            class="h-6 w-6 grid place-items-center rounded-md hover:bg-overlay-medium transition shrink-0 text-muted-foreground"
            @click="remove(toast.id)"
          >
            <X class="h-3.5 w-3.5" />
          </button>
        </div>
      </TransitionGroup>
    </div>
  </Teleport>
</template>

<style>
html[dir="rtl"] .toast-enter-from {
  transform: translateX(-100%);
}
html[dir="rtl"] .toast-leave-to {
  transform: translateX(-50%);
}
</style>

<style scoped>
.toast-enter-active {
  transition: all 0.25s ease-out;
}
.toast-leave-active {
  transition: all 0.2s ease-in;
}
.toast-enter-from {
  opacity: 0;
  transform: translateX(100%);
}
.toast-leave-to {
  opacity: 0;
  transform: translateX(50%);
}
.toast-move {
  transition: transform 0.2s ease;
}
</style>
