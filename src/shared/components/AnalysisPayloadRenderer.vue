<script setup lang="ts">
import { computed } from 'vue'
import { sanitizeHtml } from '@/shared/utils/sanitize'
import { Check, X } from 'lucide-vue-next'
import {
  FileText, BarChart3,
  Users, Heart, Lightbulb, Target, Globe, Brain,
  Shield, Zap, TrendingUp, MessageSquare, Award,
  AlertTriangle, Sparkles,
} from 'lucide-vue-next'

const props = defineProps<{
  data: Record<string, unknown>
  depth?: number
}>()

const depth = computed(() => props.depth ?? 0)

const ICON_MAP: Record<string, any> = {
  audience: Users,
  brand: Globe,
  voice: MessageSquare,
  emotion: Heart,
  personality: Users,
  competitive: BarChart3,
  recommendation: Lightbulb,
  quality: Shield,
  score: Target,
  target: Target,
  insight: Lightbulb,
  social: Brain,
  strength: Zap,
  weakness: AlertTriangle,
  opportunity: TrendingUp,
  advantage: Award,
  messaging: MessageSquare,
  strategy: Sparkles,
  persona: Users,
  segment: Users,
}

function pickIcon(key: string) {
  const lower = key.toLowerCase()
  for (const [pattern, icon] of Object.entries(ICON_MAP)) {
    if (lower.includes(pattern)) return icon
  }
  return FileText
}

function formatLabel(key: string): string {
  return key
    .replace(/_/g, ' ')
    .replace(/([a-z])([A-Z])/g, '$1 $2')
    .replace(/^\w/, (c) => c.toUpperCase())
}

function sanitize(val: string): string {
  return sanitizeHtml(val)
}

interface RenderItem {
  key: string
  label: string
  value: unknown
  type: 'text' | 'list' | 'tags' | 'score' | 'nested' | 'object_list'
  children?: RenderItem[]
  items?: any[]
  scoreMax?: number
}

function classify(key: string, val: unknown): RenderItem {
  if (val === null || val === undefined) {
    return { key, label: formatLabel(key), value: val, type: 'text' }
  }

  if (typeof val === 'boolean') {
    return { key, label: formatLabel(key), value: val, type: 'text' }
  }

  if (typeof val === 'number') {
    const label = formatLabel(key).toLowerCase()
    if (label.includes('score') || label.includes('rating') || label.includes('confidence')) {
      const max = label.includes('confidence') ? 100 : undefined
      return { key, label: formatLabel(key), value: val, type: 'score', scoreMax: max }
    }
    return { key, label: formatLabel(key), value: String(val), type: 'text' }
  }

  if (typeof val === 'string') {
    return { key, label: formatLabel(key), value: sanitize(val), type: 'text' }
  }

  if (Array.isArray(val)) {
    if (val.length === 0) {
      return { key, label: formatLabel(key), value: [], type: 'tags' }
    }
    if (typeof val[0] === 'object' && val[0] !== null) {
      return { key, label: formatLabel(key), value: val, type: 'object_list', items: val }
    }
    const strings = val.map((v) =>
      typeof v === 'string' ? sanitize(v)
        : typeof v === 'object' && v !== null ? sanitize(JSON.stringify(v))
        : String(v)
    )
    const allShort = strings.every((v) => v.length < 60)
    return {
      key,
      label: formatLabel(key),
      value: strings,
      type: allShort ? 'tags' : 'list',
    }
  }

  if (typeof val === 'object') {
    const entries = Object.entries(val as Record<string, unknown>)
      .filter(([, v]) => v !== null && v !== undefined)

    const children = entries.map(([k, v]) => classify(k, v))

    return { key, label: formatLabel(key), value: val, type: 'nested', children }
  }

  return { key, label: formatLabel(key), value: String(val), type: 'text' }
}

const items = computed<RenderItem[]>(() => {
  if (!props.data || typeof props.data !== 'object') return []
  return Object.entries(props.data)
    .filter(([, v]) => v !== null && v !== undefined)
    .map(([key, value]) => classify(key, value))
})

type RenderGroup = { type: 'item'; item: RenderItem } | { type: 'scores'; items: RenderItem[] }

const grouped = computed<RenderGroup[]>(() => {
  const result: RenderGroup[] = []
  let scoreBuf: RenderItem[] = []
  for (const item of items.value) {
    if (item.type === 'score') {
      scoreBuf.push(item)
    } else {
      if (scoreBuf.length) {
        result.push({ type: 'scores', items: scoreBuf })
        scoreBuf = []
      }
      result.push({ type: 'item', item })
    }
  }
  if (scoreBuf.length) result.push({ type: 'scores', items: scoreBuf })
  return result
})

function scoreColor(val: number, max?: number): string {
  const pct = max ? val / max : val <= 10 ? val / 10 : val / 100
  if (pct >= 0.7) return 'text-success'
  if (pct >= 0.4) return 'text-amber-400'
  return 'text-destructive'
}

function scoreBarWidth(val: number, max?: number): string {
  if (max) return `${Math.min(Math.max((val / max) * 100, 0), 100)}%`
  return `${Math.min(Math.max(val * 10, 0), 100)}%`
}

function scoreMaxLabel(item: RenderItem): string {
  if (item.scoreMax) return `/${item.scoreMax}`
  return '/10'
}

function getObjectTitle(obj: Record<string, unknown>): string | null {
  for (const key of ['name', 'title', 'persona_name', 'action', 'heading', 'label']) {
    if (typeof obj[key] === 'string' && (obj[key] as string).length > 0) return obj[key] as string
  }
  return null
}

function filterMetaFields(obj: Record<string, unknown>): Record<string, unknown> {
  const titleKey = ['name', 'title', 'persona_name', 'action', 'heading', 'label'].find(k => typeof obj[k] === 'string')
  const filtered: Record<string, unknown> = {}
  for (const [k, v] of Object.entries(obj)) {
    if (k === titleKey || k === 'priority') continue
    filtered[k] = v
  }
  return filtered
}

function priorityColor(p: string): string {
  const v = String(p).toLowerCase()
  if (v === 'high' || v === 'critical') return 'bg-red-500/15 text-red-300 border-red-500/30'
  if (v === 'medium') return 'bg-amber-500/15 text-amber-300 border-amber-500/30'
  return 'bg-blue-500/15 text-blue-300 border-blue-500/30'
}
</script>

<template>
  <div :class="['space-y-3', depth > 0 ? 'ps-2 sm:ps-3 border-s-2 border-border/30' : '']">
    <template v-for="(group, gi) in grouped" :key="gi">
      <!-- Score group (compact grid) -->
      <template v-if="group.type === 'scores'">
        <div :class="['grid gap-3 mb-1', group.items.length >= 3 ? 'grid-cols-2 sm:grid-cols-3' : group.items.length === 2 ? 'grid-cols-2' : 'grid-cols-1']">
          <div v-for="item in group.items" :key="item.key" class="space-y-1">
            <div class="text-[11px] text-muted-foreground font-medium">{{ item.label }}</div>
            <div class="flex items-center gap-2">
              <span :class="['text-base sm:text-lg font-bold leading-none', scoreColor(item.value as number, item.scoreMax)]">{{ item.value }}</span>
              <div class="flex-1 h-1.5 rounded-full bg-white/5 overflow-hidden">
                <div
                  class="h-full rounded-full bg-[image:var(--gradient-brand)]"
                  :style="{ width: scoreBarWidth(item.value as number, item.scoreMax) }"
                />
              </div>
              <span class="hidden sm:inline text-[10px] text-muted-foreground/60">{{ scoreMaxLabel(item) }}</span>
            </div>
          </div>
        </div>
      </template>

      <!-- Single item -->
      <template v-else>
        <!-- NESTED OBJECT -->
        <div v-if="group.item.type === 'nested' && group.item.children" class="mb-2">
          <div class="flex items-center gap-2 text-xs font-semibold text-foreground mb-2">
            <component :is="pickIcon(group.item.key)" class="h-3.5 w-3.5 text-primary" />
            {{ group.item.label }}
          </div>
          <div class="space-y-2 ps-1">
            <AnalysisPayloadRenderer
              :data="(group.item.value as Record<string, unknown>)"
              :depth="depth + 1"
            />
          </div>
        </div>

        <!-- LIST OF OBJECTS (cards) -->
        <div v-else-if="group.item.type === 'object_list' && group.item.items" class="mb-2">
          <div class="flex items-center gap-2 text-xs font-semibold text-foreground mb-2">
            <component :is="pickIcon(group.item.key)" class="h-3.5 w-3.5 text-primary" />
            {{ group.item.label }}
          </div>
          <div class="space-y-2">
            <div
              v-for="(obj, idx) in group.item.items"
              :key="idx"
              class="rounded-lg border border-border/40 bg-white/[0.02] p-2.5 sm:p-3 space-y-2"
            >
              <div v-if="getObjectTitle(obj as Record<string, unknown>)" class="text-sm font-medium text-foreground leading-relaxed">
                {{ getObjectTitle(obj as Record<string, unknown>) }}
              </div>
              <div v-if="(obj as Record<string, unknown>).priority" class="flex items-center gap-2">
                <span :class="['text-[10px] font-semibold px-1.5 py-0.5 rounded border', priorityColor(String((obj as Record<string, unknown>).priority))]">
                  {{ (obj as Record<string, unknown>).priority }}
                </span>
              </div>
              <AnalysisPayloadRenderer
                :data="filterMetaFields(obj as Record<string, unknown>)"
                :depth="depth + 1"
              />
            </div>
          </div>
        </div>

        <!-- TAGS -->
        <div v-else-if="group.item.type === 'tags'" class="mb-1">
          <div class="text-[11px] text-muted-foreground font-medium mb-1.5">{{ group.item.label }}</div>
          <div v-if="(group.item.value as string[])?.length === 0" class="text-[11px] text-muted-foreground/40">None</div>
          <div v-else class="flex flex-wrap gap-1.5">
            <span
              v-for="(tag, i) in (group.item.value as string[])"
              :key="i"
              class="text-[11px] px-2 py-0.5 rounded-full border border-border/60 text-muted-foreground bg-white/[0.02] max-w-full truncate"
            >
              {{ tag }}
            </span>
          </div>
        </div>

        <!-- LIST -->
        <div v-else-if="group.item.type === 'list'" class="mb-1">
          <div class="text-[11px] text-muted-foreground font-medium mb-1.5">{{ group.item.label }}</div>
          <ul class="space-y-1">
            <li
              v-for="(entry, i) in (group.item.value as string[])"
              :key="i"
              class="text-sm text-muted-foreground flex items-start gap-2"
            >
              <span class="h-1 w-1 rounded-full bg-primary/60 mt-2 shrink-0" />
              <span>{{ entry }}</span>
            </li>
          </ul>
        </div>

        <!-- TEXT (default) -->
        <div v-else class="mb-1">
          <div class="text-[11px] text-muted-foreground font-medium mb-1">{{ group.item.label }}</div>
          <div class="text-sm text-muted-foreground whitespace-pre-wrap leading-relaxed">
            <template v-if="typeof group.item.value === 'boolean'">
              <component :is="group.item.value ? Check : X" class="h-3.5 w-3.5 inline" :class="group.item.value ? 'text-success' : 'text-destructive'" />
              <span class="ms-1">{{ group.item.value ? 'Yes' : 'No' }}</span>
            </template>
            <template v-else>{{ group.item.value != null ? group.item.value : '—' }}</template>
          </div>
        </div>
      </template>
    </template>

    <div v-if="!items.length" class="text-xs text-muted-foreground/50 py-2">—</div>
  </div>
</template>
