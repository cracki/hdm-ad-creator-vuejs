<script setup lang="ts">
import { ref } from 'vue'
import { useRouter } from 'vue-router'
import { ArrowLeft, Megaphone } from 'lucide-vue-next'
import Topbar from '@/layout/Topbar.vue'
import { useI18n } from '@/shared/utils/i18n'
import { useBrands } from '@/features/brands/queries'
import { useAutoSelectBrand } from '@/shared/composables/useAutoSelectBrand'
import { useCreateCampaign } from '../queries'

const router = useRouter()
const { t } = useI18n()

const { data: brands } = useBrands()
const createMutation = useCreateCampaign()

const selectedBrandUuid = ref('')
useAutoSelectBrand(selectedBrandUuid)
const campaignName = ref('')
const creating = ref(false)

async function handleCreate() {
  if (!selectedBrandUuid.value) return
  creating.value = true
  try {
    const result = await createMutation.mutateAsync({
      brand_uuid: selectedBrandUuid.value,
      name: campaignName.value || undefined,
    })
    router.push(`/campaigns/${result.data.campaign_uuid}`)
  } finally {
    creating.value = false
  }
}
</script>

<template>
  <Topbar :title="t('camp.createTitle')" :subtitle="t('camp.createSubtitle')" />
  <main class="flex-1 p-4 sm:p-6">
    <div class="max-w-xl mx-auto space-y-6">
      <!-- Brand selection -->
      <div v-if="brands && brands.length > 1">
        <label class="text-xs font-medium mb-2 block">{{ t('camp.selectBrand') }}</label>
        <div class="grid gap-2">
          <button
            v-for="brand in brands"
            :key="brand.brand_uuid"
            :class="[
              'surface-card p-4 text-start transition',
              selectedBrandUuid === brand.brand_uuid ? 'border-primary ring-1 ring-primary/40' : 'hover:border-primary/40',
            ]"
            data-loc="campaigns.create.brand-select"
            @click="selectedBrandUuid = brand.brand_uuid"
          >
            <div class="flex items-center gap-3">
              <div class="h-9 w-9 rounded-lg bg-overlay-light grid place-items-center shrink-0">
                <Megaphone class="h-4 w-4 text-muted-foreground" />
              </div>
              <div class="min-w-0">
                <div class="text-sm font-medium truncate">{{ brand.company_name }}</div>
                <div class="text-xs text-muted-foreground truncate">{{ brand.website_url }}</div>
              </div>
            </div>
          </button>
          <div v-if="!brands?.length" class="surface-card p-6 text-center">
            <p class="text-sm text-muted-foreground">{{ t('camp.noBrands') }}</p>
            <button
              class="mt-3 h-8 px-3 rounded-lg border border-border/60 text-xs"
              @click="router.push('/brands/new')"
            >
              {{ t('camp.createBrand') }}
            </button>
          </div>
        </div>
      </div>

      <!-- Campaign name -->
      <div>
        <label class="text-xs font-medium mb-2 block">{{ t('camp.campaignName') }}</label>
        <input
          v-model="campaignName"
          :placeholder="t('camp.namePlaceholder')"
          class="w-full h-10 px-3 rounded-lg bg-overlay-subtle border border-border/60 text-sm outline-none focus:border-primary/60 transition"
          data-loc="campaigns.create.name-input"
        />
      </div>

      <!-- Actions -->
      <div class="flex items-center gap-3 pt-2">
        <button
          class="h-10 px-4 rounded-lg border border-border/60 text-xs font-medium hover:bg-overlay-subtle transition flex items-center gap-1.5"
          data-loc="campaigns.create.cancel-btn"
          @click="router.back()"
        >
          <ArrowLeft class="h-3.5 w-3.5" /> {{ t('camp.cancel') }}
        </button>
        <button
          :disabled="!selectedBrandUuid || creating"
          :class="[
            'h-10 px-5 rounded-lg text-xs font-medium flex items-center gap-1.5 transition',
            selectedBrandUuid && !creating
              ? 'bg-[image:var(--gradient-brand)] text-primary-foreground shadow-[var(--shadow-glow)]'
              : 'bg-overlay-subtle text-muted-foreground cursor-not-allowed',
          ]"
          data-loc="campaigns.create.create-btn"
          @click="handleCreate"
        >
          <span v-if="creating" class="animate-spin rounded-full h-3.5 w-3.5 border-b-2 border-primary-foreground" />
          {{ creating ? t('camp.creating') : t('camp.createBtn') }}
        </button>
      </div>
    </div>
  </main>
</template>
