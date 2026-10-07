/**
 * Build info injected at compile time by vite.config.ts `define` as the
 * `__BUILD_INFO__` global (QA4-E0 build-version badge).
 *
 * The accessor reads the global lazily (not at module import) and falls back
 * to a `dev` commit in environments where the define is not applied (unit
 * tests), so the badge always renders something.
 */
export interface BuildInfo {
  commit: string
  builtAt: string
}

const FALLBACK_BUILD_INFO: BuildInfo = { commit: 'dev', builtAt: '' }

export function getBuildInfo(): BuildInfo {
  if (typeof __BUILD_INFO__ !== 'undefined') {
    return __BUILD_INFO__
  }
  return FALLBACK_BUILD_INFO
}

/** Sidebar badge label, e.g. "2ebf850 · Oct 7". Without a build date just the commit. */
export function getBuildLabel(): string {
  const { commit, builtAt } = getBuildInfo()
  const date = builtAt ? new Date(builtAt) : null
  if (!date || Number.isNaN(date.getTime())) return commit
  return `${commit} · ${date.toLocaleDateString(undefined, { month: 'short', day: 'numeric' })}`
}
