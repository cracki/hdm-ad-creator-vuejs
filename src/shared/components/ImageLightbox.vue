<script setup lang="ts">
import { watch, onBeforeUnmount } from 'vue'
import { X } from 'lucide-vue-next'
import { useI18n } from '@/shared/utils/i18n'

// Full-screen image preview. Rendered when `src` is non-empty; closes on
// ESC, backdrop click, or the close button (emits `close`). Mobile-first:
// the image is sized to the viewport (max 90vw/85vh) and letterboxed with
// object-contain so no part of it is cropped.
const props = defineProps<{
  src: string | null
  alt?: string
  caption?: string
}>()

const emit = defineEmits<{
  close: []
}>()

const { t } = useI18n()

function close() {
  emit('close')
}

function handleKeydown(e: KeyboardEvent) {
  if (e.key === 'Escape') close()
}

// ESC closes from anywhere (focus may sit on the trigger, not the dialog).
watch(
  () => props.src,
  (src) => {
    if (src) {
      document.addEventListener('keydown', handleKeydown)
      document.body.style.overflow = 'hidden'
    } else {
      document.removeEventListener('keydown', handleKeydown)
      document.body.style.overflow = ''
    }
  },
  { immediate: true },
)

onBeforeUnmount(() => {
  document.removeEventListener('keydown', handleKeydown)
  document.body.style.overflow = ''
})
</script>

<template>
  <Teleport to="body">
    <div
      v-if="src"
      class="fixed inset-0 z-[60] flex flex-col items-center justify-center p-4"
      role="dialog"
      aria-modal="true"
      :aria-label="alt || t('common.close')"
      data-testid="image-lightbox"
    >
      <div class="absolute inset-0 bg-black/80 backdrop-blur-sm" data-testid="image-lightbox-backdrop" @click="close" />
      <img
        :src="src"
        :alt="alt || ''"
        class="relative max-w-[92vw] sm:max-w-[85vw] max-h-[80vh] object-contain rounded-lg shadow-2xl"
        data-testid="image-lightbox-img"
      />
      <div
        v-if="caption"
        class="relative mt-3 max-w-[92vw] sm:max-w-xl text-center text-xs text-white/80 line-clamp-2"
        data-testid="image-lightbox-caption"
      >
        {{ caption }}
      </div>
      <button
        class="absolute top-3 end-3 h-10 w-10 grid place-items-center rounded-md bg-black/50 hover:bg-black/70 text-white transition"
        :aria-label="t('common.close')"
        data-testid="image-lightbox-close"
        @click="close"
      >
        <X class="h-5 w-5" />
      </button>
    </div>
  </Teleport>
</template>
