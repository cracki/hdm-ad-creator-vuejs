<script setup lang="ts">
import { ref, computed } from 'vue'
import { useRoute } from 'vue-router'
import Topbar from '@/layout/Topbar.vue'
import { useI18n } from '@/shared/utils/i18n'
import { useToast } from '@/shared/composables/useToast'
import { brandsApi } from '@/features/brands/api'
import { useBrandAssets, useAnalyzeAsset } from '@/features/brands/queries'
import AssetCard from '@/features/brands/components/AssetCard.vue'
import { Upload, Plus } from 'lucide-vue-next'

const route = useRoute()
const { t } = useI18n()
const toast = useToast()

const brandUuid = computed(() => route.params.brandUuid as string)
const { data: assets, isLoading, error } = useBrandAssets(brandUuid)
const analyzeMutation = useAnalyzeAsset(brandUuid)

const uploading = ref(false)
const fileInput = ref<HTMLInputElement | null>(null)

function openFilePicker() {
  fileInput.value?.click()
}

async function handleFileUpload(event: Event) {
  const input = event.target as HTMLInputElement
  const file = input.files?.[0]
  if (!file) return

  uploading.value = true
  try {
    const formData = new FormData()
    formData.append('file', file)
    formData.append('asset_type', 'product')
    await brandsApi.uploadAsset(brandUuid.value, formData)
    toast.success(t('assets.uploaded'))
  } catch {
    toast.error(t('assets.uploadError'))
  } finally {
    uploading.value = false
    if (fileInput.value) fileInput.value.value = ''
  }
}

function handleAnalyze(assetUuid: string) {
  analyzeMutation.mutate(assetUuid, {
    onSuccess: () => toast.success(t('assets.analysisComplete')),
    onError: () => toast.error(t('assets.analysisError')),
  })
}

const analyzingUuid = computed(() =>
  analyzeMutation.isPending.value ? analyzeMutation.variables.value : null
)
</script>

<template>
  <Topbar :title="t('assets.title')" :subtitle="t('assets.subtitle')" />
  <main class="flex-1 p-4 sm:p-6 overflow-y-auto">
    <input ref="fileInput" type="file" accept="image/*" class="hidden" @change="handleFileUpload" />

    <!-- Loading -->
    <div v-if="isLoading" class="flex items-center justify-center py-20">
      <div class="text-sm text-muted-foreground">{{ t('common.loading') }}</div>
    </div>

    <!-- Error -->
    <div v-else-if="error" class="flex flex-col items-center justify-center py-20 gap-3">
      <div class="text-sm text-destructive">{{ t('common.somethingWrong') }}</div>
      <button class="text-xs text-primary hover:underline" @click="$router.go(0)">{{ t('common.retry') }}</button>
    </div>

    <!-- Empty state -->
    <div v-else-if="!assets?.length" class="flex flex-col items-center justify-center py-20 gap-4">
      <div class="h-16 w-16 rounded-2xl bg-white/[0.04] border border-border/60 grid place-items-center">
        <Upload class="h-6 w-6 text-muted-foreground" />
      </div>
      <div class="text-center space-y-1">
        <div class="text-sm font-medium">{{ t('assets.emptyTitle') }}</div>
        <div class="text-xs text-muted-foreground">{{ t('assets.emptyDesc') }}</div>
      </div>
      <button
        class="h-9 px-4 rounded-lg bg-[image:var(--gradient-brand)] text-primary-foreground text-xs font-medium shadow-[var(--shadow-glow)] flex items-center gap-1.5"
        @click="openFilePicker"
      >
        <Plus class="h-3.5 w-3.5" /> {{ t('assets.upload') }}
      </button>
    </div>

    <!-- Asset grid -->
    <template v-else>
      <div class="flex items-center justify-between mb-6">
        <div class="text-sm text-muted-foreground">
          {{ t('assets.count', { count: assets.length }) }}
        </div>
        <button
          :disabled="uploading"
          class="h-9 px-4 rounded-lg border border-border/60 text-xs font-medium hover:bg-white/[0.04] transition flex items-center gap-1.5"
          @click="openFilePicker"
        >
          <Upload class="h-3.5 w-3.5" />
          {{ uploading ? '...' : t('assets.upload') }}
        </button>
      </div>

      <div class="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4">
        <AssetCard
          v-for="asset in assets"
          :key="asset.asset_uuid"
          :asset="asset"
          :analyzing="analyzingUuid === asset.asset_uuid"
          @analyze="handleAnalyze"
        />
      </div>
    </template>
  </main>
</template>
