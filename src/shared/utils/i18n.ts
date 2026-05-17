import { ref, computed } from 'vue'
import { translations } from './translations'
import type { TKey } from './translations'
import { LANG_KEY } from '@/shared/utils/constants'

export type Lang = 'en' | 'ar' | 'fa'

export interface LangMeta {
  code: Lang
  label: string
  native: string
  dir: 'ltr' | 'rtl'
}

export const LANGS: LangMeta[] = [
  { code: 'en', label: 'EN', native: 'English', dir: 'ltr' },
  { code: 'ar', label: 'ع', native: 'العربية', dir: 'rtl' },
  { code: 'fa', label: 'فا', native: 'فارسی', dir: 'rtl' },
]

const storedLang = (() => {
  try {
    const s = localStorage.getItem(LANG_KEY) as Lang | null
    if (s && LANGS.some((l) => l.code === s)) return s
  } catch {}
  return 'en' as Lang
})()

const currentLang = ref<Lang>(storedLang)

// Apply lang/dir on initial load
;(function initLang() {
  const meta = LANGS.find((l) => l.code === storedLang)
  if (meta) {
    document.documentElement.lang = meta.code
    document.documentElement.dir = meta.dir
    document.documentElement.classList.toggle('rtl', meta.dir === 'rtl')
  }
})()

export function useI18n() {
  const lang = computed(() => currentLang.value)
  const dir = computed(() => LANGS.find((l) => l.code === currentLang.value)?.dir ?? 'ltr')

  function t(key: TKey, params?: Record<string, string | number>): string {
    const entry = translations[key]
    if (!entry) return key as string
    let text: string = entry[currentLang.value] ?? entry.en ?? (key as string)
    if (params) {
      for (const [k, v] of Object.entries(params)) {
        text = text.replaceAll(`{${k}}`, String(v))
      }
    }
    return text
  }

  function setLang(l: Lang) {
    currentLang.value = l
    const meta = LANGS.find((m) => m.code === l)!
    document.documentElement.lang = meta.code
    document.documentElement.dir = meta.dir
    document.documentElement.classList.toggle('rtl', meta.dir === 'rtl')
    try { localStorage.setItem(LANG_KEY, l) } catch {}
  }

  return { lang, dir, t, setLang }
}
