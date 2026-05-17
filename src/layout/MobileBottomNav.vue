<script setup lang="ts">
import { useRoute } from 'vue-router'
import { LayoutDashboard, Building2, Megaphone, Library, TrendingUp } from 'lucide-vue-next'
import { useI18n } from '@/shared/utils/i18n'
import type { TKey } from '@/shared/utils/translations'

const route = useRoute()
const { t } = useI18n()

interface BottomNavItem {
  to: string
  labelKey: TKey
  icon: any
}

const items: BottomNavItem[] = [
  { to: '/dashboard', labelKey: 'nav.dashboard', icon: LayoutDashboard },
  { to: '/brands', labelKey: 'nav.brands', icon: Building2 },
  { to: '/campaigns', labelKey: 'nav.campaigns', icon: Megaphone },
  { to: '/market/intelligence', labelKey: 'nav.marketIntel', icon: TrendingUp },
  { to: '/ad-library', labelKey: 'nav.adLibrary', icon: Library },
]

function isActive(to: string): boolean {
  if (to === '/dashboard') return route.path === '/dashboard' || route.path === '/'
  return route.path.startsWith(to)
}
</script>

<template>
  <nav class="lg:hidden fixed bottom-0 inset-x-0 z-40 bg-background/80 backdrop-blur-xl border-t border-border/60 safe-area-pb">
    <div class="flex items-center justify-around h-16">
      <router-link
        v-for="item in items"
        :key="item.to"
        :to="item.to"
        :class="[
          'flex flex-col items-center justify-center gap-0.5 h-full flex-1 transition',
          isActive(item.to) ? 'text-primary' : 'text-muted-foreground',
        ]"
      >
        <component :is="item.icon" class="h-5 w-5" />
        <span class="text-[11px] font-medium truncate max-w-[64px]">{{ t(item.labelKey) }}</span>
      </router-link>
    </div>
  </nav>
</template>

<style scoped>
.safe-area-pb {
  padding-bottom: env(safe-area-inset-bottom, 0px);
}
</style>
