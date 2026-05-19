<script setup lang="ts">
import { ref } from 'vue'
import { ImagePlus, Palette, StickyNote, Trash2, X } from 'lucide-vue-next'
import { useI18n } from '@/shared/utils/i18n'
import { useMoodBoard } from '@/shared/composables/useMoodBoard'
import { useToast } from '@/shared/composables/useToast'

const { t } = useI18n()
const toast = useToast()
const { items, addImage, addColor, addNote, removeItem, clearAll } = useMoodBoard()

const newNote = ref('')
const newColor = ref('#6d28d9')
const showNoteInput = ref(false)
const showColorInput = ref(false)

const fileInput = ref<HTMLInputElement | null>(null)

function handleFileUpload(e: Event) {
  const target = e.target as HTMLInputElement
  const file = target.files?.[0]
  if (file) {
    addImage(file).catch((err: Error) => {
      toast.error(err.message)
    })
  }
  target.value = ''
}

function handleDrop(e: DragEvent) {
  e.preventDefault()
  const file = e.dataTransfer?.files[0]
  if (file && file.type.startsWith('image/')) addImage(file)
}

function submitNote() {
  if (newNote.value.trim()) {
    addNote(newNote.value.trim())
    newNote.value = ''
    showNoteInput.value = false
  }
}

function submitColor() {
  addColor(newColor.value)
  showColorInput.value = false
}
</script>

<template>
  <div class="space-y-4">
    <!-- Toolbar -->
    <div class="flex flex-wrap items-center gap-2">
      <input
        ref="fileInput"
        type="file"
        accept="image/*"
        class="hidden"
        @change="handleFileUpload"
      />
      <button
        data-loc="mood-board.add-image-btn"
        class="h-9 px-3 rounded-lg border border-border/60 text-xs font-medium hover:bg-overlay-light transition flex items-center gap-1.5"
        @click="fileInput?.click()"
      >
        <ImagePlus class="h-3.5 w-3.5" /> {{ t('moodboard.addImage') }}
      </button>
      <button
        data-loc="mood-board.add-color-btn"
        :class="['h-9 px-3 rounded-lg border border-border/60 text-xs font-medium transition flex items-center gap-1.5', showColorInput ? 'bg-overlay-medium' : 'hover:bg-overlay-light']"
        @click="showColorInput = !showColorInput"
      >
        <Palette class="h-3.5 w-3.5" /> {{ t('moodboard.addColor') }}
      </button>
      <button
        data-loc="mood-board.add-note-btn"
        :class="['h-9 px-3 rounded-lg border border-border/60 text-xs font-medium transition flex items-center gap-1.5', showNoteInput ? 'bg-overlay-medium' : 'hover:bg-overlay-light']"
        @click="showNoteInput = !showNoteInput"
      >
        <StickyNote class="h-3.5 w-3.5" /> {{ t('moodboard.addNote') }}
      </button>
      <button
        v-if="items.length"
        data-loc="mood-board.clear-btn"
        class="h-9 px-3 rounded-lg border border-border/60 text-xs font-medium hover:bg-destructive/10 text-destructive transition flex items-center gap-1.5"
        @click="clearAll"
      >
        <Trash2 class="h-3.5 w-3.5" /> {{ t('moodboard.clear') }}
      </button>
    </div>

    <!-- Inline inputs -->
    <div v-if="showColorInput" class="flex items-center gap-2 p-3 surface-card max-w-xs">
      <input v-model="newColor" type="color" class="h-9 w-12 rounded cursor-pointer bg-transparent" />
      <span class="text-xs text-muted-foreground font-mono">{{ newColor }}</span>
      <button data-loc="mood-board.color-submit-btn" class="ms-auto h-7 px-2.5 rounded-md bg-[image:var(--gradient-brand)] text-primary-foreground text-xs" @click="submitColor">Add</button>
    </div>

    <div v-if="showNoteInput" class="flex items-center gap-2 p-3 surface-card max-w-sm">
      <input
        v-model="newNote"
        data-loc="mood-board.note-input"
        class="flex-1 h-9 px-3 rounded-lg bg-overlay-subtle border border-border/70 text-sm outline-none"
        placeholder="Type a note…"
        @keyup.enter="submitNote"
      />
      <button data-loc="mood-board.note-submit-btn" class="h-7 px-2.5 rounded-md bg-[image:var(--gradient-brand)] text-primary-foreground text-xs" @click="submitNote">Add</button>
    </div>

    <!-- Board -->
    <div
      class="relative min-h-[400px] surface-card overflow-auto"
      @dragover.prevent
      @drop="handleDrop"
    >
      <div v-if="items.length === 0" class="absolute inset-0 flex items-center justify-center text-sm text-muted-foreground/50">
        {{ t('moodboard.empty') }}
      </div>

      <div class="flex flex-wrap gap-3 p-4">
        <div
          v-for="item in items"
          :key="item.id"
          class="group relative rounded-lg overflow-hidden border border-border/40"
          :style="{
            width: item.type === 'color' ? '80px' : item.type === 'note' ? '180px' : '200px',
          }"
        >
          <!-- Image -->
          <img v-if="item.type === 'image'" :src="item.value" class="w-full h-36 object-cover" :alt="'Mood board item'" />
          <!-- Color -->
          <div v-if="item.type === 'color'" class="h-20 w-full" :style="{ backgroundColor: item.value }" />
          <div v-if="item.type === 'color'" class="px-2 py-1.5 text-[11px] font-mono text-muted-foreground text-center">{{ item.value }}</div>
          <!-- Note -->
          <div v-if="item.type === 'note'" class="p-3 bg-warning/10 text-sm leading-relaxed min-h-[80px]">{{ item.value }}</div>

          <!-- Delete -->
          <button
            data-loc="mood-board.delete-item-btn"
            class="absolute top-1.5 end-1.5 h-5 w-5 grid place-items-center rounded-full bg-black/60 text-white opacity-0 group-hover:opacity-100 transition"
            @click="removeItem(item.id)"
          >
            <X class="h-3 w-3" />
          </button>
        </div>
      </div>
    </div>
  </div>
</template>
