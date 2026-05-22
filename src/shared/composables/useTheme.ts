import { ref, computed, watch } from 'vue'

export type ThemeMode = 'light' | 'dark'
type ResolvedTheme = 'light' | 'dark'

const STORAGE_KEY = 'hdm_theme'

function initMode(): ThemeMode {
  try {
    const stored = localStorage.getItem(STORAGE_KEY)
    // Clear legacy 'auto' value — force reset to dark for existing users
    if (stored === 'auto') {
      localStorage.setItem(STORAGE_KEY, 'dark')
      return 'dark'
    }
    if (stored === 'light' || stored === 'dark') return stored
  } catch {}
  return 'dark'
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

watch(mode, (m) => {
  applyTheme(m)
  try { localStorage.setItem(STORAGE_KEY, m) } catch {}
}, { immediate: true })

export function useTheme() {
  function setMode(m: ThemeMode) {
    mode.value = m
  }
  function toggle() {
    mode.value = mode.value === 'dark' ? 'light' : 'dark'
  }

  return {
    mode: computed(() => mode.value),
    resolved: computed(() => mode.value),
    isDark: computed(() => mode.value === 'dark'),
    setMode,
    toggle,
  }
}
