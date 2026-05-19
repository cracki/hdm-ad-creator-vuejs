<script setup lang="ts">
import { computed } from 'vue'
import {
  Users, Heart, Brain, Target, TrendingUp,
  AlertTriangle, Lightbulb, MessageSquare, Shield,
  BarChart3, Globe, Zap, Award, Eye,
} from 'lucide-vue-next'

const props = defineProps<{
  data: Record<string, unknown>
}>()

const ICON_MAP: Record<string, any> = {
  audience: Users,
  psychographic: Brain,
  demographic: Users,
  behavioral: TrendingUp,
  pain: AlertTriangle,
  desire: Heart,
  motivation: Lightbulb,
  objection: Shield,
  messaging: MessageSquare,
  brand: Globe,
  competitive: BarChart3,
  insight: Lightbulb,
  persona: Users,
  segment: Users,
  fear: AlertTriangle,
  goal: Target,
  value: Heart,
  trigger: Zap,
  advantage: Award,
  perception: Eye,
  channel: Globe,
  emotion: Heart,
  purchase: Target,
  hidden: Eye,
  content: MessageSquare,
  language: MessageSquare,
  resonant: MessageSquare,
}

function pickIcon(key: string) {
  const lower = key.toLowerCase()
  for (const [pattern, icon] of Object.entries(ICON_MAP)) {
    if (lower.includes(pattern)) return icon
  }
  return Lightbulb
}

function formatLabel(key: string): string {
  return key
    .replace(/_/g, ' ')
    .replace(/([a-z])([A-Z])/g, '$1 $2')
    .replace(/^\w/, (c) => c.toUpperCase())
}

interface RenderItem {
  key: string
  label: string
  value: unknown
  type: 'text' | 'list' | 'tags' | 'nested' | 'card-list'
  children?: RenderItem[]
  cards?: Record<string, unknown>[]
}

function classify(key: string, val: unknown): RenderItem {
  if (val === null || val === undefined) {
    return { key, label: formatLabel(key), value: '', type: 'text' }
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
      return { key, label: formatLabel(key), value: [], type: 'tags' }
    }
    if (typeof val[0] === 'string') {
      const allShort = (val as string[]).every((v) => v.length < 60)
      return { key, label: formatLabel(key), value: val, type: allShort ? 'tags' : 'list' }
    }
    if (typeof val[0] === 'object' && val[0] !== null) {
      return {
        key,
        label: formatLabel(key),
        value: null,
        type: 'card-list',
        cards: val as Record<string, unknown>[],
      }
    }
    return {
      key,
      label: formatLabel(key),
      value: val.map((v) => (typeof v === 'string' ? v : String(v))),
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

function cardTitleField(card: Record<string, unknown>): string | null {
  const titleKeys = ['name', 'title', 'emotion', 'objection', 'pain', 'driver', 'theme', 'segment_name']
  for (const k of titleKeys) {
    if (card[k] && typeof card[k] === 'string') return k
  }
  return null
}

const items = computed<RenderItem[]>(() => {
  if (!props.data || typeof props.data !== 'object') return []
  return Object.entries(props.data)
    .filter(([, v]) => v !== null && v !== undefined)
    .map(([key, value]) => classify(key, value))
})

const hasData = computed(() => items.value.length > 0)
</script>

<template>
  <div v-if="hasData" class="space-y-4">
    <div v-for="item in items" :key="item.key" class="space-y-2">
      <!-- NESTED SECTION -->
      <template v-if="item.type === 'nested' && item.children">
        <div class="rounded-lg border border-border/30 bg-overlay-subtle p-4 space-y-2.5">
          <div class="flex items-center gap-2 text-xs font-semibold text-foreground">
            <component :is="pickIcon(item.key)" class="h-3.5 w-3.5 text-primary" />
            {{ item.label }}
          </div>
          <div class="space-y-2 ps-1">
            <template v-for="child in item.children" :key="child.key">
              <!-- Nested text -->
              <div v-if="child.type === 'text'" class="flex items-start gap-2">
                <span class="text-[11px] text-muted-foreground/60 min-w-[110px] shrink-0">{{ child.label }}</span>
                <span class="text-xs text-muted-foreground whitespace-pre-wrap leading-relaxed">{{ child.value || '—' }}</span>
              </div>

              <!-- Nested tags -->
              <div v-else-if="child.type === 'tags'" class="flex flex-wrap gap-1">
                <span
                  v-for="(tag, i) in (child.value as string[])"
                  :key="i"
                  class="text-[11px] px-2 py-0.5 rounded-full border border-border/50 bg-overlay-subtle text-muted-foreground"
                >
                  {{ tag }}
                </span>
              </div>

              <!-- Nested list -->
              <div v-else-if="child.type === 'list'" class="space-y-1">
                <div class="text-[11px] text-muted-foreground/60 mb-1">{{ child.label }}</div>
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

              <!-- Nested card-list -->
              <div v-else-if="child.type === 'card-list'" class="space-y-2">
                <div class="text-[11px] text-muted-foreground/60 mb-1">{{ child.label }}</div>
                <div class="space-y-2">
                  <div
                    v-for="(card, ci) in child.cards"
                    :key="ci"
                    class="rounded-lg bg-overlay-subtle border border-border/20 p-3 space-y-1.5"
                  >
                    <template v-if="cardTitleField(card)">
                      <div class="text-xs font-medium text-foreground">{{ card[cardTitleField(card)!] }}</div>
                    </template>
                    <template v-for="([k, v], vi) in Object.entries(card).filter(([k]) => k !== cardTitleField(card))" :key="vi">
                      <template v-if="typeof v === 'string'">
                        <div class="text-[11px] text-muted-foreground flex items-start gap-1.5">
                          <span class="text-muted-foreground/50 min-w-[90px] shrink-0">{{ formatLabel(k) }}</span>
                          <span>{{ v }}</span>
                        </div>
                      </template>
                      <template v-else-if="Array.isArray(v) && typeof v[0] === 'string'">
                        <div class="flex flex-wrap gap-1">
                          <span v-for="(t, ti) in (v as string[])" :key="ti" class="text-[10px] px-1.5 py-0.5 rounded bg-overlay-medium text-muted-foreground">{{ t }}</span>
                        </div>
                      </template>
                    </template>
                  </div>
                </div>
              </div>

              <!-- Deeply nested (render inline) -->
              <div v-else-if="child.type === 'nested' && child.children?.length" class="space-y-1.5 ps-2 border-s-2 border-border/20">
                <div class="text-[11px] text-muted-foreground/60 font-medium">{{ child.label }}</div>
                <div v-for="sub in child.children" :key="sub.key" class="text-xs flex items-start gap-2">
                  <span class="text-muted-foreground/50 min-w-[100px] shrink-0">{{ sub.label }}</span>
                  <span class="text-muted-foreground">
                    <template v-if="sub.type === 'tags' && Array.isArray(sub.value)">{{ (sub.value as string[]).join(', ') }}</template>
                    <template v-else-if="sub.type === 'card-list' && sub.cards?.length">
                      <span v-for="(c, i) in sub.cards" :key="i" class="block text-muted-foreground">{{ c[cardTitleField(c) ?? 'name'] ?? JSON.stringify(c) }}</span>
                    </template>
                    <template v-else>{{ sub.value || '—' }}</template>
                  </span>
                </div>
              </div>
            </template>
          </div>
        </div>
      </template>

      <!-- TOP-LEVEL TEXT -->
      <template v-else-if="item.type === 'text'">
        <div class="flex items-start gap-2">
          <component :is="pickIcon(item.key)" class="h-3.5 w-3.5 text-primary shrink-0 mt-0.5" />
          <div>
            <div class="text-[11px] text-muted-foreground/60 mb-0.5">{{ item.label }}</div>
            <div class="text-xs text-muted-foreground whitespace-pre-wrap leading-relaxed">{{ item.value || '—' }}</div>
          </div>
        </div>
      </template>

      <!-- TOP-LEVEL TAGS -->
      <template v-else-if="item.type === 'tags'">
        <div>
          <div class="text-[11px] text-muted-foreground/60 mb-1.5 flex items-center gap-1.5">
            <component :is="pickIcon(item.key)" class="h-3 w-3 text-primary" />
            {{ item.label }}
          </div>
          <div class="flex flex-wrap gap-1.5">
            <span
              v-for="(tag, i) in (item.value as string[])"
              :key="i"
              class="text-[11px] px-2 py-0.5 rounded-full border border-border/50 bg-overlay-subtle text-muted-foreground"
            >
              {{ tag }}
            </span>
          </div>
        </div>
      </template>

      <!-- TOP-LEVEL LIST -->
      <template v-else-if="item.type === 'list'">
        <div>
          <div class="text-[11px] text-muted-foreground/60 mb-1.5 flex items-center gap-1.5">
            <component :is="pickIcon(item.key)" class="h-3 w-3 text-primary" />
            {{ item.label }}
          </div>
          <ul class="space-y-1">
            <li
              v-for="(entry, i) in (item.value as string[])"
              :key="i"
              class="text-xs text-muted-foreground flex items-start gap-2"
            >
              <span class="h-1 w-1 rounded-full bg-primary/60 mt-1.5 shrink-0" />
              {{ entry }}
            </li>
          </ul>
        </div>
      </template>

      <!-- TOP-LEVEL CARD-LIST (array of objects) -->
      <template v-else-if="item.type === 'card-list'">
        <div>
          <div class="text-[11px] text-muted-foreground/60 mb-1.5 flex items-center gap-1.5">
            <component :is="pickIcon(item.key)" class="h-3 w-3 text-primary" />
            {{ item.label }}
          </div>
          <div class="space-y-2">
            <div
              v-for="(card, ci) in item.cards"
              :key="ci"
              class="rounded-lg bg-overlay-subtle border border-border/20 p-3 space-y-1.5"
            >
              <template v-if="cardTitleField(card)">
                <div class="text-xs font-medium text-foreground">{{ card[cardTitleField(card)!] }}</div>
              </template>
              <template v-for="([k, v], vi) in Object.entries(card).filter(([k]) => k !== cardTitleField(card))" :key="vi">
                <template v-if="typeof v === 'string'">
                  <div class="text-[11px] text-muted-foreground flex items-start gap-1.5">
                    <span class="text-muted-foreground/50 min-w-[90px] shrink-0">{{ formatLabel(k) }}</span>
                    <span>{{ v }}</span>
                  </div>
                </template>
                <template v-else-if="typeof v === 'number'">
                  <div class="text-[11px] text-muted-foreground flex items-start gap-1.5">
                    <span class="text-muted-foreground/50 min-w-[90px] shrink-0">{{ formatLabel(k) }}</span>
                    <span>{{ v }}</span>
                  </div>
                </template>
                <template v-else-if="Array.isArray(v) && typeof v[0] === 'string'">
                  <div class="flex flex-wrap gap-1">
                    <span v-for="(t, ti) in (v as string[])" :key="ti" class="text-[10px] px-1.5 py-0.5 rounded bg-overlay-medium text-muted-foreground">{{ t }}</span>
                  </div>
                </template>
                <template v-else-if="Array.isArray(v) && v.length > 0 && typeof v[0] === 'object'">
                  <div>
                    <div class="text-[10px] text-muted-foreground/50 mb-1">{{ formatLabel(k) }}</div>
                    <div v-for="(sub, si) in v" :key="si" class="text-[11px] text-muted-foreground ps-2 border-s border-border/20 mb-0.5">
                      {{ sub.name || sub.pain || sub.theme || sub.objection || sub.emotion || JSON.stringify(sub) }}
                    </div>
                  </div>
                </template>
              </template>
            </div>
          </div>
        </div>
      </template>
    </div>
  </div>

  <div v-else class="text-xs text-muted-foreground/50 py-2">—</div>
</template>
