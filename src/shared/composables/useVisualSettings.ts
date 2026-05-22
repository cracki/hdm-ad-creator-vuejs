import { ref, watch } from 'vue'
import { useTheme } from '@/shared/composables/useTheme'

export type FontSizeLevel = 'small' | 'default' | 'large'
export type ContrastLevel = 'default' | 'enhanced' | 'maximum'

export interface VisualSettings {
  fontSize: FontSizeLevel
  contrast: ContrastLevel
  focusMode: boolean
  reducedMotion: boolean
  dyslexiaFont: boolean
}

const STORAGE_PREFIX = 'hdm_visual_'

const DEFAULTS: VisualSettings = {
  fontSize: 'default',
  contrast: 'default',
  focusMode: false,
  reducedMotion: false,
  dyslexiaFont: false,
}

const FONT_SIZE_MAP: Record<FontSizeLevel, string> = {
  small: '14px',
  default: '16px',
  large: '18px',
}

const TEXT_VARS = [
  '--foreground',
  '--card-foreground',
  '--popover-foreground',
  '--muted-foreground',
  '--secondary-foreground',
  '--accent-foreground',
] as const

// Hardcoded base values from styles.css — avoids getComputedStyle timing issues
const BASE_LIGHT: Record<string, string> = {
  '--foreground': 'oklch(0.16 0.02 270)',
  '--card-foreground': 'oklch(0.16 0.02 270)',
  '--popover-foreground': 'oklch(0.16 0.02 270)',
  '--muted-foreground': 'oklch(0.50 0.02 265)',
  '--secondary-foreground': 'oklch(0.20 0.02 270)',
  '--accent-foreground': 'oklch(0.20 0.02 270)',
}

const BASE_DARK: Record<string, string> = {
  '--foreground': 'oklch(0.98 0.005 250)',
  '--card-foreground': 'oklch(0.98 0.005 250)',
  '--popover-foreground': 'oklch(0.98 0.005 250)',
  '--muted-foreground': 'oklch(0.7 0.025 265)',
  '--secondary-foreground': 'oklch(0.97 0.005 250)',
  '--accent-foreground': 'oklch(0.98 0.005 250)',
}

const CONTRAST_LIGHT: Record<ContrastLevel, Record<string, number>> = {
  default: { fg: 0, muted: 0 },
  enhanced: { fg: -0.04, muted: -0.08 },
  maximum: { fg: -0.08, muted: -0.14 },
}

const CONTRAST_DARK: Record<ContrastLevel, Record<string, number>> = {
  default: { fg: 0, muted: 0 },
  enhanced: { fg: 0.02, muted: 0.08 },
  maximum: { fg: 0.04, muted: 0.14 },
}

function storageKey(uuid: string | undefined): string {
  return `${STORAGE_PREFIX}${uuid ?? 'guest'}`
}

function loadSettings(uuid: string | undefined): VisualSettings {
  try {
    const raw = localStorage.getItem(storageKey(uuid))
    if (raw) {
      const parsed = JSON.parse(raw)
      return { ...DEFAULTS, ...parsed }
    }
  } catch {}
  return { ...DEFAULTS }
}

function persistSettings(uuid: string | undefined, s: VisualSettings) {
  try {
    localStorage.setItem(storageKey(uuid), JSON.stringify(s))
  } catch {}
}

function adjustOklchLightness(oklch: string, delta: number): string {
  const match = oklch.match(/^oklch\(\s*([\d.]+)\s+([\d.]+)\s+([\d.]+)(?:\s*\/\s*([\d.]+))?\)$/)
  if (!match) return oklch
  const L = Math.max(0, Math.min(1, parseFloat(match[1]) + delta))
  const C = match[2]
  const H = match[3]
  const alpha = match[4] ? ` / ${match[4]}` : ''
  return `oklch(${L.toFixed(4)} ${C} ${H}${alpha})`
}

const settings = ref<VisualSettings>({ ...DEFAULTS })
let currentUserUuid: string | undefined
let persistTimer: ReturnType<typeof setTimeout> | undefined

function schedulePersist() {
  clearTimeout(persistTimer)
  persistTimer = setTimeout(() => persistSettings(currentUserUuid, settings.value), 100)
}

function applyFontSize(level: FontSizeLevel) {
  if (level === 'default') {
    document.documentElement.style.removeProperty('font-size')
  } else {
    document.documentElement.style.fontSize = FONT_SIZE_MAP[level]
  }
}

function applyContrast(level: ContrastLevel, isDark: boolean) {
  const bases = isDark ? BASE_DARK : BASE_LIGHT

  if (level === 'default') {
    for (const varName of TEXT_VARS) {
      document.documentElement.style.removeProperty(varName)
    }
    return
  }

  const table = isDark ? CONTRAST_DARK : CONTRAST_LIGHT
  const deltas = table[level]

  for (const varName of TEXT_VARS) {
    const isMuted = varName.includes('muted')
    const delta = isMuted ? deltas.muted : deltas.fg
    const base = bases[varName]
    if (base) {
      document.documentElement.style.setProperty(varName, adjustOklchLightness(base, delta))
    }
  }
}

function applyFocusMode(enabled: boolean) {
  document.documentElement.classList.toggle('focus-mode', enabled)
}

function applyReducedMotion(enabled: boolean) {
  document.documentElement.classList.toggle('reduce-motion', enabled)
}

function applyDyslexiaFont(enabled: boolean) {
  if (enabled) {
    document.documentElement.style.setProperty('--font-sans', '"Atkinson Hyperlegible", "Inter", ui-sans-serif, system-ui')
    document.documentElement.style.setProperty('--font-rtl', '"Atkinson Hyperlegible", "Vazirmatn", "Inter", ui-sans-serif, system-ui')
    document.documentElement.style.setProperty('--font-display', '"Atkinson Hyperlegible", "Space Grotesk", "Inter", ui-sans-serif, system-ui')
  } else {
    document.documentElement.style.removeProperty('--font-sans')
    document.documentElement.style.removeProperty('--font-rtl')
    document.documentElement.style.removeProperty('--font-display')
  }
}

function applyAll(s: VisualSettings, isDark: boolean) {
  applyFontSize(s.fontSize)
  applyContrast(s.contrast, isDark)
  applyFocusMode(s.focusMode)
  applyReducedMotion(s.reducedMotion)
  applyDyslexiaFont(s.dyslexiaFont)
}

export function useVisualSettings() {
  const { resolved } = useTheme()

  function initForUser(uuid: string | undefined) {
    currentUserUuid = uuid
    const loaded = loadSettings(uuid)
    settings.value = loaded
    applyAll(loaded, resolved.value === 'dark')
  }

  function setFontSize(level: FontSizeLevel) {
    settings.value.fontSize = level
    applyFontSize(level)
    schedulePersist()
  }

  function setContrast(level: ContrastLevel) {
    settings.value.contrast = level
    applyContrast(level, resolved.value === 'dark')
    schedulePersist()
  }

  function setFocusMode(enabled: boolean) {
    settings.value.focusMode = enabled
    applyFocusMode(enabled)
    schedulePersist()
  }

  function setReducedMotion(enabled: boolean) {
    settings.value.reducedMotion = enabled
    applyReducedMotion(enabled)
    schedulePersist()
  }

  function setDyslexiaFont(enabled: boolean) {
    settings.value.dyslexiaFont = enabled
    applyDyslexiaFont(enabled)
    schedulePersist()
  }

  function resetAll() {
    settings.value = { ...DEFAULTS }
    applyAll(DEFAULTS, resolved.value === 'dark')
    persistSettings(currentUserUuid, DEFAULTS)
  }

  watch(resolved, (theme) => {
    applyContrast(settings.value.contrast, theme === 'dark')
  })

  return {
    settings,
    initForUser,
    setFontSize,
    setContrast,
    setFocusMode,
    setReducedMotion,
    setDyslexiaFont,
    resetAll,
  }
}
