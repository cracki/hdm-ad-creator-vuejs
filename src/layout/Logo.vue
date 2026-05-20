<script setup lang="ts">
import { RouterLink } from 'vue-router'
import { useTheme } from '@/shared/composables/useTheme'
import hdmLogo from '@/assets/hdm-logo.png'
import hdmLogoLight from '@/assets/hdm-logo-light.png'

const { isDark } = useTheme()
</script>

<template>
  <RouterLink to="/" class="flex items-center gap-2.5 group">
    <div class="relative">
      <img
        :src="isDark ? hdmLogoLight : hdmLogo"
        alt="HDM"
        class="h-8 w-8 rounded-lg object-cover shadow-[var(--shadow-glow)] transition-transform group-hover:scale-105"
      />
    </div>
    <div class="flex flex-col leading-none">
      <span class="font-display font-semibold text-sm tracking-tight">HDM</span>
      <span class="text-[11px] text-muted-foreground tracking-wider uppercase">Ad Creator</span>
    </div>
  </RouterLink>
</template>
