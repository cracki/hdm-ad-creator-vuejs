<script setup lang="ts">
import { useI18n, LANGS, type Lang } from '@/shared/utils/i18n'

const { lang, setLang } = useI18n()
</script>

<template>
  <div class="flex gap-1.5">
    <button
      v-for="l in LANGS"
      :key="l.code"
      @click="setLang(l.code as Lang)"
      :aria-label="l.native"
      :data-loc="`lang-switch.${l.code}`"
      :class="[
        'px-2 py-0.5 rounded text-xs transition min-h-[44px] min-w-[44px]',
        lang === l.code
          ? 'bg-overlay-medium text-foreground'
          : 'text-muted-foreground hover:bg-overlay-light',
      ]"
    >
      {{ l.label }}
    </button>
  </div>
</template>
