<script setup lang="ts">
import { computed } from 'vue'
import { RouterLink } from 'vue-router'
import { Building2, Megaphone, Brain, TrendingUp, Activity } from 'lucide-vue-next'
import { useI18n } from '@/shared/utils/i18n'
import { useDashboardActivity } from '../composables/useDashboardActivity'
import type { ActivityItem } from '../composables/useDashboardActivity'

const { t, lang } = useI18n()
const { activities } = useDashboardActivity()

const limitedActivities = computed(() => activities.value.slice(0, 15))

const TYPE_META: Record<ActivityItem['type'], { icon: typeof Building2; dotClass: string; iconClass: string }> = {
  brand: { icon: Building2, dotClass: 'bg-primary', iconClass: 'text-primary' },
  campaign: { icon: Megaphone, dotClass: 'bg-accent-cyan', iconClass: 'text-accent-cyan' },
  intelligence: { icon: Brain, dotClass: 'bg-accent-amber', iconClass: 'text-accent-amber' },
  funnel: { icon: TrendingUp, dotClass: 'bg-accent-magenta', iconClass: 'text-accent-magenta' },
}

function getRelativeTime(date: Date): string {
  const now = Date.now()
  const diff = now - date.getTime()
  const seconds = Math.floor(diff / 1000)
  const minutes = Math.floor(seconds / 60)
  const hours = Math.floor(minutes / 60)
  const days = Math.floor(hours / 24)

  const rtf = new Intl.RelativeTimeFormat(lang.value, { numeric: 'auto' })

  if (days > 0) return rtf.format(-days, 'day')
  if (hours > 0) return rtf.format(-hours, 'hour')
  if (minutes > 0) return rtf.format(-minutes, 'minute')
  return rtf.format(-seconds, 'second')
}

function getMeta(type: ActivityItem['type']) {
  return TYPE_META[type]
}
</script>

<template>
  <!-- Empty state -->
  <div v-if="limitedActivities.length === 0" class="flex flex-col items-center justify-center py-10 text-center">
    <div class="h-12 w-12 rounded-xl bg-primary/15 grid place-items-center mb-3">
      <Activity class="h-6 w-6 text-primary" />
    </div>
    <p class="text-sm text-muted-foreground">{{ t('dashboard.activity.empty' as any) }}</p>
  </div>

  <!-- Timeline -->
  <div v-else class="relative">
    <!-- Vertical line -->
    <div class="absolute start-[11px] top-2 bottom-2 w-px bg-overlay-subtle" />

    <div class="space-y-1">
      <RouterLink
        v-for="item in limitedActivities"
        :key="item.id"
        :to="item.route"
        class="flex items-start gap-3 p-2 rounded-lg hover:bg-overlay-subtle/50 transition group"
      >
        <!-- Dot + icon -->
        <div class="relative z-10 shrink-0 mt-0.5">
          <div
            class="h-[22px] w-[22px] rounded-full grid place-items-center"
            :class="getMeta(item.type).dotClass + '/15'"
          >
            <div class="h-2 w-2 rounded-full" :class="getMeta(item.type).dotClass" />
          </div>
        </div>

        <!-- Content -->
        <div class="flex-1 min-w-0">
          <div class="flex items-center gap-2">
            <component
              :is="getMeta(item.type).icon"
              class="h-3.5 w-3.5 shrink-0"
              :class="getMeta(item.type).iconClass"
            />
            <span class="text-sm font-medium truncate">{{ item.name }}</span>
          </div>
          <div class="flex items-center gap-2 mt-0.5">
            <span v-if="item.subtitle" class="text-[11px] text-muted-foreground truncate">{{ item.subtitle }}</span>
            <span class="text-[11px] text-muted-foreground/70 shrink-0">{{ getRelativeTime(item.date) }}</span>
          </div>
        </div>
      </RouterLink>
    </div>
  </div>
</template>
