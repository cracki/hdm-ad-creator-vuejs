<script setup lang="ts">
import { ref, computed } from 'vue'
import { useRouter } from 'vue-router'
import { Sparkles, Plus, Trash2, Search } from 'lucide-vue-next'
import Topbar from '@/layout/Topbar.vue'
import { useI18n } from '@/shared/utils/i18n'
import { useToast } from '@/shared/composables/useToast'
import SkeletonLoader from '@/shared/components/SkeletonLoader.vue'
import EmptyState from '@/shared/components/EmptyState.vue'
import ConfirmDialog from '@/shared/components/ConfirmDialog.vue'
import { useCampaigns, useDeleteCampaign } from '../queries'
import { getCampaignProgress } from '../types'

const router = useRouter()
const { t } = useI18n()
const toast = useToast()
const searchQuery = ref('')
const deleteTarget = ref<{ uuid: string; name: string } | null>(null)

const { data: campaigns, isLoading, error, refetch } = useCampaigns()
const deleteMutation = useDeleteCampaign()

const filteredCampaigns = computed(() => {
  const list = campaigns.value ?? []
  if (!searchQuery.value) return list
  const q = searchQuery.value.toLowerCase()
  return list.filter(
    (c) =>
      c.name?.toLowerCase().includes(q) ||
      c.brand?.company_name?.toLowerCase().includes(q),
  )
})

function getStatusBadge(campaign: { status: string }) {
  const map: Record<string, { label: string; cls: string }> = {
    draft: { label: 'Draft', cls: 'bg-white/10 text-muted-foreground' },
    in_progress: { label: 'In progress', cls: 'bg-blue-500/15 text-blue-300' },
    completed: { label: 'Completed', cls: 'bg-success/15 text-success' },
    archived: { label: 'Archived', cls: 'bg-white/5 text-muted-foreground' },
  }
  return map[campaign.status] ?? map.draft
}

async function handleDelete(uuid: string, name: string) {
  deleteTarget.value = { uuid, name }
}

async function confirmDelete() {
  if (!deleteTarget.value) return
  try {
    await deleteMutation.mutateAsync(deleteTarget.value.uuid)
    toast.success(t('common.deleted'))
  } catch {
    toast.error(t('common.operationFailed'))
  } finally {
    deleteTarget.value = null
  }
}
</script>

<template>
  <Topbar :title="t('camp.title')" :subtitle="t('camp.subtitle')" />
  <main class="flex-1 p-4 sm:p-6">
    <!-- Search + Create -->
    <div class="flex items-center gap-3 flex-wrap mb-6">
      <div class="flex-1 flex items-center gap-2 px-3 h-10 rounded-lg bg-white/[0.03] border border-border/60">
        <Search class="h-3.5 w-3.5 text-muted-foreground shrink-0" />
        <input
          v-model="searchQuery"
          :placeholder="t('camp.search')"
          class="flex-1 bg-transparent text-sm outline-none placeholder:text-muted-foreground/60"
        />
      </div>
      <button
        class="h-10 px-4 rounded-lg bg-[image:var(--gradient-brand)] text-primary-foreground text-xs font-medium shadow-[var(--shadow-glow)] flex items-center gap-1.5"
        @click="router.push('/campaigns/new')"
      >
        <Plus class="h-3.5 w-3.5" /> {{ t('camp.newCampaign') }}
      </button>
    </div>

    <!-- Loading -->
    <SkeletonLoader v-if="isLoading" variant="grid" :count="6" height="280px" />

    <!-- Error -->
    <div v-else-if="error" class="surface-card p-5 text-center">
      <p class="text-destructive text-sm">{{ t('camp.loadError') }}</p>
      <button class="mt-3 h-8 px-3 rounded-lg border border-border/60 text-xs" @click="refetch()">
        {{ t('camp.retry') }}
      </button>
    </div>

    <!-- Empty -->
    <EmptyState
      v-else-if="filteredCampaigns.length === 0"
      :icon="Sparkles"
      :title="t('camp.empty')"
      :description="t('camp.emptyDesc')"
      :show-action="true"
      :action-label="t('camp.launch')"
      @action="router.push('/campaigns/new')"
    />

    <!-- Grid -->
    <div v-else class="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
      <div
        v-for="campaign in filteredCampaigns"
        :key="campaign.campaign_uuid"
        class="surface-card group cursor-pointer hover:border-primary/40 transition"
        @click="router.push(`/campaigns/${campaign.campaign_uuid}`)"
      >
        <!-- Header -->
        <div class="p-4 border-b border-border/40">
          <div class="flex items-start justify-between mb-2">
            <span
              :class="[
                'text-[11px] font-semibold px-2 py-0.5 rounded',
                getStatusBadge(campaign).cls,
              ]"
            >
              {{ getStatusBadge(campaign).label }}
            </span>
            <button
              class="h-10 w-10 grid place-items-center rounded-md sm:opacity-0 sm:group-hover:opacity-60 hover:!opacity-100 hover:bg-white/[0.06] transition"
              @click.stop="handleDelete(campaign.campaign_uuid, campaign.name)"
            >
              <Trash2 class="h-3.5 w-3.5 text-muted-foreground" />
            </button>
          </div>
          <h3 class="text-sm font-semibold truncate">{{ campaign.name || 'Untitled Campaign' }}</h3>
          <p v-if="campaign.brand" class="text-xs text-muted-foreground mt-0.5 truncate">
            {{ campaign.brand.company_name }}
          </p>
        </div>

        <!-- Body -->
        <div class="p-4 space-y-3">
          <!-- Progress -->
          <div>
            <div class="flex items-center justify-between mb-1">
              <span class="text-[11px] text-muted-foreground">{{ t('camp.progress') }}</span>
              <span class="text-[11px] font-medium">{{ getCampaignProgress(campaign) }}%</span>
            </div>
            <div class="h-1.5 rounded-full bg-white/5 overflow-hidden">
              <div
                class="h-full rounded-full bg-[image:var(--gradient-brand)] transition-all duration-500"
                :style="{ width: `${getCampaignProgress(campaign)}%` }"
              />
            </div>
          </div>

          <!-- Stats row -->
          <div class="grid grid-cols-3 gap-2 text-center">
            <div class="p-2 rounded-lg bg-white/[0.02]">
              <div class="text-sm font-bold">{{ campaign.steps_count }}</div>
              <div class="text-[11px] text-muted-foreground">{{ t('camp.steps') }}</div>
            </div>
            <div class="p-2 rounded-lg bg-white/[0.02]">
              <div class="text-sm font-bold capitalize">{{ campaign.current_step.replace('_', ' ') }}</div>
              <div class="text-[11px] text-muted-foreground">{{ t('camp.current') }}</div>
            </div>
            <div class="p-2 rounded-lg bg-white/[0.02]">
              <div class="text-sm font-bold">{{ campaign.brand?.selected_industry?.name ?? '—' }}</div>
              <div class="text-[11px] text-muted-foreground">{{ t('camp.industry') }}</div>
            </div>
          </div>

          <!-- Date -->
          <div class="text-[11px] text-muted-foreground">
            {{ new Date(campaign.updated_at).toLocaleDateString() }}
          </div>
        </div>
      </div>
    </div>
  </main>

  <ConfirmDialog
    :open="!!deleteTarget"
    :title="t('common.delete')"
    :description="`Delete '${deleteTarget?.name}'?`"
    :confirm-label="t('common.delete')"
    :destructive="true"
    @confirm="confirmDelete"
    @cancel="deleteTarget = null"
  />
</template>
