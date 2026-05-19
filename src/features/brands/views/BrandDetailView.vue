<script setup lang="ts">
import { computed, ref } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import Topbar from '@/layout/Topbar.vue'
import { useBrand, useDeleteBrand, useAnalysisRuns } from '@/features/brands/queries'
import { useI18n } from '@/shared/utils/i18n'
import { useToast } from '@/shared/composables/useToast'
import { usePageActions } from '@/shared/composables/usePageActions'
import Breadcrumb from '@/shared/components/Breadcrumb.vue'
import { Globe, Trash2, Pencil, Sparkles, Clock, CheckCircle2, XCircle, Loader2, BarChart3, ChevronLeft } from 'lucide-vue-next'
import ConfirmDialog from '@/shared/components/ConfirmDialog.vue'

const route = useRoute()
const router = useRouter()
const { t } = useI18n()
const toast = useToast()

const brandUuid = computed(() => route.params.brandUuid as string)
const { setActions } = usePageActions()

const breadcrumbs = computed(() => [
  { label: t('breadcrumb.brands'), to: '/brands' },
  { label: brand.value?.company_name ?? '' },
])
const { data: brand, isLoading } = useBrand(brandUuid)
const { data: analysisRuns } = useAnalysisRuns(brandUuid)
const deleteMutation = useDeleteBrand()

const activeTab = ref<'overview' | 'analysis'>('overview')
const showDeleteDialog = ref(false)

const competitorLink = computed(() => `/brands/${brandUuid.value}/competitors`)
const socialLink = computed(() => `/brands/${brandUuid.value}/social`)

const latestRun = computed(() => analysisRuns.value?.[0] ?? null)
const hasAnalysis = computed(() => !!latestRun.value)

function runStatusBadge(run: any) {
  switch (run.status) {
    case 'completed': return { icon: CheckCircle2, cls: 'text-success bg-success/10', label: t('analysis.status.completed') }
    case 'failed': return { icon: XCircle, cls: 'text-destructive bg-destructive/10', label: t('analysis.status.failed') }
    case 'running': case 'pending': return { icon: Loader2, cls: 'text-info bg-info/10', label: t('analysis.status.running'), spin: true }
    default: return { icon: Clock, cls: 'text-muted-foreground bg-overlay-subtle', label: run.status }
  }
}

async function handleDelete() {
  if (!brand.value) return
  showDeleteDialog.value = true
}

async function confirmDelete() {
  if (!brand.value) return
  try {
    await deleteMutation.mutateAsync(brand.value.brand_uuid)
    toast.success(t('common.deleted'))
    router.push('/brands')
  } catch {
    toast.error(t('common.operationFailed'))
  }
}

setActions([
  { label: 'Edit', icon: Pencil, to: `/brands/${brandUuid.value}/edit` },
  { label: 'Delete', icon: Trash2, handler: handleDelete, variant: 'destructive' },
])
</script>

<template>
  <Topbar
    :title="brand?.company_name ?? 'Loading…'"
    :subtitle="brand?.website_url ?? ''"
  >
    <template #actions>
      <RouterLink
        :to="`/brands/${brandUuid}/edit`"
        data-loc="brands.detail.edit-btn"
        class="hidden sm:inline-flex items-center gap-1.5 h-9 px-3.5 rounded-lg border border-border/60 text-xs font-medium hover:bg-overlay-subtle transition"
      >
        <Pencil class="h-3.5 w-3.5" /> Edit
      </RouterLink>
      <button
        @click="handleDelete"
        data-loc="brands.detail.delete-btn"
        class="hidden sm:inline-flex items-center gap-1.5 h-9 px-3.5 rounded-lg border border-destructive/40 text-destructive text-xs font-medium hover:bg-destructive/10 transition"
      >
        <Trash2 class="h-3.5 w-3.5" /> Delete
      </button>
    </template>
  </Topbar>

  <main class="flex-1 p-4 sm:p-6 overflow-y-auto">
    <Breadcrumb :items="breadcrumbs" :show-back="true" back-to="/brands" />
    <div v-if="isLoading" class="surface-card p-6 shimmer h-64" />

    <div v-else-if="brand" class="max-w-3xl mx-auto space-y-5">
      <!-- Tabs -->
      <div class="flex gap-1 p-1 rounded-lg bg-overlay-subtle border border-border/40 w-fit">
        <button
          v-for="tab in (['overview', 'analysis'] as const)"
          :key="tab"
          @click="activeTab = tab"
          :data-loc="`brands.detail.tab-${tab}`"
          :class="[
            'h-8 px-3 rounded-md text-xs font-medium transition',
            activeTab === tab
              ? 'bg-[image:var(--gradient-brand)] text-primary-foreground shadow-sm'
              : 'text-muted-foreground hover:text-foreground hover:bg-overlay-subtle',
          ]"
        >
          {{ t(`analysis.tab.${tab}`) }}
        </button>
      </div>

      <!-- Overview Tab -->
      <template v-if="activeTab === 'overview'">
        <div class="surface-card p-6">
          <div class="grid grid-cols-2 sm:grid-cols-3 gap-x-6 gap-y-4">
            <div class="col-span-2 sm:col-span-1">
              <div class="text-xs text-muted-foreground mb-1">{{ t('newbrand.row.company') }}</div>
              <div class="font-semibold">{{ brand.company_name }}</div>
            </div>
            <div class="col-span-2 sm:col-span-1 min-w-0">
              <div class="text-xs text-muted-foreground mb-1">{{ t('newbrand.row.website') }}</div>
              <div class="flex items-center gap-2 min-w-0">
                <Globe class="h-3.5 w-3.5 text-muted-foreground shrink-0" />
                <a :href="brand.website_url" target="_blank" class="text-primary hover:underline truncate">{{ brand.website_url }}</a>
              </div>
            </div>
            <div v-if="brand.selected_industry">
              <div class="text-xs text-muted-foreground mb-1">{{ t('newbrand.row.industry') }}</div>
              <span class="text-xs px-2 py-0.5 rounded-full border border-border/60 text-muted-foreground">
                {{ brand.selected_industry.name }}
              </span>
            </div>
            <div>
              <div class="text-xs text-muted-foreground mb-1">Created</div>
              <div class="text-sm">{{ new Date(brand.created_at).toLocaleDateString() }}</div>
            </div>
            <div>
              <div class="text-xs text-muted-foreground mb-1">Updated</div>
              <div class="text-sm">{{ new Date(brand.updated_at).toLocaleDateString() }}</div>
            </div>
          </div>
        </div>
      </template>

      <!-- Analysis Tab -->
      <template v-if="activeTab === 'analysis'">
        <div v-if="hasAnalysis && latestRun" class="space-y-3">
          <!-- Latest run card -->
          <div
            class="surface-card p-5 flex items-center gap-4 hover:border-primary/40 transition cursor-pointer"
            @click="router.push(`/brands/${brandUuid}/analysis/${latestRun.analysis_run_uuid}`)"
          >
            <div :class="['h-10 w-10 rounded-xl grid place-items-center shrink-0', runStatusBadge(latestRun).cls]">
              <component :is="runStatusBadge(latestRun).icon" :class="['h-5 w-5', runStatusBadge(latestRun).spin ? 'animate-spin' : '']" />
            </div>
            <div class="flex-1 min-w-0">
              <div class="font-medium text-sm">{{ runStatusBadge(latestRun).label }}</div>
              <div class="text-xs text-muted-foreground">{{ new Date(latestRun.created_at).toLocaleString() }}</div>
            </div>
            <ChevronLeft class="h-4 w-4 text-muted-foreground rotate-180" />
          </div>

          <div class="flex gap-2">
            <RouterLink
              :to="`/brands/${brandUuid}/analysis`"
              data-loc="brands.detail.new-analysis-btn"
              class="inline-flex items-center gap-1.5 h-9 px-3.5 rounded-lg bg-[image:var(--gradient-brand)] text-primary-foreground text-xs font-medium shadow-[var(--shadow-glow)] hover:opacity-95 transition"
            >
              <Sparkles class="h-3.5 w-3.5" /> {{ t('analysis.newAnalysis') }}
            </RouterLink>
            <RouterLink
              :to="`/brands/${brandUuid}/analysis/history`"
              data-loc="brands.detail.view-history-btn"
              class="inline-flex items-center gap-1.5 h-9 px-3.5 rounded-lg border border-border/60 text-xs font-medium hover:bg-overlay-subtle transition"
            >
              <BarChart3 class="h-3.5 w-3.5" /> {{ t('analysis.viewHistory') }}
            </RouterLink>
          </div>
        </div>

        <!-- No analysis yet -->
        <div v-else class="surface-card p-8 text-center space-y-4">
          <div class="h-14 w-14 rounded-2xl bg-[image:var(--gradient-brand)] grid place-items-center mx-auto shadow-[var(--shadow-glow)]">
            <Sparkles class="h-6 w-6 text-primary-foreground" />
          </div>
          <div>
            <div class="font-semibold mb-1">{{ t('analysis.noAnalysisTitle') }}</div>
            <div class="text-sm text-muted-foreground">{{ t('analysis.noAnalysisDesc') }}</div>
          </div>
          <RouterLink
            :to="`/brands/${brandUuid}/analysis`"
            class="inline-flex items-center gap-1.5 h-9 px-4 rounded-lg bg-[image:var(--gradient-brand)] text-primary-foreground text-xs font-medium shadow-[var(--shadow-glow)] hover:opacity-95 transition"
          >
            <Sparkles class="h-3.5 w-3.5" /> {{ t('analysis.startAnalysis') }}
          </RouterLink>
        </div>
      </template>

      <!-- Competitor & Social links -->
      <div class="grid sm:grid-cols-2 gap-3 pt-2">
        <RouterLink
          :to="competitorLink"
          data-loc="brands.detail.competitors-link"
          class="surface-card p-4 flex items-center gap-3 hover:border-primary/40 transition"
        >
          <BarChart3 class="h-5 w-5 text-muted-foreground shrink-0" />
          <div>
            <div class="font-medium text-sm">{{ t('nav.competitors') }}</div>
            <div class="text-xs text-muted-foreground">{{ t('competitors.subtitle') }}</div>
          </div>
        </RouterLink>
        <RouterLink
          :to="socialLink"
          data-loc="brands.detail.social-link"
          class="surface-card p-4 flex items-center gap-3 hover:border-primary/40 transition"
        >
          <Globe class="h-5 w-5 text-muted-foreground shrink-0" />
          <div>
            <div class="font-medium text-sm">{{ t('social.title') }}</div>
            <div class="text-xs text-muted-foreground">{{ t('social.subtitle') }}</div>
          </div>
        </RouterLink>
      </div>
    </div>
  </main>

  <ConfirmDialog
    :open="showDeleteDialog"
    :title="t('common.delete')"
    :description="`Delete '${brand?.company_name}'?`"
    :confirm-label="t('common.delete')"
    :destructive="true"
    @confirm="confirmDelete"
    @cancel="showDeleteDialog = false"
  />
</template>
