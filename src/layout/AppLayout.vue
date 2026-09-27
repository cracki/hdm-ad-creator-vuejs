<script setup lang="ts">
import { onMounted, watch } from 'vue'
import { useRoute } from 'vue-router'
import AppSidebar from './Sidebar.vue'
import MobileBottomNav from './MobileBottomNav.vue'
import { useProductTour } from '@/shared/composables/useProductTour'
import { welcomeTour } from '@/features/auth/tours'
import { useVisualSettings } from '@/shared/composables/useVisualSettings'
import { useAuthStore } from '@/features/auth/store'

const { registerTour, autoStartForRoute, isActive, stopTour } = useProductTour()
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

// Navigating away tears the tour down WITHOUT persisting completion — only
// an explicit dismissal (X / backdrop) or finishing marks it done (QA fix 4).
watch(() => route.name, () => {
  if (isActive.value) stopTour()
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
