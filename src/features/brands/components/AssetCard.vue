<script setup lang="ts">
import { ref, computed } from 'vue'
import { Sparkles, Loader2, ChevronDown, ChevronUp, Image } from 'lucide-vue-next'
import { useI18n } from '@/shared/utils/i18n'
import type { BrandAsset } from '@/features/brands/types'
import AssetAnalysisResults from './AssetAnalysisResults.vue'

const props = defineProps<{
  asset: BrandAsset
  analyzing?: boolean
}>()

const emit = defineEmits<{
  analyze: [assetUuid: string]
}>()

const { t } = useI18n()
const showResults = ref(false)
const hasAnalysis = computed(() => !!props.asset.analysis_data)
</script>

<template>
  <div class="surface-card overflow-hidden">
    <!-- Thumbnail -->
    <div class="aspect-square bg-overlay-subtle relative flex items-center justify-center overflow-hidden">
      <img
        v-if="asset.file_url || asset.file"
        :src="asset.file_url || asset.file"
        :alt="asset.asset_type"
        class="w-full h-full object-cover"
      />
      <Image v-else class="h-8 w-8 text-muted-foreground/40" />

      <!-- Type badge -->
      <span class="absolute top-2 start-2 text-[11px] px-2 py-0.5 rounded-full bg-overlay-medium border border-border/60 capitalize">
        {{ asset.asset_type }}
      </span>

      <!-- Analyzed badge -->
      <span v-if="hasAnalysis" class="absolute top-2 end-2 text-[11px] px-2 py-0.5 rounded-full bg-success/15 text-success border border-success/30">
        {{ t('status.analyzed') }}
      </span>
    </div>

    <!-- Actions -->
    <div class="p-3 space-y-2">
      <div class="flex items-center gap-2">
        <button
          v-if="!hasAnalysis"
          :disabled="analyzing"
          data-loc="brands.assets.analyze-btn"
          class="flex-1 h-8 rounded-md bg-overlay-light border border-border/60 text-xs font-medium flex items-center justify-center gap-1.5 hover:bg-overlay-medium transition disabled:opacity-50"
          @click="emit('analyze', asset.asset_uuid)"
        >
          <Loader2 v-if="analyzing" class="h-3 w-3 animate-spin" />
          <Sparkles v-else class="h-3 w-3 text-primary" />
          {{ analyzing ? t('status.analyzing') : t('assets.analyze') }}
        </button>
        <button
          v-if="hasAnalysis"
          class="flex-1 h-8 rounded-md bg-overlay-light border border-border/60 text-xs font-medium flex items-center justify-center gap-1.5 hover:bg-overlay-medium transition"
          @click="showResults = !showResults"
        >
          {{ showResults ? t('common.close') : t('assets.viewResults') }}
          <ChevronUp v-if="showResults" class="h-3 w-3" />
          <ChevronDown v-else class="h-3 w-3" />
        </button>
      </div>

      <!-- Analysis Results -->
      <AssetAnalysisResults v-if="showResults && hasAnalysis" :data="asset.analysis_data!" />
    </div>
  </div>
</template>
