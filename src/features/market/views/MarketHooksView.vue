<script setup lang="ts">
import { ref, computed } from 'vue'
import { Sparkles, Loader2, AlertCircle, RefreshCw, Plus, Trash2 } from 'lucide-vue-next'
import Topbar from '@/layout/Topbar.vue'
import { useI18n } from '@/shared/utils/i18n'
import { useGenerateAIHooks } from '../queries'

const { t } = useI18n()
const hooksMutation = useGenerateAIHooks()

const titles = ref<string[]>([''])
const industry = ref('')
const brandName = ref('')
const hookCount = ref(10)

const hooksResult = ref<Record<string, unknown> | null>(null)
const loading = ref(false)
const error = ref<string | null>(null)

const parsedHooks = computed(() => {
  if (!hooksResult.value) return []
  const hooks = hooksResult.value.hooks ?? hooksResult.value
  if (Array.isArray(hooks)) return hooks
  return []
})

function addTitle() {
  titles.value.push('')
}

function removeTitle(idx: number) {
  if (titles.value.length > 1) {
    titles.value.splice(idx, 1)
  }
}

async function generateHooks() {
  const validTitles = titles.value.filter(t => t.trim())
  if (!validTitles.length || !industry.value) return

  loading.value = true
  error.value = null
  hooksResult.value = null
  try {
    const res = await hooksMutation.mutateAsync({
      titles: validTitles,
      industry: industry.value,
      brand_name: brandName.value || undefined,
      hook_count: hookCount.value,
    })
    hooksResult.value = res.data
  } catch (e: any) {
    error.value = e?.response?.data?.detail ?? e?.message ?? t('market.error')
  } finally {
    loading.value = false
  }
}
</script>

<template>
  <Topbar :title="t('market.hooksTitle')" :subtitle="t('market.hooksSubtitle')" />

  <main class="flex-1 overflow-y-auto">
    <div class="max-w-5xl mx-auto p-4 sm:p-6 md:p-8">
      <header class="flex items-start gap-4 mb-6">
        <div class="h-12 w-12 rounded-xl bg-[image:var(--gradient-brand)] grid place-items-center shadow-[var(--shadow-glow)] shrink-0">
          <Sparkles class="h-5 w-5 text-primary-foreground" />
        </div>
        <div class="min-w-0 flex-1">
          <h2 class="text-xl sm:text-2xl font-semibold tracking-tight">{{ t('market.hooksTitle') }}</h2>
          <p class="text-sm text-muted-foreground mt-1">{{ t('market.hooksDesc') }}</p>
        </div>
      </header>

      <!-- Input form -->
      <div v-if="!hooksResult && !loading" class="surface-card p-5 space-y-4 mb-6">
        <div>
          <label class="text-[11px] uppercase tracking-wider text-muted-foreground mb-1.5 block">{{ t('market.titles') }}</label>
          <div class="space-y-2">
            <div v-for="(_, idx) in titles" :key="idx" class="flex items-center gap-2">
              <input v-model="titles[idx]" data-loc="market.hooks.title-input" :placeholder="t('market.titleHint')" class="flex-1 h-10 px-3 rounded-lg bg-white/[0.03] border border-border/60 text-sm outline-none placeholder:text-muted-foreground/60" />
              <button
                v-if="titles.length > 1"
                class="h-10 w-10 rounded-lg border border-border/60 grid place-items-center hover:bg-white/[0.03] transition shrink-0"
                @click="removeTitle(idx)"
              >
                <Trash2 class="h-3.5 w-3.5 text-muted-foreground" />
              </button>
            </div>
          </div>
          <button data-loc="market.hooks.add-title-btn" class="mt-2 h-8 px-3 rounded-lg border border-border/60 text-xs flex items-center gap-1.5 hover:bg-white/[0.03] transition" @click="addTitle">
            <Plus class="h-3 w-3" /> {{ t('market.addTitle') }}
          </button>
        </div>
        <div class="grid sm:grid-cols-3 gap-4">
          <div>
            <label class="text-[11px] uppercase tracking-wider text-muted-foreground mb-1.5 block">{{ t('market.industry') }}</label>
            <input v-model="industry" data-loc="market.hooks.industry-input" :placeholder="t('market.industryHint')" class="w-full h-10 px-3 rounded-lg bg-white/[0.03] border border-border/60 text-sm outline-none placeholder:text-muted-foreground/60" />
          </div>
          <div>
            <label class="text-[11px] uppercase tracking-wider text-muted-foreground mb-1.5 block">{{ t('market.brandName') }}</label>
            <input v-model="brandName" data-loc="market.hooks.brand-name-input" :placeholder="t('market.brandNameHint')" class="w-full h-10 px-3 rounded-lg bg-white/[0.03] border border-border/60 text-sm outline-none placeholder:text-muted-foreground/60" />
          </div>
          <div>
            <label class="text-[11px] uppercase tracking-wider text-muted-foreground mb-1.5 block">{{ t('market.hookCount') }}</label>
            <input v-model.number="hookCount" data-loc="market.hooks.hook-count-input" type="number" min="1" max="50" class="w-full h-10 px-3 rounded-lg bg-white/[0.03] border border-border/60 text-sm outline-none placeholder:text-muted-foreground/60" />
          </div>
        </div>

        <button
          data-loc="market.hooks.generate-btn"
          class="h-10 px-5 rounded-lg bg-[image:var(--gradient-brand)] text-primary-foreground text-xs font-medium shadow-[var(--shadow-glow)] flex items-center gap-1.5"
          :disabled="!titles.some(t => t.trim()) || !industry"
          @click="generateHooks"
        >
          <Sparkles class="h-3.5 w-3.5" /> {{ t('market.generateHooks') }}
        </button>
      </div>

      <!-- Loading -->
      <div v-if="loading" class="surface-card p-8 text-center">
        <Loader2 class="h-8 w-8 animate-spin text-primary mx-auto mb-4" />
        <div class="text-sm font-medium mb-1">{{ t('market.generatingHooks') }}</div>
        <div class="text-xs text-muted-foreground">{{ t('market.generatingHooksDesc') }}</div>
      </div>

      <!-- Error -->
      <div v-if="error" class="surface-card p-5 flex items-center gap-3 mb-6">
        <AlertCircle class="h-5 w-5 text-destructive shrink-0" />
        <div class="flex-1">
          <div class="text-sm font-medium text-destructive">{{ error }}</div>
        </div>
        <button data-loc="market.hooks.retry-btn" class="h-8 px-3 rounded-lg border border-border/60 text-xs flex items-center gap-1.5" @click="generateHooks">
          <RefreshCw class="h-3 w-3" /> {{ t('market.retry') }}
        </button>
      </div>

      <!-- Results -->
      <div v-if="hooksResult && !loading">
        <div class="flex items-center justify-between mb-4">
          <div class="text-xs text-muted-foreground">{{ t('market.hooksFound', { count: parsedHooks.length }) }}</div>
          <button data-loc="market.hooks.re-run-btn" class="h-8 px-3 rounded-lg border border-border/60 text-xs flex items-center gap-1.5 hover:bg-white/[0.03] transition" @click="hooksResult = null">
            <RefreshCw class="h-3 w-3" /> {{ t('market.reRun') }}
          </button>
        </div>

        <div class="space-y-4">
          <div v-for="(hookGroup, idx) in parsedHooks" :key="idx" class="surface-card p-3 sm:p-5">
            <div v-if="hookGroup.title" class="text-sm font-semibold mb-3">{{ hookGroup.title }}</div>
            <div class="space-y-2">
              <div
                v-for="(hook, hIdx) in (hookGroup.hooks ?? hookGroup)"
                :key="hIdx"
                class="p-3 rounded-lg bg-white/[0.02] border border-border/40"
              >
                <div class="text-xs text-muted-foreground mb-1">{{ t('market.hook') }} {{ Number(hIdx) + 1 }}</div>
                <div class="text-sm">{{ typeof hook === 'string' ? hook : hook.text ?? hook.hook ?? JSON.stringify(hook) }}</div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  </main>
</template>
