<script setup lang="ts">
import { ref, computed } from 'vue'
import { FileText, Download } from 'lucide-vue-next'
import { useI18n } from '@/shared/utils/i18n'
import { triggerDownload } from '@/shared/utils/download'

interface BriefData {
  brand_name: string
  campaign_name: string
  objective: string
  target_audience: string
  key_messages: string
  tone_voice: string
  platforms: string[]
  budget: string
  timeline: string
  deliverables: string
  competitors: string
  do_include: string
  do_avoid: string
}

const { t } = useI18n()

const brief = ref<BriefData>({
  brand_name: '',
  campaign_name: '',
  objective: '',
  target_audience: '',
  key_messages: '',
  tone_voice: '',
  platforms: [],
  budget: '',
  timeline: '',
  deliverables: '',
  competitors: '',
  do_include: '',
  do_avoid: '',
})

const PLATFORM_OPTIONS = ['Meta (Facebook/Instagram)', 'Google Ads', 'LinkedIn', 'TikTok', 'Twitter/X']

function togglePlatform(p: string) {
  const idx = brief.value.platforms.indexOf(p)
  if (idx >= 0) brief.value.platforms.splice(idx, 1)
  else brief.value.platforms.push(p)
}

function generateBriefText(): string {
  const b = brief.value
  return `
CREATIVE BRIEF
══════════════════════════════════════════════

Brand:            ${b.brand_name || '—'}
Campaign:         ${b.campaign_name || '—'}
Date:             ${new Date().toLocaleDateString()}

──────────────────────────────────────────────
OBJECTIVE
${b.objective || '—'}

──────────────────────────────────────────────
TARGET AUDIENCE
${b.target_audience || '—'}

──────────────────────────────────────────────
KEY MESSAGES
${b.key_messages || '—'}

──────────────────────────────────────────────
TONE & VOICE
${b.tone_voice || '—'}

──────────────────────────────────────────────
PLATFORMS
${b.platforms.length ? b.platforms.join(', ') : '—'}

──────────────────────────────────────────────
BUDGET & TIMELINE
Budget: ${b.budget || '—'}
Timeline: ${b.timeline || '—'}

──────────────────────────────────────────────
DELIVERABLES
${b.deliverables || '—'}

──────────────────────────────────────────────
COMPETITORS / REFERENCES
${b.competitors || '—'}

──────────────────────────────────────────────
DO INCLUDE
${b.do_include || '—'}

──────────────────────────────────────────────
DO AVOID
${b.do_avoid || '—'}
`.trim()
}

function downloadBrief() {
  const text = generateBriefText()
  const blob = new Blob([text], { type: 'text/plain;charset=utf-8' })
  triggerDownload(blob, `${brief.value.campaign_name || 'creative-brief'}.txt`)
}

function downloadJson() {
  const json = JSON.stringify(brief.value, null, 2)
  const blob = new Blob([json], { type: 'application/json' })
  triggerDownload(blob, `${brief.value.campaign_name || 'creative-brief'}.json`)
}

const fields: { key: keyof BriefData; type: 'input' | 'textarea'; rows?: number }[] = [
  { key: 'brand_name', type: 'input' },
  { key: 'campaign_name', type: 'input' },
  { key: 'objective', type: 'textarea', rows: 3 },
  { key: 'target_audience', type: 'textarea', rows: 3 },
  { key: 'key_messages', type: 'textarea', rows: 3 },
  { key: 'tone_voice', type: 'input' },
  { key: 'budget', type: 'input' },
  { key: 'timeline', type: 'input' },
  { key: 'deliverables', type: 'textarea', rows: 2 },
  { key: 'competitors', type: 'textarea', rows: 2 },
  { key: 'do_include', type: 'textarea', rows: 2 },
  { key: 'do_avoid', type: 'textarea', rows: 2 },
]

function formatLabel(key: string): string {
  return key.replace(/_/g, ' ').replace(/^\w/, c => c.toUpperCase())
}

const filledCount = computed(() => {
  let count = 0
  if (brief.value.brand_name) count++
  if (brief.value.campaign_name) count++
  if (brief.value.objective) count++
  if (brief.value.target_audience) count++
  if (brief.value.key_messages) count++
  return count
})

const progressPct = computed(() => Math.round((filledCount.value / 5) * 100))
</script>

<template>
  <div class="space-y-5">
    <div class="flex items-center justify-between">
      <div class="flex items-center gap-3">
        <FileText class="h-5 w-5 text-primary" />
        <div>
          <h3 class="text-sm font-semibold">{{ t('brief.title') }}</h3>
          <p class="text-xs text-muted-foreground">{{ t('brief.subtitle') }}</p>
        </div>
      </div>
      <div class="flex gap-2">
        <button
          data-loc="creative-brief.download-text-btn"
          class="h-9 px-3 rounded-lg border border-border/60 text-xs font-medium hover:bg-overlay-light transition flex items-center gap-1.5"
          @click="downloadBrief"
        >
          <Download class="h-3.5 w-3.5" /> {{ t('brief.download') }}
        </button>
        <button
          data-loc="creative-brief.export-json-btn"
          class="h-9 px-3 rounded-lg bg-[image:var(--gradient-brand)] text-primary-foreground text-xs font-medium flex items-center gap-1.5"
          @click="downloadJson"
        >
          {{ t('common.exportJson') }}
        </button>
      </div>
    </div>

    <!-- Progress -->
    <div class="flex items-center gap-3">
      <div class="flex-1 h-1.5 rounded-full bg-overlay-subtle overflow-hidden">
        <div class="h-full rounded-full bg-[image:var(--gradient-brand)] transition-all" :style="{ width: `${progressPct}%` }" />
      </div>
      <span class="text-[11px] text-muted-foreground">{{ filledCount }}/5 required</span>
    </div>

    <!-- Platforms -->
    <div>
      <div class="text-xs font-medium text-muted-foreground mb-2">Platforms</div>
      <div class="flex flex-wrap gap-2">
        <button
          v-for="p in PLATFORM_OPTIONS"
          :key="p"
          data-loc="creative-brief.platform-btn"
          :class="[
            'px-3 py-1.5 rounded-lg text-xs font-medium border transition',
            brief.platforms.includes(p) ? 'bg-primary/15 border-primary/40 text-primary' : 'border-border/60 text-muted-foreground hover:bg-overlay-light',
          ]"
          @click="togglePlatform(p)"
        >
          {{ p }}
        </button>
      </div>
    </div>

    <!-- Form Fields -->
    <div class="grid sm:grid-cols-2 gap-3">
      <div v-for="field in fields" :key="field.key" :class="field.type === 'textarea' ? 'sm:col-span-2' : ''">
        <label class="block">
          <span class="text-[11px] font-medium text-muted-foreground mb-1 block">{{ formatLabel(field.key) }}</span>
          <input
            v-if="field.type === 'input'"
            v-model="(brief as any)[field.key]"
            data-loc="creative-brief.form-input"
            class="w-full h-9 px-3 rounded-lg bg-overlay-subtle border border-border/70 text-sm outline-none focus:border-primary/60 transition"
          />
          <textarea
            v-else
            v-model="(brief as any)[field.key]"
            data-loc="creative-brief.form-textarea"
            :rows="field.rows ?? 2"
            class="w-full px-3 py-2 rounded-lg bg-overlay-subtle border border-border/70 text-sm outline-none focus:border-primary/60 transition resize-none"
          />
        </label>
      </div>
    </div>
  </div>
</template>
