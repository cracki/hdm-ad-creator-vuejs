<script setup lang="ts">
import { computed, ref, watch } from 'vue'
import { Check, Plus, AlertTriangle } from 'lucide-vue-next'
import { useI18n } from '@/shared/utils/i18n'
// Direct api call (not a vue-query mutation): this shared component must not
// hard-require a VueQueryPlugin context.
import { brandsApi } from '@/features/brands/api'

interface ServiceOption {
  name: string
  score?: number | null
  classification?: string | null
  recommendation?: string | null
  source?: string | null
}

const props = withDefaults(defineProps<{
  modelValue: string[]
  services?: ServiceOption[]
  disabled?: boolean
  /** When set, brand-unrelated custom services trigger a warning before add. */
  brandUuid?: string | null
}>(), {
  services: () => [],
  disabled: false,
  brandUuid: null,
})

const emit = defineEmits<{ 'update:modelValue': [value: string[]] }>()

const { t } = useI18n()

// Names added via the inline input, kept so custom picks render as chips too.
const customNames = ref<string[]>([])

const options = computed<ServiceOption[]>(() => {
  const known = new Set(props.services.map((s) => s.name))
  const extras = customNames.value
    .filter((name) => !known.has(name))
    .map((name) => ({ name }))
  return [...props.services, ...extras]
})

const customSet = computed(() => new Set(customNames.value))

function isSelected(name: string): boolean {
  return props.modelValue.includes(name)
}

function toggle(name: string) {
  if (props.disabled) return
  emit('update:modelValue', isSelected(name)
    ? props.modelValue.filter((n) => n !== name)
    : [...props.modelValue, name])
}

const newName = ref('')

// ── Relatedness check (QA round 3 fix 1) ──
// A NEW custom service is checked against the brand first; `related:false`
// shows a localized amber warning and the SECOND submit force-adds.
const checkPending = ref(false)
const unrelatedWarning = ref('')
const warnedName = ref('')

watch(newName, (value) => {
  // Keep the warning while the input holds the warned pending name (it is
  // programmatically restored for the force-add second submit).
  if (value.trim().toLowerCase() !== warnedName.value) {
    unrelatedWarning.value = ''
  }
})

function addService() {
  const name = newName.value.trim()
  // QA4 (test-4 bug 2): re-entry guard + immediate clear — while the
  // relatedness check is in flight the input must be empty, otherwise a
  // second Enter concatenates the stale text into one merged label.
  if (!name || props.disabled || checkPending.value) return
  newName.value = ''
  commitAdd(name)
}

async function commitAdd(name: string) {
  const known = options.value.some((s) => s.name.toLowerCase() === name.toLowerCase())
  if (props.brandUuid && !known && warnedName.value !== name.toLowerCase()) {
    unrelatedWarning.value = ''
    checkPending.value = true
    try {
      const res = await brandsApi.checkServiceRelatedness(props.brandUuid, name)
      if (res?.data?.related === false) {
        warnedName.value = name.toLowerCase()
        unrelatedWarning.value = t('serviceSelector.unrelatedWarning')
        newName.value = name // restore so the second submit force-adds
        return // first submit only warns — a second click force-adds
      }
    } catch {
      // Check unavailable — never block the add on it.
    } finally {
      checkPending.value = false
    }
  }
  unrelatedWarning.value = ''
  if (!isSelected(name)) {
    emit('update:modelValue', [...props.modelValue, name])
  }
  if (!options.value.some((s) => s.name === name)) {
    customNames.value.push(name)
  }
}
</script>

<template>
  <div class="space-y-3">
    <div v-if="options.length" class="flex flex-wrap gap-2">
      <button
        v-for="service in options"
        :key="service.name"
        type="button"
        :disabled="disabled"
        :class="[
          'inline-flex items-center gap-1.5 min-h-9 px-3 rounded-full border text-xs transition',
          isSelected(service.name)
            ? 'border-primary bg-primary/15 text-primary font-medium'
            : 'border-border/60 bg-overlay-subtle text-foreground hover:border-primary/40',
          disabled ? 'opacity-50 cursor-not-allowed' : '',
        ]"
        :data-selected="isSelected(service.name)"
        data-testid="service-chip"
        @click="toggle(service.name)"
      >
        <Check v-if="isSelected(service.name)" class="h-3 w-3 shrink-0" />
        <span>{{ service.name }}</span>
        <span
          v-if="service.score != null"
          class="px-1.5 py-0.5 rounded bg-success/10 text-success text-[10px] font-semibold"
          data-testid="service-score"
        >
          {{ service.score }}
        </span>
        <span
          v-if="customSet.has(service.name)"
          class="px-1.5 py-0.5 rounded bg-primary/10 text-primary text-[10px]"
        >
          {{ t('serviceSelector.custom') }}
        </span>
      </button>
    </div>
    <div v-else class="text-xs text-muted-foreground" data-testid="service-empty">
      {{ t('serviceSelector.empty') }}
    </div>

    <!-- QA round 3 fix 1: localized warning for brand-unrelated custom services -->
    <div
      v-if="unrelatedWarning"
      class="flex items-start gap-2 rounded-lg border border-warning/40 bg-warning/10 px-3 py-2 text-xs text-warning leading-relaxed"
      data-testid="service-warning"
      role="alert"
    >
      <AlertTriangle class="h-3.5 w-3.5 shrink-0 mt-0.5" />
      <span>{{ unrelatedWarning }}</span>
    </div>

    <div class="flex items-center gap-2">
      <input
        v-model="newName"
        :disabled="disabled || checkPending"
        :placeholder="t('serviceSelector.addPlaceholder')"
        class="flex-1 min-w-0 h-10 px-3 rounded-lg bg-overlay-subtle border border-border/70 text-sm placeholder:text-muted-foreground/60 outline-none focus:border-primary/60 transition disabled:opacity-50"
        data-testid="service-add-input"
        @keydown.enter.prevent="addService"
      />
      <button
        type="button"
        :disabled="disabled || !newName.trim() || checkPending"
        class="h-10 px-3 rounded-lg border border-border/60 text-xs font-medium hover:bg-overlay-subtle transition flex items-center gap-1.5 disabled:opacity-50 disabled:cursor-not-allowed shrink-0"
        data-testid="service-add-btn"
        @click="addService"
      >
        <Plus class="h-3.5 w-3.5" /> {{ t('serviceSelector.add') }}
      </button>
    </div>
  </div>
</template>
