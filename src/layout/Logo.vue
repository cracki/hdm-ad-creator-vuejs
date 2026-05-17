<script setup lang="ts">
import { RouterLink } from 'vue-router'
import hdmLogo from '@/assets/hdm-logo.jpg'
</script>

<template>
  <RouterLink to="/" class="flex items-center gap-2.5 group">
    <div class="relative">
      <img
        :src="hdmLogo"
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
