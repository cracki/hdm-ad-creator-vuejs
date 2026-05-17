<script setup lang="ts">
import ToastNotification from '@/shared/components/ToastNotification.vue'
import ErrorBoundary from '@/shared/components/ErrorBoundary.vue'
import DemoBanner from '@/shared/components/DemoBanner.vue'
import ProductTourOverlay from '@/shared/components/ProductTourOverlay.vue'
</script>

<template>
  <DemoBanner />
  <ErrorBoundary>
    <router-view />
  </ErrorBoundary>
  <ToastNotification />
  <ProductTourOverlay />
</template>
