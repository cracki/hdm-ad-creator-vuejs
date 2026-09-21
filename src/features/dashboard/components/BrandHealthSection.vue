<script setup lang="ts">
import { computed } from 'vue'
import { RouterLink } from 'vue-router'
import { Activity, ChevronRight } from 'lucide-vue-next'
import { useI18n } from '@/shared/utils/i18n'
import { useBrands } from '@/features/brands/queries'

/**
 * Honest brand list — links to each brand and its analysis. The previous
 * heuristic "brand score" radar (fabricated from name length / account age)
 * was removed: no real brand-health score exists in the dashboard queries.
 */
const { t } = useI18n()
const { data: brands } = useBrands()

const brandList = computed(() => brands.value ?? [])

function getCompanyInitial(name: string): string {
  return name.charAt(0).toUpperCase()
}
</script>

<template>
  <div data-loc="dashboard.brand-health">
    <!-- Empty State -->
    <div
      v-if="brandList.length === 0"
      class="flex flex-col items-center justify-center py-12 text-center"
    >
      <div class="h-12 w-12 rounded-xl bg-primary/10 grid place-items-center mb-3">
        <Activity class="h-6 w-6 text-primary" />
      </div>
      <p class="text-sm text-muted-foreground">
        {{ t('dashboard.brandHealth.noBrands' as any) }}
      </p>
    </div>

    <!-- Brand List -->
    <div v-else class="space-y-2">
      <RouterLink
        v-for="brand in brandList"
        :key="brand.brand_uuid"
        :to="`/brands/${brand.brand_uuid}`"
        class="flex items-center gap-3 p-2.5 rounded-lg hover:bg-white/5 transition-colors group"
      >
        <!-- Company Initial -->
        <div
          class="h-8 w-8 rounded-full bg-primary/10 text-primary grid place-items-center text-xs font-bold shrink-0"
        >
          {{ getCompanyInitial(brand.company_name) }}
        </div>

        <!-- Name + Industry -->
        <div class="flex-1 min-w-0">
          <p class="text-sm font-medium truncate group-hover:text-primary transition-colors">
            {{ brand.company_name }}
          </p>
          <p v-if="brand.selected_industry?.name" class="text-[11px] text-muted-foreground truncate">
            {{ brand.selected_industry.name }}
          </p>
        </div>

        <ChevronRight class="h-4 w-4 text-muted-foreground/50 shrink-0 rtl:rotate-180" />
      </RouterLink>
    </div>
  </div>
</template>
