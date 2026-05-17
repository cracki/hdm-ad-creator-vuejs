import { ref, type Component } from 'vue'

export interface PageAction {
  label: string
  icon?: Component
  handler?: () => void
  variant?: 'default' | 'destructive'
  to?: string
  disabled?: boolean
}

const actions = ref<PageAction[]>([])

export function usePageActions() {
  function setActions(items: PageAction[]) {
    actions.value = items
  }

  function clearActions() {
    actions.value = []
  }

  return { actions, setActions, clearActions }
}
