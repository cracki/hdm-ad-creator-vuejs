<script setup lang="ts">
import { computed } from 'vue'

const props = defineProps<{
  data: Record<string, unknown>
}>()

interface TreeNode {
  key: string
  label: string
  value: unknown
  type: 'text' | 'list' | 'nested'
  children?: TreeNode[]
}

function formatLabel(key: string): string {
  return key
    .replace(/_/g, ' ')
    .replace(/([a-z])([A-Z])/g, '$1 $2')
    .replace(/^\w/, (c) => c.toUpperCase())
}

function classify(key: string, val: unknown): TreeNode {
  if (val === null || val === undefined) {
    return { key, label: formatLabel(key), value: '—', type: 'text' }
  }
  if (typeof val === 'boolean') {
    return { key, label: formatLabel(key), value: val ? 'Yes' : 'No', type: 'text' }
  }
  if (typeof val === 'number') {
    return { key, label: formatLabel(key), value: String(val), type: 'text' }
  }
  if (typeof val === 'string') {
    return { key, label: formatLabel(key), value: val, type: 'text' }
  }
  if (Array.isArray(val)) {
    if (val.length === 0) {
      return { key, label: formatLabel(key), value: [], type: 'list' }
    }
    if (typeof val[0] === 'string') {
      return { key, label: formatLabel(key), value: val as string[], type: 'list' }
    }
    return {
      key,
      label: formatLabel(key),
      value: val.map((v) => (typeof v === 'string' ? v : JSON.stringify(v, null, 2))),
      type: 'list',
    }
  }
  if (typeof val === 'object') {
    return {
      key,
      label: formatLabel(key),
      value: val,
      type: 'nested',
      children: Object.entries(val as Record<string, unknown>)
        .filter(([, v]) => v !== null && v !== undefined)
        .map(([k, v]) => classify(k, v)),
    }
  }
  return { key, label: formatLabel(key), value: String(val), type: 'text' }
}

const items = computed<TreeNode[]>(() => {
  if (!props.data || typeof props.data !== 'object') return []
  return Object.entries(props.data)
    .filter(([, v]) => v !== null && v !== undefined)
    .map(([key, value]) => classify(key, value))
})

const hasData = computed(() => items.value.length > 0)
</script>

<template>
  <div v-if="hasData" class="space-y-3">
    <div v-for="item in items" :key="item.key">
      <!-- Nested section -->
      <template v-if="item.type === 'nested' && item.children">
        <div class="rounded-lg border border-border/30 bg-white/[0.015] p-3.5 space-y-2">
          <div class="text-xs font-semibold text-foreground">{{ item.label }}</div>
          <div class="space-y-1.5 ps-1">
            <template v-for="child in item.children" :key="child.key">
              <div v-if="child.type === 'text'" class="flex items-start gap-2">
                <span class="text-[11px] text-muted-foreground/60 min-w-[110px] shrink-0">{{ child.label }}</span>
                <span class="text-xs text-muted-foreground whitespace-pre-wrap leading-relaxed">{{ child.value }}</span>
              </div>
              <div v-else-if="child.type === 'list'" class="space-y-1">
                <div class="text-[11px] text-muted-foreground/60">{{ child.label }}</div>
                <ul class="space-y-0.5">
                  <li
                    v-for="(entry, i) in (child.value as string[])"
                    :key="i"
                    class="text-xs text-muted-foreground flex items-start gap-1.5"
                  >
                    <span class="h-1 w-1 rounded-full bg-primary/60 mt-1.5 shrink-0" />
                    {{ entry }}
                  </li>
                </ul>
              </div>
              <div v-else-if="child.type === 'nested'" class="space-y-1 ps-2 border-s-2 border-border/20">
                <div class="text-[11px] text-muted-foreground/60 font-medium">{{ child.label }}</div>
                <div v-for="sub in child.children" :key="sub.key" class="text-xs flex items-start gap-2">
                  <span class="text-muted-foreground/50 min-w-[100px] shrink-0">{{ sub.label }}</span>
                  <span class="text-muted-foreground">
                    <template v-if="Array.isArray(sub.value)">{{ (sub.value as string[]).join(', ') }}</template>
                    <template v-else>{{ sub.value != null ? sub.value : '—' }}</template>
                  </span>
                </div>
              </div>
            </template>
          </div>
        </div>
      </template>

      <!-- Top-level text -->
      <template v-else-if="item.type === 'text'">
        <div class="flex items-start gap-2">
          <span class="text-[11px] text-muted-foreground/60 min-w-[110px] shrink-0">{{ item.label }}</span>
          <span class="text-xs text-muted-foreground whitespace-pre-wrap leading-relaxed">{{ item.value }}</span>
        </div>
      </template>

      <!-- Top-level list -->
      <template v-else-if="item.type === 'list'">
        <div>
          <div class="text-[11px] text-muted-foreground/60 mb-1">{{ item.label }}</div>
          <ul class="space-y-0.5">
            <li
              v-for="(entry, i) in (item.value as string[])"
              :key="i"
              class="text-xs text-muted-foreground flex items-start gap-1.5"
            >
              <span class="h-1 w-1 rounded-full bg-primary/60 mt-1.5 shrink-0" />
              {{ entry }}
            </li>
          </ul>
        </div>
      </template>
    </div>
  </div>
</template>
