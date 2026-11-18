<script setup lang="ts">
import { ref, computed, watch } from 'vue'
import { useRouter } from 'vue-router'
import { ArrowLeft, ChevronDown, Megaphone, Languages } from 'lucide-vue-next'
import Topbar from '@/layout/Topbar.vue'
import ServiceSelector from '@/shared/components/ServiceSelector.vue'
import { useI18n, LANGS, type Lang } from '@/shared/utils/i18n'
import { useBrands, useBrandServices } from '@/features/brands/queries'
import { managedServiceNames, selectServiceSuggestions, SERVICE_SUGGESTION_CAP, type ServiceSuggestion } from '@/features/brands/serviceSuggestions'
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

// Campaign language (F22): one output language for ALL generated content.
// FA-15: defaults FROM THE BRAND (scan-detected site language) instead of
// hard-coded English; the user can still override before creating.
const language = ref<Lang>('en')
const languageTouched = ref(false)

// Total budget + currency (F16): optional — omitted from the payload when the
// amount is empty/invalid, matching the backend's nullable total_budget.
// FA-16: TRY added (team request); FA-15 default comes from the brand's
// country (Iran → IRT, UAE → AED, KSA → SAR, Turkey → TRY) instead of USD.
const CURRENCIES = ['USD', 'EUR', 'AED', 'GBP', 'IRT', 'SAR', 'TRY'] as const
const COUNTRY_CURRENCY: Record<string, string> = {
  Iran: 'IRT',
  UAE: 'AED',
  'Saudi Arabia': 'SAR',
  Turkey: 'TRY',
}
const currencyTouched = ref(false)
const budgetAmount = ref('')
const budgetCurrency = ref<string>('USD')

function budgetPayload(): { total_budget: number; currency: string } | Record<string, never> {
  // v-model on type="number" inputs auto-casts to number (empty → '')
  const raw = String(budgetAmount.value ?? '').trim()
  const amount = Number(raw)
  if (raw === '' || !Number.isFinite(amount) || amount <= 0) return {}
  return { total_budget: amount, currency: budgetCurrency.value || 'USD' }
}

// Services to advertise (F14): fetched for the chosen brand, selection is
// persisted on the campaign via context_payload.selected_services.
const { data: brandServices, isLoading: servicesLoading } = useBrandServices(selectedBrandUuid)
const selectedServices = ref<string[]>([])

// QA round 3 fix 2: the brand's MANAGED (user-confirmed) services are the
// primary suggestions; the merged scan/analysis list is only a fallback,
// capped so an extraction junk flood can't dominate the picker.
const selectedBrand = computed(() => brands.value?.find((b) => b.brand_uuid === selectedBrandUuid.value) ?? null)
const managedNames = computed(() => managedServiceNames(selectedBrand.value?.services))
const showAllServices = ref(false)

// QA6-jadid6(b): suggestions come from the FULL merged services list
// (GET /brands/{uuid}/services/) restricted to user-authored sources —
// 'manual' + 'brand_analysis' — so the analysis courses (Gold, Platinum, …)
// appear next to the managed rows; scraped junk stays out. Rows without a
// source (legacy managed string lists) can't be classified and stay.
const SUGGESTION_SOURCES: ReadonlySet<string> = new Set(['manual', 'brand_analysis'])
const SUGGESTION_CAP = 12

const trustedDetected = computed<ServiceSuggestion[]>(() =>
  (brandServices.value ?? [])
    .filter((s) => {
      const source = (s as { source?: unknown }).source
      return source == null || SUGGESTION_SOURCES.has(String(source))
    })
    .map((s) => ({ name: s.name, score: s.score })),
)

// Managed-first (user-confirmed rows always lead, never capped), then the
// trusted detected rows deduped against them, capped at 12 with a show-more.
// Falls back to the previous behavior when the endpoint has nothing trusted.
const serviceSuggestions = computed(() => {
  const trusted = trustedDetected.value
  if (managedNames.value.length || trusted.length) {
    const seen = new Set(managedNames.value.map((n) => n.trim().toLowerCase()))
    const extras = [...trusted]
      .sort((a, b) => (typeof b.score === 'number' ? b.score : -1) - (typeof a.score === 'number' ? a.score : -1))
      .filter((s) => {
        const key = s.name.trim().toLowerCase()
        if (!key || seen.has(key)) return false
        seen.add(key)
        return true
      })
    const combined = [...managedNames.value.map((name) => ({ name })), ...extras]
    if (showAllServices.value || combined.length <= SUGGESTION_CAP) {
      return { options: combined, capped: false }
    }
    return { options: combined.slice(0, SUGGESTION_CAP), capped: true }
  }
  return selectServiceSuggestions(managedNames.value, brandServices.value ?? [], SERVICE_SUGGESTION_CAP, showAllServices.value)
})

watch(selectedBrandUuid, () => {
  selectedServices.value = []
  showAllServices.value = false
  servicesPreselected.value = false
})

// FA-17: the helper copy says "deselect what you don't want" — so the chips
// must START SELECTED. Once the suggestion list for the current brand
// arrives, all suggested (managed + trusted analysis) services are checked;
// from that point every v-model change is the user's own. Persisting the
// full selection also guarantees downstream stages (PPC/FA-51) see a
// non-empty selected_services list.
const servicesPreselected = ref(false)
watch(
  () => serviceSuggestions.value.options,
  (options) => {
    if (servicesPreselected.value || !options.length) return
    servicesPreselected.value = true
    if (!selectedServices.value.length) {
      selectedServices.value = options.map((o) => o.name)
    }
  },
  { immediate: true },
)

// FA-15: default language + currency from the selected brand (once per
// brand switch; user overrides win for the rest of the session).
watch(
  selectedBrand,
  (brand) => {
    if (!brand) return
    if (!languageTouched.value) {
      const detected = (brand.detected_language || '').trim().toLowerCase()
      const match = LANGS.find((l) => l.code === detected)
      if (match) language.value = match.code
    }
    if (!currencyTouched.value) {
      const country = (brand.detected_country || '').trim()
      const currency = country ? COUNTRY_CURRENCY[country] : undefined
      if (currency && (CURRENCIES as readonly string[]).includes(currency)) {
        budgetCurrency.value = currency
      }
    }
  },
)
watch(language, () => { languageTouched.value = true })
watch(budgetCurrency, () => { currencyTouched.value = true })

async function handleCreate() {
  if (!selectedBrandUuid.value) return
  creating.value = true
  try {
    const result = await createMutation.mutateAsync({
      brand_uuid: selectedBrandUuid.value,
      name: campaignName.value || undefined,
      language: language.value,
      ...budgetPayload(),
      // FA-17/FA-51: once suggestions exist the selection is ALWAYS
      // persisted — chips start fully selected, so an empty list means
      // the user deliberately deselected everything, and the backend
      // must reject that at PPC time instead of silently widening to
      // the whole brand catalog.
      ...(serviceSuggestions.value.options.length
        ? { context_payload: { selected_services: selectedServices.value } }
        : {}),
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
      <div v-if="brands && !brands.length" data-testid="no-brands-card">
        <div class="surface-card p-6 text-center">
          <p class="text-sm text-muted-foreground">{{ t('camp.noBrands') }}</p>
          <button
            class="mt-3 h-8 px-3 rounded-lg border border-border/60 text-xs"
            @click="router.push('/brands/new')"
          >
            {{ t('camp.createBrand') }}
          </button>
        </div>
      </div>
      <div v-else-if="brands && brands.length > 1">
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
          <!-- FA-18: explain why Create Campaign stays disabled while brands
               exist but none is picked (previously silently disabled). -->
          <p
            v-if="!selectedBrandUuid"
            class="text-[11px] text-amber-500 dark:text-amber-400"
            data-testid="create-needs-brand-hint"
          >
            {{ t('camp.needBrandHint') }}
          </p>
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

      <!-- Total budget + currency (F16) -->
      <div data-loc="campaigns.create.budget">
        <label class="text-xs font-medium mb-1.5 block">{{ t('camp.budgetLabel') }}</label>
        <p class="text-[11px] text-muted-foreground mb-2.5">{{ t('camp.budgetHint') }}</p>
        <div class="flex flex-col sm:flex-row gap-2">
          <input
            v-model="budgetAmount"
            type="number"
            min="0"
            step="any"
            inputmode="decimal"
            :placeholder="t('camp.budgetPlaceholder')"
            class="flex-1 h-10 px-3 rounded-lg bg-overlay-subtle border border-border/60 text-sm outline-none focus:border-primary/60 transition"
            data-testid="budget-amount-input"
            data-loc="campaigns.create.budget-input"
          />
          <div class="relative sm:w-52">
            <select
              v-model="budgetCurrency"
              :aria-label="t('camp.currencyLabel')"
              class="w-full h-10 px-3 pe-8 rounded-lg bg-overlay-subtle border border-border/60 text-sm outline-none focus:border-primary/60 transition appearance-none cursor-pointer"
              data-testid="currency-select"
              data-loc="campaigns.create.currency-select"
            >
              <option v-for="c in CURRENCIES" :key="c" :value="c">{{ t(`camp.currency.${c}`) }}</option>
            </select>
            <ChevronDown class="h-3.5 w-3.5 text-muted-foreground absolute end-3 top-1/2 -translate-y-1/2 pointer-events-none" />
          </div>
        </div>
      </div>

      <!-- Campaign language (F22) -->
      <div data-loc="campaigns.create.language">
        <label class="text-xs font-medium mb-1.5 block">{{ t('camp.languageLabel') }}</label>
        <p class="text-[11px] text-muted-foreground mb-2.5">{{ t('camp.languageHint') }}</p>
        <div class="relative">
          <select
            v-model="language"
            :aria-label="t('camp.languageLabel')"
            class="w-full sm:w-64 h-10 px-3 pe-8 rounded-lg bg-overlay-subtle border border-border/60 text-sm outline-none focus:border-primary/60 transition appearance-none cursor-pointer"
            data-testid="campaign-language-select"
            data-loc="campaigns.create.language-select"
          >
            <option v-for="l in LANGS" :key="l.code" :value="l.code">{{ l.native }}</option>
          </select>
          <Languages class="h-3.5 w-3.5 text-muted-foreground absolute end-3 top-1/2 -translate-y-1/2 pointer-events-none" />
        </div>
      </div>

      <!-- Services to advertise (F14) -->
      <div v-if="selectedBrandUuid && (servicesLoading || serviceSuggestions.options.length)" data-loc="campaigns.create.services">
        <label class="text-xs font-medium mb-1.5 block">{{ t('camp.servicesLabel') }}</label>
        <p class="text-[11px] text-muted-foreground mb-2.5">{{ t('camp.servicesHint') }}</p>
        <!-- :key — remount per brand so custom-added service names don't leak across brands -->
        <ServiceSelector
          :key="selectedBrandUuid"
          v-model="selectedServices"
          :services="serviceSuggestions.options"
          :brand-uuid="selectedBrandUuid"
          :disabled="creating"
        />
        <!-- QA round 3 fix 2: the capped fallback can be expanded on demand -->
        <button
          v-if="serviceSuggestions.capped"
          type="button"
          class="mt-2 h-8 px-3 rounded-lg border border-border/60 text-xs text-muted-foreground hover:text-foreground hover:bg-overlay-subtle transition"
          data-testid="services-show-more"
          @click="showAllServices = !showAllServices"
        >
          {{ showAllServices ? t('common.showLess') : t('common.showMore') }}
        </button>
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
