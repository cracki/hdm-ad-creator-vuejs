<script setup lang="ts">
import { computed } from 'vue'
import { Brain, Check, ExternalLink } from 'lucide-vue-next'
import { useI18n } from '@/shared/utils/i18n'
import type { Campaign } from '@/features/campaigns/types'

const props = defineProps<{ campaign: Campaign; campaignUuid: string }>()
const { t } = useI18n()

const brand = computed(() => props.campaign.brand)
const ctx = computed(() => props.campaign.context_payload as any)
</script>

<template>
  <div class="space-y-5">
    <header class="flex items-start gap-2.5 sm:gap-4">
      <div class="h-10 w-10 sm:h-12 sm:w-12 rounded-xl bg-[image:var(--gradient-brand)] grid place-items-center shadow-[var(--shadow-glow)] shrink-0">
        <Brain class="h-5 w-5 text-primary-foreground" />
      </div>
      <div class="min-w-0">
        <div class="text-[11px] font-semibold uppercase tracking-[0.16em] text-primary">{{ t('smart.stepOf') }} 1 / 10</div>
        <h2 class="text-lg sm:text-2xl font-semibold tracking-tight mt-1">{{ t('smart.s1') }}</h2>
        <p class="text-sm text-muted-foreground mt-1 line-clamp-2">{{ t('smart.aiInsights') }}</p>
      </div>
    </header>

    <div class="surface-card p-5 space-y-4">
      <div class="text-sm font-semibold">{{ t('newbrand.row.company') }}</div>
      <div class="grid sm:grid-cols-2 gap-4 text-xs">
        <div>
          <div class="text-muted-foreground mb-1">{{ t('newbrand.row.company') }}</div>
          <div class="font-medium">{{ brand?.company_name ?? '—' }}</div>
        </div>
        <div>
          <div class="text-muted-foreground mb-1">{{ t('newbrand.row.website') }}</div>
          <div class="font-medium truncate flex items-center gap-1">
            {{ brand?.website_url ?? '—' }}
            <a v-if="brand?.website_url" :href="brand.website_url" target="_blank" class="text-primary">
              <ExternalLink class="h-3 w-3" />
            </a>
          </div>
        </div>
        <div>
          <div class="text-muted-foreground mb-1">{{ t('camp.industry') }}</div>
          <div class="font-medium">{{ brand?.selected_industry?.name ?? '—' }}</div>
        </div>
        <div>
          <div class="text-muted-foreground mb-1">{{ t('smart.s2') }}</div>
          <div class="font-medium">{{ ctx?.segmentation_data ? t('status.completed') : t('smart.locked') }}</div>
        </div>
      </div>
    </div>

    <div class="surface-card p-5 flex items-center gap-3">
      <div class="h-8 w-8 rounded-lg bg-success/15 border border-success/40 grid place-items-center">
        <Check class="h-4 w-4 text-success" />
      </div>
      <div class="flex-1">
        <div class="text-xs font-medium">{{ t('smart.approved') }}</div>
        <div class="text-[11px] text-muted-foreground">{{ t('smart.s1') }} — {{ t('smart.aiInsights') }}</div>
      </div>
    </div>
  </div>
</template>
