import { watch, type Ref } from 'vue'
import { useBrands } from '@/features/brands/queries'

export function useAutoSelectBrand(selectedUuid: Ref<string>) {
  const { data: brands } = useBrands()

  watch(brands, (list) => {
    if (list && list.length === 1 && !selectedUuid.value) {
      selectedUuid.value = list[0].brand_uuid
    }
  }, { immediate: true })
}
