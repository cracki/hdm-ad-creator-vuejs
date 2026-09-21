<script setup lang="ts">
import { computed } from 'vue'
import { Check } from 'lucide-vue-next'
import { useI18n } from '@/shared/utils/i18n'

/**
 * Multi-select persona picker (MOM: the user must choose which personas to
 * target). Renders one toggle chip per segmentation persona; an empty
 * selection means "all personas" downstream.
 */
const props = withDefaults(defineProps<{
  modelValue: string[]
  personas?: { name: string }[]
  disabled?: boolean
}>(), {
  personas: () => [],
  disabled: false,
})

const emit = defineEmits<{ 'update:modelValue': [value: string[]] }>()

const { t } = useI18n()

/** Backend contract cap: at most 10 personas per segmentation run. */
const MAX_PERSONAS = 10

const options = computed(() =>
  props.personas
    .map((p, idx) => ({ name: p.name, label: p.name || `${t('seg.persona')} ${idx + 1}` }))
    .filter((o) => o.name),
)

function isSelected(name: string): boolean {
  return props.modelValue.includes(name)
}

function toggle(name: string) {
  if (props.disabled) return
  if (isSelected(name)) {
    emit('update:modelValue', props.modelValue.filter((n) => n !== name))
  } else if (props.modelValue.length < MAX_PERSONAS) {
    emit('update:modelValue', [...props.modelValue, name])
  }
}
</script>

<template>
  <div class="flex flex-wrap gap-2" data-testid="persona-selector">
    <button
      v-for="option in options"
      :key="option.name"
      type="button"
      :disabled="disabled"
      :class="[
        'inline-flex items-center gap-1.5 min-h-9 px-3 rounded-full border text-xs transition',
        isSelected(option.name)
          ? 'border-primary bg-primary/15 text-primary font-medium'
          : 'border-border/60 bg-overlay-subtle text-foreground hover:border-primary/40',
        disabled ? 'opacity-50 cursor-not-allowed' : '',
      ]"
      :data-selected="isSelected(option.name)"
      data-testid="persona-chip"
      @click="toggle(option.name)"
    >
      <Check v-if="isSelected(option.name)" class="h-3 w-3 shrink-0" />
      <span>{{ option.label }}</span>
    </button>
  </div>
</template>
