<script setup lang="ts">
import { computed, ref } from 'vue'
import { COUNTRIES } from '@/shared/data/countries'

const props = defineProps<{ modelValue: { country: string; city: string } }>()
const emit = defineEmits<{ 'update:modelValue': [{ country: string; city: string }] }>()

const query = ref(props.modelValue.country ?? '')
const open = ref(false)

const suggestions = computed(() => {
  const q = query.value.trim().toLowerCase()
  if (!q) return []
  return COUNTRIES.filter((c) => c.toLowerCase().includes(q)).slice(0, 8)
})

function onCountryInput(e: Event) {
  query.value = (e.target as HTMLInputElement).value
  open.value = true
}

function selectCountry(c: string) {
  query.value = c
  open.value = false
  emit('update:modelValue', { country: c, city: props.modelValue.city })
}

function onCityInput(e: Event) {
  emit('update:modelValue', { country: props.modelValue.country, city: (e.target as HTMLInputElement).value })
}
</script>

<template>
  <div class="grid sm:grid-cols-2 gap-3">
    <div class="relative">
      <label class="text-[11px] uppercase tracking-wider text-muted-foreground mb-1.5 block">Country</label>
      <input
        data-testid="country-input"
        :value="query"
        autocomplete="off"
        placeholder="Type to search"
        class="w-full h-10 px-3 rounded-lg bg-overlay-subtle border border-border/60 text-sm outline-none focus:border-primary/40 transition"
        @input="onCountryInput"
        @focus="open = true"
        @blur="open = false"
      />
      <ul
        v-if="open && suggestions.length"
        class="absolute z-30 mt-1 w-full max-h-56 overflow-auto rounded-lg border border-border/40 bg-overlay-strong shadow-lg"
      >
        <li
          v-for="s in suggestions"
          :key="s"
          data-testid="country-suggestion"
          class="px-3 py-2 text-sm cursor-pointer hover:bg-overlay-subtle transition"
          @mousedown.prevent
          @click="selectCountry(s)"
        >
          {{ s }}
        </li>
      </ul>
    </div>
    <div>
      <label class="text-[11px] uppercase tracking-wider text-muted-foreground mb-1.5 block">City</label>
      <input
        data-testid="city-input"
        :value="modelValue.city"
        placeholder="City"
        class="w-full h-10 px-3 rounded-lg bg-overlay-subtle border border-border/60 text-sm outline-none focus:border-primary/40 transition"
        @input="onCityInput"
      />
    </div>
  </div>
</template>
