<script setup lang="ts">
import { ref, computed, type Ref } from 'vue'
import {
  Grid3X3, Download, Loader2, AlertCircle, Check, RefreshCw,
  Sparkles, Users, Palette, Smartphone, Bookmark,
} from 'lucide-vue-next'
import Topbar from '@/layout/Topbar.vue'
import { useI18n } from '@/shared/utils/i18n'
import { usePageActions } from '@/shared/composables/usePageActions'
import { useAsyncOperation } from '@/shared/composables/useAsyncOperation'
import { exportCsv } from '@/shared/utils/csv'
import { useBrands } from '@/features/brands/queries'
import { useAutoSelectBrand } from '@/shared/composables/useAutoSelectBrand'
import AiLoadingAnimation from '@/shared/components/AiLoadingAnimation.vue'
import { useConfetti } from '@/shared/composables/useConfetti'
import { useVariantOptions, useMetaFrameworks } from '../queries'
import { scenarioVariantsApi } from '../api'
import type { VariantOption, VariantFormatOption, MetaCreativeFramework } from '../types'

interface VariantAdCopy {
  headline?: string
  body?: string
  primary_text?: string
  cta?: string
}

interface GeneratedVariant {
  audience?: string
  style?: string
  creative_style?: string
  format?: string
  ad_format?: string
  ad_copy?: VariantAdCopy
  headline?: string
  primary_text?: string
  body?: string
  cta?: string
  image_prompt?: string
  visual_prompt?: string
  framework_name?: string
  framework?: string
}

interface VariantResult {
  variants?: GeneratedVariant[]
  rows?: GeneratedVariant[]
  meta_creative_variants?: GeneratedVariant[]
}

interface GenerateResult extends VariantResult {
  result?: VariantResult
}

const { t } = useI18n()
const { data: brands } = useBrands()
const confetti = useConfetti()

const brandUuid = ref('')
useAutoSelectBrand(brandUuid)

const selectedAudiences = ref<string[]>([])
const selectedStyles = ref<string[]>([])
const selectedFormats = ref<string[]>([])
const selectedMetaFrameworks = ref<string[]>([])
const audienceNotes = ref('')
const styleNotes = ref('')
const formatNotes = ref('')

const viewMode = ref<'cards' | 'table'>('cards')

const { data: result, loading, error, run } = useAsyncOperation<GenerateResult>()

const emptyIndustry = ref('')
const { data: optionsData, isPending: optionsLoading } = useVariantOptions(emptyIndustry)
const { data: frameworksData } = useMetaFrameworks()

const audienceOptions = computed<VariantOption[]>(() => {
  const audiences = optionsData.value?.audiences
  if (!audiences) return []
  return audiences.map(a => ({
    id: a.name?.toLowerCase().replace(/[\s/]+/g, '_') ?? '',
    name: a.name ?? '',
    description: a.description ?? '',
  }))
})

const styleOptions = computed<VariantOption[]>(() => {
  const styles = optionsData.value?.styles
  if (!styles) return []
  return styles.map(s => ({
    id: s.name?.toLowerCase().replace(/[\s/]+/g, '_') ?? '',
    name: s.name ?? '',
    description: s.description ?? '',
  }))
})

const formatOptions = computed<VariantFormatOption[]>(() => {
  const formats = optionsData.value?.formats
  if (!formats) return []
  return formats.map(f => ({
    id: f.name?.toLowerCase().replace(/[\s/]+/g, '_') ?? '',
    name: f.name ?? '',
    description: f.specs ?? f.description ?? '',
    specs: f.specs ?? '',
  }))
})

const frameworkOptions = computed<MetaCreativeFramework[]>(() => frameworksData.value?.frameworks ?? [])

const optionsLoaded = computed(() => !optionsLoading.value)

function createToggle(list: Ref<string[]>) {
  return (id: string) => {
    list.value = list.value.includes(id)
      ? list.value.filter(x => x !== id)
      : [...list.value, id]
  }
}

const toggleAudience = createToggle(selectedAudiences)
const toggleStyle = createToggle(selectedStyles)
const toggleFormat = createToggle(selectedFormats)
const toggleMetaFramework = createToggle(selectedMetaFrameworks)

const totalVariants = computed(() => {
  const base = selectedAudiences.value.length * selectedStyles.value.length * selectedFormats.value.length
  const metaExtra = selectedMetaFrameworks.value.length * selectedAudiences.value.length
  return base + metaExtra
})

const variants = computed<GeneratedVariant[]>(() => {
  if (!result.value) return []
  const r = result.value.result ?? result.value
  return r.variants ?? r.rows ?? []
})

const metaVariants = computed<GeneratedVariant[]>(() => {
  if (!result.value) return []
  const r = result.value.result ?? result.value
  return r.meta_creative_variants ?? []
})

const canGenerate = computed(() =>
  selectedAudiences.value.length > 0 &&
  selectedStyles.value.length > 0 &&
  selectedFormats.value.length > 0 &&
  brandUuid.value.length > 0,
)

async function generate() {
  const audienceNames = selectedAudiences.value.map(id => audienceOptions.value.find(a => a.id === id)?.name ?? id)
  const styleNames = selectedStyles.value.map(id => styleOptions.value.find(s => s.id === id)?.name ?? id)
  const formatNames = selectedFormats.value.map(id => formatOptions.value.find(f => f.id === id)?.name ?? id)

  const selectionNotes: Record<string, unknown> = {}
  if (audienceNotes.value) {
    selectionNotes.audience_notes = Object.fromEntries(audienceNames.map(n => [n, audienceNotes.value]))
  }
  if (styleNotes.value) {
    selectionNotes.style_notes = Object.fromEntries(styleNames.map(n => [n, styleNotes.value]))
  }
  if (formatNotes.value) {
    selectionNotes.format_notes = Object.fromEntries(formatNames.map(n => [n, formatNotes.value]))
  }

  await run(async () => {
    const { data } = await scenarioVariantsApi.runStandaloneVariants({
      brand_uuid: brandUuid.value,
      scenario: 'promotional',
      selected_audiences: audienceNames,
      selected_styles: styleNames,
      selected_formats: formatNames,
      selected_meta_frameworks: selectedMetaFrameworks.value.length > 0 ? selectedMetaFrameworks.value : undefined,
      selection_notes: Object.keys(selectionNotes).length > 0 ? selectionNotes : undefined,
    })
    return data as GenerateResult
  })
}

function exportCSV() {
  const rows = variants.value
  if (rows.length === 0 && metaVariants.value.length === 0) return

  const data = rows.map(v => {
    const adCopy = v.ad_copy ?? {}
    return {
      audience: v.audience ?? '',
      style: v.style ?? v.creative_style ?? '',
      format: v.format ?? v.ad_format ?? '',
      headline: adCopy.headline ?? v.headline ?? '',
      primary_text: adCopy.body ?? adCopy.primary_text ?? v.primary_text ?? v.body ?? '',
      cta: adCopy.cta ?? v.cta ?? '',
      visual_prompt: v.image_prompt ?? v.visual_prompt ?? '',
    }
  })

  exportCsv(data, `variant-matrix-${Date.now()}`, [
    { key: 'audience', header: 'Audience' },
    { key: 'style', header: 'Style' },
    { key: 'format', header: 'Format' },
    { key: 'headline', header: 'Headline' },
    { key: 'primary_text', header: 'Primary Text' },
    { key: 'cta', header: 'CTA' },
    { key: 'visual_prompt', header: 'Visual Prompt' },
  ])
  confetti.trigger()
}

const { setActions } = usePageActions()
setActions([{ label: t('variant.exportCSV'), icon: Download, handler: exportCSV }])
</script>

<template>
  <Topbar :title="t('variant.title')" :subtitle="t('variant.subtitle')">
    <template #actions>
      <button
        v-if="variants.length > 0"
        data-loc="variant.main.export-btn"
        class="h-9 px-3 rounded-lg border border-border/60 text-xs font-medium flex items-center gap-1.5 hover:bg-overlay-subtle transition"
        @click="exportCSV"
      >
        <Download class="h-3.5 w-3.5" /> {{ t('variant.exportCSV') }}
      </button>
    </template>
  </Topbar>

  <main class="flex-1 overflow-y-auto">
    <div class="max-w-6xl mx-auto p-4 sm:p-6 md:p-8 space-y-6">

      <!-- Brand selection -->
      <div class="surface-card p-5">
        <label class="text-xs font-medium text-muted-foreground block mb-2">{{ t('variant.selectBrand') }}</label>
        <select
          v-model="brandUuid"
          data-loc="variant.main.brand-select"
          class="w-full h-10 px-3 rounded-lg bg-overlay-subtle border border-border/60 text-sm outline-none focus:ring-1 focus:ring-primary/50"
        >
          <option value="" disabled>{{ t('variant.chooseBrand') }}</option>
          <option v-for="b in (brands ?? [])" :key="b.brand_uuid" :value="b.brand_uuid">
            {{ b.company_name }}
          </option>
        </select>
      </div>

      <!-- Step 1: Audiences -->
      <div class="surface-card p-5">
        <div class="flex items-center gap-2 mb-4">
          <Users class="h-4 w-4 text-primary" />
          <h3 class="text-sm font-semibold">{{ t('variant.step1Title') }}</h3>
        </div>
        <div v-if="!optionsLoaded" class="flex items-center gap-2 text-xs text-muted-foreground">
          <Loader2 class="h-4 w-4 animate-spin" /> {{ t('variant.loadingOptions') }}
        </div>
        <div v-else class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2">
          <button
            v-for="aud in audienceOptions" :key="aud.id"
            data-loc="variant.main.audience-btn"
            @click="toggleAudience(aud.id)"
            :class="[
              'p-3 rounded-lg border text-start text-xs transition',
              selectedAudiences.includes(aud.id)
                ? 'border-primary/60 bg-primary/10'
                : 'border-border/60 bg-overlay-subtle hover:border-border',
            ]"
          >
            <div class="flex items-center justify-between mb-1">
              <span class="font-medium">{{ aud.name }}</span>
              <Check v-if="selectedAudiences.includes(aud.id)" class="h-3.5 w-3.5 text-primary" />
            </div>
            <span class="text-muted-foreground text-[11px]">{{ aud.description }}</span>
          </button>
        </div>
        <div v-if="selectedAudiences.length > 0" class="mt-3 pt-3 border-t border-border/40">
          <textarea
            v-model="audienceNotes"
            data-loc="variant.main.audience-notes"
            :placeholder="t('variant.audienceNotesPlaceholder')"
            class="w-full p-2 rounded-lg border border-border/60 bg-overlay-subtle text-xs outline-none resize-y min-h-[48px]"
            rows="2"
          />
        </div>
      </div>

      <!-- Step 2: Styles -->
      <div class="surface-card p-5">
        <div class="flex items-center gap-2 mb-4">
          <Palette class="h-4 w-4 text-accent-magenta" />
          <h3 class="text-sm font-semibold">{{ t('variant.step2Title') }}</h3>
        </div>
        <div v-if="!optionsLoaded" class="flex items-center gap-2 text-xs text-muted-foreground">
          <Loader2 class="h-4 w-4 animate-spin" /> {{ t('variant.loadingOptions') }}
        </div>
        <div v-else class="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-2">
          <button
            v-for="style in styleOptions" :key="style.id"
            data-loc="variant.main.style-btn"
            @click="toggleStyle(style.id)"
            :class="[
              'p-3 rounded-lg border text-start text-xs transition',
              selectedStyles.includes(style.id)
                ? 'border-accent-magenta/60 bg-accent-magenta/10'
                : 'border-border/60 bg-overlay-subtle hover:border-border',
            ]"
          >
            <div class="flex items-center justify-between mb-1">
              <span class="font-medium">{{ style.name }}</span>
              <Check v-if="selectedStyles.includes(style.id)" class="h-3.5 w-3.5 text-accent-magenta" />
            </div>
            <span class="text-muted-foreground text-[11px]">{{ style.description }}</span>
          </button>
        </div>
        <div v-if="selectedStyles.length > 0" class="mt-3 pt-3 border-t border-border/40">
          <textarea
            v-model="styleNotes"
            data-loc="variant.main.style-notes"
            :placeholder="t('variant.styleNotesPlaceholder')"
            class="w-full p-2 rounded-lg border border-border/60 bg-overlay-subtle text-xs outline-none resize-y min-h-[48px]"
            rows="2"
          />
        </div>
      </div>

      <!-- Step 3: Meta Frameworks -->
      <div v-if="frameworkOptions.length > 0" class="surface-card p-5 border-s-2 border-s-accent-cyan">
        <div class="flex items-center gap-2 mb-4">
          <Bookmark class="h-4 w-4 text-accent-cyan" />
          <h3 class="text-sm font-semibold">{{ t('variant.step3Title') }}</h3>
          <span class="text-[11px] font-semibold px-1.5 py-0.5 rounded bg-accent-cyan/20 text-accent-cyan">Meta</span>
        </div>
        <div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2">
          <button
            v-for="fw in frameworkOptions" :key="fw.id"
            data-loc="variant.main.meta-framework-btn"
            @click="toggleMetaFramework(fw.id)"
            :class="[
              'p-3 rounded-lg border text-start text-xs transition',
              selectedMetaFrameworks.includes(fw.id)
                ? 'border-accent-cyan/60 bg-accent-cyan/10'
                : 'border-border/60 bg-overlay-subtle hover:border-accent-cyan/40',
            ]"
          >
            <div class="flex items-center justify-between mb-1">
              <span class="font-medium">{{ fw.name }}</span>
              <Check v-if="selectedMetaFrameworks.includes(fw.id)" class="h-3.5 w-3.5 text-accent-cyan" />
            </div>
            <span class="text-muted-foreground text-[11px] line-clamp-2">{{ fw.description }}</span>
            <div class="flex gap-1 mt-2 flex-wrap">
              <span class="text-[11px] px-1.5 py-0.5 rounded bg-overlay-medium text-muted-foreground">{{ fw.tone }}</span>
              <span v-if="fw.visual_style" class="text-[11px] px-1.5 py-0.5 rounded bg-accent-cyan/10 text-accent-cyan">{{ fw.visual_style.split(',')[0] }}</span>
            </div>
          </button>
        </div>
      </div>

      <!-- Step 4: Formats -->
      <div class="surface-card p-5">
        <div class="flex items-center gap-2 mb-4">
          <Smartphone class="h-4 w-4 text-accent-amber" />
          <h3 class="text-sm font-semibold">{{ t('variant.step4Title') }}</h3>
        </div>
        <div v-if="!optionsLoaded" class="flex items-center gap-2 text-xs text-muted-foreground">
          <Loader2 class="h-4 w-4 animate-spin" /> {{ t('variant.loadingOptions') }}
        </div>
        <div v-else class="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-2">
          <button
            v-for="fmt in formatOptions" :key="fmt.id"
            data-loc="variant.main.format-btn"
            @click="toggleFormat(fmt.id)"
            :class="[
              'p-3 rounded-lg border text-center text-xs transition',
              selectedFormats.includes(fmt.id)
                ? 'border-accent-amber/60 bg-accent-amber/10'
                : 'border-border/60 bg-overlay-subtle hover:border-border',
            ]"
          >
            <div class="font-medium">{{ fmt.name }}</div>
            <div v-if="fmt.description" class="text-[11px] text-muted-foreground mt-1 line-clamp-2">{{ fmt.description }}</div>
            <Check v-if="selectedFormats.includes(fmt.id)" class="h-3.5 w-3.5 text-accent-amber mx-auto mt-1" />
          </button>
        </div>
        <div v-if="selectedFormats.length > 0" class="mt-3 pt-3 border-t border-border/40">
          <textarea
            v-model="formatNotes"
            data-loc="variant.main.format-notes"
            :placeholder="t('variant.formatNotesPlaceholder')"
            class="w-full p-2 rounded-lg border border-border/60 bg-overlay-subtle text-xs outline-none resize-y min-h-[48px]"
            rows="2"
          />
        </div>
      </div>

      <!-- Matrix preview + Generate -->
      <div v-if="canGenerate" class="surface-card p-5 flex items-center justify-between">
        <div>
          <div class="text-xs font-semibold text-primary mb-1">{{ t('variant.matrixPreview') }}</div>
          <div class="text-xs text-muted-foreground">
            {{ selectedAudiences.length }} × {{ selectedStyles.length }} × {{ selectedFormats.length }}
            <span v-if="selectedMetaFrameworks.length > 0"> + {{ selectedMetaFrameworks.length }} {{ t('variant.frameworks') }}</span>
            = <span class="text-sm font-bold text-foreground">{{ totalVariants }}</span> {{ t('variant.totalVariants') }}
          </div>
        </div>
        <button
          data-loc="variant.main.generate-btn"
          :disabled="loading"
          class="h-10 px-5 rounded-lg bg-[image:var(--gradient-brand)] text-primary-foreground text-xs font-medium shadow-[var(--shadow-glow)] flex items-center gap-1.5 disabled:opacity-50"
          @click="generate"
        >
          <Loader2 v-if="loading" class="h-3.5 w-3.5 animate-spin" />
          <Sparkles v-else class="h-3.5 w-3.5" />
          {{ loading ? t('variant.generating') : t('variant.generate') }}
        </button>
      </div>

      <!-- Generating -->
      <div v-if="loading" class="surface-card p-8">
        <AiLoadingAnimation :message="t('variant.generating')" :description="t('variant.subtitle')" />
      </div>

      <!-- Error -->
      <div v-if="error" class="surface-card p-4 flex items-center gap-3">
        <AlertCircle class="h-5 w-5 text-destructive shrink-0" />
        <div class="flex-1 text-sm text-destructive">{{ error }}</div>
        <button class="h-8 px-3 rounded-lg border border-border/60 text-xs flex items-center gap-1.5" @click="generate">
          <RefreshCw class="h-3 w-3" /> {{ t('seg.retry') }}
        </button>
      </div>

      <!-- Results -->
      <div v-if="variants.length > 0">
        <div class="flex items-center justify-between mb-4">
          <h3 class="text-sm font-semibold">{{ variants.length }} {{ t('variant.totalVariants') }}</h3>
          <div class="flex gap-1 bg-overlay-subtle rounded-lg p-0.5">
            <button
              data-loc="variant.main.view-cards"
              @click="viewMode = 'cards'"
              :class="['min-h-[44px] px-2.5 py-1 rounded text-xs font-medium transition', viewMode === 'cards' ? 'bg-overlay-medium text-foreground' : 'text-muted-foreground']"
            >
              {{ t('variant.cards') }}
            </button>
            <button
              data-loc="variant.main.view-table"
              @click="viewMode = 'table'"
              :class="['min-h-[44px] px-2.5 py-1 rounded text-xs font-medium transition', viewMode === 'table' ? 'bg-overlay-medium text-foreground' : 'text-muted-foreground']"
            >
              {{ t('variant.table') }}
            </button>
          </div>
        </div>

        <!-- Cards View -->
        <div v-if="viewMode === 'cards'" class="grid grid-cols-1 lg:grid-cols-2 gap-3">
          <div v-for="(v, idx) in variants" :key="idx" data-loc="variant.main.variant-card" class="surface-card p-4">
            <div class="flex flex-wrap gap-1.5 mb-3">
              <span class="text-[11px] px-2 py-0.5 rounded-full bg-accent-cyan/15 text-accent-cyan">{{ v.audience }}</span>
              <span class="text-[11px] px-2 py-0.5 rounded-full bg-accent-magenta/15 text-accent-magenta">{{ v.style ?? v.creative_style }}</span>
              <span class="text-[11px] px-2 py-0.5 rounded-full bg-accent-amber/15 text-accent-amber">{{ v.format ?? v.ad_format }}</span>
            </div>
            <template v-if="v.ad_copy && typeof v.ad_copy === 'object'">
              <div v-if="v.ad_copy.headline" class="font-semibold text-sm mb-2">{{ v.ad_copy.headline }}</div>
              <div class="text-xs text-muted-foreground mb-2">{{ v.ad_copy.body ?? v.ad_copy.primary_text }}</div>
              <span v-if="v.ad_copy.cta" class="inline-block text-[10px] px-2 py-0.5 rounded bg-overlay-medium border border-border/40 text-muted-foreground cursor-default select-none">
                {{ t('variant.ctaLabel') }}: {{ v.ad_copy.cta }}
              </span>
            </template>
            <template v-else>
              <div v-if="v.headline" class="font-semibold text-sm mb-2">{{ v.headline }}</div>
              <div class="text-xs text-muted-foreground mb-2">{{ v.primary_text ?? v.body }}</div>
              <span v-if="v.cta" class="inline-block text-[10px] px-2 py-0.5 rounded bg-overlay-medium border border-border/40 text-muted-foreground cursor-default select-none">
                {{ t('variant.ctaLabel') }}: {{ v.cta }}
              </span>
            </template>
            <div v-if="v.image_prompt ?? v.visual_prompt" class="mt-3 pt-3 border-t border-border/40">
              <div class="text-[11px] font-medium text-muted-foreground mb-1">{{ t('variant.visualPrompt') }}</div>
              <div class="text-[11px] text-muted-foreground italic line-clamp-3">{{ v.image_prompt ?? v.visual_prompt }}</div>
            </div>
          </div>
        </div>

        <!-- Table View -->
        <div v-else class="surface-card overflow-hidden">
          <div class="overflow-x-auto">
            <table class="w-full text-xs">
              <thead class="border-b border-border/60 bg-overlay-subtle">
                <tr>
                  <th class="px-3 py-2 text-start font-semibold text-muted-foreground">{{ t('variant.audience') }}</th>
                  <th class="px-3 py-2 text-start font-semibold text-muted-foreground">{{ t('variant.style') }}</th>
                  <th class="px-3 py-2 text-start font-semibold text-muted-foreground">{{ t('variant.format') }}</th>
                  <th class="px-3 py-2 text-start font-semibold text-muted-foreground">{{ t('variant.headline') }}</th>
                  <th class="px-3 py-2 text-start font-semibold text-muted-foreground">{{ t('variant.adCopy') }}</th>
                  <th class="px-3 py-2 text-start font-semibold text-muted-foreground">{{ t('variant.cta') }}</th>
                </tr>
              </thead>
              <tbody class="divide-y divide-border/40">
                <tr v-for="(v, idx) in variants" :key="idx" class="hover:bg-overlay-subtle">
                  <td class="px-3 py-2">{{ v.audience }}</td>
                  <td class="px-3 py-2">{{ v.style ?? v.creative_style }}</td>
                  <td class="px-3 py-2">{{ v.format ?? v.ad_format }}</td>
                  <td class="px-3 py-2 max-w-[200px] truncate">{{ v.ad_copy?.headline ?? v.headline }}</td>
                  <td class="px-3 py-2 max-w-[200px] truncate text-muted-foreground">{{ v.ad_copy?.body ?? v.ad_copy?.primary_text ?? v.primary_text }}</td>
                  <td class="px-3 py-2 text-muted-foreground">{{ v.ad_copy?.cta ?? v.cta }}</td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>
      </div>

      <!-- Meta Framework Variants -->
      <div v-if="metaVariants.length > 0">
        <div class="flex items-center gap-2 mb-4">
          <Bookmark class="h-4 w-4 text-accent-cyan" />
          <h3 class="text-sm font-semibold">{{ metaVariants.length }} Meta Creative {{ t('variant.totalVariants') }}</h3>
          <span class="text-[11px] px-1.5 py-0.5 rounded bg-accent-cyan/20 text-accent-cyan">Meta</span>
        </div>
        <div class="grid grid-cols-1 lg:grid-cols-2 gap-3">
          <div v-for="(mv, idx) in metaVariants" :key="`meta-${idx}`" data-loc="variant.main.meta-variant-card" class="surface-card p-4 border-s-2 border-s-accent-cyan">
            <div class="flex flex-wrap gap-1.5 mb-3">
              <span class="text-[11px] px-2 py-0.5 rounded-full bg-accent-cyan/15 text-accent-cyan">{{ mv.framework_name ?? mv.framework ?? 'Framework' }}</span>
              <span v-if="mv.audience" class="text-[11px] px-2 py-0.5 rounded-full bg-accent-magenta/15 text-accent-magenta">{{ mv.audience }}</span>
            </div>
            <div v-if="mv.headline ?? mv.ad_copy?.headline" class="font-semibold text-sm mb-2">{{ mv.headline ?? mv.ad_copy?.headline }}</div>
            <div class="text-xs text-muted-foreground mb-2">{{ mv.primary_text ?? mv.ad_copy?.body }}</div>
            <span v-if="mv.cta ?? mv.ad_copy?.cta" class="inline-block text-[10px] px-2 py-0.5 rounded bg-overlay-medium border border-border/40 text-muted-foreground cursor-default select-none">
              {{ t('variant.ctaLabel') }}: {{ mv.cta ?? mv.ad_copy?.cta }}
            </span>
            <div v-if="mv.image_prompt ?? mv.visual_prompt" class="mt-3 pt-3 border-t border-border/40">
              <div class="text-[11px] font-medium text-muted-foreground mb-1">{{ t('variant.visualPrompt') }}</div>
              <div class="text-[11px] text-muted-foreground italic line-clamp-3">{{ mv.image_prompt ?? mv.visual_prompt }}</div>
            </div>
          </div>
        </div>
      </div>

      <!-- Empty State -->
      <div v-if="!result && !loading && variants.length === 0" class="surface-card p-12 text-center">
        <Grid3X3 class="h-12 w-12 text-muted-foreground/40 mx-auto mb-3" />
        <div class="text-sm font-medium text-muted-foreground mb-1">{{ t('variant.emptyTitle') }}</div>
        <div class="text-xs text-muted-foreground/70">{{ t('variant.emptyDesc') }}</div>
      </div>
    </div>
  </main>
</template>
