<script setup lang="ts">
import { computed } from 'vue'
import { Check, X } from 'lucide-vue-next'

const props = defineProps<{
  data: Record<string, unknown>
}>()

interface TreeNode {
  key: string
  label: string
  value: unknown
  type: 'text' | 'list' | 'nested' | 'score'
  children?: TreeNode[]
  scoreMax?: number
  scoreValue?: number
}

function formatLabel(key: string): string {
  return key
    .replace(/_/g, ' ')
    .replace(/([a-z])([A-Z])/g, '$1 $2')
    .replace(/^\w/, (c) => c.toUpperCase())
}

function extractScore(val: Record<string, unknown>): { score: number; max: number } | null {
  const score = typeof val.score === 'number' ? val.score
    : typeof val.total_score === 'number' ? val.total_score
    : null
  const max = typeof val.max === 'number' ? val.max
    : typeof val.max_score === 'number' ? val.max_score
    : typeof val.max_possible_score === 'number' ? val.max_possible_score
    : (typeof val.max === 'object' && val.max !== null && typeof (val.max as any).parsedValue === 'number')
      ? (val.max as any).parsedValue
    : typeof val.percentage === 'number' ? 100
    : typeof val.overall_score === 'number' && typeof val.score_out_of === 'object'
      ? (val.score_out_of as any)?.parsedValue ?? 10
    : null
  if (score === null || max === null) return null
  return { score, max }
}

function classify(key: string, val: unknown): TreeNode {
  if (val === null || val === undefined) {
    return { key, label: formatLabel(key), value: '—', type: 'text' }
  }
  if (typeof val === 'boolean') {
    return { key, label: formatLabel(key), value: val, type: 'text' }
  }
  if (typeof val === 'number') {
    if (key.toLowerCase().includes('score') || key.toLowerCase().includes('confidence')) {
      const max = key.toLowerCase().includes('confidence') ? 100 : undefined
      return { key, label: formatLabel(key), value: val, type: 'score', scoreValue: val, scoreMax: max }
    }
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
    const obj = val as Record<string, unknown>
    const scoreInfo = extractScore(obj)
    if (scoreInfo && Object.keys(obj).filter(k => !['grade', 'grade_label', 'timestamp', 'not_found', 'data_completeness', 'confidence_level', 'sources_with_data', 'missing_data', 'certifications_found', 'parsedValue', 'source', 'percentage'].includes(k)).length <= 6) {
      return {
        key,
        label: formatLabel(key),
        value: val,
        type: 'score',
        scoreValue: scoreInfo.score,
        scoreMax: scoreInfo.max,
        children: Object.entries(obj)
          .filter(([k, v]) => v !== null && v !== undefined && k !== 'score' && k !== 'max' && k !== 'max_score' && k !== 'max_possible_score' && k !== 'total_score')
          .map(([k, v]) => classify(k, v)),
      }
    }
    return {
      key,
      label: formatLabel(key),
      value: val,
      type: 'nested',
      children: Object.entries(obj)
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

function scoreGradeColor(grade: string): string {
  const g = String(grade).toUpperCase().charAt(0)
  if (g === 'A') return 'text-success bg-success/15'
  if (g === 'B') return 'text-blue-400 bg-blue-400/15'
  if (g === 'C') return 'text-amber-400 bg-amber-400/15'
  if (g === 'D') return 'text-orange-400 bg-orange-400/15'
  return 'text-destructive bg-destructive/15'
}

function scoreBarColor(grade: string): string {
  const g = String(grade).toUpperCase().charAt(0)
  if (g === 'A') return 'bg-success'
  if (g === 'B') return 'bg-blue-400'
  if (g === 'C') return 'bg-amber-400'
  if (g === 'D') return 'bg-orange-400'
  return 'bg-destructive'
}

function getGrade(item: TreeNode): string {
  if (!item.children) return ''
  const gradeChild = item.children.find(c => c.key === 'grade' || c.key === 'grade_label')
  return gradeChild ? String(gradeChild.value) : ''
}
</script>

<template>
  <div v-if="hasData" class="space-y-3">
    <div v-for="item in items" :key="item.key">
      <!-- Score section -->
      <template v-if="item.type === 'score'">
        <div class="rounded-lg border border-border/30 bg-overlay-subtle p-3.5 space-y-2">
          <div class="text-xs font-semibold text-foreground">{{ item.label }}</div>
          <div class="flex items-center gap-3">
            <div class="flex-1 h-2 rounded-full bg-overlay-medium overflow-hidden">
              <div
                :class="scoreBarColor(getGrade(item))"
                class="h-full rounded-full transition-all"
                :style="{ width: `${Math.min((item.scoreValue ?? 0) / (item.scoreMax ?? 100) * 100, 100)}%` }"
              />
            </div>
            <span class="text-xs text-muted-foreground tabular-nums whitespace-nowrap">
              {{ item.scoreValue ?? 0 }} / {{ item.scoreMax ?? 100 }}
            </span>
            <span
              v-if="getGrade(item)"
              :class="scoreGradeColor(getGrade(item))"
              class="text-[10px] font-bold px-1.5 py-0.5 rounded"
            >
              {{ getGrade(item) }}
            </span>
          </div>
          <div v-if="item.children?.length" class="grid grid-cols-2 gap-x-4 gap-y-1">
            <template v-for="child in item.children.filter(c => c.key !== 'grade' && c.key !== 'grade_label')" :key="child.key">
              <div v-if="child.type === 'text'" class="text-xs flex items-start gap-2">
                <span class="text-muted-foreground/50 shrink-0">{{ child.label }}</span>
                <span class="text-muted-foreground">
                  <template v-if="typeof child.value === 'boolean'">
                    <component :is="child.value ? Check : X" class="h-3 w-3 inline" :class="child.value ? 'text-success' : 'text-destructive'" />
                  </template>
                  <template v-else>{{ child.value }}</template>
                </span>
              </div>
              <div v-else-if="child.type === 'list'" class="text-xs">
                <span class="text-muted-foreground/50">{{ child.label }}</span>
                <span v-if="(child.value as string[])?.length === 0" class="text-muted-foreground/40">None</span>
                <div v-else class="flex flex-wrap gap-1 mt-0.5">
                  <span v-for="(t, i) in (child.value as string[])" :key="i" class="text-[10px] px-1.5 py-0.5 rounded bg-overlay-medium text-muted-foreground">{{ t }}</span>
                </div>
              </div>
            </template>
          </div>
        </div>
      </template>

      <!-- Nested section -->
      <template v-else-if="item.type === 'nested' && item.children">
        <div class="rounded-lg border border-border/30 bg-overlay-subtle p-3.5 space-y-2">
          <div class="text-xs font-semibold text-foreground">{{ item.label }}</div>
          <div class="space-y-1.5 ps-1">
            <template v-for="child in item.children" :key="child.key">
              <!-- Child score -->
              <div v-if="child.type === 'score'" class="flex items-center gap-2 text-xs">
                <span class="text-muted-foreground/50 shrink-0">{{ child.label }}</span>
                <div class="flex-1 h-1.5 rounded-full bg-overlay-medium overflow-hidden">
                  <div
                    :class="scoreBarColor(getGrade(child))"
                    class="h-full rounded-full"
                    :style="{ width: `${Math.min((child.scoreValue ?? 0) / (child.scoreMax ?? 100) * 100, 100)}%` }"
                  />
                </div>
                <span class="text-muted-foreground tabular-nums">{{ child.scoreValue ?? 0 }}/{{ child.scoreMax ?? 100 }}</span>
                <span v-if="getGrade(child)" :class="scoreGradeColor(getGrade(child))" class="text-[10px] font-bold px-1 py-0.5 rounded">{{ getGrade(child) }}</span>
              </div>

              <!-- Child text -->
              <div v-else-if="child.type === 'text'" class="flex items-start gap-2">
                <span class="text-[11px] text-muted-foreground/60 min-w-[110px] shrink-0">{{ child.label }}</span>
                <span class="text-xs text-muted-foreground whitespace-pre-wrap leading-relaxed">
                  <template v-if="typeof child.value === 'boolean'">
                    <component :is="child.value ? Check : X" class="h-3 w-3 inline" :class="child.value ? 'text-success' : 'text-destructive'" />
                    <span class="ms-1">{{ child.value ? 'Yes' : 'No' }}</span>
                  </template>
                  <template v-else>{{ child.value }}</template>
                </span>
              </div>

              <!-- Child list -->
              <div v-else-if="child.type === 'list'" class="space-y-1">
                <div class="text-[11px] text-muted-foreground/60">{{ child.label }}</div>
                <div v-if="(child.value as string[])?.length === 0" class="text-[11px] text-muted-foreground/40">None</div>
                <div v-else class="flex flex-wrap gap-1">
                  <span
                    v-for="(entry, i) in (child.value as string[])"
                    :key="i"
                    class="text-[10px] px-1.5 py-0.5 rounded bg-overlay-medium text-muted-foreground"
                  >
                    {{ entry }}
                  </span>
                </div>
              </div>

              <!-- Child nested (second level) -->
              <div v-else-if="child.type === 'nested'" class="ps-2 border-s-2 border-border/20">
                <div class="text-[11px] text-muted-foreground/60 font-medium mb-1.5">{{ child.label }}</div>
                <div class="space-y-2">
                  <template v-for="sub in child.children" :key="sub.key">
                    <!-- Sub score -->
                    <div v-if="sub.type === 'score'" class="text-xs flex items-center gap-2">
                      <span class="text-muted-foreground/50 shrink-0">{{ sub.label }}</span>
                      <div class="flex-1 h-1.5 rounded-full bg-overlay-medium overflow-hidden">
                        <div class="h-full rounded-full bg-primary/60" :style="{ width: `${Math.min((sub.scoreValue ?? 0) / (sub.scoreMax ?? 100) * 100, 100)}%` }" />
                      </div>
                      <span class="text-muted-foreground tabular-nums">{{ sub.scoreValue ?? 0 }}/{{ sub.scoreMax ?? 100 }}</span>
                    </div>
                    <!-- Sub list (as tags) -->
                    <div v-else-if="sub.type === 'list'" class="text-xs">
                      <div class="text-muted-foreground/50 mb-1">{{ sub.label }}</div>
                      <div v-if="(sub.value as string[])?.length === 0" class="text-muted-foreground/40">None</div>
                      <div v-else class="flex flex-wrap gap-1">
                        <span v-for="(tag, i) in (sub.value as string[])" :key="i" class="text-[10px] px-1.5 py-0.5 rounded bg-overlay-medium text-muted-foreground">{{ tag }}</span>
                      </div>
                    </div>
                    <!-- Sub nested (3rd level inline) -->
                    <div v-else-if="sub.type === 'nested' && sub.children" class="text-xs">
                      <div class="text-muted-foreground/50 mb-1">{{ sub.label }}</div>
                      <div class="grid grid-cols-2 gap-x-4 gap-y-1 ps-2 border-s border-border/15">
                        <template v-for="deep in sub.children" :key="deep.key">
                          <div class="flex items-start gap-2">
                            <span class="text-muted-foreground/50 shrink-0">{{ deep.label }}</span>
                            <span class="text-muted-foreground">
                              <template v-if="typeof deep.value === 'boolean'">
                                <component :is="deep.value ? Check : X" class="h-3 w-3 inline" :class="deep.value ? 'text-success' : 'text-destructive'" />
                              </template>
                              <template v-else-if="Array.isArray(deep.value)">
                                <span class="flex flex-wrap gap-1">
                                  <span v-for="(tag, ti) in (deep.value as string[])" :key="ti" class="text-[10px] px-1.5 py-0.5 rounded bg-overlay-medium">{{ tag }}</span>
                                </span>
                              </template>
                              <template v-else>{{ deep.value != null ? deep.value : '—' }}</template>
                            </span>
                          </div>
                        </template>
                      </div>
                    </div>
                    <!-- Sub text -->
                    <div v-else class="text-xs flex items-start gap-2">
                      <span class="text-muted-foreground/50 shrink-0">{{ sub.label }}</span>
                      <span class="text-muted-foreground">
                        <template v-if="typeof sub.value === 'boolean'">
                          <component :is="sub.value ? Check : X" class="h-3 w-3 inline" :class="sub.value ? 'text-success' : 'text-destructive'" />
                        </template>
                        <template v-else>{{ sub.value != null ? sub.value : '—' }}</template>
                      </span>
                    </div>
                  </template>
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
          <span class="text-xs text-muted-foreground whitespace-pre-wrap leading-relaxed">
            <template v-if="typeof item.value === 'boolean'">
              <component :is="item.value ? Check : X" class="h-3 w-3 inline" :class="item.value ? 'text-success' : 'text-destructive'" />
              <span class="ms-1">{{ item.value ? 'Yes' : 'No' }}</span>
            </template>
            <template v-else>{{ item.value }}</template>
          </span>
        </div>
      </template>

      <!-- Top-level list -->
      <template v-else-if="item.type === 'list'">
        <div>
          <div class="text-[11px] text-muted-foreground/60 mb-1">{{ item.label }}</div>
          <div v-if="(item.value as string[])?.length === 0" class="text-[11px] text-muted-foreground/40">None</div>
          <div v-else class="flex flex-wrap gap-1.5">
            <span
              v-for="(entry, i) in (item.value as string[])"
              :key="i"
              class="text-[10px] px-2 py-0.5 rounded-full border border-border/50 bg-overlay-subtle text-muted-foreground"
            >
              {{ entry }}
            </span>
          </div>
        </div>
      </template>
    </div>
  </div>
</template>
