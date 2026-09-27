<script setup lang="ts">
import { computed } from 'vue'
import {
  Users, Heart, Brain, Target, TrendingUp,
  AlertTriangle, Lightbulb, MessageSquare, Shield,
  BarChart3, Globe, Zap, Award, Eye, ThumbsUp, ThumbsDown,
} from 'lucide-vue-next'
import { useI18n } from '@/shared/utils/i18n'
import { filterPlaceholderItems } from '@/shared/utils/payloadDisplay'

const props = defineProps<{
  data: Record<string, unknown>
}>()

const { t } = useI18n()

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
  type: 'text' | 'list' | 'tags' | 'nested' | 'card-list' | 'lang-patterns'
  children?: RenderItem[]
  cards?: Record<string, unknown>[]
  /** lang-patterns: words to use / avoid when the payload separates them */
  useWords?: string[]
  avoidWords?: string[]
  /** lang-patterns: unclassifiable flat list — rendered as ONE group with a hint */
  flatItems?: string[]
}

/** Backend structured keys that split language patterns into use vs avoid. */
const LANG_USE_KEYS = ['words_they_use', 'words_to_use', 'recommended_words']
const LANG_AVOID_KEYS = ['phrases_to_avoid', 'words_to_avoid', 'avoid_words']

function asCleanStringList(val: unknown): string[] {
  return Array.isArray(val) ? filterPlaceholderItems(val.filter((v): v is string => typeof v === 'string' && v.trim().length > 0)) : []
}

/**
 * QA fix 3 (Terminology): language patterns must never mix "use" and "avoid"
 * vocabulary in one undifferentiated list. When the payload carries
 * structured keys (words_they_use / phrases_to_avoid — the backend's deep
 * research shape) they render as two labeled groups with distinct styling.
 * A flat list is NEVER split by guessing — it renders as one group with a
 * backend-agnostic hint instead.
 */
function classifyLanguagePatterns(val: unknown): RenderItem | null {
  if (Array.isArray(val)) {
    const flat = asCleanStringList(val)
    if (flat.length === 0) return null
    return { key: 'language_patterns', label: t('segResearch.lang.title'), value: val, type: 'lang-patterns', flatItems: flat }
  }
  if (typeof val !== 'object' || val === null) return null

  const obj = val as Record<string, unknown>
  const useWords = LANG_USE_KEYS.flatMap((k) => asCleanStringList(obj[k]))
  const avoidWords = LANG_AVOID_KEYS.flatMap((k) => asCleanStringList(obj[k]))
  if (useWords.length === 0 && avoidWords.length === 0) return null

  const consumed = new Set([...LANG_USE_KEYS, ...LANG_AVOID_KEYS])
  const extras = Object.entries(obj)
    .filter(([k]) => !consumed.has(k))
    .map(([k, v]) => classify(k, v))
    .filter((item): item is RenderItem => item !== null)

  return {
    key: 'language_patterns',
    label: t('segResearch.lang.title'),
    value: val,
    type: 'lang-patterns',
    useWords: [...new Set(useWords)],
    avoidWords: [...new Set(avoidWords)],
    children: extras,
  }
}

function classify(key: string, val: unknown): RenderItem | null {
  if (val === null || val === undefined) {
    return null
  }

  if (key === 'language_patterns') {
    const langItem = classifyLanguagePatterns(val)
    if (langItem) return langItem
    // No structured/flat language data — fall through to the generic paths.
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
      return null
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
    const children = Object.entries(val as Record<string, unknown>)
      .map(([k, v]) => classify(k, v))
      .filter((item): item is RenderItem => item !== null)
    if (children.length === 0) return null
    return {
      key,
      label: formatLabel(key),
      value: val,
      type: 'nested',
      children,
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
    .map(([key, value]) => classify(key, value))
    .filter((item): item is RenderItem => item !== null)
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

              <!-- Nested language patterns (QA fix 3) -->
              <div v-else-if="child.type === 'lang-patterns'" class="ps-2 border-s-2 border-border/20 space-y-2" data-testid="language-patterns">
                <div class="text-[11px] text-muted-foreground/60 font-medium">{{ child.label }}</div>
                <div v-if="child.useWords?.length" data-testid="lang-use-group">
                  <div class="flex items-center gap-1.5 text-[11px] font-medium text-success mb-1">
                    <ThumbsUp class="h-3 w-3" /> {{ t('segResearch.lang.use') }}
                  </div>
                  <div class="flex flex-wrap gap-1">
                    <span v-for="(word, i) in child.useWords" :key="i" data-testid="lang-use-chip" class="text-[11px] px-2 py-0.5 rounded-full border border-success/40 bg-success/10 text-success">{{ word }}</span>
                  </div>
                </div>
                <div v-if="child.avoidWords?.length" data-testid="lang-avoid-group">
                  <div class="flex items-center gap-1.5 text-[11px] font-medium text-destructive mb-1">
                    <ThumbsDown class="h-3 w-3" /> {{ t('segResearch.lang.avoid') }}
                  </div>
                  <div class="flex flex-wrap gap-1">
                    <span v-for="(word, i) in child.avoidWords" :key="i" data-testid="lang-avoid-chip" class="text-[11px] px-2 py-0.5 rounded-full border border-destructive/40 bg-destructive/10 text-destructive">{{ word }}</span>
                  </div>
                </div>
                <div v-if="child.flatItems?.length" class="flex flex-wrap gap-1" data-testid="lang-flat-group">
                  <span v-for="(word, i) in child.flatItems" :key="i" data-testid="lang-flat-chip" class="text-[11px] px-2 py-0.5 rounded-full border border-border/50 bg-overlay-subtle text-muted-foreground">{{ word }}</span>
                </div>
                <p v-if="child.flatItems?.length" class="text-[11px] text-muted-foreground/70">{{ t('segResearch.lang.hint') }}</p>
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

      <!-- LANGUAGE PATTERNS (QA fix 3: use vs avoid never mixed) -->
      <template v-else-if="item.type === 'lang-patterns'">
        <div class="rounded-lg border border-border/30 bg-overlay-subtle p-4 space-y-3" data-testid="language-patterns">
          <div class="flex items-center gap-2 text-xs font-semibold text-foreground">
            <component :is="pickIcon(item.key)" class="h-3.5 w-3.5 text-primary" />
            {{ item.label }}
          </div>

          <!-- Structured payload: two labeled groups with distinct styling -->
          <template v-if="item.useWords?.length || item.avoidWords?.length">
            <div v-if="item.useWords?.length" data-testid="lang-use-group">
              <div class="flex items-center gap-1.5 text-[11px] font-medium text-success mb-1.5">
                <ThumbsUp class="h-3 w-3" /> {{ t('segResearch.lang.use') }}
              </div>
              <div class="flex flex-wrap gap-1.5">
                <span
                  v-for="(word, i) in item.useWords"
                  :key="i"
                  data-testid="lang-use-chip"
                  class="text-[11px] px-2 py-0.5 rounded-full border border-success/40 bg-success/10 text-success"
                >
                  {{ word }}
                </span>
              </div>
            </div>
            <div v-if="item.avoidWords?.length" data-testid="lang-avoid-group">
              <div class="flex items-center gap-1.5 text-[11px] font-medium text-destructive mb-1.5">
                <ThumbsDown class="h-3 w-3" /> {{ t('segResearch.lang.avoid') }}
              </div>
              <div class="flex flex-wrap gap-1.5">
                <span
                  v-for="(word, i) in item.avoidWords"
                  :key="i"
                  data-testid="lang-avoid-chip"
                  class="text-[11px] px-2 py-0.5 rounded-full border border-destructive/40 bg-destructive/10 text-destructive"
                >
                  {{ word }}
                </span>
              </div>
            </div>
            <!-- Remaining structured keys (emotional triggers, tone preferences…) -->
            <template v-for="extra in item.children" :key="extra.key">
              <div v-if="extra.type === 'tags'" class="space-y-1">
                <div class="text-[11px] text-muted-foreground/60">{{ extra.label }}</div>
                <div class="flex flex-wrap gap-1">
                  <span v-for="(tg, ti) in (extra.value as string[])" :key="ti" class="text-[10px] px-1.5 py-0.5 rounded bg-overlay-medium text-muted-foreground">{{ tg }}</span>
                </div>
              </div>
              <div v-else-if="extra.type === 'list'" class="space-y-1">
                <div class="text-[11px] text-muted-foreground/60">{{ extra.label }}</div>
                <ul class="space-y-0.5">
                  <li v-for="(entry, li) in (extra.value as string[])" :key="li" class="text-xs text-muted-foreground flex items-start gap-1.5">
                    <span class="h-1 w-1 rounded-full bg-primary/60 mt-1.5 shrink-0" /> {{ entry }}
                  </li>
                </ul>
              </div>
              <div v-else-if="extra.type === 'text'" class="flex items-start gap-2">
                <span class="text-[11px] text-muted-foreground/60 min-w-[110px] shrink-0">{{ extra.label }}</span>
                <span class="text-xs text-muted-foreground whitespace-pre-wrap leading-relaxed">{{ extra.value }}</span>
              </div>
            </template>
          </template>

          <!-- Flat list: rendered as ONE group + hint — never split by guessing -->
          <template v-else>
            <div class="flex flex-wrap gap-1.5" data-testid="lang-flat-group">
              <span
                v-for="(word, i) in item.flatItems"
                :key="i"
                data-testid="lang-flat-chip"
                class="text-[11px] px-2 py-0.5 rounded-full border border-border/50 bg-overlay-subtle text-muted-foreground"
              >
                {{ word }}
              </span>
            </div>
            <p class="text-[11px] text-muted-foreground/70">{{ t('segResearch.lang.hint') }}</p>
          </template>
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
