<script setup lang="ts">
import ToastNotification from '@/shared/components/ToastNotification.vue'
import ErrorBoundary from '@/shared/components/ErrorBoundary.vue'
import DemoBanner from '@/shared/components/DemoBanner.vue'
import ProductTourOverlay from '@/shared/components/ProductTourOverlay.vue'
import ConfettiCelebration from '@/shared/components/ConfettiCelebration.vue'
</script>

<template>
  <DemoBanner />
  <ErrorBoundary>
    <router-view />
  </ErrorBoundary>
  <ToastNotification />
  <ConfettiCelebration />
  <ProductTourOverlay />
</template>
