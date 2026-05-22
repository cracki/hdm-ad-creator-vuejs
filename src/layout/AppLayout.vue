<script setup lang="ts">
import { onMounted, watch } from 'vue'
import AppSidebar from './Sidebar.vue'
import MobileBottomNav from './MobileBottomNav.vue'
import { useProductTour } from '@/shared/composables/useProductTour'
import { useVisualSettings } from '@/shared/composables/useVisualSettings'
import { useAuthStore } from '@/features/auth/store'

const { autoStart } = useProductTour()
const visualSettings = useVisualSettings()
const auth = useAuthStore()

onMounted(() => {
  autoStart()
  if (auth.user) {
    visualSettings.initForUser(auth.user.user_uuid)
  }
})

watch(() => auth.user, (user) => {
  visualSettings.initForUser(user?.user_uuid)
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
