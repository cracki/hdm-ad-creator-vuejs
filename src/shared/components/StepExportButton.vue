<script setup lang="ts">
import { ref } from 'vue'
import { Download, FileText, Presentation, BarChart3 } from 'lucide-vue-next'

defineProps<{ disabled?: boolean }>()
const emit = defineEmits<{ (e: 'export', format: 'csv' | 'pdf' | 'pptx'): void }>()

const open = ref(false)

function pick(format: 'csv' | 'pdf' | 'pptx') {
  open.value = false
  emit('export', format)
}
</script>

<template>
  <div class="relative">
    <button
      :disabled="disabled"
      class="h-8 px-3 rounded-lg border border-border/60 text-xs flex items-center gap-1.5 hover:bg-overlay-subtle transition disabled:opacity-50"
      @click="open = !open"
    >
      <Download class="w-3.5 h-3.5" />
      <span>Export</span>
    </button>
    <div v-if="open" class="fixed inset-0 z-40" @click="open = false" />
    <div
      v-if="open"
      class="absolute end-0 top-full mt-1 z-50 min-w-[180px] max-w-[calc(100vw-2rem)] rounded-lg border border-border/40 bg-popover shadow-lg py-1"
    >
      <button class="w-full flex items-center gap-2 px-3 py-2 text-xs text-muted-foreground hover:text-foreground hover:bg-overlay-light transition" @click="pick('pdf')">
        <FileText class="w-3.5 h-3.5 text-red-400" />
        Download PDF
      </button>
      <button class="w-full flex items-center gap-2 px-3 py-2 text-xs text-muted-foreground hover:text-foreground hover:bg-overlay-light transition" @click="pick('pptx')">
        <Presentation class="w-3.5 h-3.5 text-orange-400" />
        Download PPT
      </button>
      <button class="w-full flex items-center gap-2 px-3 py-2 text-xs text-muted-foreground hover:text-foreground hover:bg-overlay-light transition" @click="pick('csv')">
        <BarChart3 class="w-3.5 h-3.5 text-green-400" />
        Download CSV
      </button>
    </div>
  </div>
</template>
