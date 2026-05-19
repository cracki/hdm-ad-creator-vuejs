<script setup lang="ts">
import { ref, watch, nextTick } from 'vue'
import { AlertTriangle, X } from 'lucide-vue-next'
import { useI18n } from '@/shared/utils/i18n'

const props = withDefaults(defineProps<{
  open: boolean
  title?: string
  description?: string
  confirmLabel?: string
  cancelLabel?: string
  destructive?: boolean
}>(), {
  title: '',
  description: '',
  confirmLabel: '',
  cancelLabel: '',
  destructive: false,
})

const emit = defineEmits<{
  confirm: []
  cancel: []
  'update:open': [value: boolean]
}>()

const { t } = useI18n()
const dialogRef = ref<HTMLElement | null>(null)
const previousFocusEl = ref<HTMLElement | null>(null)

watch(() => props.open, (val) => {
  document.body.style.overflow = val ? 'hidden' : ''
  if (val) {
    previousFocusEl.value = document.activeElement as HTMLElement
    nextTick(() => {
      const firstBtn = dialogRef.value?.querySelector('button')
      firstBtn?.focus()
    })
  } else {
    previousFocusEl.value?.focus()
  }
})

function handleConfirm() {
  emit('confirm')
  emit('update:open', false)
}

function handleCancel() {
  emit('cancel')
  emit('update:open', false)
}

function handleKeydown(e: KeyboardEvent) {
  if (e.key === 'Escape') {
    handleCancel()
    return
  }
  if (e.key !== 'Tab' || !dialogRef.value) return

  const focusable = dialogRef.value.querySelectorAll<HTMLElement>(
    'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
  )
  if (focusable.length === 0) return

  const first = focusable[0]
  const last = focusable[focusable.length - 1]

  if (e.shiftKey) {
    if (document.activeElement === first) {
      e.preventDefault()
      last.focus()
    }
  } else {
    if (document.activeElement === last) {
      e.preventDefault()
      first.focus()
    }
  }
}
</script>

<template>
  <Teleport to="body">
    <Transition name="dialog">
      <div v-if="open" class="fixed inset-0 z-50 flex items-center justify-center p-4" role="dialog" aria-modal="true" :aria-label="title">
        <div class="absolute inset-0 bg-black/60 backdrop-blur-sm" @click="handleCancel" />
        <div ref="dialogRef" class="relative surface-card w-full max-w-sm p-5 space-y-4 animate-scale-in" @keydown="handleKeydown">
          <button
            data-loc="confirm-dialog.close-btn"
            class="absolute top-3 end-3 h-10 w-10 grid place-items-center rounded-md hover:bg-overlay-medium text-muted-foreground"
            aria-label="Close"
            @click="handleCancel"
          >
            <X class="h-4 w-4" />
          </button>

          <div v-if="destructive" class="flex items-center gap-3">
            <div class="h-10 w-10 rounded-lg bg-destructive/15 grid place-items-center shrink-0">
              <AlertTriangle class="h-5 w-5 text-destructive" />
            </div>
            <div>
              <h3 class="font-semibold text-sm">{{ title }}</h3>
              <p v-if="description" class="text-xs text-muted-foreground mt-0.5">{{ description }}</p>
            </div>
          </div>

          <div v-else>
            <h3 class="font-semibold text-sm">{{ title }}</h3>
            <p v-if="description" class="text-xs text-muted-foreground mt-1">{{ description }}</p>
          </div>

          <div class="flex items-center justify-end gap-2 pt-1">
            <button
              data-loc="confirm-dialog.cancel-btn"
              class="h-9 px-3.5 rounded-lg border border-border/60 text-xs font-medium hover:bg-overlay-subtle transition"
              @click="handleCancel"
            >
              {{ cancelLabel || t('common.cancel') }}
            </button>
            <button
              data-loc="confirm-dialog.confirm-btn"
              :class="[
                'h-9 px-3.5 rounded-lg text-xs font-medium transition',
                destructive
                  ? 'bg-destructive text-white hover:bg-destructive/90'
                  : 'bg-[image:var(--gradient-brand)] text-primary-foreground',
              ]"
              @click="handleConfirm"
            >
              {{ confirmLabel || t('common.confirm') }}
            </button>
          </div>
        </div>
      </div>
    </Transition>
  </Teleport>
</template>

<style scoped>
.dialog-enter-active { transition: all 0.2s ease-out; }
.dialog-leave-active { transition: all 0.15s ease-in; }
.dialog-enter-from,
.dialog-leave-to { opacity: 0; }
.dialog-enter-from .surface-card,
.dialog-leave-to .surface-card { transform: scale(0.95); }
</style>
