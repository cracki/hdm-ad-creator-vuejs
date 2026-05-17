<script setup lang="ts">
import { computed, ref } from 'vue'
import { Facebook, Search as SearchIcon, Linkedin } from 'lucide-vue-next'
import { useI18n } from '@/shared/utils/i18n'

export interface AdData {
  headline: string
  primary_text: string
  description: string
  cta: string
  display_url?: string
  image_url?: string
  brand_name?: string
}

type Platform = 'meta' | 'google' | 'linkedin'

const props = defineProps<{ ad: AdData }>()
const { t } = useI18n()
const activePlatform = ref<Platform>('meta')

const platforms: { key: Platform; labelKey: string; icon: any }[] = [
  { key: 'meta', labelKey: 'adpreview.meta', icon: Facebook },
  { key: 'google', labelKey: 'adpreview.google', icon: SearchIcon },
  { key: 'linkedin', labelKey: 'adpreview.linkedin', icon: Linkedin },
]

const ctaColors: Record<string, string> = {
  'Shop Now': 'bg-blue-600 text-white',
  'Learn More': 'bg-blue-600 text-white',
  'Get Offer': 'bg-green-600 text-white',
  'Sign Up': 'bg-blue-600 text-white',
  'Download': 'bg-blue-600 text-white',
  'Contact Us': 'bg-blue-600 text-white',
  'Book Demo': 'bg-blue-600 text-white',
  'Start Free Trial': 'bg-green-600 text-white',
  'Discover More': 'bg-blue-600 text-white',
  default: 'bg-primary text-primary-foreground',
}

const ctaClass = computed(() => ctaColors[props.ad.cta] ?? ctaColors.default)
</script>

<template>
  <div class="space-y-3">
    <!-- Platform Tabs -->
    <div class="flex gap-1 p-1 rounded-lg bg-white/[0.03] border border-border/60 w-fit">
      <button
        v-for="p in platforms"
        :key="p.key"
        :class="[
          'flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-medium transition',
          activePlatform === p.key ? 'bg-[image:var(--gradient-brand)] text-primary-foreground' : 'text-muted-foreground hover:text-foreground',
        ]"
        @click="activePlatform = p.key"
      >
        <component :is="p.icon" class="h-3.5 w-3.5" />
        {{ t(p.labelKey as any) }}
      </button>
    </div>

    <!-- Meta Feed Preview -->
    <div v-if="activePlatform === 'meta'" class="surface-card max-w-[480px] overflow-hidden">
      <div class="p-4 flex items-center gap-3">
        <div class="h-10 w-10 rounded-full bg-gradient-to-br from-primary to-accent-magenta grid place-items-center text-xs font-bold text-white">
          {{ (ad.brand_name ?? 'B').charAt(0).toUpperCase() }}
        </div>
        <div>
          <div class="text-sm font-semibold">{{ ad.brand_name ?? 'Brand Name' }}</div>
          <div class="text-[11px] text-muted-foreground">Sponsored · 🌐</div>
        </div>
        <div class="ms-auto text-[11px] text-muted-foreground">···</div>
      </div>
      <p class="px-4 pb-3 text-sm leading-relaxed">{{ ad.primary_text }}</p>
      <div class="aspect-video bg-muted/50 flex items-center justify-center text-muted-foreground text-xs">
        {{ ad.image_url ? '' : '1200 × 628' }}
        <img v-if="ad.image_url" :src="ad.image_url" class="w-full h-full object-cover" :alt="ad.headline" />
      </div>
      <div class="p-4 border-t border-border/40">
        <div class="text-[11px] text-muted-foreground uppercase mb-1">example.com</div>
        <div class="text-sm font-semibold">{{ ad.headline }}</div>
        <div class="text-xs text-muted-foreground mt-0.5">{{ ad.description }}</div>
        <button :class="['mt-3 h-9 px-6 rounded-md text-xs font-semibold', ctaClass]">
          {{ ad.cta }}
        </button>
      </div>
    </div>

    <!-- Google Search Preview -->
    <div v-if="activePlatform === 'google'" class="surface-card max-w-[600px] p-5">
      <div class="flex items-start gap-1 mb-1">
        <span class="text-[11px] text-muted-foreground">Ad ·</span>
        <span class="text-[11px] text-muted-foreground">{{ ad.display_url ?? 'https://example.com' }}</span>
      </div>
      <div class="text-base text-blue-400 font-medium mb-1 hover:underline cursor-pointer">
        {{ ad.headline }} — {{ ad.brand_name ?? 'Brand' }}
      </div>
      <div class="text-xs text-green-500 mb-2">{{ ad.display_url ?? 'https://example.com' }} › {{ ad.cta?.toLowerCase().replace(/\s+/g, '') }}</div>
      <p class="text-sm text-muted-foreground leading-relaxed">{{ ad.primary_text }}</p>
      <div class="mt-2 flex items-center gap-3">
        <span class="text-[11px] px-2 py-1 rounded border border-border/60 text-muted-foreground">{{ ad.description }}</span>
      </div>
    </div>

    <!-- LinkedIn Preview -->
    <div v-if="activePlatform === 'linkedin'" class="surface-card max-w-[480px] overflow-hidden">
      <div class="p-4 flex items-center gap-3">
        <div class="h-10 w-10 rounded bg-gradient-to-br from-primary to-accent-cyan grid place-items-center text-xs font-bold text-white">
          {{ (ad.brand_name ?? 'B').charAt(0).toUpperCase() }}
        </div>
        <div>
          <div class="text-sm font-semibold">{{ ad.brand_name ?? 'Brand Name' }}</div>
          <div class="text-[11px] text-muted-foreground">Promoted · 1st</div>
        </div>
        <div class="ms-auto text-[11px] text-muted-foreground">···</div>
      </div>
      <p class="px-4 pb-3 text-sm leading-relaxed">{{ ad.primary_text }}</p>
      <div class="aspect-[1.91/1] bg-muted/50 flex items-center justify-center text-muted-foreground text-xs">
        {{ ad.image_url ? '' : '1200 × 627' }}
        <img v-if="ad.image_url" :src="ad.image_url" class="w-full h-full object-cover" :alt="ad.headline" />
      </div>
      <div class="p-3 flex items-center justify-between border-t border-border/40">
        <div class="text-xs text-muted-foreground">{{ ad.display_url ?? 'example.com' }}</div>
        <button :class="['h-8 px-4 rounded-full text-xs font-semibold border', 'border-primary/60 text-primary hover:bg-primary/10 transition']">
          {{ ad.cta }}
        </button>
      </div>
    </div>
  </div>
</template>
