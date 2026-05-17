<script setup lang="ts">
import { onMounted } from 'vue'
import AppSidebar from './Sidebar.vue'
import MobileBottomNav from './MobileBottomNav.vue'
import { useProductTour } from '@/shared/composables/useProductTour'

const { autoStart } = useProductTour()

onMounted(() => {
  autoStart()
})
</script>

<template>
  <div class="min-h-screen flex w-full bg-background text-foreground">
    <AppSidebar />
    <div class="flex-1 min-w-0 flex flex-col pb-16 lg:pb-0">
      <router-view />
    </div>
    <MobileBottomNav />
  </div>
</template>
