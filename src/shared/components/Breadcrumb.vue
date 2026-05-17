<script setup lang="ts">
import { ChevronLeft } from 'lucide-vue-next'
import { useI18n } from '@/shared/utils/i18n'

export interface BreadcrumbItem {
  label: string
  to?: string
}

withDefaults(defineProps<{
  items: BreadcrumbItem[]
  showBack?: boolean
  backTo?: string
}>(), {
  showBack: false,
  backTo: '',
})

const { dir } = useI18n()
</script>

<template>
  <nav class="flex items-center gap-1.5 text-xs text-muted-foreground mb-4 min-w-0" :dir="dir">
    <router-link
      v-if="showBack && backTo"
      :to="backTo"
      class="h-9 w-9 grid place-items-center rounded-md hover:bg-white/[0.06] transition shrink-0"
    >
      <ChevronLeft class="h-4 w-4 rtl-flip" />
    </router-link>

    <div class="flex items-center gap-1.5 min-w-0 truncate">
      <template v-for="(item, i) in items" :key="i">
        <router-link
          v-if="item.to"
          :to="item.to"
          class="hover:text-foreground transition truncate"
        >
          {{ item.label }}
        </router-link>
        <span v-else :class="i === items.length - 1 ? 'text-foreground font-medium truncate' : 'truncate'">
          {{ item.label }}
        </span>
        <span v-if="i < items.length - 1" class="text-border mx-0.5 shrink-0">/</span>
      </template>
    </div>
  </nav>
</template>

<style scoped>
.rtl-flip {
  html.rtl & {
    transform: scaleX(-1);
  }
}

@media (max-width: 640px) {
  a {
    min-height: unset;
  }
}
</style>
