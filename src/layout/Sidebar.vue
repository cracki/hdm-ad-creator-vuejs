<script setup lang="ts">
import { useRoute, useRouter } from 'vue-router'
import {
  LayoutDashboard, Building2, Megaphone, Library,
  ChevronRight, TrendingUp, Search,
  MessageSquare, Grid3X3, Rocket, LogOut, User, X,
} from 'lucide-vue-next'
import Logo from './Logo.vue'
import LangSwitch from './LangSwitch.vue'
import ThemeToggle from '@/shared/components/ThemeToggle.vue'
import { useI18n } from '@/shared/utils/i18n'
import { useAuthStore } from '@/features/auth/store'
import { useMobileDrawer } from '@/shared/composables/useMobileDrawer'
import { computed, watch, onUnmounted, ref } from 'vue'
import type { TKey } from '@/shared/utils/translations'

const router = useRouter()
const route = useRoute()
const auth = useAuthStore()
const { t, dir } = useI18n()
const { isOpen, close } = useMobileDrawer()

const drawerRef = ref<HTMLElement | null>(null)
let previousFocusEl: HTMLElement | null = null

function lockScroll() {
  document.body.style.overflow = 'hidden'
}
function unlockScroll() {
  document.body.style.overflow = ''
}

function onFocusTrap(e: KeyboardEvent) {
  if (e.key !== 'Tab' || !drawerRef.value) return
  const focusable = drawerRef.value.querySelectorAll<HTMLElement>(
    'a[href], button, input, [tabindex]:not([tabindex="-1"])',
  )
  if (!focusable.length) return
  const first = focusable[0]
  const last = focusable[focusable.length - 1]
  if (e.shiftKey) {
    if (document.activeElement === first) { e.preventDefault(); last.focus() }
  } else {
    if (document.activeElement === last) { e.preventDefault(); first.focus() }
  }
}

function onKeydown(e: KeyboardEvent) {
  if (e.key === 'Escape') close()
}

watch(isOpen, (open) => {
  if (open) {
    previousFocusEl = document.activeElement as HTMLElement
    lockScroll()
    document.addEventListener('keydown', onKeydown)
    document.addEventListener('keydown', onFocusTrap)
    requestAnimationFrame(() => {
      const first = drawerRef.value?.querySelector<HTMLElement>('a, button')
      first?.focus()
    })
  } else {
    unlockScroll()
    document.removeEventListener('keydown', onKeydown)
    document.removeEventListener('keydown', onFocusTrap)
    previousFocusEl?.focus()
    previousFocusEl = null
  }
})

watch(() => route.path, () => { if (isOpen.value) close() })

onUnmounted(() => {
  document.removeEventListener('keydown', onKeydown)
  document.removeEventListener('keydown', onFocusTrap)
  unlockScroll()
})

function handleLogout() {
  close()
  auth.logout()
  router.push('/login')
}

interface NavItem {
  to: string
  labelKey: TKey
  icon: any
  accent?: boolean
  tourId?: string
  loc: string
}
interface NavGroup {
  labelKey: TKey
  items: NavItem[]
}

const nav: NavGroup[] = [
  {
    labelKey: 'nav.workspace',
    items: [
      { to: '/dashboard', labelKey: 'nav.dashboard', icon: LayoutDashboard, loc: 'sidebar.nav-dashboard' },
      { to: '/brands', labelKey: 'nav.brands', icon: Building2, tourId: 'sidebar-brands', loc: 'sidebar.nav-brands' },
      { to: '/campaigns', labelKey: 'nav.campaigns', icon: Megaphone, tourId: 'sidebar-campaigns', loc: 'sidebar.nav-campaigns' },
      { to: '/campaigns/full-funnel', labelKey: 'nav.fullFunnel', icon: Rocket, loc: 'sidebar.nav-full-funnel' },
      { to: '/scenario-variants', labelKey: 'nav.scenarioVariants', icon: Grid3X3, loc: 'sidebar.nav-scenario-variants' },
    ],
  },
  {
    labelKey: 'nav.intelligence',
    items: [
      { to: '/market/intelligence', labelKey: 'nav.marketIntel', icon: TrendingUp, tourId: 'sidebar-intelligence', loc: 'sidebar.nav-market-intelligence' },
      { to: '/market/hooks', labelKey: 'nav.aiHooks', icon: MessageSquare, loc: 'sidebar.nav-market-hooks' },
      { to: '/market/gaps', labelKey: 'nav.contentGaps', icon: Search, loc: 'sidebar.nav-market-gaps' },
      { to: '/market/matrix', labelKey: 'nav.contentMatrix', icon: Grid3X3, loc: 'sidebar.nav-market-matrix' },
      { to: '/market/top-performing', labelKey: 'nav.topContent', icon: TrendingUp, loc: 'sidebar.nav-market-top-performing' },
      { to: '/ad-library', labelKey: 'nav.adLibrary', icon: Library, loc: 'sidebar.nav-ad-library' },
    ],
  },
]

const activeTo = computed(() => {
  const allItems = nav.flatMap(g => g.items)
  let best = ''
  for (const item of allItems) {
    if (route.path === item.to || route.path.startsWith(item.to + '/')) {
      if (item.to.length > best.length) {
        best = item.to
      }
    }
  }
  return best
})

function isActive(item: NavItem): boolean {
  return item.to === activeTo.value
}
</script>

<template>
  <!-- Desktop sidebar -->
  <aside class="hidden lg:flex w-64 shrink-0 flex-col border-e border-border/60 bg-surface/40 backdrop-blur-xl">
    <div class="h-16 flex items-center px-5 border-b border-border/60 shrink-0">
      <Logo />
    </div>

    <nav class="flex-1 overflow-y-auto px-3 py-5 space-y-6">
      <div v-for="group in nav" :key="group.labelKey">
        <div class="px-3 mb-2 text-[11px] font-semibold uppercase tracking-[0.14em] text-muted-foreground/70">
          {{ t(group.labelKey) }}
        </div>
        <div class="space-y-0.5">
          <router-link
            v-for="item in group.items"
            :key="item.to"
            :to="item.to"
            :data-tour="item.tourId"
            :data-loc="item.loc"
            :class="[
              'group flex items-center gap-3 px-3 py-2 rounded-lg text-sm transition-all relative',
              isActive(item)
                ? 'bg-gradient-to-r from-primary/15 to-transparent text-foreground'
                : 'text-muted-foreground hover:text-foreground hover:bg-overlay-subtle',
            ]"
          >
            <span
              v-if="isActive(item)"
              class="absolute start-0 top-1.5 bottom-1.5 w-0.5 rounded-full bg-[image:var(--gradient-brand)]"
            />
            <component
              :is="item.icon"
              :class="['h-4 w-4', isActive(item) ? 'text-primary' : '']"
            />
            <span class="font-medium">{{ t(item.labelKey) }}</span>
            <span
              v-if="item.accent"
              class="ms-auto text-[11px] font-semibold px-1.5 py-0.5 rounded-md bg-[image:var(--gradient-brand)] text-primary-foreground"
            >
              AI
            </span>
            <ChevronRight
              v-if="isActive(item) && !item.accent"
              class="ms-auto h-3.5 w-3.5 opacity-50"
            />
          </router-link>
        </div>
      </div>
    </nav>

    <div class="p-3 border-t border-border/60 shrink-0 space-y-3">
      <div class="surface-card p-3 relative overflow-hidden" data-tour="credits-bar" data-loc="sidebar.credits">
        <div class="absolute -top-8 -end-8 h-24 w-24 rounded-full bg-[image:var(--gradient-brand)] opacity-30 blur-2xl" />
        <div class="relative">
          <div class="text-xs font-semibold mb-1">{{ t('sidebar.aiCredits') }}</div>
          <div class="text-[11px] text-muted-foreground mb-2">{{ t('sidebar.creditsUsed') }}</div>
          <div class="h-1.5 rounded-full bg-overlay-subtle overflow-hidden">
            <div class="h-full w-1/2 rounded-full bg-[image:var(--gradient-brand)]" />
          </div>
        </div>
      </div>
      <button
        class="w-full flex items-center gap-3 px-3 py-2 rounded-lg text-sm text-muted-foreground hover:text-destructive hover:bg-destructive/5 transition"
        data-loc="sidebar.logout"
        @click="handleLogout"
      >
        <LogOut class="h-4 w-4" />
        <span class="font-medium">{{ t('nav.logout') }}</span>
      </button>
    </div>
  </aside>

  <!-- Mobile drawer -->
  <Teleport to="body">
    <Transition name="drawer">
      <div v-if="isOpen" ref="drawerRef" class="fixed inset-0 z-50 lg:hidden" :class="dir === 'rtl' ? 'drawer-rtl' : ''" role="dialog" aria-modal="true">
        <div class="absolute inset-0 bg-black/50" @click="close" />
        <aside class="relative w-72 h-full flex flex-col border-e border-border/60 bg-background">
          <div class="h-16 flex items-center justify-between px-5 border-b border-border/60 shrink-0">
            <Logo />
            <button class="h-8 w-8 grid place-items-center rounded-md hover:bg-overlay-medium text-muted-foreground" aria-label="Close menu" data-loc="sidebar.mobile-close" @click="close">
              <X class="h-4 w-4" />
            </button>
          </div>
          <nav class="flex-1 overflow-y-auto px-3 py-5 space-y-6">
            <div v-for="group in nav" :key="group.labelKey">
              <div class="px-3 mb-2 text-[11px] font-semibold uppercase tracking-[0.14em] text-muted-foreground/70">
                {{ t(group.labelKey) }}
              </div>
              <div class="space-y-0.5">
                <router-link
                  v-for="item in group.items"
                  :key="item.to"
                  :to="item.to"
                  :data-loc="item.loc"
                  :class="[
                    'group flex items-center gap-3 px-3 py-2 rounded-lg text-sm transition-all relative',
                    isActive(item)
                      ? 'bg-gradient-to-r from-primary/15 to-transparent text-foreground'
                      : 'text-muted-foreground hover:text-foreground hover:bg-overlay-subtle',
                  ]"
                  @click="close"
                >
                  <component :is="item.icon" class="h-4 w-4" />
                  <span class="font-medium">{{ t(item.labelKey) }}</span>
                </router-link>
              </div>
            </div>
          </nav>
          <div class="p-3 border-t border-border/60 shrink-0 space-y-3">
            <div class="surface-card p-3 relative overflow-hidden">
              <div class="absolute -top-8 -end-8 h-24 w-24 rounded-full bg-[image:var(--gradient-brand)] opacity-30 blur-2xl" />
              <div class="relative">
                <div class="text-xs font-semibold mb-1">{{ t('sidebar.aiCredits') }}</div>
                <div class="text-[11px] text-muted-foreground mb-2">{{ t('sidebar.creditsUsed') }}</div>
                <div class="h-1.5 rounded-full bg-overlay-subtle overflow-hidden">
                  <div class="h-full w-1/2 rounded-full bg-[image:var(--gradient-brand)]" />
                </div>
              </div>
            </div>
            <ThemeToggle />
            <LangSwitch />
            <button
              class="w-full flex items-center gap-3 px-3 py-2 rounded-lg text-sm text-muted-foreground hover:text-foreground hover:bg-overlay-light transition"
              data-loc="sidebar.mobile-profile"
              @click="close(); router.push({ name: 'profile' })"
            >
              <User class="h-4 w-4" />
              <span class="font-medium">{{ t('nav.profile') }}</span>
            </button>
            <button
              class="w-full flex items-center gap-3 px-3 py-2 rounded-lg text-sm text-muted-foreground hover:text-destructive hover:bg-destructive/5 transition"
              data-loc="sidebar.mobile-logout"
              @click="handleLogout"
            >
              <LogOut class="h-4 w-4" />
              <span class="font-medium">{{ t('nav.logout') }}</span>
            </button>
          </div>
        </aside>
      </div>
    </Transition>
  </Teleport>
</template>

<style scoped>
.drawer-enter-active,
.drawer-leave-active {
  transition: opacity 0.2s ease;
}
.drawer-enter-active aside,
.drawer-leave-active aside {
  transition: transform 0.25s cubic-bezier(0.4, 0, 0.2, 1);
}
.drawer-enter-from,
.drawer-leave-to {
  opacity: 0;
}
.drawer-enter-from aside,
.drawer-leave-to aside {
  transform: translateX(-100%);
}
.drawer-rtl.drawer-enter-from aside,
.drawer-rtl.drawer-leave-to aside {
  transform: translateX(100%);
}
</style>
