<script setup lang="ts">
import { computed, ref } from 'vue'
import { Target, Lightbulb, Layers, Tag, Users } from 'lucide-vue-next'
import type { ContentMatrixResponse, ContentMatrixStage } from '@/features/market/types'
import AnalysisPayloadRenderer from '@/shared/components/renderers/AnalysisPayloadRenderer.vue'
import { useI18n } from '@/shared/utils/i18n'

const { t } = useI18n()

const props = defineProps<{
  data: ContentMatrixResponse | Record<string, unknown>
}>()

const activeTab = ref<'TOFU' | 'MOFU' | 'BOFU'>('TOFU')

const matrix = computed(() => {
  const raw = props.data as ContentMatrixResponse
  return raw?.content_matrix ?? null
})

const stages = computed(() => {
  if (!matrix.value) return []
  return (['TOFU', 'MOFU', 'BOFU'] as const).map((key) => ({
    key,
    stage: matrix.value![key] as ContentMatrixStage,
  }))
})

const activeStage = computed(() => {
  return matrix.value?.[activeTab.value] ?? null
})

const stageColors: Record<string, { bg: string; text: string; border: string }> = {
  TOFU: { bg: 'bg-info/10', text: 'text-info', border: 'border-info/30' },
  MOFU: { bg: 'bg-amber-500/10', text: 'text-amber-400', border: 'border-amber-500/30' },
  BOFU: { bg: 'bg-success/10', text: 'text-success', border: 'border-success/30' },
}

const stageLabels: Record<string, string> = {
  TOFU: 'Awareness',
  MOFU: 'Consideration',
  BOFU: 'Decision',
}
</script>

<template>
  <div v-if="matrix" class="space-y-4">
    <!-- Header stats -->
    <div class="flex flex-wrap gap-3 mb-4">
      <div class="text-xs text-muted-foreground flex items-center gap-1.5">
        <Lightbulb class="h-3 w-3" />
        {{ t('matrix.totalIdeas') }}: <span class="font-semibold text-foreground">{{ data.total_content_ideas ?? 0 }}</span>
      </div>
      <div v-if="data.priority_recommendation" class="text-xs text-muted-foreground flex items-center gap-1.5">
        <Target class="h-3 w-3" />
        {{ data.priority_recommendation }}
      </div>
    </div>

    <!-- Tab buttons -->
    <div class="flex gap-1.5">
      <button
        v-for="{ key } in stages"
        :key="key"
        :class="[
          'h-8 px-3.5 rounded-lg text-xs font-medium border transition',
          activeTab === key
            ? `${stageColors[key].bg} ${stageColors[key].text} ${stageColors[key].border}`
            : 'bg-white/[0.02] border-border/40 text-muted-foreground hover:text-foreground',
        ]"
        @click="activeTab = key"
      >
        {{ key }} <span class="opacity-60">({{ stageLabels[key] }})</span>
      </button>
    </div>

    <!-- Active stage content -->
    <div v-if="activeStage" class="space-y-4">
      <div class="flex items-center gap-2 text-xs text-muted-foreground">
        <Layers class="h-3 w-3" />
        <span class="font-medium">{{ activeStage.goal }}</span>
        <span class="opacity-50">|</span>
        <span>{{ activeStage.content_ideas?.length ?? 0 }} {{ t('matrix.ideas') }}</span>
      </div>

      <!-- Formats -->
      <div v-if="activeStage.recommended_formats?.length" class="flex flex-wrap gap-1.5">
        <span
          v-for="fmt in activeStage.recommended_formats"
          :key="fmt"
          class="text-[11px] px-2 py-0.5 rounded-full border border-border/50 bg-white/[0.02] text-muted-foreground flex items-center gap-1"
        >
          <Tag class="h-2.5 w-2.5" /> {{ fmt }}
        </span>
      </div>

      <!-- Personas -->
      <div v-if="activeStage.target_personas?.length" class="flex flex-wrap gap-1.5">
        <span
          v-for="p in activeStage.target_personas"
          :key="p"
          class="text-[11px] px-2 py-0.5 rounded-full border border-primary/30 bg-primary/5 text-primary flex items-center gap-1"
        >
          <Users class="h-2.5 w-2.5" /> {{ p }}
        </span>
      </div>

      <!-- Content idea cards -->
      <div class="grid gap-2.5">
        <div
          v-for="(idea, idx) in activeStage.content_ideas"
          :key="idx"
          class="rounded-lg border border-border/30 bg-white/[0.015] p-3.5 space-y-2"
        >
          <div class="flex items-start gap-2">
            <span :class="['shrink-0 h-5 w-5 rounded text-[10px] font-bold grid place-items-center', stageColors[activeTab].bg, stageColors[activeTab].text]">
              {{ idx + 1 }}
            </span>
            <div class="min-w-0 flex-1">
              <div class="text-sm font-medium text-foreground leading-snug">
                {{ idea.suggested_title || idea.title_inspiration }}
              </div>
              <div v-if="idea.type === 'question'" class="text-[10px] mt-0.5 px-1.5 py-0.5 rounded bg-info/10 text-info inline-block">
                FAQ
              </div>
            </div>
            <span v-if="idea.position" class="text-[10px] text-muted-foreground shrink-0">#{{ idea.position }}</span>
          </div>

          <div v-if="idea.content_angle" class="text-xs text-muted-foreground leading-relaxed ps-7">
            {{ idea.content_angle }}
          </div>

          <div v-if="idea.topic && idea.topic !== 'FAQ'" class="text-[11px] text-muted-foreground/60 ps-7">
            {{ t('matrix.topic') }}: {{ idea.topic }}
          </div>
        </div>
      </div>
    </div>
  </div>

  <!-- Fallback for unexpected shapes -->
  <AnalysisPayloadRenderer v-else-if="Object.keys(data).length" :data="data" />
  <div v-else class="text-xs text-muted-foreground/50 py-2">{{ t('analysis.noData') }}</div>
</template>
