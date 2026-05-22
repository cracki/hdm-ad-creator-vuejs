<script setup lang="ts">
import { computed, ref } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { MonitorSmartphone, ArrowLeft, ArrowRight, Loader2, Shield, Check, X } from 'lucide-vue-next'
import Topbar from '@/layout/Topbar.vue'
import AiLoadingAnimation from '@/shared/components/AiLoadingAnimation.vue'
import { useI18n } from '@/shared/utils/i18n'
import { usePageActions } from '@/shared/composables/usePageActions'
import { useCampaign } from '../queries'
import { campaignsApi } from '../api'
import { useQueryClient } from '@tanstack/vue-query'
import { operationManager } from '@/infrastructure/operations/operationManager'

const route = useRoute()
const router = useRouter()
const { t } = useI18n()
const queryClient = useQueryClient()

const campaignUuid = computed(() => route.params.campaignUuid as string)
const { data: campaign, isLoading } = useCampaign(campaignUuid)

const { setActions } = usePageActions()
setActions([{ label: t('camp.backToCampaign'), icon: ArrowLeft, to: `/campaigns/${campaignUuid.value}` }])

const isPrereqMet = computed(() => campaign.value?.content_strategy_completed ?? false)

interface PlatformOption {
  key: 'meta' | 'google' | 'linkedin'
  label: string
  description: string
}

const platforms: PlatformOption[] = [
  { key: 'meta', label: 'Meta (Facebook & Instagram)', description: 'Reach audiences across Facebook and Instagram feeds, Stories, Reels, and more.' },
  { key: 'google', label: 'Google Ads', description: 'Search, Display, YouTube, Shopping, and Performance Max campaigns.' },
  { key: 'linkedin', label: 'LinkedIn Ads', description: 'B2B targeting by job title, company size, industry, and seniority.' },
]

const selected = ref<Set<string>>(new Set())

const savedPlatforms = computed(() => {
  const ctx = campaign.value?.context_payload as any
  return (ctx?.selected_platforms ?? []) as string[]
})

const isAlreadySaved = computed(() => savedPlatforms.value.length > 0)

const saving = ref(false)
const error = ref<string | null>(null)

function togglePlatform(key: string) {
  if (selected.value.has(key)) selected.value.delete(key)
  else selected.value.add(key)
}

function isSelected(key: string): boolean {
  return selected.value.has(key) || savedPlatforms.value.includes(key)
}

function isPlatformCompleted(key: string): boolean {
  const flag = `${key}_ads_completed` as keyof typeof campaign.value
  return !!campaign.value?.[flag]
}

async function savePlatforms() {
  const platformsToSave = Array.from(selected.value)
  if (platformsToSave.length === 0) return

  const opKey = `${campaignUuid.value}:platform-selection`
  if (!operationManager.canStart(opKey)) return
  operationManager.start(opKey)
  saving.value = true
  error.value = null

  try {
    await campaignsApi.update(campaignUuid.value, {
      context_payload: {
        ...(campaign.value?.context_payload as any),
        selected_platforms: platformsToSave,
      },
    })
    queryClient.invalidateQueries({ queryKey: ['campaigns', campaignUuid] })
  } catch (e: any) {
    error.value = e?.response?.data?.detail ?? e?.message ?? 'Failed to save'
  } finally {
    saving.value = false
    operationManager.finish(opKey)
  }
}

async function removePlatform(key: string) {
  const remaining = savedPlatforms.value.filter((p) => p !== key)
  const opKey = `${campaignUuid.value}:platform-remove`
  if (!operationManager.canStart(opKey)) return
  operationManager.start(opKey)
  saving.value = true
  error.value = null

  try {
    await campaignsApi.update(campaignUuid.value, {
      context_payload: {
        ...(campaign.value?.context_payload as any),
        selected_platforms: remaining,
      },
    })
    queryClient.invalidateQueries({ queryKey: ['campaigns', campaignUuid] })
  } catch (e: any) {
    error.value = e?.response?.data?.detail ?? e?.message ?? 'Failed to remove'
  } finally {
    saving.value = false
    operationManager.finish(opKey)
  }
}

function startEditing() {
  selected.value = new Set(savedPlatforms.value)
}

function goNext() {
  router.push(`/campaigns/${campaignUuid.value}/ads-strategy`)
}
</script>

<template>
  <Topbar :title="campaign?.name ?? ''" :subtitle="campaign?.brand?.company_name">
    <template #actions>
      <button
        class="h-9 px-3 rounded-lg border border-border/60 text-xs font-medium hover:bg-overlay-subtle transition"
        @click="router.push(`/campaigns/${campaignUuid}`)"
      >
        {{ t('camp.backToCampaign') }}
      </button>
    </template>
  </Topbar>

  <main class="flex-1 overflow-y-auto">
    <div class="max-w-5xl mx-auto p-4 sm:p-6 md:p-8">
      <header class="flex items-start gap-4 mb-6">
        <div class="h-12 w-12 rounded-xl bg-[image:var(--gradient-brand)] grid place-items-center shadow-[var(--shadow-glow)] shrink-0">
          <MonitorSmartphone class="h-5 w-5 text-primary-foreground" />
        </div>
        <div class="min-w-0 flex-1">
          <div class="text-[11px] font-semibold uppercase tracking-[0.16em] text-primary">{{ t('smart.stepOf') }} 5 / 9</div>
          <h2 class="text-xl sm:text-2xl font-semibold tracking-tight mt-1">{{ t('platform.title') }}</h2>
          <p class="text-sm text-muted-foreground mt-1">{{ t('platform.description') }}</p>
        </div>
      </header>

      <div v-if="isLoading" class="py-12">
        <AiLoadingAnimation :message="t('smart.s6')" size="sm" />
      </div>

      <div v-else-if="!isPrereqMet" class="surface-card p-8 text-center">
        <Shield class="h-8 w-8 text-muted-foreground mx-auto mb-3" />
        <div class="text-sm font-medium mb-1">{{ t('platform.prereqTitle') }}</div>
        <div class="text-xs text-muted-foreground mb-4">{{ t('platform.prereqDesc') }}</div>
        <button
          class="h-9 px-4 rounded-lg bg-[image:var(--gradient-brand)] text-primary-foreground text-xs font-medium shadow-[var(--shadow-glow)]"
          @click="router.push(`/campaigns/${campaignUuid}/content`)"
        >
          {{ t('content.runStrategy') }}
        </button>
      </div>

      <template v-else>
        <!-- Already saved -->
        <div v-if="isAlreadySaved && selected.size === 0" class="surface-card p-8 text-center mb-6">
          <div class="h-10 w-10 rounded-lg bg-success/15 border border-success/40 grid place-items-center mx-auto mb-3">
            <Check class="h-5 w-5 text-success" />
          </div>
          <div class="text-sm font-medium mb-1">{{ t('platform.saved') }}</div>
          <div class="text-xs text-muted-foreground mb-3">
            {{ savedPlatforms.map((p) => platforms.find((pl) => pl.key === p)?.label ?? p).join(', ') }}
          </div>
          <div class="flex items-center justify-center gap-3">
            <button class="h-9 px-4 rounded-lg border border-border/60 text-xs flex items-center gap-1.5 hover:bg-overlay-subtle transition" @click="startEditing">
              {{ t('platform.edit') }}
            </button>
            <button
              class="h-9 px-4 rounded-lg bg-[image:var(--gradient-brand)] text-primary-foreground text-xs font-medium shadow-[var(--shadow-glow)] flex items-center gap-1.5"
              @click="goNext"
            >
              {{ t('smart.continue') }} <ArrowRight class="h-3.5 w-3.5" />
            </button>
          </div>
        </div>

        <!-- Saved platforms with remove option (when not editing) -->
        <div v-if="isAlreadySaved && selected.size === 0" class="space-y-2 mb-6">
          <div
            v-for="key in savedPlatforms"
            :key="'saved-' + key"
            class="surface-card p-4 flex items-center justify-between gap-4"
          >
            <div class="flex items-center gap-3 min-w-0">
              <div class="h-8 w-8 rounded-lg bg-overlay-light grid place-items-center shrink-0">
                <MonitorSmartphone class="h-4 w-4 text-muted-foreground" />
              </div>
              <div class="min-w-0">
                <div class="text-sm font-medium">{{ platforms.find((pl) => pl.key === key)?.label ?? key }}</div>
                <div class="text-[11px] text-muted-foreground">{{ platforms.find((pl) => pl.key === key)?.description }}</div>
              </div>
            </div>
            <div class="flex items-center gap-2 shrink-0">
              <span v-if="isPlatformCompleted(key)" class="text-[11px] text-success flex items-center gap-1">
                <Check class="h-3 w-3" /> {{ t('status.completed') }}
              </span>
              <button
                :disabled="saving"
                class="h-7 w-7 rounded-md border border-border/40 grid place-items-center hover:bg-destructive/10 hover:border-destructive/40 hover:text-destructive transition text-muted-foreground disabled:opacity-50"
                :title="t('platform.remove')"
                @click="removePlatform(key)"
              >
                <X class="h-3.5 w-3.5" />
              </button>
            </div>
          </div>
        </div>

        <!-- Selection (editing mode) -->
        <div v-if="!isAlreadySaved || selected.size > 0" class="space-y-3 mb-6">
          <div
            v-for="p in platforms"
            :key="p.key"
            :class="[
              'surface-card p-4 flex items-center gap-4 cursor-pointer transition',
              isSelected(p.key) ? 'border-primary/60' : 'hover:border-primary/30',
            ]"
            data-loc="campaigns.platform.select-card"
            @click="togglePlatform(p.key)"
          >
            <div
              :class="[
                'h-5 w-5 rounded border-2 grid place-items-center shrink-0 transition',
                isSelected(p.key) ? 'bg-primary border-primary' : 'border-border/60',
              ]"
            >
              <Check v-if="isSelected(p.key)" class="h-3 w-3 text-primary-foreground" />
            </div>
            <div class="flex-1 min-w-0">
              <div class="text-sm font-medium">{{ p.label }}</div>
              <div class="text-[11px] text-muted-foreground mt-0.5">{{ p.description }}</div>
            </div>
          </div>
        </div>

        <div v-if="error" class="surface-card p-4 flex items-center gap-3 mb-4">
          <div class="text-sm text-destructive">{{ error }}</div>
        </div>

        <div v-if="!isAlreadySaved || selected.size > 0" class="flex items-center justify-between">
          <button
            class="h-10 px-4 rounded-lg border border-border/60 text-xs font-medium hover:bg-overlay-subtle transition flex items-center gap-1.5"
            @click="router.push(`/campaigns/${campaignUuid}/content`)"
          >
            <ArrowLeft class="h-3.5 w-3.5" /> {{ t('smart.previous') }}
          </button>
          <button
            :disabled="selected.size === 0 || saving"
            class="h-10 px-5 rounded-lg bg-[image:var(--gradient-brand)] text-primary-foreground text-xs font-medium shadow-[var(--shadow-glow)] flex items-center gap-1.5 disabled:opacity-50"
            data-loc="campaigns.platform.save-btn"
            @click="savePlatforms"
          >
            <Loader2 v-if="saving" class="h-3.5 w-3.5 animate-spin" />
            {{ saving ? t('platform.saving') : t('platform.saveContinue') }} <ArrowRight v-if="!saving" class="h-3.5 w-3.5" />
          </button>
        </div>
      </template>
    </div>
  </main>
</template>
