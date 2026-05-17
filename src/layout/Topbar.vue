<script setup lang="ts">
import { ref, computed, watch } from 'vue'
import { useRouter, useRoute } from 'vue-router'
import { Search, LogOut, User, MoreVertical, Menu } from 'lucide-vue-next'
import { useI18n } from '@/shared/utils/i18n'
import { useAuthStore } from '@/features/auth/store'
import { usePageActions } from '@/shared/composables/usePageActions'
import { useMobileDrawer } from '@/shared/composables/useMobileDrawer'
import LangSwitch from './LangSwitch.vue'

defineProps<{
  title?: string
  subtitle?: string
  actions?: any
}>()

const { t } = useI18n()
const router = useRouter()
const route = useRoute()
const auth = useAuthStore()
const { toggle: toggleDrawer } = useMobileDrawer()

const { actions: pageActions, clearActions } = usePageActions()
const hasMobileActions = computed(() => pageActions.value.length > 0)

watch(() => route.path, clearActions)

const showUserMenu = ref(false)
const showMobileActions = ref(false)
const searchQuery = ref('')

function handleSearch() {
  const q = searchQuery.value.trim()
  if (!q) return
  router.push({ name: 'brands', query: { search: q } })
  searchQuery.value = ''
}

function handleLogout() {
  showUserMenu.value = false
  auth.logout()
  router.push('/login')
}

function getUserInitials(): string {
  const user = auth.user
  if (!user) return ''
  const first = user.first_name?.charAt(0)?.toUpperCase() ?? ''
  const last = user.last_name?.charAt(0)?.toUpperCase() ?? ''
  return first && last ? `${first}${last}` : user.email.charAt(0).toUpperCase()
}
</script>

<template>
  <header class="h-16 border-b border-border/60 bg-background/60 backdrop-blur-xl sticky top-0 z-30">
    <div class="h-full px-3 sm:px-6 flex items-center gap-2 sm:gap-4">
      <button
        class="lg:hidden h-9 w-9 grid place-items-center rounded-lg hover:bg-white/[0.04] text-muted-foreground transition"
        aria-label="Open menu"
        @click="toggleDrawer"
      >
        <Menu class="h-5 w-5" />
      </button>
      <div class="flex-1 min-w-0">
        <template v-if="title">
          <h1 class="text-sm sm:text-base font-semibold leading-tight truncate">{{ title }}</h1>
          <p v-if="subtitle" class="text-[11px] sm:text-xs text-muted-foreground truncate">{{ subtitle }}</p>
        </template>
      </div>

      <!-- Desktop search -->
      <form class="hidden md:flex items-center gap-2 px-3 h-9 rounded-lg bg-white/[0.03] border border-border/60 w-72" @submit.prevent="handleSearch" data-tour="topbar-search">
        <Search class="h-3.5 w-3.5 text-muted-foreground shrink-0" />
        <input
          v-model="searchQuery"
          :placeholder="t('topbar.search')"
          class="flex-1 bg-transparent text-sm outline-none placeholder:text-muted-foreground/60"
        />
      </form>

      <div class="hidden sm:contents">
        <slot name="actions" />
      </div>

      <!-- Mobile kebab menu for page actions -->
      <div v-if="hasMobileActions" class="relative sm:hidden">
        <button
          aria-label="Page actions"
          class="h-9 w-9 grid place-items-center rounded-lg hover:bg-white/[0.04] transition"
          @click="showMobileActions = !showMobileActions"
        >
          <MoreVertical class="h-4 w-4 text-muted-foreground" />
        </button>
        <div v-if="showMobileActions" class="absolute end-0 top-12 surface-card p-2 min-w-[180px] max-w-[calc(100vw-24px)] z-50">
          <template v-for="(action, i) in pageActions" :key="i">
            <hr v-if="action.variant === 'destructive' && i > 0" class="border-border/40 my-1" />
            <button
              :disabled="action.disabled"
              :class="[
                'w-full flex items-center gap-2 px-3 py-2 text-xs rounded-md transition disabled:opacity-50',
                action.variant === 'destructive'
                  ? 'text-destructive hover:bg-destructive/10'
                  : 'text-foreground hover:bg-white/[0.04]',
              ]"
              @click="showMobileActions = false; action.to ? router.push(action.to) : action.handler?.()"
            >
              <component v-if="action.icon" :is="action.icon" class="h-3.5 w-3.5" />
              {{ action.label }}
            </button>
          </template>
        </div>
        <div v-if="showMobileActions" class="fixed inset-0 z-40" @click="showMobileActions = false" />
      </div>

      <div class="hidden sm:block">
        <LangSwitch />
      </div>

      <div class="relative">
        <button
          class="h-9 w-9 rounded-full bg-[image:var(--gradient-brand)] grid place-items-center text-xs font-semibold text-primary-foreground shadow-[var(--shadow-glow)] shrink-0"
          aria-label="User menu"
          @click="showUserMenu = !showUserMenu"
        >
          {{ getUserInitials() }}
        </button>
        <div
          v-if="showUserMenu"
          class="absolute end-0 top-12 surface-card p-2 min-w-[180px] max-w-[calc(100vw-24px)] z-50"
        >
          <div class="px-3 py-2 text-xs text-muted-foreground truncate">
            {{ auth.user?.email }}
          </div>
          <hr class="border-border/40 my-1" />
          <button
            class="w-full flex items-center gap-2 px-3 py-2 text-xs text-foreground hover:bg-white/[0.04] rounded-md transition"
            @click="showUserMenu = false; router.push({ name: 'profile' })"
          >
            <User class="h-3.5 w-3.5" />
            {{ t('nav.profile') }}
          </button>
          <hr class="border-border/40 my-1" />
          <button
            class="w-full flex items-center gap-2 px-3 py-2 text-xs text-destructive hover:bg-white/[0.04] rounded-md transition"
            @click="handleLogout"
          >
            <LogOut class="h-3.5 w-3.5" />
            {{ t('nav.logout') }}
          </button>
        </div>
        <div v-if="showUserMenu" class="fixed inset-0 z-40" @click="showUserMenu = false" />
      </div>
    </div>

  </header>
</template>
