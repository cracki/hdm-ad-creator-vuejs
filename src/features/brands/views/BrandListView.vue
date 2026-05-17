<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import { RouterLink, useRoute } from 'vue-router'
import Topbar from '@/layout/Topbar.vue'
import { useBrands } from '@/features/brands/queries'
import { brandsApi } from '@/features/brands/api'
import type { Industry } from '@/features/brands/types'
import { useI18n } from '@/shared/utils/i18n'
import { usePageActions } from '@/shared/composables/usePageActions'
import SkeletonLoader from '@/shared/components/SkeletonLoader.vue'
import {
  Search, Plus, SlidersHorizontal, MoreHorizontal, Sparkles,
  Globe, Eye, Pencil, Trash2,
} from 'lucide-vue-next'

const { data: brands, isLoading } = useBrands()
const { t } = useI18n()
const route = useRoute()
const { setActions } = usePageActions()

const searchQuery = ref((route.query.search as string) ?? '')
const selectedIndustry = ref<string | null>(null)
const industries = ref<Industry[]>([])
const showIndustryDropdown = ref(false)
const openMenuUuid = ref<string | null>(null)

const filteredBrands = computed(() => {
  if (!brands.value) return []
  let result = brands.value
  if (searchQuery.value) {
    const q = searchQuery.value.toLowerCase()
    result = result.filter(
      (b) =>
        b.company_name.toLowerCase().includes(q) ||
        b.website_url.toLowerCase().includes(q),
    )
  }
  if (selectedIndustry.value) {
    result = result.filter(
      (b) => b.selected_industry?.industry_uuid === selectedIndustry.value,
    )
  }
  return result
})

onMounted(async () => {
  try {
    const { data } = await brandsApi.listIndustries()
    industries.value = data
  } catch { /* ignore */ }
})

function toggleIndustryDropdown() {
  showIndustryDropdown.value = !showIndustryDropdown.value
}

function selectIndustry(uuid: string | null) {
  selectedIndustry.value = uuid
  showIndustryDropdown.value = false
}

function selectedIndustryName(): string {
  if (!selectedIndustry.value) return t('brands.allIndustries')
  const ind = industries.value.find((i) => i.industry_uuid === selectedIndustry.value)
  return ind?.name ?? t('brands.allIndustries')
}

function toggleMenu(uuid: string, event: Event) {
  event.preventDefault()
  event.stopPropagation()
  openMenuUuid.value = openMenuUuid.value === uuid ? null : uuid
}

function closeMenu() {
  openMenuUuid.value = null
}

async function handleDelete(uuid: string) {
  if (!confirm(t('brands.confirmDelete'))) return
  try {
    await brandsApi.delete(uuid)
  } catch { /* ignore */ }
  closeMenu()
}

function getInitials(name: string): string {
  return name.charAt(0).toUpperCase()
}

const COLORS = [
  'from-pink-500 to-rose-500',
  'from-cyan-400 to-blue-500',
  'from-amber-500 to-orange-600',
  'from-emerald-500 to-teal-500',
  'from-violet-500 to-fuchsia-500',
  'from-indigo-500 to-purple-500',
]

function getColor(index: number): string {
  return COLORS[index % COLORS.length]
}

setActions([
  { label: t('brands.new'), icon: Plus, to: '/brands/new' },
])
</script>

<template>
  <Topbar
    :title="t('brands.title')"
    :subtitle="t('brands.subtitle')"
  >
    <template #actions>
      <RouterLink
        to="/brands/new"
        data-loc="brands.list.new-brand-btn"
        class="hidden sm:inline-flex items-center gap-1.5 h-9 px-3.5 rounded-lg bg-[image:var(--gradient-brand)] text-primary-foreground text-xs font-medium shadow-[var(--shadow-glow)] hover:opacity-95 transition"
      >
        <Plus class="h-3.5 w-3.5" /> {{ t('brands.new') }}
      </RouterLink>
    </template>
  </Topbar>

  <main class="flex-1 p-4 sm:p-6 space-y-4 sm:space-y-5 overflow-y-auto" @click="closeMenu">
    <div class="flex flex-wrap items-center gap-2 sm:gap-3">
      <div class="flex items-center gap-2 px-3 h-10 rounded-lg bg-white/[0.03] border border-border/60 flex-1 min-w-0 sm:max-w-md">
        <Search class="h-3.5 w-3.5 text-muted-foreground shrink-0" />
        <input
          v-model="searchQuery"
          :placeholder="t('brands.searchPlaceholder')"
          data-loc="brands.list.search"
          class="flex-1 min-w-0 bg-transparent text-sm outline-none placeholder:text-muted-foreground/60"
        />
      </div>

      <!-- Industry filter -->
      <div class="relative">
        <button
          @click="toggleIndustryDropdown"
          data-loc="brands.list.industry-filter"
          class="h-10 px-3 rounded-lg bg-white/[0.03] border border-border/60 text-xs font-medium hover:bg-white/[0.06] transition flex items-center gap-1.5"
        >
          <SlidersHorizontal class="h-3.5 w-3.5" />
          <span class="hidden sm:inline">{{ selectedIndustryName() }}</span>
        </button>
        <div
          v-if="showIndustryDropdown"
          class="absolute top-full mt-1 start-0 z-20 w-56 max-h-64 overflow-y-auto rounded-lg border border-border/60 bg-surface shadow-lg py-1"
        >
          <button
            @click="selectIndustry(null)"
            :class="['w-full text-start px-3 py-2 text-xs hover:bg-white/[0.04] transition', !selectedIndustry ? 'text-primary font-medium' : 'text-muted-foreground']"
          >
            {{ t('brands.allIndustries') }}
          </button>
          <button
            v-for="ind in industries"
            :key="ind.industry_uuid"
            @click="selectIndustry(ind.industry_uuid)"
            :class="['w-full text-start px-3 py-2 text-xs hover:bg-white/[0.04] transition', selectedIndustry === ind.industry_uuid ? 'text-primary font-medium' : 'text-muted-foreground']"
          >
            {{ ind.name }}
          </button>
        </div>
      </div>

      <RouterLink to="/brands/new" class="sm:hidden h-10 px-3 rounded-lg bg-[image:var(--gradient-brand)] text-primary-foreground text-xs font-medium shadow-[var(--shadow-glow)] flex items-center gap-1.5">
        <Plus class="h-3.5 w-3.5" /> {{ t('brands.shortNew') }}
      </RouterLink>
    </div>

    <!-- Loading skeleton -->
    <SkeletonLoader v-if="isLoading" variant="grid" :count="6" height="230px" />

    <!-- Brand grid -->
    <div v-else class="grid sm:grid-cols-2 lg:grid-cols-3 gap-3 sm:gap-4">
      <RouterLink
        v-for="(brand, index) in filteredBrands"
        :key="brand.brand_uuid"
        :to="`/brands/${brand.brand_uuid}`"
        data-loc="brands.list.brand-card"
        class="group surface-card p-5 hover:border-primary/40 transition relative block"
      >
        <div class="absolute -top-12 -end-12 h-32 w-32 rounded-full bg-[image:var(--gradient-brand)] opacity-0 group-hover:opacity-10 blur-3xl transition" />
        <div class="relative flex items-start justify-between mb-4">
          <div :class="['h-12 w-12 rounded-xl bg-gradient-to-br grid place-items-center text-base font-semibold text-white shadow-lg', getColor(index)]">
            {{ getInitials(brand.company_name) }}
          </div>
          <div class="relative">
            <button @click="toggleMenu(brand.brand_uuid, $event)" data-loc="brands.list.card-menu-toggle" class="h-10 w-10 grid place-items-center rounded-md hover:bg-white/[0.06] text-muted-foreground">
              <MoreHorizontal class="h-4 w-4" />
            </button>
            <!-- Dropdown menu -->
            <div
              v-if="openMenuUuid === brand.brand_uuid"
              class="absolute end-0 top-full mt-1 z-20 w-40 rounded-lg border border-border/60 bg-surface shadow-lg py-1"
              @click.stop
            >
              <RouterLink
                :to="`/brands/${brand.brand_uuid}`"
                data-loc="brands.list.card-view-details"
                class="flex items-center gap-2 w-full text-start px-3 py-2 text-xs text-muted-foreground hover:bg-white/[0.04] hover:text-foreground transition"
                @click="closeMenu"
              >
                <Eye class="h-3.5 w-3.5" /> {{ t('brands.viewDetails') }}
              </RouterLink>
              <RouterLink
                :to="`/brands/${brand.brand_uuid}/edit`"
                data-loc="brands.list.card-edit"
                class="flex items-center gap-2 w-full text-start px-3 py-2 text-xs text-muted-foreground hover:bg-white/[0.04] hover:text-foreground transition"
                @click="closeMenu"
              >
                <Pencil class="h-3.5 w-3.5" /> {{ t('brands.edit') }}
              </RouterLink>
              <RouterLink
                :to="`/brands/${brand.brand_uuid}/analysis`"
                data-loc="brands.list.card-analyze"
                class="flex items-center gap-2 w-full text-start px-3 py-2 text-xs text-muted-foreground hover:bg-white/[0.04] hover:text-foreground transition"
                @click="closeMenu"
              >
                <Sparkles class="h-3.5 w-3.5" /> {{ t('brands.analyze') }}
              </RouterLink>
              <button
                @click="handleDelete(brand.brand_uuid)"
                data-loc="brands.list.card-delete"
                class="flex items-center gap-2 w-full text-start px-3 py-2 text-xs text-destructive hover:bg-destructive/5 transition"
              >
                <Trash2 class="h-3.5 w-3.5" /> {{ t('brands.delete') }}
              </button>
            </div>
          </div>
        </div>
        <div class="space-y-1 mb-4">
          <div class="font-semibold truncate">{{ brand.company_name }}</div>
          <div class="flex items-center gap-1.5 text-xs text-muted-foreground min-w-0">
            <Globe class="h-3 w-3 shrink-0" />
            <span class="truncate">{{ brand.website_url }}</span>
          </div>
        </div>
        <div class="flex items-center gap-2 flex-wrap mb-4">
          <span v-if="brand.selected_industry" class="text-[11px] px-2 py-0.5 rounded-full border border-border/60 text-muted-foreground">
            {{ brand.selected_industry.name }}
          </span>
          <span class="inline-flex items-center gap-1 text-[11px] px-2 py-0.5 rounded-full text-muted-foreground bg-white/5">
            <Sparkles class="h-2.5 w-2.5" /> {{ t('status.notAnalyzed') }}
          </span>
        </div>
      </RouterLink>

      <RouterLink
        to="/brands/new"
        data-loc="brands.list.add-brand-card"
        class="rounded-xl border-2 border-dashed border-border/60 hover:border-primary/50 hover:bg-white/[0.02] transition flex flex-col items-center justify-center p-8 min-h-[180px] sm:min-h-[230px] text-center gap-3 group"
      >
        <div class="h-12 w-12 rounded-xl bg-[image:var(--gradient-brand)] grid place-items-center shadow-[var(--shadow-glow)] group-hover:scale-110 transition-transform">
          <Plus class="h-5 w-5 text-primary-foreground" />
        </div>
        <div>
          <div class="font-semibold text-sm">{{ t('brands.add') }}</div>
          <div class="text-xs text-muted-foreground mt-1">{{ t('brands.addHint') }}</div>
        </div>
      </RouterLink>
    </div>
  </main>
</template>
