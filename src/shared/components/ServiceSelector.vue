<script setup lang="ts">
import { computed, ref } from 'vue'
import { Check, Plus } from 'lucide-vue-next'
import { useI18n } from '@/shared/utils/i18n'

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
}>(), {
  services: () => [],
  disabled: false,
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

function addService() {
  const name = newName.value.trim()
  if (!name || props.disabled) return
  if (!isSelected(name)) {
    emit('update:modelValue', [...props.modelValue, name])
  }
  if (!options.value.some((s) => s.name === name)) {
    customNames.value.push(name)
  }
  newName.value = ''
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

    <div class="flex items-center gap-2">
      <input
        v-model="newName"
        :disabled="disabled"
        :placeholder="t('serviceSelector.addPlaceholder')"
        class="flex-1 min-w-0 h-10 px-3 rounded-lg bg-overlay-subtle border border-border/70 text-sm placeholder:text-muted-foreground/60 outline-none focus:border-primary/60 transition disabled:opacity-50"
        data-testid="service-add-input"
        @keydown.enter.prevent="addService"
      />
      <button
        type="button"
        :disabled="disabled || !newName.trim()"
        class="h-10 px-3 rounded-lg border border-border/60 text-xs font-medium hover:bg-overlay-subtle transition flex items-center gap-1.5 disabled:opacity-50 disabled:cursor-not-allowed shrink-0"
        data-testid="service-add-btn"
        @click="addService"
      >
        <Plus class="h-3.5 w-3.5" /> {{ t('serviceSelector.add') }}
      </button>
    </div>
  </div>
</template>
