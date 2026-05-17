import { reactive } from 'vue'

interface OperationEntry {
  key: string
  startedAt: number
}

const MAX_OPERATIONS = 100
const STALE_MS = 30 * 60_000

const state = reactive({
  operations: new Map<string, OperationEntry>(),
})

function sweepStale() {
  const now = Date.now()
  for (const [key, entry] of state.operations) {
    if (now - entry.startedAt > STALE_MS) {
      state.operations.delete(key)
    }
  }
}

export const operationManager = {
  start(key: string): void {
    if (state.operations.size >= MAX_OPERATIONS) {
      sweepStale()
    }
    state.operations.set(key, { key, startedAt: Date.now() })
  },

  finish(key: string): void {
    state.operations.delete(key)
  },

  isActive(key: string): boolean {
    return state.operations.has(key)
  },

  getActiveOperations(): string[] {
    return Array.from(state.operations.keys())
  },

  canStart(key: string): boolean {
    return !state.operations.has(key)
  },
}
