<script setup lang="ts">
import { computed, ref } from 'vue'
import { ExternalLink, Globe, BarChart3, Tag } from 'lucide-vue-next'
import type { ContentOpportunities, ContentOpportunityTopic } from '@/features/market/types'
import AnalysisPayloadRenderer from '@/shared/components/renderers/AnalysisPayloadRenderer.vue'
import { useI18n } from '@/shared/utils/i18n'

const { t } = useI18n()

const props = defineProps<{
  data: ContentOpportunities | Record<string, unknown>
}>()

const result = computed(() => props.data as ContentOpportunities)
const topContent = computed(() => result.value?.top_performing_content ?? [])
const contentByType = computed(() => result.value?.content_by_type ?? {})
const domains = computed(() => result.value?.top_competing_domains ?? [])
const typeKeys = computed(() => Object.keys(contentByType.value))
const activeType = ref(typeKeys.value[0] ?? '')

const typeLabels: Record<string, string> = {
  guides: 'Guides',
  tips: 'Tips',
  case_studies: 'Case Studies',
  how_to: 'How-To',
  mistakes: 'Mistakes to Avoid',
  trends: 'Trends',
}

function typeName(key: string): string {
  return typeLabels[key] ?? key.replace(/_/g, ' ').replace(/^\w/, c => c.toUpperCase())
}
</script>

<template>
  <div v-if="topContent.length || typeKeys.length || domains.length" class="space-y-5">
    <!-- Stats row -->
    <div class="grid grid-cols-2 sm:grid-cols-3 gap-3">
      <div class="rounded-lg border border-border/30 bg-white/[0.015] p-3 text-center">
        <div class="text-xl font-bold text-primary">{{ result.total_topics_found ?? 0 }}</div>
        <div class="text-[10px] text-muted-foreground">{{ t('opportunities.topicsFound') }}</div>
      </div>
      <div class="rounded-lg border border-border/30 bg-white/[0.015] p-3 text-center">
        <div class="text-xl font-bold text-info">{{ topContent.length }}</div>
        <div class="text-[10px] text-muted-foreground">{{ t('opportunities.topResults') }}</div>
      </div>
      <div class="rounded-lg border border-border/30 bg-white/[0.015] p-3 text-center">
        <div class="text-xl font-bold text-amber-400">{{ domains.length }}</div>
        <div class="text-[10px] text-muted-foreground">{{ t('opportunities.competingDomains') }}</div>
      </div>
    </div>

    <!-- Top Performing Content -->
    <div>
      <div class="text-xs font-semibold mb-2.5 flex items-center gap-1.5">
        <BarChart3 class="h-3.5 w-3.5 text-primary" />
        {{ t('opportunities.topPerforming') }}
      </div>
      <div class="space-y-2">
        <div
          v-for="(item, idx) in topContent.slice(0, 10)"
          :key="idx"
          class="rounded-lg border border-border/30 bg-white/[0.015] p-3 flex items-start gap-2.5"
        >
          <span class="shrink-0 h-5 w-5 rounded bg-[image:var(--gradient-brand)] text-primary-foreground text-[10px] font-bold grid place-items-center">
            {{ item.position ?? idx + 1 }}
          </span>
          <div class="min-w-0 flex-1 space-y-1">
            <div class="text-sm font-medium text-foreground leading-snug truncate">{{ item.title }}</div>
            <div v-if="item.snippet" class="text-xs text-muted-foreground line-clamp-2">{{ item.snippet }}</div>
            <div class="flex items-center gap-2 flex-wrap">
              <span v-if="item.domain" class="text-[10px] text-muted-foreground/60 flex items-center gap-0.5">
                <Globe class="h-2.5 w-2.5" /> {{ item.domain }}
              </span>
              <span v-if="item.query" class="text-[10px] px-1.5 py-0.5 rounded bg-white/[0.04] text-muted-foreground">
                {{ item.query }}
              </span>
            </div>
          </div>
          <a v-if="item.url" :href="item.url" target="_blank" rel="noopener" class="shrink-0 h-6 w-6 rounded flex items-center justify-center hover:bg-white/[0.05] transition">
            <ExternalLink class="h-3 w-3 text-muted-foreground" />
          </a>
        </div>
      </div>
    </div>

    <!-- Content by Type -->
    <div v-if="typeKeys.length">
      <div class="text-xs font-semibold mb-2.5">{{ t('opportunities.byType') }}</div>
      <div class="flex flex-wrap gap-1.5 mb-3">
        <button
          v-for="key in typeKeys"
          :key="key"
          :class="[
            'h-7 px-3 rounded-lg text-[11px] font-medium border transition',
            activeType === key
              ? 'border-primary/60 bg-primary/10 text-primary'
              : 'border-border/40 bg-white/[0.02] text-muted-foreground hover:text-foreground',
          ]"
          @click="activeType = key"
        >
          {{ typeName(key) }} ({{ (contentByType[key] as ContentOpportunityTopic[])?.length ?? 0 }})
        </button>
      </div>
      <div v-if="(contentByType[activeType] as ContentOpportunityTopic[])?.length" class="space-y-2">
        <div
          v-for="(item, idx) in (contentByType[activeType] as ContentOpportunityTopic[])"
          :key="idx"
          class="rounded-lg border border-border/30 bg-white/[0.015] p-3 flex items-start gap-2"
        >
          <span class="shrink-0 text-[10px] text-muted-foreground/50 w-4 text-end">{{ idx + 1 }}</span>
          <div class="min-w-0 flex-1">
            <div class="text-xs font-medium text-foreground leading-snug truncate">{{ item.title }}</div>
            <div v-if="item.snippet" class="text-[11px] text-muted-foreground line-clamp-1 mt-0.5">{{ item.snippet }}</div>
            <div class="flex items-center gap-2 mt-1">
              <span v-if="item.domain" class="text-[10px] text-muted-foreground/60 flex items-center gap-0.5">
                <Globe class="h-2.5 w-2.5" /> {{ item.domain }}
              </span>
              <span v-if="item.query" class="text-[10px] px-1.5 py-0.5 rounded bg-white/[0.04] text-muted-foreground">
                <Tag class="h-2 w-2 inline" /> {{ item.query }}
              </span>
            </div>
          </div>
          <a v-if="item.url" :href="item.url" target="_blank" rel="noopener" class="shrink-0 h-5 w-5 rounded flex items-center justify-center hover:bg-white/[0.05] transition">
            <ExternalLink class="h-2.5 w-2.5 text-muted-foreground" />
          </a>
        </div>
      </div>
    </div>

    <!-- Top Competing Domains -->
    <div v-if="domains.length">
      <div class="text-xs font-semibold mb-2.5">{{ t('opportunities.topDomains') }}</div>
      <div class="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-2">
        <div
          v-for="d in domains"
          :key="d.domain"
          class="rounded-lg border border-border/30 bg-white/[0.015] p-2.5 text-center"
        >
          <div class="text-[11px] font-medium text-foreground truncate">{{ d.domain }}</div>
          <div class="text-lg font-bold text-primary">{{ d.content_count }}</div>
          <div class="text-[10px] text-muted-foreground">{{ t('opportunities.content') }}</div>
        </div>
      </div>
    </div>
  </div>

  <AnalysisPayloadRenderer v-else-if="Object.keys(data).length" :data="(data as any)" />
  <div v-else class="text-xs text-muted-foreground/50 py-2">{{ t('analysis.noData') }}</div>
</template>
