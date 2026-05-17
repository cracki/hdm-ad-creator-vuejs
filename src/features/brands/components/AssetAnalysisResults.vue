<script setup lang="ts">
defineProps<{
  data: Record<string, unknown>
}>()
</script>

<template>
  <div class="space-y-1.5">
    <template v-for="(value, key) in data" :key="String(key)">
      <div class="flex items-start gap-2">
        <span class="text-primary font-medium shrink-0">{{ String(key) }}:</span>
        <span v-if="value === null || value === undefined" class="text-muted-foreground italic">null</span>
        <span v-else-if="typeof value === 'boolean'" class="text-accent-cyan">{{ value }}</span>
        <span v-else-if="typeof value === 'number'" class="text-accent-amber">{{ value }}</span>
        <span v-else-if="typeof value === 'string'" class="text-foreground/80 break-all">{{ value }}</span>
        <div v-else-if="Array.isArray(value)" class="flex-1 space-y-1 ps-2 border-s border-border/40">
          <div v-for="(item, i) in value" :key="i">
            <template v-if="typeof item === 'object' && item !== null">
              <AssetAnalysisResults :data="item as Record<string, unknown>" />
            </template>
            <span v-else class="text-foreground/80">{{ item }}</span>
          </div>
        </div>
        <div v-else-if="typeof value === 'object'" class="flex-1 ps-2 border-s border-border/40">
          <AssetAnalysisResults :data="value as Record<string, unknown>" />
        </div>
      </div>
    </template>
  </div>
</template>
