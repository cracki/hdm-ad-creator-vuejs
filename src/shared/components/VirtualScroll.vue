<script setup lang="ts" generic="T">
import { ref, computed, onMounted, onUnmounted, watch } from 'vue'

const props = withDefaults(defineProps<{
  items: T[]
  itemHeight: number
  buffer?: number
  tag?: string
}>(), {
  buffer: 5,
  tag: 'div',
})

const emit = defineEmits<{ loadMore: [] }>()

const container = ref<HTMLElement | null>(null)
const scrollTop = ref(0)
const containerHeight = ref(0)

let resizeObserver: ResizeObserver | null = null
let rafId: number | null = null

const totalHeight = computed(() => props.items.length * props.itemHeight)

const startIndex = computed(() => {
  const start = Math.floor(scrollTop.value / props.itemHeight) - props.buffer
  return Math.max(0, start)
})

const endIndex = computed(() => {
  const visibleCount = Math.ceil(containerHeight.value / props.itemHeight)
  const end = startIndex.value + visibleCount + props.buffer * 2
  return Math.min(props.items.length, end)
})

const visibleItems = computed(() => {
  if (props.items.length === 0) return []
  const result: { item: T; index: number; style: { transform: string } }[] = []
  for (let i = startIndex.value; i < endIndex.value; i++) {
    result.push({
      item: props.items[i],
      index: i,
      style: { transform: `translateY(${i * props.itemHeight}px)` },
    })
  }
  return result
})

function onScroll() {
  if (rafId !== null) return
  rafId = requestAnimationFrame(() => {
    rafId = null
    if (!container.value) return
    scrollTop.value = container.value.scrollTop

    if (
      props.items.length > 0 &&
      scrollTop.value + containerHeight.value >= totalHeight.value - props.itemHeight * 3
    ) {
      emit('loadMore')
    }
  })
}

function updateHeight() {
  if (container.value) {
    containerHeight.value = container.value.clientHeight
  }
}

onMounted(() => {
  if (container.value) {
    containerHeight.value = container.value.clientHeight
    resizeObserver = new ResizeObserver(updateHeight)
    resizeObserver.observe(container.value)
  }
})

onUnmounted(() => {
  resizeObserver?.disconnect()
  if (rafId !== null) cancelAnimationFrame(rafId)
})

watch(() => props.items.length, () => {
  if (container.value) {
    scrollTop.value = container.value.scrollTop
  }
})
</script>

<template>
  <component
    :is="tag"
    ref="container"
    class="overflow-y-auto"
    @scroll="onScroll"
  >
    <div :style="{ height: `${totalHeight}px`, position: 'relative' }">
      <div
        v-for="{ item, index, style } in visibleItems"
        :key="index"
        :style="{ ...style, position: 'absolute', top: 0, insetInlineStart: 0, insetInlineEnd: 0, height: `${itemHeight}px` }"
      >
        <slot :item="item" :index="index" />
      </div>
    </div>
    <div v-if="items.length === 0">
      <slot name="empty" />
    </div>
  </component>
</template>
