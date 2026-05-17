import { ref, watch } from 'vue'

export interface MoodBoardItem {
  id: string
  type: 'image' | 'color' | 'note'
  value: string
  x: number
  y: number
  width?: number
  height?: number
}

const STORAGE_KEY = 'hdm_mood_board'
const MAX_IMAGES = 6
const THUMBNAIL_MAX = 400

function resizeImage(dataUrl: string, maxDim: number): Promise<string> {
  return new Promise((resolve) => {
    const img = new Image()
    img.onload = () => {
      if (img.width <= maxDim && img.height <= maxDim) {
        resolve(dataUrl)
        return
      }
      const scale = maxDim / Math.max(img.width, img.height)
      const canvas = document.createElement('canvas')
      canvas.width = Math.round(img.width * scale)
      canvas.height = Math.round(img.height * scale)
      const ctx = canvas.getContext('2d')!
      ctx.drawImage(img, 0, 0, canvas.width, canvas.height)
      resolve(canvas.toDataURL('image/jpeg', 0.7))
    }
    img.src = dataUrl
  })
}

function loadItems(): MoodBoardItem[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    return raw ? JSON.parse(raw) : []
  } catch {
    return []
  }
}

function saveItems(items: MoodBoardItem[]) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(items))
  } catch {
    // Storage full — remove oldest image to make room
    const firstImageIdx = items.findIndex(i => i.type === 'image')
    if (firstImageIdx >= 0) {
      items.splice(firstImageIdx, 1)
      try { localStorage.setItem(STORAGE_KEY, JSON.stringify(items)) } catch {}
    }
  }
}

export function useMoodBoard() {
  const items = ref<MoodBoardItem[]>(loadItems())

  watch(items, (val) => saveItems(val), { deep: true })

  function addImage(file: File): Promise<void> {
    const imageCount = items.value.filter(i => i.type === 'image').length
    if (imageCount >= MAX_IMAGES) {
      return Promise.reject(new Error(`Maximum ${MAX_IMAGES} images allowed on the board`))
    }

    return new Promise((resolve, reject) => {
      const reader = new FileReader()
      reader.onload = async (e) => {
        try {
          const dataUrl = e.target?.result as string
          const resized = await resizeImage(dataUrl, THUMBNAIL_MAX)
          items.value.push({
            id: `img-${Date.now()}`,
            type: 'image',
            value: resized,
            x: Math.random() * 300,
            y: Math.random() * 200,
            width: 200,
            height: 150,
          })
          resolve()
        } catch {
          reject(new Error('Failed to process image'))
        }
      }
      reader.onerror = () => reject(new Error('Failed to read file'))
      reader.readAsDataURL(file)
    })
  }

  function addColor(color: string) {
    items.value.push({
      id: `clr-${Date.now()}`,
      type: 'color',
      value: color,
      x: Math.random() * 300,
      y: Math.random() * 200,
      width: 80,
      height: 80,
    })
  }

  function addNote(text: string) {
    items.value.push({
      id: `note-${Date.now()}`,
      type: 'note',
      value: text,
      x: Math.random() * 300,
      y: Math.random() * 200,
      width: 180,
      height: 100,
    })
  }

  function removeItem(id: string) {
    items.value = items.value.filter(i => i.id !== id)
  }

  function clearAll() {
    items.value = []
  }

  return { items, addImage, addColor, addNote, removeItem, clearAll }
}
