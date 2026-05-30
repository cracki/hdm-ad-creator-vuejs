import { ref, computed, watch } from 'vue'
import type { DashboardLayout, WidgetId } from '../types'
import { DEFAULT_LAYOUT } from '../types'

const STORAGE_KEY = 'dashboard-layout'

function loadLayout(): DashboardLayout {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (!raw) return { ...DEFAULT_LAYOUT }
    const saved: DashboardLayout = JSON.parse(raw)
    const allIds = new Set([...DEFAULT_LAYOUT.order, ...saved.order])
    const order = saved.order.filter(id => allIds.has(id as WidgetId)) as WidgetId[]
    for (const id of DEFAULT_LAYOUT.order) {
      if (!order.includes(id as WidgetId)) order.push(id as WidgetId)
    }
    const hidden = saved.hidden.filter(id => order.includes(id as WidgetId)) as WidgetId[]
    return { order, hidden }
  } catch {
    return { ...DEFAULT_LAYOUT }
  }
}

const layout = ref<DashboardLayout>(loadLayout())

watch(layout, (val) => {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(val))
}, { deep: true })

export function useDashboardLayout() {
  const orderedWidgets = computed(() =>
    layout.value.order.filter(id => !layout.value.hidden.includes(id))
  )

  const hiddenWidgets = computed(() => layout.value.hidden)

  const hiddenCount = computed(() => layout.value.hidden.length)

  function reorder(newOrder: WidgetId[]) {
    layout.value = { ...layout.value, order: newOrder }
  }

  function hide(widgetId: WidgetId) {
    if (!layout.value.hidden.includes(widgetId)) {
      layout.value = {
        ...layout.value,
        hidden: [...layout.value.hidden, widgetId],
      }
    }
  }

  function show(widgetId: WidgetId) {
    layout.value = {
      ...layout.value,
      hidden: layout.value.hidden.filter(id => id !== widgetId),
    }
  }

  function reset() {
    layout.value = { order: [...DEFAULT_LAYOUT.order], hidden: [] }
  }

  function isHidden(id: WidgetId) {
    return layout.value.hidden.includes(id)
  }

  return {
    layout,
    orderedWidgets,
    hiddenWidgets,
    hiddenCount,
    reorder,
    hide,
    show,
    reset,
    isHidden,
  }
}
