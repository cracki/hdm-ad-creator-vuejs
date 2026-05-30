<script setup lang="ts">
import { ref } from 'vue'
import { Lightbulb, X } from 'lucide-vue-next'

defineProps<{ text: string }>()
const dismissed = ref(false)
</script>

<template>
  <div
    v-if="!dismissed"
    class="flex items-start gap-2 p-3 rounded-lg bg-info/10 border border-info/20 text-xs text-muted-foreground"
  >
    <Lightbulb class="h-3.5 w-3.5 text-info shrink-0 mt-0.5" />
    <span class="flex-1 leading-relaxed">{{ text }}</span>
    <button
      class="shrink-0 hover:text-foreground transition mt-0.5"
      aria-label="Dismiss tip"
      @click="dismissed = true"
    >
      <X class="h-3 w-3" />
    </button>
  </div>
</template>
