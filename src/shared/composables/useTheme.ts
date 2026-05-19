import { ref, computed, watch } from 'vue'

export type ThemeMode = 'auto' | 'light' | 'dark'
type ResolvedTheme = 'light' | 'dark'

const STORAGE_KEY = 'hdm_theme'

function initMode(): ThemeMode {
  try {
    const stored = localStorage.getItem(STORAGE_KEY)
    if (stored === 'auto' || stored === 'light' || stored === 'dark') return stored
  } catch {}
  return 'auto'
}

function resolveTheme(m: ThemeMode): ResolvedTheme {
  if (m !== 'auto') return m
  if (typeof window === 'undefined') return 'dark'
  return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light'
}

function applyTheme(theme: ResolvedTheme) {
  if (typeof document === 'undefined') return
  const html = document.documentElement
  html.classList.remove('light', 'dark')
  html.classList.add(theme)
  html.style.colorScheme = theme
  const meta = document.querySelector('meta[name="theme-color"]')
  if (meta) meta.setAttribute('content', theme === 'dark' ? '#292541' : '#f7f6fa')
}

const mode = ref<ThemeMode>(initMode())
const resolved = ref<ResolvedTheme>(resolveTheme(mode.value))

if (typeof window !== 'undefined') {
  const mql = window.matchMedia('(prefers-color-scheme: dark)')
  const handler = (e: MediaQueryListEvent) => {
    if (mode.value === 'auto') {
      resolved.value = e.matches ? 'dark' : 'light'
      applyTheme(resolved.value)
    }
  }
  mql.addEventListener('change', handler)
}

watch(mode, (m) => {
  resolved.value = resolveTheme(m)
  applyTheme(resolved.value)
  try { localStorage.setItem(STORAGE_KEY, m) } catch {}
}, { immediate: true })

export function useTheme() {
  function setMode(m: ThemeMode) {
    mode.value = m
  }
  function toggle() {
    if (mode.value === 'dark') mode.value = 'light'
    else if (mode.value === 'light') mode.value = 'dark'
    else mode.value = resolved.value === 'dark' ? 'light' : 'dark'
  }
  function cycle() {
    const order: ThemeMode[] = ['auto', 'light', 'dark']
    mode.value = order[(order.indexOf(mode.value) + 1) % order.length]
  }

  return {
    mode: computed(() => mode.value),
    resolved: computed(() => resolved.value),
    isDark: computed(() => resolved.value === 'dark'),
    setMode,
    toggle,
    cycle,
  }
}
