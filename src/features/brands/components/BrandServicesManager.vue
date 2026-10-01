<script setup lang="ts">
import { computed, ref } from 'vue'
import { Briefcase, Plus, X, Loader2, AlertTriangle, ScanSearch } from 'lucide-vue-next'
import { useI18n } from '@/shared/utils/i18n'
import type { TKey } from '@/shared/utils/translations'
import {
  useManagedBrandServices,
  useCreateManagedBrandService,
  useDeleteManagedBrandService,
  useBrandServices,
  useCheckServiceRelatedness,
} from '../queries'

/**
 * Edit-mode services management (QA Fix 4, round 3 fix 5). TWO sections:
 *  - "Your services": the brand's MANAGED rows — editable (add / remove);
 *  - "Detected by scan/analysis": read-only chips from the merged list,
 *    because scanned services only become managed rows when promoted.
 * Adding runs the relatedness check first (round 3 fix 1): an unrelated
 * service warns once, a second submit force-adds.
 */
const props = defineProps<{
  brandUuid: string
}>()

const { t } = useI18n()

const brandUuidRef = computed(() => props.brandUuid)

const { data: services, isLoading } = useManagedBrandServices(brandUuidRef)
const createMutation = useCreateManagedBrandService(brandUuidRef)
const deleteMutation = useDeleteManagedBrandService(brandUuidRef)
const checkMutation = useCheckServiceRelatedness(brandUuidRef)

// QA round 3 fix 5: detected (scan/analysis) services that are not managed
// rows yet — read-only chips so the edit page reflects the scan.
const { data: detectedServices } = useBrandServices(brandUuidRef)
const detected = computed(() =>
  (detectedServices.value ?? []).filter((s) => (s.source as string) !== 'manual'),
)

const newName = ref('')
const error = ref('')
const unrelatedWarning = ref('')
const warnedName = ref('')
const deletingUuid = ref<string | null>(null)

const SOURCE_LABEL_KEYS: Record<string, TKey> = {
  scraped: 'brandServices.source.scraped',
  brand_analysis: 'brandServices.source.brandAnalysis',
  ppc_viability: 'brandServices.source.ppcViability',
  manual: 'brandServices.source.manual',
  scan: 'brandServices.source.scanned',
  campaign: 'brandServices.source.campaign',
}

function sourceLabel(source: string): string {
  const key = SOURCE_LABEL_KEYS[source]
  return key ? t(key) : source.replace(/_/g, ' ')
}

function clearWarning() {
  unrelatedWarning.value = ''
}

async function addService() {
  const name = newName.value.trim()
  if (!name || createMutation.isPending.value) return
  error.value = ''
  // Relatedness check (QA round 3 fix 1): only for NEW names; a known name
  // (managed or detected) is added straight away. `related:false` warns once.
  const known = services.value?.some((s) => s.name.toLowerCase() === name.toLowerCase())
    || detected.value.some((s) => s.name.toLowerCase() === name.toLowerCase())
  if (!known && warnedName.value !== name.toLowerCase()) {
    clearWarning()
    try {
      const result = await checkMutation.mutateAsync(name)
      if (result?.related === false) {
        warnedName.value = name.toLowerCase()
        unrelatedWarning.value = t('brandServices.unrelatedWarning')
        return // second submit force-adds
      }
    } catch {
      // Check unavailable — never block the add on it.
    }
  }
  clearWarning()
  try {
    await createMutation.mutateAsync({ name })
    newName.value = ''
  } catch {
    error.value = t('brandServices.addFailed')
  }
}

async function removeService(serviceUuid: string) {
  if (deleteMutation.isPending.value) return
  error.value = ''
  deletingUuid.value = serviceUuid
  try {
    await deleteMutation.mutateAsync(serviceUuid)
  } catch {
    error.value = t('brandServices.deleteFailed')
  } finally {
    deletingUuid.value = null
  }
}
</script>

<template>
  <div data-testid="brand-services-manager" class="rounded-xl border border-border/60 p-4 space-y-3">
    <div class="flex items-center gap-2">
      <Briefcase class="h-4 w-4 text-primary shrink-0" />
      <span class="text-sm font-medium">{{ t('brandServices.title') }}</span>
    </div>
    <p class="text-[11px] text-muted-foreground leading-relaxed">{{ t('brandServices.note') }}</p>

    <div v-if="isLoading" class="text-xs text-muted-foreground">{{ t('common.loading') }}</div>
    <template v-else>
      <!-- Your services (managed — editable) -->
      <div class="space-y-1.5">
        <div class="text-[11px] font-medium uppercase tracking-wider text-muted-foreground">
          {{ t('brandServices.yoursTitle') }}
        </div>
        <div v-if="services?.length" class="space-y-1.5">
          <div
            v-for="svc in services"
            :key="svc.service_uuid"
            class="flex items-center gap-2 rounded-lg border border-border/40 bg-overlay-subtle px-3 py-2"
            data-testid="brand-service-item"
          >
            <span class="flex-1 min-w-0 text-sm truncate" data-testid="brand-service-name">{{ svc.name }}</span>
            <span
              class="text-[10px] font-medium px-1.5 py-0.5 rounded border border-border/50 text-muted-foreground shrink-0"
              data-testid="brand-service-source"
            >
              {{ sourceLabel(svc.source) }}
            </span>
            <button
              type="button"
              class="h-7 w-7 grid place-items-center rounded-md text-muted-foreground hover:text-destructive hover:bg-destructive/10 transition shrink-0 disabled:opacity-50"
              :aria-label="t('brandServices.delete')"
              data-testid="brand-service-delete-btn"
              :disabled="deleteMutation.isPending.value"
              @click="removeService(svc.service_uuid)"
            >
              <Loader2 v-if="deletingUuid === svc.service_uuid" class="h-3.5 w-3.5 animate-spin" />
              <X v-else class="h-3.5 w-3.5" />
            </button>
          </div>
        </div>
        <div v-else class="text-xs text-muted-foreground">{{ t('brandServices.empty') }}</div>
      </div>

      <!-- Detected by scan/analysis (read-only chips) -->
      <div v-if="detected.length" class="space-y-1.5" data-testid="brand-services-detected">
        <div class="flex items-center gap-1.5 text-[11px] font-medium uppercase tracking-wider text-muted-foreground">
          <ScanSearch class="h-3.5 w-3.5 shrink-0" />
          {{ t('brandServices.detectedTitle') }}
        </div>
        <div class="flex flex-wrap gap-1.5">
          <span
            v-for="svc in detected"
            :key="svc.name"
            class="inline-flex items-center gap-1.5 rounded-full border border-border/40 bg-overlay-subtle px-2.5 py-1 text-xs text-muted-foreground"
            data-testid="brand-service-detected-chip"
          >
            <span class="max-w-[14rem] truncate">{{ svc.name }}</span>
            <span
              class="text-[9px] font-medium px-1 py-0.5 rounded border border-border/50 shrink-0"
              data-testid="brand-service-detected-source"
            >
              {{ sourceLabel(svc.source) }}
            </span>
          </span>
        </div>
      </div>

      <div class="flex flex-col sm:flex-row gap-2">
        <input
          v-model="newName"
          :placeholder="t('brandServices.addPlaceholder')"
          class="flex-1 h-10 px-3 rounded-lg bg-overlay-subtle border border-border/70 text-sm outline-none focus:border-primary/60 transition placeholder:text-muted-foreground/60"
          data-testid="brand-service-add-input"
          @keyup.enter="addService"
          @input="clearWarning"
        />
        <button
          type="button"
          class="h-10 px-3.5 rounded-lg border border-primary/40 bg-primary/10 text-primary text-xs font-medium hover:bg-primary/15 transition inline-flex items-center justify-center gap-1.5 disabled:opacity-50"
          :disabled="!newName.trim() || createMutation.isPending.value || checkMutation.isPending.value"
          data-testid="brand-service-add-btn"
          @click="addService"
        >
          <Loader2 v-if="createMutation.isPending.value || checkMutation.isPending.value" class="h-3.5 w-3.5 animate-spin" />
          <Plus v-else class="h-3.5 w-3.5" />
          {{ t('brandServices.add') }}
        </button>
      </div>
      <!-- QA round 3 fix 1: localized unrelated-service warning (amber) -->
      <div
        v-if="unrelatedWarning"
        class="flex items-start gap-2 rounded-lg border border-warning/40 bg-warning/10 px-3 py-2 text-xs text-warning leading-relaxed"
        data-testid="service-warning"
        role="alert"
      >
        <AlertTriangle class="h-3.5 w-3.5 shrink-0 mt-0.5" />
        <span>{{ unrelatedWarning }}</span>
      </div>
      <div v-if="error" class="text-xs text-destructive" data-testid="brand-services-error">{{ error }}</div>
    </template>
  </div>
</template>
