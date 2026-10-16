/**
 * One-time self-healing for failed dynamic imports after a deploy (QA5).
 *
 * When a new build ships, the old hashed chunks (e.g.
 * BrandAnalysisView-Cp3TeQxI.js) are deleted from the server. Browsers that
 * still run the old service worker / cached shell keep failing lazy route
 * loads with "Failed to fetch dynamically imported module". The router
 * onError handler uses this helper to decide whether a recovery reload may
 * help: at most ONE reload per session (guarded by a sessionStorage key), so
 * a genuinely broken deployment can never produce a reload loop.
 */

const RECOVERY_KEY = 'hdm_sw_recovery'

/** Error messages browsers produce when a lazy chunk 404s after a deploy. */
const DYNAMIC_IMPORT_FAILURE_RE =
  /Failed to fetch dynamically imported module|Importing a module script failed|error loading dynamically imported module/i

/** True when the error looks like a lazy chunk that vanished after a deploy. */
export function isDynamicImportFailure(err: unknown): boolean {
  const message = err instanceof Error ? err.message : typeof err === 'string' ? err : String(err ?? '')
  return DYNAMIC_IMPORT_FAILURE_RE.test(message)
}

/** True when the error looks like a lazy chunk that vanished after a deploy. */
export function shouldRecover(err: unknown): boolean {
  return isDynamicImportFailure(err)
}

/**
 * True when a recovery reload was already issued this session. When
 * sessionStorage is unavailable (privacy mode) this conservatively returns
 * true so the caller can never risk a reload loop.
 */
export function hasRecoveryAttempted(): boolean {
  try {
    return sessionStorage.getItem(RECOVERY_KEY) !== null
  } catch {
    return true
  }
}

/** Remember that a recovery reload was issued, so it happens at most once. */
export function markRecoveryAttempt(): void {
  try {
    sessionStorage.setItem(RECOVERY_KEY, '1')
  } catch {
    // best effort — the key is only a loop guard
  }
}

/**
 * Clear the guard after a successful navigation, so a FUTURE deploy can also
 * self-heal in the same session.
 */
export function clearRecoveryFlag(): void {
  try {
    sessionStorage.removeItem(RECOVERY_KEY)
  } catch {
    // best effort
  }
}
