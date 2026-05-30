<script setup lang="ts">
import { onMounted, watch } from 'vue'
import { useRoute } from 'vue-router'
import AppSidebar from './Sidebar.vue'
import MobileBottomNav from './MobileBottomNav.vue'
import { useProductTour } from '@/shared/composables/useProductTour'
import { welcomeTour } from '@/features/auth/tours'
import { useVisualSettings } from '@/shared/composables/useVisualSettings'
import { useAuthStore } from '@/features/auth/store'

const { registerTour, autoStartForRoute, isActive, dismiss } = useProductTour()
const visualSettings = useVisualSettings()
const auth = useAuthStore()
const route = useRoute()

onMounted(() => {
  registerTour(welcomeTour)
  autoStartForRoute('__welcome__')
  if (auth.user) {
    visualSettings.initForUser(auth.user.user_uuid)
  }
})

watch(() => auth.user, (user) => {
  visualSettings.initForUser(user?.user_uuid)
})

watch(() => route.name, () => {
  if (isActive.value) dismiss()
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
