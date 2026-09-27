<script setup lang="ts">
import { computed, ref } from 'vue'
import { Briefcase, Plus, X, Loader2 } from 'lucide-vue-next'
import { useI18n } from '@/shared/utils/i18n'
import type { TKey } from '@/shared/utils/translations'
import { useManagedBrandServices, useCreateManagedBrandService, useDeleteManagedBrandService } from '../queries'

/**
 * Edit-mode services management (QA Fix 4). Lists the brand's managed
 * services (name + source badge) against the new backend endpoints and
 * lets the user add / remove entries. Scanned entries refresh on the next
 * brand re-analysis; the merged read-only list is invalidated alongside.
 */
const props = defineProps<{
  brandUuid: string
}>()

const { t } = useI18n()

const brandUuidRef = computed(() => props.brandUuid)

const { data: services, isLoading } = useManagedBrandServices(brandUuidRef)
const createMutation = useCreateManagedBrandService(brandUuidRef)
const deleteMutation = useDeleteManagedBrandService(brandUuidRef)

const newName = ref('')
const error = ref('')
const deletingUuid = ref<string | null>(null)

const SOURCE_LABEL_KEYS: Record<string, TKey> = {
  scraped: 'brandServices.source.scraped',
  brand_analysis: 'brandServices.source.brandAnalysis',
  ppc_viability: 'brandServices.source.ppcViability',
  manual: 'brandServices.source.manual',
}

function sourceLabel(source: string): string {
  const key = SOURCE_LABEL_KEYS[source]
  return key ? t(key) : source.replace(/_/g, ' ')
}

async function addService() {
  const name = newName.value.trim()
  if (!name || createMutation.isPending.value) return
  error.value = ''
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

      <div class="flex flex-col sm:flex-row gap-2">
        <input
          v-model="newName"
          :placeholder="t('brandServices.addPlaceholder')"
          class="flex-1 h-10 px-3 rounded-lg bg-overlay-subtle border border-border/70 text-sm outline-none focus:border-primary/60 transition placeholder:text-muted-foreground/60"
          data-testid="brand-service-add-input"
          @keyup.enter="addService"
        />
        <button
          type="button"
          class="h-10 px-3.5 rounded-lg border border-primary/40 bg-primary/10 text-primary text-xs font-medium hover:bg-primary/15 transition inline-flex items-center justify-center gap-1.5 disabled:opacity-50"
          :disabled="!newName.trim() || createMutation.isPending.value"
          data-testid="brand-service-add-btn"
          @click="addService"
        >
          <Loader2 v-if="createMutation.isPending.value" class="h-3.5 w-3.5 animate-spin" />
          <Plus v-else class="h-3.5 w-3.5" />
          {{ t('brandServices.add') }}
        </button>
      </div>
      <div v-if="error" class="text-xs text-destructive" data-testid="brand-services-error">{{ error }}</div>
    </template>
  </div>
</template>
