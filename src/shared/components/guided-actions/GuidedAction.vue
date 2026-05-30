<script setup lang="ts">
import { computed, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import { ArrowRight } from 'lucide-vue-next'
import type { ActionPath, ActionStep, GuidedActionFeature, GuidedActionVariant } from '../../composables/useGuidedActions'
import { useGuidedActions } from '../../composables/useGuidedActions'
import GuidedActionIllustration from './GuidedActionIllustration.vue'
import GuidedActionStep from './GuidedActionStep.vue'
import GuidedActionTip from './GuidedActionTip.vue'

const WIDTH_MAP = { sm: 'max-w-sm', md: 'max-w-md', lg: 'max-w-lg', full: 'max-w-full' } as const

const props = withDefaults(defineProps<{
  id: string
  variant: GuidedActionVariant
  title: string
  description?: string
  why?: string
  icon?: unknown
  feature?: GuidedActionFeature
  actions?: ActionPath[]
  steps?: ActionStep[]
  tip?: string
  blockedReason?: string
  blockedActionTo?: string
  showProgress?: boolean
  maxWidth?: 'sm' | 'md' | 'lg' | 'full'
  showIllustration?: boolean
}>(), {
  actions: () => [],
  steps: () => [],
  maxWidth: 'md',
  showIllustration: true,
})

const emit = defineEmits<{
  action: [pathIndex: number]
}>()

const router = useRouter()
const guided = useGuidedActions()

onMounted(() => {
  guided.markSeen(props.id)
})

function handleAction(path: ActionPath, index: number) {
  emit('action', index)
  if (path.handler) {
    path.handler()
  } else if (path.to) {
    router.push(path.to)
  }
}

const completedSteps = computed(() => {
  return guided.getState(props.id).completedSteps
})
</script>

<template>
  <div
    class="mx-auto text-center surface-card p-6 sm:p-10 mt-8 animate-[slide-up_0.4s_ease-out_both]"
    :class="WIDTH_MAP[maxWidth]"
  >
    <!-- Illustration -->
    <GuidedActionIllustration
      v-if="showIllustration"
      :variant="variant"
      :icon="icon"
    />

    <!-- Title -->
    <h2 class="font-semibold text-lg mb-1">{{ title }}</h2>

    <!-- Description -->
    <p v-if="description" class="text-sm text-muted-foreground mb-4">{{ description }}</p>

    <!-- Why section -->
    <div v-if="why" class="text-xs text-muted-foreground/80 leading-relaxed mb-5 max-w-sm mx-auto">
      {{ why }}
    </div>

    <!-- Blocked reason -->
    <div v-if="variant === 'blocked' && blockedReason" class="text-sm text-accent-amber mb-5">
      {{ blockedReason }}
    </div>

    <!-- Steps -->
    <div v-if="steps.length" class="text-start max-w-xs mx-auto mb-5 space-y-0.5">
      <GuidedActionStep
        v-for="(step, idx) in steps"
        :key="step.id"
        :index="idx + 1"
        :title="step.title"
        :description="step.description"
        :completed="step.completed || completedSteps.includes(step.id)"
      />
    </div>

    <!-- Action buttons -->
    <div v-if="actions.length" class="flex justify-center gap-2 flex-wrap">
      <template v-for="(action, idx) in actions" :key="idx">
        <button
          v-if="action.variant !== 'secondary' && action.variant !== 'outline'"
          class="inline-flex items-center gap-1.5 h-9 px-5 rounded-lg bg-[image:var(--gradient-brand)] text-primary-foreground text-xs font-medium shadow-[var(--shadow-glow)] hover:opacity-95 transition"
          @click="handleAction(action, idx)"
        >
          <component :is="action.icon" v-if="action.icon" class="h-3.5 w-3.5" />
          {{ action.labelKey }}
        </button>
        <RouterLink
          v-else-if="action.to"
          :to="action.to"
          class="inline-flex items-center gap-1.5 h-9 px-4 rounded-lg border border-border/60 text-xs font-medium hover:bg-overlay-subtle transition"
          @click="emit('action', idx)"
        >
          <component :is="action.icon" v-if="action.icon" class="h-3.5 w-3.5" />
          {{ action.labelKey }}
        </RouterLink>
        <button
          v-else
          class="inline-flex items-center gap-1.5 h-9 px-4 rounded-lg border border-border/60 text-xs font-medium hover:bg-overlay-subtle transition"
          @click="handleAction(action, idx)"
        >
          <component :is="action.icon" v-if="action.icon" class="h-3.5 w-3.5" />
          {{ action.labelKey }}
        </button>
      </template>
    </div>

    <!-- Blocked shortcut -->
    <div v-if="variant === 'blocked' && blockedActionTo" class="mt-3">
      <button
        class="inline-flex items-center gap-1.5 h-9 px-5 rounded-lg bg-[image:var(--gradient-brand)] text-primary-foreground text-xs font-medium shadow-[var(--shadow-glow)] hover:opacity-95 transition"
        @click="router.push(blockedActionTo!)"
      >
        <slot name="blocked-label">Go to next step</slot>
        <ArrowRight class="h-3.5 w-3.5" />
      </button>
    </div>

    <!-- Tip -->
    <div v-if="tip" class="mt-5">
      <GuidedActionTip :text="tip" />
    </div>

    <!-- Progress dots -->
    <div v-if="showProgress && steps.length" class="flex justify-center gap-1.5 mt-5">
      <div
        v-for="step in steps"
        :key="step.id"
        class="h-1.5 rounded-full transition-all duration-300"
        :class="(step.completed || completedSteps.includes(step.id))
          ? 'w-4 bg-primary'
          : 'w-1.5 bg-overlay-medium'"
      />
    </div>
  </div>
</template>
