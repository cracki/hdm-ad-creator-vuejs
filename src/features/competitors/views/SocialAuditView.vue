<script setup lang="ts">
import { computed, ref } from 'vue'
import { useRoute } from 'vue-router'
import Topbar from '@/layout/Topbar.vue'
import { useI18n } from '@/shared/utils/i18n'
import { usePageActions } from '@/shared/composables/usePageActions'
import SocialAuditRenderer from '@/shared/components/renderers/SocialAuditRenderer.vue'
import { useSocialAudit } from '../queries'
import { Shield, Loader2, ChevronLeft } from 'lucide-vue-next'

const route = useRoute()
const { t } = useI18n()

const brandUuid = computed(() => route.params.brandUuid as string)
const auditMutation = useSocialAudit(brandUuid)

const hasRun = ref(false)

const { setActions } = usePageActions()
setActions([
  { label: t('socialAudit.back'), icon: ChevronLeft, to: `/brands/${brandUuid.value}/social` },
])

async function handleRunAudit() {
  hasRun.value = true
  await auditMutation.mutateAsync()
}
</script>

<template>
  <Topbar
    :title="t('socialAudit.title')"
    :subtitle="t('socialAudit.subtitle')"
  >
    <template #actions>
      <RouterLink
        :to="`/brands/${brandUuid}/social`"
        data-loc="competitors.audit.back-btn"
        class="hidden sm:inline-flex items-center gap-1.5 h-9 px-3.5 rounded-lg border border-border/60 text-xs font-medium hover:bg-overlay-subtle transition"
      >
        <ChevronLeft class="h-3.5 w-3.5" /> {{ t('socialAudit.back') }}
      </RouterLink>
    </template>
  </Topbar>

  <main class="flex-1 p-4 sm:p-6 space-y-4 overflow-y-auto">
    <!-- Run button -->
    <div v-if="!hasRun" class="surface-card p-8 text-center space-y-4 max-w-lg mx-auto">
      <div class="h-14 w-14 rounded-2xl bg-[image:var(--gradient-brand)] grid place-items-center mx-auto shadow-[var(--shadow-glow)]">
        <Shield class="h-6 w-6 text-primary-foreground" />
      </div>
      <div>
        <div class="font-semibold mb-1">{{ t('socialAudit.runTitle') }}</div>
        <div class="text-sm text-muted-foreground">{{ t('socialAudit.runDesc') }}</div>
      </div>
      <button
        data-loc="competitors.audit.run-btn"
        @click="handleRunAudit"
        :disabled="auditMutation.isPending.value"
        class="inline-flex items-center gap-1.5 h-10 px-5 rounded-lg bg-[image:var(--gradient-brand)] text-primary-foreground text-xs font-medium shadow-[var(--shadow-glow)] hover:opacity-95 transition disabled:opacity-50"
      >
        <Loader2 v-if="auditMutation.isPending.value" class="h-4 w-4 animate-spin" />
        <Shield v-else class="h-4 w-4" />
        {{ t('socialAudit.runAudit') }}
      </button>
    </div>

    <!-- Loading -->
    <div v-else-if="auditMutation.isPending.value" class="surface-card p-8 text-center space-y-4">
      <Loader2 class="h-8 w-8 animate-spin text-primary mx-auto" />
      <div class="text-sm text-muted-foreground">{{ t('socialAudit.running') }}</div>
    </div>

    <!-- Error -->
    <div v-else-if="auditMutation.error.value" class="surface-card p-5 border-destructive/40">
      <div class="text-destructive font-medium text-sm">{{ t('socialAudit.error') }}</div>
      <div class="text-xs text-muted-foreground mt-1">{{ auditMutation.error.value }}</div>
      <button
        data-loc="competitors.audit.retry-btn"
        @click="handleRunAudit"
        class="mt-3 inline-flex items-center gap-1.5 h-8 px-3 rounded-lg border border-border/60 text-xs font-medium hover:bg-overlay-subtle transition"
      >
        {{ t('socialAudit.retry') }}
      </button>
    </div>

    <!-- Results -->
    <div v-else-if="auditMutation.data.value" class="space-y-4">
      <SocialAuditRenderer :data="(auditMutation.data.value as any)" />

      <div class="flex justify-center pt-2">
        <button
          data-loc="competitors.audit.re-run-btn"
          @click="handleRunAudit"
          :disabled="auditMutation.isPending.value"
          class="inline-flex items-center gap-1.5 h-9 px-4 rounded-lg border border-border/60 text-xs font-medium hover:bg-overlay-subtle transition disabled:opacity-50"
        >
          <Loader2 v-if="auditMutation.isPending.value" class="h-3.5 w-3.5 animate-spin" />
          {{ t('socialAudit.reRun') }}
        </button>
      </div>
    </div>
  </main>
</template>
