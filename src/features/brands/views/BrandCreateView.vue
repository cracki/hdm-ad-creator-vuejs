<script setup lang="ts">
import { ref, computed, watch } from 'vue'
import { useRouter, useRoute } from 'vue-router'
import Topbar from '@/layout/Topbar.vue'
import { useI18n } from '@/shared/utils/i18n'
import { useToast } from '@/shared/composables/useToast'
import { useIndustries, useCreateBrand, useBrand, useUpdateBrand, useBrandAssets, useBrandSocialMedia } from '@/features/brands/queries'
import { brandsApi } from '@/features/brands/api'
import {
  Globe, Building2, MapPin, Upload, Palette, ArrowRight, ArrowLeft,
  Check, Sparkles, Facebook, Instagram, Linkedin, Youtube, X,
} from 'lucide-vue-next'
import type { TKey } from '@/shared/utils/translations'

const logoFile = ref<File | null>(null)
const logoPreview = ref<string | null>(null)
const logoInput = ref<HTMLInputElement | null>(null)

function openLogoPicker() {
  logoInput.value?.click()
}

function handleLogoSelect(event: Event) {
  const input = event.target as HTMLInputElement
  const file = input.files?.[0]
  if (!file) return
  if (file.size > 5 * 1024 * 1024) {
    error.value = 'File must be under 5MB'
    return
  }
  if (!file.type.startsWith('image/')) {
    error.value = 'Only image files are allowed'
    return
  }
  logoFile.value = file
  logoPreview.value = URL.createObjectURL(file)
  error.value = ''
}

function clearLogo() {
  logoFile.value = null
  logoPreview.value = null
}

const router = useRouter()
const route = useRoute()
const { t } = useI18n()
const toast = useToast()

const isEdit = computed(() => route.name === 'brand-edit')
const brandUuid = computed(() => route.params.brandUuid as string)

const { data: existingBrand } = useBrand(brandUuid)
const { data: industries } = useIndustries()
const { data: existingAssets } = useBrandAssets(brandUuid)
const { data: existingSocialMedia } = useBrandSocialMedia(brandUuid)
const createMutation = useCreateBrand()
const updateMutation = useUpdateBrand()

const step = ref(1)
const form = ref({
  website_url: '',
  company_name: '',
  selected_industry_id: null as string | null,
  location: '',
  brand_color: '',
})

const socialLinks = ref<Record<string, string>>({
  facebook: '',
  instagram: '',
  linkedin: '',
  youtube: '',
})

watch(existingBrand, (brand) => {
  if (brand && isEdit.value) {
    form.value.website_url = brand.website_url
    form.value.company_name = brand.company_name
    form.value.selected_industry_id = brand.selected_industry?.industry_uuid ?? null
  }
}, { immediate: true })

watch(existingSocialMedia, (profiles) => {
  if (profiles && isEdit.value) {
    const links: Record<string, string> = { facebook: '', instagram: '', linkedin: '', youtube: '' }
    for (const p of profiles) {
      if (p.platform in links) {
        links[p.platform] = p.profile_url || ''
      }
    }
    socialLinks.value = links
  }
}, { immediate: true })

watch(existingAssets, (assets) => {
  if (assets && isEdit.value) {
    const logo = assets.find((a: any) => a.asset_type === 'logo')
    if (logo?.file_url) {
      logoPreview.value = logo.file_url
    }
  }
}, { immediate: true })

const error = ref('')
const loading = computed(() => createMutation.isPending.value || updateMutation.isPending.value)

const steps: Array<{ n: number; labelKey: TKey; descKey: TKey }> = [
  { n: 1, labelKey: 'newbrand.s1.label', descKey: 'newbrand.s1.desc' },
  { n: 2, labelKey: 'newbrand.s2.label', descKey: 'newbrand.s2.desc' },
  { n: 3, labelKey: 'newbrand.s3.label', descKey: 'newbrand.s3.desc' },
]

async function handleSubmit() {
  error.value = ''
  try {
    const payload = {
      website_url: form.value.website_url,
      company_name: form.value.company_name,
      selected_industry_id: form.value.selected_industry_id,
    }
    if (isEdit.value) {
      await updateMutation.mutateAsync({ uuid: brandUuid.value, payload })
      // Upload new logo if selected
      if (logoFile.value) {
        try {
          const formData = new FormData()
          formData.append('file', logoFile.value)
          formData.append('asset_type', 'logo')
          await brandsApi.uploadAsset(brandUuid.value, formData)
        } catch {}
      }
      // Sync social media: update existing, create new
      const currentProfiles = existingSocialMedia.value || []
      for (const [platform, url] of Object.entries(socialLinks.value)) {
        const trimmed = url.trim()
        const existing = currentProfiles.find((p: any) => p.platform === platform)
        if (existing) {
          if (existing.profile_url !== trimmed) {
            try {
              await brandsApi.updateSocialMedia(brandUuid.value, existing.social_media_uuid, { profile_url: trimmed })
            } catch {}
          }
        } else if (trimmed) {
          try {
            await brandsApi.createSocialMedia(brandUuid.value, { platform, profile_url: trimmed })
          } catch {}
        }
      }
    } else {
      const result = await createMutation.mutateAsync(payload)
      const newBrandUuid = result.data.brand_uuid
      // Upload logo if selected
      if (logoFile.value) {
        try {
          const formData = new FormData()
          formData.append('file', logoFile.value)
          formData.append('asset_type', 'logo')
          await brandsApi.uploadAsset(newBrandUuid, formData)
          brandsApi.logoAnalysis(newBrandUuid).then(
            () => toast.success(t('brands.logoAnalyzed')),
            () => toast.warning(t('brands.logoAnalysisSkipped')),
          )
        } catch {}
      }
      // Save social media profiles after brand creation
      const socialEntries = Object.entries(socialLinks.value).filter(([, url]) => url.trim())
      for (const [platform, url] of socialEntries) {
        try {
          await brandsApi.createSocialMedia(newBrandUuid, { platform, profile_url: url.trim() })
        } catch {}
      }
    }
    router.push('/brands')
  } catch (e: any) {
    const data = e.response?.data
    error.value = data?.website_url?.[0] || data?.company_name?.[0] || data?.non_field_errors?.[0] || 'Failed to save brand'
  }
}
</script>

<template>
  <Topbar :title="t('newbrand.title')" :subtitle="t('newbrand.subtitle')" />
  <main class="flex-1 p-4 sm:p-6 overflow-y-auto">
    <div class="max-w-3xl mx-auto space-y-8">
      <!-- Stepper -->
      <div data-loc="brands.create.stepper" class="flex items-center justify-center gap-2">
        <div v-for="(s, i) in steps" :key="s.n" class="flex items-center gap-2">
          <div class="flex items-center gap-3">
            <div
              :class="[
                'h-9 w-9 rounded-full grid place-items-center text-xs font-semibold border transition-all',
                step > s.n ? 'bg-success/15 border-success text-success' :
                step === s.n ? 'bg-[image:var(--gradient-brand)] border-transparent text-primary-foreground shadow-[var(--shadow-glow)]' :
                'border-border/60 text-muted-foreground',
              ]"
            >
              <Check v-if="step > s.n" class="h-4 w-4" />
              <template v-else>{{ s.n }}</template>
            </div>
            <div class="hidden sm:block">
              <div :class="['text-sm font-medium', step === s.n ? '' : 'text-muted-foreground']">{{ t(s.labelKey) }}</div>
              <div class="text-[11px] text-muted-foreground">{{ t(s.descKey) }}</div>
            </div>
          </div>
          <div v-if="i < steps.length - 1" class="h-px w-8 sm:w-16 bg-border/60 relative overflow-hidden shrink-0">
            <div class="absolute inset-0 bg-[image:var(--gradient-brand)] transition-all" :style="{ width: step > s.n ? '100%' : '0%' }" />
          </div>
        </div>
      </div>

      <!-- Step content -->
      <div class="surface-card p-4 sm:p-6 md:p-8 animate-[fade-up_0.4s_ease-out]">
        <!-- Step 1: Basics -->
        <div v-if="step === 1" class="space-y-6">
          <div>
            <h2 class="text-xl font-semibold tracking-tight">{{ t('newbrand.s1.h') }}</h2>
            <p class="text-sm text-muted-foreground mt-1">{{ t('newbrand.s1.sub') }}</p>
          </div>
          <label class="block">
            <span class="text-xs font-medium text-muted-foreground mb-1.5 block">{{ t('newbrand.field.url') }}</span>
            <div class="relative">
              <Globe class="absolute start-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
              <input v-model="form.website_url" placeholder="https://yourbrand.com" class="w-full h-11 ps-9 pe-3 rounded-lg bg-white/[0.03] border border-border/70 text-sm placeholder:text-muted-foreground/60 outline-none focus:border-primary/60 focus:bg-white/[0.05] transition" />
            </div>
            <span class="text-[11px] text-muted-foreground mt-1.5 block">{{ t('newbrand.field.urlHint') }}</span>
          </label>
          <label class="block">
            <span class="text-xs font-medium text-muted-foreground mb-1.5 block">{{ t('newbrand.field.company') }}</span>
            <div class="relative">
              <Building2 class="absolute start-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
              <input v-model="form.company_name" placeholder="Lumen Skincare" class="w-full h-11 ps-9 pe-3 rounded-lg bg-white/[0.03] border border-border/70 text-sm placeholder:text-muted-foreground/60 outline-none focus:border-primary/60 focus:bg-white/[0.05] transition" />
            </div>
          </label>
          <div class="grid md:grid-cols-2 gap-4">
            <label class="block">
              <span class="text-xs font-medium text-muted-foreground mb-1.5 block">{{ t('newbrand.field.industry') }}</span>
              <select v-model="form.selected_industry_id" data-loc="brands.create.industry-dropdown" class="w-full h-11 px-3 rounded-lg bg-white/[0.03] border border-border/70 text-sm outline-none focus:border-primary/60 transition">
                <option :value="null" disabled>Select industry</option>
                <option v-for="ind in industries" :key="ind.industry_uuid" :value="ind.industry_uuid" class="bg-card">
                  {{ ind.name }}
                </option>
              </select>
            </label>
            <label class="block">
              <span class="text-xs font-medium text-muted-foreground mb-1.5 block">{{ t('newbrand.field.location') }}</span>
              <div class="relative">
                <MapPin class="absolute start-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
                <input v-model="form.location" placeholder="Dubai, UAE" class="w-full h-11 ps-9 pe-3 rounded-lg bg-white/[0.03] border border-border/70 text-sm placeholder:text-muted-foreground/60 outline-none focus:border-primary/60 focus:bg-white/[0.05] transition" />
              </div>
            </label>
          </div>
        </div>

        <!-- Step 2: Identity -->
        <div v-if="step === 2" class="space-y-6">
          <div>
            <h2 class="text-xl font-semibold tracking-tight">{{ t('newbrand.s2.h') }}</h2>
            <p class="text-sm text-muted-foreground mt-1">{{ t('newbrand.s2.sub') }}</p>
          </div>

          <div>
            <span class="text-xs font-medium text-muted-foreground mb-2 block">{{ t('newbrand.logo') }}</span>
            <input ref="logoInput" type="file" accept="image/*" class="hidden" @change="handleLogoSelect" />
            <div
              v-if="!logoPreview"
              data-loc="brands.create.logo-upload"
              class="rounded-xl border-2 border-dashed border-border/60 p-8 text-center hover:border-primary/50 hover:bg-white/[0.02] transition cursor-pointer"
              @click="openLogoPicker"
            >
              <div class="h-12 w-12 rounded-xl bg-white/[0.05] grid place-items-center mx-auto mb-3">
                <Upload class="h-5 w-5 text-muted-foreground" />
              </div>
              <div class="text-sm font-medium">{{ t('newbrand.dropLogo') }}</div>
              <div class="text-xs text-muted-foreground mt-1">{{ t('newbrand.logoHint') }}</div>
            </div>
            <div v-else class="relative rounded-xl border border-border/60 p-4 flex items-center gap-4">
              <img :src="logoPreview" alt="Logo preview" class="h-16 w-16 rounded-lg object-cover" />
              <div class="flex-1 min-w-0">
                <div class="text-sm font-medium truncate">{{ logoFile?.name }}</div>
                <div class="text-xs text-muted-foreground">{{ logoFile ? `${(logoFile.size / 1024).toFixed(0)} KB` : '' }}</div>
              </div>
              <button class="h-8 w-8 grid place-items-center rounded-md hover:bg-destructive/10 text-muted-foreground hover:text-destructive transition" @click="clearLogo">
                <X class="h-4 w-4" />
              </button>
            </div>
          </div>

          <div>
            <span class="text-xs font-medium text-muted-foreground mb-2 block">{{ t('newbrand.color') }}</span>
            <div class="flex flex-wrap items-center gap-3">
              <div class="h-12 w-12 rounded-lg bg-[image:var(--gradient-brand)] border border-border/60 shadow-inner shrink-0" />
              <div class="flex-1 min-w-[140px]">
                <div class="relative">
                  <Palette class="absolute start-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
                  <input v-model="form.brand_color" placeholder="#A855F7" class="w-full h-11 ps-9 pe-3 rounded-lg bg-white/[0.03] border border-border/70 text-sm placeholder:text-muted-foreground/60 outline-none focus:border-primary/60 transition" />
                </div>
              </div>
              <div class="flex flex-wrap gap-1.5">
                <button v-for="c in ['#EC4899','#A855F7','#3B82F6','#10B981','#F59E0B','#EF4444']" :key="c" data-loc="brands.create.color-option" class="h-7 w-7 rounded-md border border-border/60 hover:scale-110 transition" :style="{ background: c }" @click="form.brand_color = c" />
              </div>
            </div>
          </div>

          <div>
            <span class="text-xs font-medium text-muted-foreground mb-2 block">{{ t('newbrand.social') }}</span>
            <div class="grid md:grid-cols-2 gap-3">
              <div v-for="(platform, key) in { facebook: Facebook, instagram: Instagram, linkedin: Linkedin, youtube: Youtube }" :key="key" class="flex items-center gap-2 px-3 h-10 rounded-lg bg-white/[0.03] border border-border/70">
                <component :is="platform" class="h-3.5 w-3.5 text-muted-foreground" />
                <input v-model="socialLinks[key]" :placeholder="`${key.charAt(0).toUpperCase() + key.slice(1)} URL`" class="flex-1 bg-transparent text-sm outline-none placeholder:text-muted-foreground/60" />
              </div>
            </div>
          </div>
        </div>

        <!-- Step 3: Review -->
        <div v-if="step === 3" class="space-y-6">
          <div>
            <h2 class="text-xl font-semibold tracking-tight">{{ t('newbrand.s3.h') }}</h2>
            <p class="text-sm text-muted-foreground mt-1">{{ t('newbrand.s3.sub') }}</p>
          </div>
          <div class="rounded-xl border border-border/60 divide-y divide-border/60">
            <div class="flex items-center justify-between gap-3 px-4 py-3 text-sm">
              <span class="text-muted-foreground shrink-0">{{ t('newbrand.row.company') }}</span>
              <span class="font-medium truncate text-end">{{ form.company_name || '—' }}</span>
            </div>
            <div class="flex items-center justify-between gap-3 px-4 py-3 text-sm">
              <span class="text-muted-foreground shrink-0">{{ t('newbrand.row.website') }}</span>
              <span class="font-medium truncate text-end">{{ form.website_url || '—' }}</span>
            </div>
            <div class="flex items-center justify-between gap-3 px-4 py-3 text-sm">
              <span class="text-muted-foreground shrink-0">{{ t('newbrand.row.industry') }}</span>
              <span class="font-medium truncate text-end">
                {{ industries?.find((i: any) => i.industry_uuid === form.selected_industry_id)?.name || '—' }}
              </span>
            </div>
            <div class="flex items-center justify-between gap-3 px-4 py-3 text-sm">
              <span class="text-muted-foreground shrink-0">{{ t('newbrand.row.color') }}</span>
              <span class="font-medium truncate text-end">{{ form.brand_color || '—' }}</span>
            </div>
          </div>

          <div v-if="error" class="text-sm text-destructive">{{ error }}</div>

          <div class="rounded-xl border border-primary/30 bg-primary/[0.04] p-4 flex items-start gap-3">
            <Sparkles class="h-4 w-4 text-primary mt-0.5" />
            <div class="text-xs text-muted-foreground">
              <span class="text-foreground font-medium">{{ t('newbrand.next') }}</span> {{ t('newbrand.nextDesc') }}
            </div>
          </div>
        </div>
      </div>

      <!-- Navigation -->
      <div class="flex items-center justify-between">
        <button
          @click="step = Math.max(1, step - 1)"
          :disabled="step === 1"
          data-loc="brands.create.back-btn"
          class="h-10 px-4 rounded-lg border border-border/60 text-xs font-medium hover:bg-white/[0.03] transition flex items-center gap-1.5 disabled:opacity-40 disabled:cursor-not-allowed"
        >
          <ArrowLeft class="h-3.5 w-3.5" /> {{ t('newbrand.previous') }}
        </button>
        <button
          v-if="step < 3"
          @click="step++"
          data-loc="brands.create.continue-btn"
          class="h-10 px-5 rounded-lg bg-[image:var(--gradient-brand)] text-primary-foreground text-xs font-medium shadow-[var(--shadow-glow)] flex items-center gap-1.5"
        >
          {{ t('newbrand.continue') }} <ArrowRight class="h-3.5 w-3.5" />
        </button>
        <button
          v-else
          @click="handleSubmit"
          :disabled="loading"
          data-loc="brands.create.start-btn"
          class="h-10 px-5 rounded-lg bg-[image:var(--gradient-brand)] text-primary-foreground text-xs font-medium shadow-[var(--shadow-glow)] flex items-center gap-1.5 disabled:opacity-60"
        >
          <Sparkles class="h-3.5 w-3.5" /> {{ loading ? '...' : t('newbrand.start') }}
        </button>
      </div>
    </div>
  </main>
</template>
