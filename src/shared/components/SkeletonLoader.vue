<script setup lang="ts">
withDefaults(defineProps<{
  variant?: 'card' | 'text' | 'avatar' | 'row' | 'grid' | 'list'
  count?: number
  height?: string
}>(), {
  variant: 'card',
  count: 1,
  height: '',
})
</script>

<template>
  <!-- Card skeleton -->
  <template v-if="variant === 'card'">
    <div
      v-for="i in count"
      :key="i"
      class="surface-card p-5 space-y-3 shimmer"
      :style="height ? { height } : undefined"
    >
      <div class="flex items-center gap-3">
        <div class="h-10 w-10 rounded-xl bg-white/[0.06]" />
        <div class="flex-1 space-y-1.5">
          <div class="h-3 w-2/3 rounded bg-white/[0.06]" />
          <div class="h-2.5 w-1/2 rounded bg-white/[0.04]" />
        </div>
      </div>
      <div class="space-y-2">
        <div class="h-2.5 w-full rounded bg-white/[0.04]" />
        <div class="h-2.5 w-4/5 rounded bg-white/[0.04]" />
      </div>
      <div class="flex gap-2">
        <div class="h-6 w-16 rounded-full bg-white/[0.04]" />
        <div class="h-6 w-20 rounded-full bg-white/[0.04]" />
      </div>
    </div>
  </template>

  <!-- Text skeleton -->
  <template v-else-if="variant === 'text'">
    <div v-for="i in count" :key="i" class="space-y-2">
      <div class="h-3 w-full rounded bg-white/[0.06]" />
      <div class="h-3 w-4/5 rounded bg-white/[0.04]" />
      <div class="h-3 w-3/5 rounded bg-white/[0.04]" />
    </div>
  </template>

  <!-- Avatar skeleton -->
  <template v-else-if="variant === 'avatar'">
    <div v-for="i in count" :key="i" class="flex items-center gap-3">
      <div class="h-10 w-10 rounded-full bg-white/[0.06] shrink-0" />
      <div class="flex-1 space-y-1.5">
        <div class="h-3 w-1/2 rounded bg-white/[0.06]" />
        <div class="h-2.5 w-1/3 rounded bg-white/[0.04]" />
      </div>
    </div>
  </template>

  <!-- Row skeleton -->
  <template v-else-if="variant === 'row'">
    <div
      v-for="i in count"
      :key="i"
      class="flex items-center gap-3 py-3"
      :class="i < count ? 'border-b border-border/40' : ''"
    >
      <div class="h-8 w-8 rounded-lg bg-white/[0.06] shrink-0" />
      <div class="flex-1 space-y-1.5">
        <div class="h-3 w-2/3 rounded bg-white/[0.06]" />
        <div class="h-2.5 w-1/3 rounded bg-white/[0.04]" />
      </div>
      <div class="h-6 w-16 rounded-full bg-white/[0.04]" />
    </div>
  </template>

  <!-- Grid skeleton (campaign cards) -->
  <template v-else-if="variant === 'grid'">
    <div class="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
      <div
        v-for="i in count"
        :key="i"
        class="surface-card overflow-hidden shimmer"
        :style="height ? { height } : undefined"
      >
        <div class="p-4 border-b border-border/40 space-y-2">
          <div class="flex items-center justify-between">
            <div class="h-5 w-16 rounded bg-white/[0.06]" />
            <div class="h-6 w-6 rounded bg-white/[0.04]" />
          </div>
          <div class="h-4 w-3/4 rounded bg-white/[0.06]" />
          <div class="h-3 w-1/2 rounded bg-white/[0.04]" />
        </div>
        <div class="p-4 space-y-3">
          <div class="h-1.5 w-full rounded bg-white/[0.04]" />
          <div class="grid grid-cols-3 gap-2">
            <div class="h-12 rounded-lg bg-white/[0.04]" />
            <div class="h-12 rounded-lg bg-white/[0.04]" />
            <div class="h-12 rounded-lg bg-white/[0.04]" />
          </div>
        </div>
      </div>
    </div>
  </template>
</template>
