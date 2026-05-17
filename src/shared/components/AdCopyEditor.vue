<script setup lang="ts">
import { ref, computed, watch } from 'vue'
import { Pencil, Check, RotateCcw } from 'lucide-vue-next'
import type { AdData } from './AdPreview.vue'

export interface PlatformLimits {
  headline: number
  primary_text: number
  description: number
}

const PLATFORM_LIMITS: Record<string, PlatformLimits> = {
  meta: { headline: 40, primary_text: 125, description: 30 },
  google: { headline: 30, primary_text: 90, description: 90 },
  linkedin: { headline: 70, primary_text: 150, description: 100 },
}

const props = defineProps<{
  ad: AdData
  platform?: string
}>()

const emit = defineEmits<{
  update: [ad: AdData]
}>()

const isEditing = ref(false)
const localAd = ref<AdData>({ ...props.ad })

watch(() => props.ad, (newAd) => {
  localAd.value = { ...newAd }
}, { deep: true })

const limits = computed(() => PLATFORM_LIMITS[props.platform ?? 'meta'] ?? PLATFORM_LIMITS.meta)

function charPercent(field: keyof PlatformLimits): number {
  const max = limits.value[field]
  const len = (localAd.value[field === 'primary_text' ? 'primary_text' : field] ?? '').length
  return Math.min(100, (len / max) * 100)
}

function charColor(field: keyof PlatformLimits): string {
  const pct = charPercent(field)
  if (pct > 95) return 'text-destructive'
  if (pct > 80) return 'text-warning'
  return 'text-muted-foreground'
}

function toggleEdit() {
  if (isEditing.value) {
    emit('update', { ...localAd.value })
  }
  isEditing.value = !isEditing.value
}

function reset() {
  localAd.value = { ...props.ad }
  emit('update', { ...localAd.value })
}
</script>

<template>
  <div class="surface-card p-4 space-y-3">
    <div class="flex items-center justify-between">
      <div class="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Ad Copy</div>
      <div class="flex items-center gap-1">
        <button
          data-loc="ad-copy-editor.reset-btn"
          class="h-7 w-7 grid place-items-center rounded-md hover:bg-white/[0.06] text-muted-foreground transition"
          @click="reset"
          title="Reset"
        >
          <RotateCcw class="h-3.5 w-3.5" />
        </button>
        <button
          data-loc="ad-copy-editor.toggle-edit-btn"
          :class="[
            'h-7 px-2.5 rounded-md text-xs font-medium flex items-center gap-1 transition',
            isEditing ? 'bg-success/15 text-success' : 'hover:bg-white/[0.06] text-muted-foreground',
          ]"
          @click="toggleEdit"
        >
          <Check v-if="isEditing" class="h-3 w-3" />
          <Pencil v-else class="h-3 w-3" />
          {{ isEditing ? 'Save' : 'Edit' }}
        </button>
      </div>
    </div>

    <!-- Headline -->
    <div>
      <div class="flex items-center justify-between mb-1">
        <span class="text-[11px] text-muted-foreground font-medium">Headline</span>
        <span :class="['text-[11px]', charColor('headline')]">
          {{ localAd.headline?.length ?? 0 }}/{{ limits.headline }}
        </span>
      </div>
      <div class="h-1 rounded-full bg-white/5 overflow-hidden mb-1.5">
        <div
          :class="['h-full rounded-full transition-all', charPercent('headline') > 95 ? 'bg-destructive' : 'bg-primary']"
          :style="{ width: `${charPercent('headline')}%` }"
        />
      </div>
      <input
        v-if="isEditing"
        v-model="localAd.headline"
        data-loc="ad-copy-editor.headline-input"
        :maxlength="limits.headline"
        class="w-full h-9 px-3 rounded-lg bg-white/[0.03] border border-border/70 text-sm outline-none focus:border-primary/60 transition"
      />
      <div v-else class="text-sm font-semibold">{{ localAd.headline }}</div>
    </div>

    <!-- Primary Text -->
    <div>
      <div class="flex items-center justify-between mb-1">
        <span class="text-[11px] text-muted-foreground font-medium">Primary Text</span>
        <span :class="['text-[11px]', charColor('primary_text')]">
          {{ localAd.primary_text?.length ?? 0 }}/{{ limits.primary_text }}
        </span>
      </div>
      <div class="h-1 rounded-full bg-white/5 overflow-hidden mb-1.5">
        <div
          :class="['h-full rounded-full transition-all', charPercent('primary_text') > 95 ? 'bg-destructive' : 'bg-primary']"
          :style="{ width: `${charPercent('primary_text')}%` }"
        />
      </div>
      <textarea
        v-if="isEditing"
        v-model="localAd.primary_text"
        data-loc="ad-copy-editor.primary-text-input"
        :maxlength="limits.primary_text"
        rows="3"
        class="w-full px-3 py-2 rounded-lg bg-white/[0.03] border border-border/70 text-sm outline-none focus:border-primary/60 transition resize-none"
      />
      <div v-else class="text-sm text-muted-foreground leading-relaxed">{{ localAd.primary_text }}</div>
    </div>

    <!-- Description -->
    <div>
      <div class="flex items-center justify-between mb-1">
        <span class="text-[11px] text-muted-foreground font-medium">Description</span>
        <span :class="['text-[11px]', charColor('description')]">
          {{ localAd.description?.length ?? 0 }}/{{ limits.description }}
        </span>
      </div>
      <div class="h-1 rounded-full bg-white/5 overflow-hidden mb-1.5">
        <div
          :class="['h-full rounded-full transition-all', charPercent('description') > 95 ? 'bg-destructive' : 'bg-primary']"
          :style="{ width: `${charPercent('description')}%` }"
        />
      </div>
      <input
        v-if="isEditing"
        v-model="localAd.description"
        data-loc="ad-copy-editor.description-input"
        :maxlength="limits.description"
        class="w-full h-9 px-3 rounded-lg bg-white/[0.03] border border-border/70 text-sm outline-none focus:border-primary/60 transition"
      />
      <div v-else class="text-xs text-muted-foreground">{{ localAd.description }}</div>
    </div>

    <!-- CTA -->
    <div class="flex items-center justify-between">
      <span class="text-[11px] text-muted-foreground font-medium">CTA</span>
      <span v-if="!isEditing" class="text-xs px-2.5 py-1 rounded-md bg-primary/10 text-primary font-medium">{{ localAd.cta }}</span>
    </div>
    <select
      v-if="isEditing"
      v-model="localAd.cta"
      data-loc="ad-copy-editor.cta-select"
      class="w-full h-9 px-3 rounded-lg bg-white/[0.03] border border-border/70 text-sm outline-none focus:border-primary/60 transition"
    >
      <option>Shop Now</option>
      <option>Learn More</option>
      <option>Sign Up</option>
      <option>Get Offer</option>
      <option>Download</option>
      <option>Contact Us</option>
      <option>Book Demo</option>
      <option>Start Free Trial</option>
      <option>Discover More</option>
      <option>Apply Now</option>
      <option>Subscribe</option>
    </select>
  </div>
</template>
